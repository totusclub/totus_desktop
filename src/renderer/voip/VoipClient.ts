// Порт modules/voip/VoipService.ts (только исходящий звонок в поддержку) на браузерный WebRTC:
// та же сигнализация calling_api_v2 (voip.totus.club): Socket.IO (`registerDevice`, `offer`/`answer`/
// `ice-candidate`, `call-state`) + HTTP (`/api/calls`, `/api/calls/:id`, `/api/calls/:id/candidate`,
// `/api/calls/:id/candidates`, `/api/calls/:id/end`, `/api/ice-servers`, `/api/register-device`).
// Без CallKeep / InCallManager / push-токенов: deviceId — стабильный UUID в localStorage.
import { io, type Socket } from 'socket.io-client';
import { VOIP_BASE_URL } from '@shared/config/server';
import { voipFetch, voipSocketAuth } from '@shared/modules/api/voipAuth';

const BASE_URL = VOIP_BASE_URL;
const DEVICE_ID_KEY = '@voip_desktop_device_id';

export type CallState = 'idle' | 'calling' | 'answered' | 'ended' | 'rejected';
export type ConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'failed' | null;
export type SpeakerMode = 'earpiece' | 'loudspeaker';

export type VoipSnapshot = {
  state: CallState;
  callerName: string | null;
  isMuted: boolean;
  speakerMode: SpeakerMode;
  callUUID: string | null;
  connectionState: ConnectionState;
  /** Момент ответа (для таймера), как activeCallStartedAt в приложении. */
  startedAt: number | null;
  /** Был ли звонок отвечен (для «Нет ответа» vs «Звонок завершён»). */
  wasAnswered: boolean;
  /** Последняя ошибка старта звонка (текст для UI). */
  error: string | null;
};

export type ConnectionStatus = {
  connectionState: string | null;
  iceConnectionState: string | null;
  isConnecting: boolean;
  isConnected: boolean;
};

type Listener = (s: VoipSnapshot) => void;

// ---------------------------------------------------------------------------
// Состояние модуля (аналог переменных модуля VoipService)
// ---------------------------------------------------------------------------
let socket: Socket | null = null;
let pc: RTCPeerConnection | null = null;
let localStream: MediaStream | null = null;
let remoteAudio: HTMLAudioElement | null = null;

let currentDeviceId: string | null = null;
let currentLoyaltyId: string | null = null;
let activeCallUUID: string | null = null;
let currentCallState: CallState = 'idle';
let connectionState: ConnectionState = null;
let callerName: string | null = null;
let activeCallStartedAt: number | null = null;
let wasAnswered = false;
let isMuted = false;
let currentSpeakerMode: SpeakerMode = 'loudspeaker';
let lastError: string | null = null;
let answerProcessedForCall: string | null = null;
let idleResetTimer: ReturnType<typeof setTimeout> | null = null;
let answerWaitTimer: ReturnType<typeof setTimeout> | null = null;

const iceCandidateQueue = new Map<string, RTCIceCandidateInit[]>();
const listeners = new Set<Listener>();

const FALLBACK_ICE_SERVERS: RTCIceServer[] = [{ urls: 'stun:stun1.totus.club:3478' }, { urls: 'stun:stun2.totus.club:3478' }];
let cachedIceServers: RTCIceServer[] | null = null;
let cachedIceExpiresAt = 0;

/** Сколько ждать ответа поддержки: 20 с socket + 20 с HTTP-поллинг, как waitForAnswer → waitForAnswerHTTP. */
const ANSWER_TIMEOUT_MS = 40000;

// ---------------------------------------------------------------------------
// Подписка / снимок состояния
// ---------------------------------------------------------------------------
export function getCallState(): VoipSnapshot {
  return {
    state: currentCallState,
    callerName,
    isMuted,
    speakerMode: currentSpeakerMode,
    callUUID: activeCallUUID,
    connectionState,
    startedAt: activeCallStartedAt,
    wasAnswered,
    error: lastError,
  };
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  listener(getCallState());
  return () => {
    listeners.delete(listener);
  };
}

function emit(): void {
  const snap = getCallState();
  listeners.forEach(l => {
    try {
      l(snap);
    } catch (e) {
      console.warn('[voip] listener failed', e);
    }
  });
}

