// Socket.io для чата с поддержкой — отдельный singleton (сокет звонков в VoipClient приватный, его не трогаем).
// Тот же namespace calling_api_v2: по JWT в handshake сервер кладёт сокет в комнату u:<userId>,
// куда приходят support:message / support:chat-updated / support:read / support:typing.
import { io, type Socket } from 'socket.io-client';
import { VOIP_BASE_URL } from '@shared/config/server';
import { voipSocketAuth } from '@shared/modules/api/voipAuth';
import type { SupportChat, SupportMessage, SupportMessageMeta } from '@shared/modules/api/supportChat';

export type SupportMessageEvent = { chat: SupportChat; message: SupportMessage };
export type SupportChatUpdatedEvent = { chat: SupportChat };
export type SupportReadEvent = { chatId: number; by: 'user' | 'staff'; lastMessageId: number | null; chat?: SupportChat };
export type SupportTypingEvent = { chatId: number; from: 'user' | 'staff'; typing: boolean };

export type SupportEventMap = {
  'support:message': SupportMessageEvent;
  'support:chat-updated': SupportChatUpdatedEvent;
  'support:read': SupportReadEvent;
  'support:typing': SupportTypingEvent;
  connect: undefined;
  disconnect: string;
};
export type SupportEventName = keyof SupportEventMap;

export type SupportSendPayload = { body: string; clientMsgId?: string; meta?: SupportMessageMeta | null };
export type SupportSendAck =
  | { ok: true; chat: SupportChat; message: SupportMessage; duplicate?: boolean }
  | { ok: false; error?: string };

type Listener = (payload: any) => void;

let socket: Socket | null = null;
const listeners = new Map<SupportEventName, Set<Listener>>();

const FORWARDED: SupportEventName[] = ['support:message', 'support:chat-updated', 'support:read', 'support:typing'];

function dispatch(event: SupportEventName, payload: unknown): void {
  const set = listeners.get(event);
  if (!set) return;
  set.forEach(fn => {
    try {
      fn(payload);
    } catch (e) {
      console.warn('[support-chat] listener error', event, e);
    }
  });
}

/** Подключить сокет (idempotent). Токен берётся из voipSocketAuth при каждом (ре)коннекте. */
export function connectSupportSocket(): Socket {
  if (socket) {
    if (!socket.connected) socket.connect();
    return socket;
  }
  socket = io(VOIP_BASE_URL, {
    auth: voipSocketAuth,
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 8000,
    timeout: 15000,
  });
  socket.on('connect', () => dispatch('connect', undefined));
  socket.on('disconnect', (reason: string) => dispatch('disconnect', reason));
  socket.on('connect_error', (e: Error) => console.warn('[support-chat] socket connect_error', e?.message || e));
  FORWARDED.forEach(ev => socket?.on(ev, (payload: unknown) => dispatch(ev, payload)));
  return socket;
}

/** Отключить и уничтожить сокет (логаут). Подписчики остаются — при следующем connect события снова пойдут. */
export function disconnectSupportSocket(): void {
  if (!socket) return;
  try {
    socket.removeAllListeners();
    socket.disconnect();
  } catch {
    /* ignore */
  }
  socket = null;
}

export function isSupportSocketConnected(): boolean {
  return Boolean(socket?.connected);
}

/** Подписка на событие; возвращает функцию отписки. */
export function onSupportEvent<K extends SupportEventName>(event: K, fn: (payload: SupportEventMap[K]) => void): () => void {
  let set = listeners.get(event);
  if (!set) {
    set = new Set();
    listeners.set(event, set);
  }
  set.add(fn as Listener);
  return () => {
    listeners.get(event)?.delete(fn as Listener);
  };
}

/** emit с ack. Если сокет не подключён — resolve(null): вызывающий код падает на REST. */
export function emitSupport<T = unknown>(event: 'support:send' | 'support:read' | 'support:typing', payload: Record<string, unknown>, timeoutMs = 8000): Promise<T | null> {
  return new Promise(resolve => {
    if (!socket || !socket.connected) {
      resolve(null);
      return;
    }
    if (event === 'support:typing') {
      socket.emit(event, payload);
      resolve(null);
      return;
    }
    let done = false;
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      resolve(null);
    }, timeoutMs);
    socket.emit(event, payload, (result: T) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve(result ?? null);
    });
  });
}