export function getConnectionStatus(): ConnectionStatus {
  if (!pc) {
    return { connectionState: null, iceConnectionState: null, isConnecting: false, isConnected: false };
  }
  const cs = pc.connectionState || 'unknown';
  const ice = pc.iceConnectionState || 'unknown';
  const isConnecting =
    cs === 'connecting' ||
    cs === 'new' ||
    ice === 'checking' ||
    ice === 'new' ||
    (cs !== 'connected' &&
      cs !== 'disconnected' &&
      cs !== 'failed' &&
      cs !== 'closed' &&
      ice !== 'connected' &&
      ice !== 'completed' &&
      ice !== 'failed' &&
      ice !== 'closed');
  const isConnected = cs === 'connected' && (ice === 'connected' || ice === 'completed');
  return { connectionState: cs, iceConnectionState: ice, isConnecting, isConnected };
}

// ---------------------------------------------------------------------------
// deviceId / регистрация устройства
// ---------------------------------------------------------------------------
const generateUUID = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

export function getCurrentDeviceId(): string {
  if (currentDeviceId) return currentDeviceId;
  let id: string | null = null;
  try {
    id = window.localStorage.getItem(DEVICE_ID_KEY);
  } catch {
    /* ignore */
  }
  if (!id) {
    id = `desktop-${generateUUID()}`;
    try {
      window.localStorage.setItem(DEVICE_ID_KEY, id);
    } catch {
      /* ignore */
    }
  }
  currentDeviceId = id;
  return id;
}

export function getCurrentLoyaltyId(): string | null {
  return currentLoyaltyId;
}

async function registerDeviceWithBackend(deviceId: string, loyaltyId: string | null): Promise<void> {
  if (!loyaltyId) {
    ensureSocketConnected();
    socket?.emit('registerDevice', { deviceId });
    return;
  }
  // TODO(voip): в приложении voipToken — это APNs/FCM push-токен, platform — 'ios'|'android'.
  // Для десктопа отправляем deviceId как voipToken и platform 'desktop'; если calling_api_v2
  // валидирует platform/token — согласовать с бэкендом (регистрация нужна только для
  // идентификации fromDeviceId в звонке, пуши десктопу не нужны).
  const response = await voipFetch(`${BASE_URL}/api/register-device`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId, voipToken: deviceId, platform: 'desktop', loyaltyId }),
  });
  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Backend registration failed: ${response.status} - ${errorText}`);
  }
  ensureSocketConnected();
  socket?.emit('registerDevice', { deviceId, loyaltyId });
}

async function unregisterDeviceWithBackend(loyaltyId: string): Promise<void> {
  if (!loyaltyId) return;
  try {
    const response = await voipFetch(`${BASE_URL}/api/unregister-device`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loyaltyId }),
    });
    if (!response.ok) console.warn('[voip] unregister device failed:', response.status);
  } catch (e) {
    console.warn('[voip] failed to unregister device on logout:', e);
  }
}

/** Аналог setUserLoyaltyId: запоминает loyalty_id пользователя и регистрирует устройство. */
export function setUserLoyaltyId(loyaltyId: string): void {
  currentLoyaltyId = loyaltyId;
  const deviceId = getCurrentDeviceId();
  registerDeviceWithBackend(deviceId, loyaltyId).catch(e => {
    console.warn('[voip] failed to update device registration with loyalty_id', e);
  });
}

// ---------------------------------------------------------------------------
// Socket.IO — те же события, что в VoipService.ensureSocketConnected
// ---------------------------------------------------------------------------
function ensureSocketConnected(): void {
  if (socket) {
    if (socket.connected) {
      const deviceId = currentDeviceId;
      if (deviceId && currentLoyaltyId) socket.emit('registerDevice', { deviceId, loyaltyId: currentLoyaltyId });
      return;
    }
    if (socket.active) return;
    try {
      socket.connect();
      return;
    } catch (e) {
      console.warn('[voip] socket reconnect failed, creating new socket', e);
      try {
        socket.removeAllListeners();
        socket.disconnect();
      } catch {
        /* ignore */
      }
      socket = null;
    }
  }

  socket = io(BASE_URL, {
    // user-JWT в handshake: сервер (calling_api_v2 socketGate) берёт личность из токена
    auth: voipSocketAuth,
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 8000,
    timeout: 15000,
  });

  socket.on('connect', () => {
    const deviceId = getCurrentDeviceId();
    if (currentLoyaltyId) socket?.emit('registerDevice', { deviceId, loyaltyId: currentLoyaltyId });
    else socket?.emit('registerDevice', { deviceId });
  });

  socket.on('disconnect', () => {
    console.log('[voip] socket disconnected');
  });

  socket.on('call-state', (payload: { callId?: string; state?: string; callerName?: string }) => {
    const callId = payload?.callId;
    if (!callId || callId !== activeCallUUID) return;

    if (payload.state === 'rejected') {
      currentCallState = 'rejected';
      activeCallUUID = null;
      activeCallStartedAt = null;
      endVoiceCall();
      scheduleIdleReset(3000);
      emit();
      return;
    }
    if (payload.state === 'answered') {
      currentCallState = 'answered';
      connectionState = 'connected';
      wasAnswered = true;
      if (!activeCallStartedAt) activeCallStartedAt = Date.now();
      clearAnswerWait();
      emit();
    }
    if (payload.state === 'ended') {
      currentCallState = 'ended';
      connectionState = 'disconnected';
      activeCallUUID = null;
      activeCallStartedAt = null;
      isMuted = false;
      endVoiceCall();
      scheduleIdleReset(3000);
      emit();
    }
  });

  // Входящие звонки (`offer`) десктоп не принимает — только звонок в поддержку.
  socket.on('offer', ({ callId }: { callId?: string }) => {
    console.log('[voip] incoming offer ignored on desktop', callId);
  });

  socket.on('answer', async ({ callId, answer }: { callId?: string; answer?: RTCSessionDescriptionInit }) => {
    if (!answer || !answer.sdp || !callId) return;
    await applyRemoteAnswer(callId, answer);
  });

  socket.on('ice-candidate', async ({ callId, candidate }: { callId?: string; candidate?: RTCIceCandidateInit | null }) => {
    if (!candidate || !callId) return;
    if (!pc || activeCallUUID !== callId) return;
    if (pc.connectionState === 'closed' || pc.connectionState === 'failed') return;
    if (!pc.remoteDescription) {
      const q = iceCandidateQueue.get(callId) || [];
      q.push(candidate);
      iceCandidateQueue.set(callId, q);
      return;
    }
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
      console.warn('[voip] failed to add ICE candidate', e);
    }
  });
}

async function processQueuedIceCandidates(callId: string): Promise<void> {
  const q = iceCandidateQueue.get(callId);
  if (!q || !pc) return;
  iceCandidateQueue.delete(callId);
  for (const c of q) {
    try {
      await pc.addIceCandidate(new RTCIceCandidate(c));
    } catch (e) {
      console.warn('[voip] failed to add queued ICE candidate', e);
    }
  }
}

async function applyRemoteAnswer(callId: string, answer: RTCSessionDescriptionInit): Promise<boolean> {
  if (!pc || activeCallUUID !== callId || answerProcessedForCall === callId) return answerProcessedForCall === callId;
  if (pc.signalingState !== 'have-local-offer') {
    if (pc.signalingState === 'stable') answerProcessedForCall = callId;
    return answerProcessedForCall === callId;
  }
  try {
    await pc.setRemoteDescription(new RTCSessionDescription(answer));
    answerProcessedForCall = callId;
    await processQueuedIceCandidates(callId);
    if (!activeCallStartedAt) activeCallStartedAt = Date.now();
    wasAnswered = true;
    if (currentCallState === 'calling') currentCallState = 'answered';
    clearAnswerWait();
    emit();
    void pollRemoteCandidates(callId);
    return true;
  } catch (e: any) {
    const msg = e?.message || '';
    if (msg.includes('wrong state') || msg.includes('stable')) {
      answerProcessedForCall = callId;
      return true;
    }
    console.error('[voip] failed to set remote description', e);
    return false;
  }
}

// ---------------------------------------------------------------------------
// ICE
// ---------------------------------------------------------------------------
async function fetchIceServers(): Promise<RTCIceServer[]> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedIceServers && now < cachedIceExpiresAt - 300) return cachedIceServers;
  try {
    const res = await voipFetch(`${BASE_URL}/api/ice-servers`);
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.iceServers) && data.iceServers.length > 0) {
        cachedIceServers = data.iceServers;
        cachedIceExpiresAt = Number(data.expiresAt) || now + 3600;
        if (data.mode === 'stun-only') console.warn('[voip] backend вернул только STUN — relay недоступен');
        return cachedIceServers as RTCIceServer[];
      }
    }
    console.warn('[voip] /api/ice-servers ответил', res.status, '— фолбэк STUN-only');
  } catch (e) {
    console.warn('[voip] не удалось получить /api/ice-servers — фолбэк STUN-only', e);
  }
  return cachedIceServers || FALLBACK_ICE_SERVERS;
}

async function sendIceCandidate(callId: string, candidate: RTCIceCandidate | null): Promise<void> {
  if (!candidate) return;
  ensureSocketConnected();
  if (socket && socket.connected) {
    try {
      const callResp = await voipFetch(`${BASE_URL}/api/calls/${callId}`).catch(() => null);
      if (callResp && callResp.ok) {
        const callData = await callResp.json();
        const toDeviceId = callData.toDeviceId;
        if (toDeviceId) {
          socket.emit('ice-candidate', {
            callId,
            candidate: candidate.toJSON(),
            fromDeviceId: callData.fromDeviceId || currentDeviceId,
            toDeviceId,
          });
        }
      }
    } catch (e) {
      console.warn('[voip] sendIceCandidate: socket emit failed, using HTTP', e);
    }
  }
  try {
    await voipFetch(`${BASE_URL}/api/calls/${callId}/candidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'caller', candidate: candidate.toJSON() }),
    });
  } catch (e) {
    console.warn('[voip] sendIceCandidate: HTTP send failed', e);
  }
}

async function pollRemoteCandidates(callId: string): Promise<void> {
  const currentPc = pc;
  if (!currentPc) return;
  try {
    const resp = await voipFetch(`${BASE_URL}/api/calls/${callId}/candidates?for=caller`);
    if (!resp.ok) return;
    const data = await resp.json();
    const candidates: RTCIceCandidateInit[] = data.candidates || [];
    for (const c of candidates) {
      if (!pc || pc !== currentPc) return;
      if (currentPc.connectionState === 'closed' || currentPc.connectionState === 'failed') return;
      if (!c.candidate) continue;
      try {
        await currentPc.addIceCandidate(new RTCIceCandidate(c));
      } catch (err) {
        console.warn('[voip] failed to add ICE candidate from fallback', err);
      }
    }
  } catch (e) {
    console.warn('[voip] pollRemoteCandidates fallback error', e);
  }
}

// ---------------------------------------------------------------------------
// WebRTC
// ---------------------------------------------------------------------------
function ensureRemoteAudio(): HTMLAudioElement {
  if (!remoteAudio) {
    remoteAudio = document.createElement('audio');
    remoteAudio.autoplay = true;
    remoteAudio.setAttribute('playsinline', 'true');
    remoteAudio.style.display = 'none';
    document.body.appendChild(remoteAudio);
  }
  return remoteAudio;
}

async function startVoiceCall(callUUID: string): Promise<void> {
  const iceServers = await fetchIceServers();
  const peer = new RTCPeerConnection({
    iceServers,
    iceCandidatePoolSize: 10,
    iceTransportPolicy: 'all',
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
  });
  pc = peer;

  peer.onicecandidate = event => {
    if (event.candidate) void sendIceCandidate(callUUID, event.candidate);
  };

  peer.ontrack = event => {
    const audio = ensureRemoteAudio();
    const [stream] = event.streams;
    audio.srcObject = stream || new MediaStream([event.track]);
    void audio.play().catch(e => console.warn('[voip] remote audio play failed', e));
  };

  peer.onconnectionstatechange = () => {
    const state = peer.connectionState;
    if (state === 'connecting' || state === 'new') {
      connectionState = 'connecting';
    } else if (state === 'connected') {
      connectionState = 'connected';
      if (currentCallState === 'calling') {
        currentCallState = 'answered';
        wasAnswered = true;
        if (!activeCallStartedAt && activeCallUUID === callUUID) activeCallStartedAt = Date.now();
        clearAnswerWait();
      }
    } else if (state === 'disconnected') {
      connectionState = 'disconnected';
    } else if (state === 'failed') {
      connectionState = 'failed';
      try {
        if (peer.signalingState !== 'closed') peer.restartIce();
      } catch (e) {
        console.warn('[voip] restartIce failed', e);
      }
    }
    emit();
  };

  peer.oniceconnectionstatechange = () => {
    const ice = peer.iceConnectionState;
    if (ice === 'checking' || ice === 'new') {
      if (connectionState !== 'reconnecting') connectionState = 'connecting';
    } else if (ice === 'connected' || ice === 'completed') {
      connectionState = 'connected';
    } else if (ice === 'failed') {
      connectionState = 'failed';
    } else if (ice === 'disconnected') {
      connectionState = 'disconnected';
    }
    emit();
  };

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  } catch (e) {
    throw new Error('Нет доступа к микрофону');
  }
  localStream = stream;
  stream.getTracks().forEach(track => {
    track.enabled = !isMuted;
    peer.addTrack(track, stream);
  });

  const offer = await peer.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: false });
  await peer.setLocalDescription(offer);
  answerProcessedForCall = null;
}

function endVoiceCall(): void {
  clearAnswerWait();
  if (localStream) {
    localStream.getTracks().forEach(t => {
      try {
        t.stop();
      } catch {
        /* ignore */
      }
    });
    localStream = null;
  }
  if (pc) {
    try {
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.onconnectionstatechange = null;
      pc.oniceconnectionstatechange = null;
      pc.close();
    } catch {
      /* ignore */
    }
    pc = null;
  }
  if (remoteAudio) {
    try {
      remoteAudio.pause();
      remoteAudio.srcObject = null;
    } catch {
      /* ignore */
    }
  }
  iceCandidateQueue.clear();
  answerProcessedForCall = null;
}

function clearAnswerWait(): void {
  if (answerWaitTimer) {
    clearTimeout(answerWaitTimer);
    answerWaitTimer = null;
  }
}

function scheduleIdleReset(ms: number): void {
  if (idleResetTimer) clearTimeout(idleResetTimer);
  idleResetTimer = setTimeout(() => {
    idleResetTimer = null;
    if (currentCallState === 'ended' || currentCallState === 'rejected') {
      currentCallState = 'idle';
      connectionState = null;
      callerName = null;
      emit();
    }
  }, ms);
}

/** Ожидание ответа: socket `answer` (см. ensureSocketConnected) + HTTP-поллинг GET /api/calls/:id. */
async function waitForAnswerHTTP(callId: string): Promise<void> {
  const currentPc = pc;
  for (let i = 0; i < 20; i += 1) {
    if (!pc || pc !== currentPc || activeCallUUID !== callId) return;
    if (answerProcessedForCall === callId) return;
    try {
      const resp = await voipFetch(`${BASE_URL}/api/calls/${callId}`);
      if (resp.ok) {
        const data = await resp.json();
        if (data.answer && data.answer.sdp) {
          if (await applyRemoteAnswer(callId, data.answer)) return;
        }
        // TODO(voip): поля статуса в GET /api/calls/:id (`status: 'rejected' | 'ended'`?) в приложении не читаются —
        // завершение по инициативе поддержки приходит через socket `call-state`.
      }
    } catch (e) {
      console.warn('[voip] waitForAnswerHTTP error', e);
    }
    await new Promise(r => setTimeout(r, 1000));
  }
}

// ---------------------------------------------------------------------------
// Публичный API
// ---------------------------------------------------------------------------
/** Аналог startOutgoingVoiceCallByLoyaltyId: звонок абоненту по loyalty_id (у нас — только поддержка). */
export async function startOutgoingVoiceCallByLoyaltyId(targetLoyaltyId: string, displayName: string): Promise<void> {
  if (!targetLoyaltyId) throw new Error('Target loyaltyId is required');
  if (currentCallState !== 'idle' && currentCallState !== 'ended' && currentCallState !== 'rejected') {
    throw new Error('У вас уже есть активный звонок');
  }
  if (idleResetTimer) {
    clearTimeout(idleResetTimer);
    idleResetTimer = null;
  }
  endVoiceCall();

  const deviceId = getCurrentDeviceId();
  const callUUID = generateUUID();
  activeCallUUID = callUUID;
  currentCallState = 'calling';
  callerName = displayName;
  connectionState = 'connecting';
  activeCallStartedAt = null;
  wasAnswered = false;
  lastError = null;
  isMuted = false;
  emit();

  try {
    ensureSocketConnected();
    await startVoiceCall(callUUID);
    const localDesc = pc?.localDescription;
    if (!localDesc) throw new Error('Local description not set after createOffer');

    const response = await voipFetch(`${BASE_URL}/api/calls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callId: callUUID,
        toLoyaltyId: targetLoyaltyId,
        fromDeviceId: deviceId,
        fromLoyaltyId: currentLoyaltyId,
        callerName: displayName,
        offer: { type: localDesc.type, sdp: localDesc.sdp },
      }),
    }).catch((networkErr: any) => {
      throw new Error(`Network error: ${networkErr?.message || 'Failed to connect to server'}`);
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      let errorMessage = `Backend returned ${response.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      throw new Error(`Failed to start call: ${errorMessage}`);
    }
  } catch (err: any) {
    lastError = err?.message || 'Неизвестная ошибка';
    activeCallUUID = null;
    currentCallState = 'idle';
    connectionState = null;
    endVoiceCall();
    emit();
    throw err;
  }

  // Ожидание ответа: socket-слушатель уже висит; параллельно — HTTP-поллинг (фолбэк, как в приложении).
  clearAnswerWait();
  answerWaitTimer = setTimeout(() => {
    answerWaitTimer = null;
    if (activeCallUUID === callUUID && currentCallState === 'calling') {
      // Нет ответа — завершаем звонок сами (в приложении звонок «висит» до сброса пользователем).
      endCall();
    }
  }, ANSWER_TIMEOUT_MS);
  void waitForAnswerHTTP(callUUID);
}

export function toggleMute(): boolean {
  isMuted = !isMuted;
  if (localStream) localStream.getAudioTracks().forEach(t => (t.enabled = !isMuted));
  emit();
  return isMuted;
}

/**
 * Динамик: в браузере/Electron вывод всегда идёт на системное устройство по умолчанию,
 * поэтому режим — только флаг для UI (громкость 1.0 в «loudspeaker», 0.6 в «earpiece»).
 */
export function toggleSpeakerMode(): SpeakerMode {
  currentSpeakerMode = currentSpeakerMode === 'loudspeaker' ? 'earpiece' : 'loudspeaker';
  if (remoteAudio) remoteAudio.volume = currentSpeakerMode === 'loudspeaker' ? 1 : 0.6;
  emit();
  return currentSpeakerMode;
}

/** Аналог endCall(): сброс звонка пользователем + уведомление бэкенда. */
export function endCall(): void {
  const callId = activeCallUUID;
  currentCallState = callId ? 'ended' : 'idle';
  activeCallUUID = null;
  activeCallStartedAt = null;
  isMuted = false;
  endVoiceCall();
  if (callId) {
    voipFetch(`${BASE_URL}/api/calls/${callId}/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: getCurrentDeviceId() }),
    }).catch(e => console.warn('[voip] failed to notify backend about call end', e));
  }
  emit();
  scheduleIdleReset(3000);
}

/** Сброс состояния после закрытия окна звонка (ended/rejected → idle без ожидания таймера). */
export function resetToIdle(): void {
  if (currentCallState === 'ended' || currentCallState === 'rejected') {
    if (idleResetTimer) {
      clearTimeout(idleResetTimer);
      idleResetTimer = null;
    }
    currentCallState = 'idle';
    connectionState = null;
    callerName = null;
    emit();
  }
}

/** Аналог cleanupVoipOnLogout: снять регистрацию устройства, отключить сокет, сбросить звонок. */
export async function cleanupVoipOnLogout(): Promise<void> {
  const loyaltyIdToUnregister = currentLoyaltyId;
  if (activeCallUUID) endCall();
  if (loyaltyIdToUnregister) await unregisterDeviceWithBackend(loyaltyIdToUnregister);
  currentLoyaltyId = null;
  if (socket) {
    try {
      socket.removeAllListeners();
      socket.disconnect();
    } catch {
      /* ignore */
    }
    socket = null;
  }
  currentCallState = 'idle';
  connectionState = null;
  callerName = null;
  emit();
}
