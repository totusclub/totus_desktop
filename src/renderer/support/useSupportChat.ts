import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createClientMsgId,
  getSupportChat,
  getSupportErrorMessage,
  getSupportMessages,
  markSupportRead,
  sendSupportMessage,
  SUPPORT_MESSAGE_MAX_LENGTH,
  supportErrorText,
  type SupportChat,
  type SupportHours,
  type SupportMessage,
  type SupportMessageMeta,
} from '@shared/modules/api/supportChat';
import { useSupportChatContext } from './SupportChatProvider';
import { emitSupport, onSupportEvent, type SupportSendAck } from './supportSocket';

/** Сообщение в списке экрана: серверное или оптимистичное (ещё не подтверждено / не отправилось). */
export type SupportUiMessage = SupportMessage & { pending?: boolean; failed?: boolean };

export type SupportChatState = {
  chat: SupportChat | null;
  messages: SupportUiMessage[];
  hours: SupportHours | null;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  sending: boolean;
  staffTyping: boolean;
  error: string | null;
};

const PAGE = 50;
const TYPING_THROTTLE_MS = 3000;
const TYPING_IDLE_MS = 4000;
const STAFF_TYPING_TTL_MS = 6000;

function sortMessages(list: SupportUiMessage[]): SupportUiMessage[] {
  return [...list].sort((a, b) => {
    const ta = Date.parse(a.createdAt) || 0;
    const tb = Date.parse(b.createdAt) || 0;
    if (ta !== tb) return ta - tb;
    return (a.id > 0 ? a.id : Number.MAX_SAFE_INTEGER) - (b.id > 0 ? b.id : Number.MAX_SAFE_INTEGER);
  });
}

/** Вставить/заменить сообщение: совпадение по id или clientMsgId (оптимистичное → серверное). */
function upsertMessage(list: SupportUiMessage[], msg: SupportUiMessage): SupportUiMessage[] {
  const idx = list.findIndex(m => (msg.id > 0 && m.id === msg.id) || (msg.clientMsgId && m.clientMsgId === msg.clientMsgId));
  if (idx === -1) return sortMessages([...list, msg]);
  const next = list.slice();
  next[idx] = { ...next[idx], ...msg, pending: msg.pending, failed: msg.failed };
  return sortMessages(next);
}

let optimisticSeq = -1;

/**
 * Состояние экрана «Чат с поддержкой»: загрузка диалога и истории, отправка с оптимистичным сообщением
 * (сокет с ack → REST при отсутствии сокета), «печатает…», прочтение при открытии и при новых сообщениях.
 */
export function useSupportChat(userName?: string | null) {
  const ctx = useSupportChatContext();
  const { setChat: setCtxChat } = ctx;
  const [state, setState] = useState<SupportChatState>({
    chat: null,
    messages: [],
    hours: null,
    loading: true,
    loadingMore: false,
    hasMore: false,
    sending: false,
    staffTyping: false,
    error: null,
  });
  const chatRef = useRef<SupportChat | null>(null);
  const messagesRef = useRef<SupportUiMessage[]>([]);
  const lastReadIdRef = useRef<number>(0);
  const typingLastSentRef = useRef(0);
  const typingIdleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const staffTypingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const patch = useCallback((p: Partial<SupportChatState>) => {
    if (!mountedRef.current) return;
    setState(s => ({ ...s, ...p }));
  }, []);

  const applyChat = useCallback(
    (chat: SupportChat | null) => {
      chatRef.current = chat;
      patch({ chat });
      setCtxChat(chat);
    },
    [patch, setCtxChat],
  );

  const applyMessages = useCallback(
    (updater: (prev: SupportUiMessage[]) => SupportUiMessage[]) => {
      messagesRef.current = updater(messagesRef.current);
      patch({ messages: messagesRef.current });
    },
    [patch],
  );

  /** Отметить прочитанным до последнего серверного сообщения (сокет → REST). */
  const markRead = useCallback(async () => {
    const last = [...messagesRef.current].reverse().find(m => m.id > 0);
    const lastId = last?.id ?? null;
    if (lastId && lastId <= lastReadIdRef.current) return;
    if (!chatRef.current) return;
    if (lastId) lastReadIdRef.current = lastId;
    try {
      const ack = await emitSupport<{ ok: boolean; chat?: SupportChat }>('support:read', lastId ? { lastMessageId: lastId } : {});
      if (ack && ack.ok) {
        if (ack.chat) applyChat(ack.chat);
        else if (chatRef.current) applyChat({ ...chatRef.current, userUnread: 0 });
        return;
      }
      const res = await markSupportRead(lastId);
      if (res?.chat) applyChat(res.chat);
    } catch (e) {
      console.warn('[support-chat] markRead failed', e);
    }
  }, [applyChat]);

  // Первичная загрузка
  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;
    patch({ loading: true, error: null });
    getSupportChat(PAGE)
      .then(res => {
        if (cancelled) return;
        applyChat(res.chat);
        messagesRef.current = sortMessages(res.messages || []);
        patch({ messages: messagesRef.current, hasMore: Boolean(res.hasMore), hours: res.hours || null, loading: false });
        if ((res.chat?.userUnread ?? 0) > 0 || messagesRef.current.some(m => m.senderRole !== 'user' && !m.readAt)) void markRead();
      })
      .catch(e => {
        if (cancelled) return;
        patch({ loading: false, error: getSupportErrorMessage(e) });
      });
    return () => {
      cancelled = true;
      mountedRef.current = false;
      if (typingIdleTimerRef.current) clearTimeout(typingIdleTimerRef.current);
      if (staffTypingTimerRef.current) clearTimeout(staffTypingTimerRef.current);
    };
  }, [applyChat, markRead, patch]);

  // События сокета
  useEffect(() => {
    const offMessage = onSupportEvent('support:message', ({ chat, message }) => {
      if (!message) return;
      applyMessages(prev => upsertMessage(prev, { ...message, pending: false, failed: false }));
      if (chat) applyChat(chat);
      if (message.senderRole !== 'user') {
        if (staffTypingTimerRef.current) clearTimeout(staffTypingTimerRef.current);
        patch({ staffTyping: false });
        // Экран открыт — сразу отмечаем прочитанным, если окно активно
        if (!document.hidden) void markRead();
      }
    });
    const offUpdated = onSupportEvent('support:chat-updated', ({ chat }) => {
      if (chat) applyChat(chat);
    });
    const offRead = onSupportEvent('support:read', ev => {
      if (!ev || ev.by !== 'staff') return;
      const readAt = new Date().toISOString();
      const upTo = ev.lastMessageId ?? Number.MAX_SAFE_INTEGER;
      applyMessages(prev => prev.map(m => (m.senderRole === 'user' && m.id > 0 && m.id <= upTo && !m.readAt ? { ...m, readAt } : m)));
      if (ev.chat) applyChat(ev.chat);
    });
    const offTyping = onSupportEvent('support:typing', ev => {
      if (!ev || ev.from !== 'staff') return;
      if (staffTypingTimerRef.current) clearTimeout(staffTypingTimerRef.current);
      patch({ staffTyping: Boolean(ev.typing) });
      if (ev.typing) staffTypingTimerRef.current = setTimeout(() => patch({ staffTyping: false }), STAFF_TYPING_TTL_MS);
    });
    return () => {
      offMessage();
      offUpdated();
      offRead();
      offTyping();
    };
  }, [applyChat, applyMessages, markRead, patch]);

  // Возврат фокуса в окно — отметить прочитанным
  useEffect(() => {
    const onFocus = () => {
      if (!document.hidden) void markRead();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [markRead]);

  /** Страница истории вверх. */
  const loadMore = useCallback(async () => {
    const oldest = messagesRef.current.find(m => m.id > 0);
    if (!oldest || state.loadingMore || !state.hasMore) return;
    patch({ loadingMore: true });
    try {
      const res = await getSupportMessages(oldest.id, PAGE);
      const incoming = (res.messages || []).filter(m => !messagesRef.current.some(x => x.id === m.id));
      applyMessages(prev => sortMessages([...incoming, ...prev]));
      patch({ hasMore: Boolean(res.hasMore), loadingMore: false });
    } catch (e) {
      patch({ loadingMore: false, error: getSupportErrorMessage(e) });
    }
  }, [applyMessages, patch, state.hasMore, state.loadingMore]);

  const sendTyping = useCallback((typing: boolean) => {
    void emitSupport('support:typing', { typing });
  }, []);

  /** Пользователь печатает — троттлинг support:typing и авто-«перестал печатать». */
  const onTyping = useCallback(() => {
    const now = Date.now();
    if (now - typingLastSentRef.current > TYPING_THROTTLE_MS) {
      typingLastSentRef.current = now;
      sendTyping(true);
    }
    if (typingIdleTimerRef.current) clearTimeout(typingIdleTimerRef.current);
    typingIdleTimerRef.current = setTimeout(() => {
      typingLastSentRef.current = 0;
      sendTyping(false);
    }, TYPING_IDLE_MS);
  }, [sendTyping]);

  const deliver = useCallback(
    async (optimistic: SupportUiMessage, meta: SupportMessageMeta | null) => {
      const clientMsgId = optimistic.clientMsgId as string;
      const body = optimistic.body;
      try {
        const ack = await emitSupport<SupportSendAck>('support:send', meta ? { body, clientMsgId, meta } : { body, clientMsgId });
        if (ack) {
          if (!ack.ok) throw new Error(supportErrorText(ack.error));
          applyMessages(prev => upsertMessage(prev, { ...ack.message, clientMsgId: ack.message.clientMsgId || clientMsgId, pending: false, failed: false }));
          applyChat(ack.chat);
        } else {
          const res = await sendSupportMessage(body, clientMsgId, meta);
          applyMessages(prev => upsertMessage(prev, { ...res.message, clientMsgId: res.message.clientMsgId || clientMsgId, pending: false, failed: false }));
          applyChat(res.chat);
        }
        patch({ sending: false, error: null });
      } catch (e) {
        applyMessages(prev => prev.map(m => (m.clientMsgId === clientMsgId ? { ...m, pending: false, failed: true } : m)));
        patch({ sending: false, error: e instanceof Error && e.message ? e.message : getSupportErrorMessage(e) });
      }
    },
    [applyChat, applyMessages, patch],
  );

  /** Отправить сообщение: сразу показываем в списке, затем сокет (ack) или REST. */
  const send = useCallback(
    async (text: string, meta?: SupportMessageMeta | null) => {
      const body = text.trim();
      if (!body) return;
      if (body.length > SUPPORT_MESSAGE_MAX_LENGTH) {
        patch({ error: supportErrorText('message_too_long') });
        return;
      }
      if (typingIdleTimerRef.current) clearTimeout(typingIdleTimerRef.current);
      typingLastSentRef.current = 0;
      sendTyping(false);
      const optimistic: SupportUiMessage = {
        id: optimisticSeq--,
        chatId: chatRef.current?.id ?? 0,
        senderRole: 'user',
        senderId: null,
        senderName: userName || null,
        body,
        meta: meta || null,
        clientMsgId: createClientMsgId(),
        readAt: null,
        createdAt: new Date().toISOString(),
        pending: true,
        failed: false,
      };
      applyMessages(prev => upsertMessage(prev, optimistic));
      patch({ sending: true, error: null });
      await deliver(optimistic, meta || null);
    },
    [applyMessages, deliver, patch, sendTyping, userName],
  );

  /** Повторить неотправленное сообщение (тот же clientMsgId — сервер не создаст дубль). */
  const retry = useCallback(
    async (clientMsgId: string) => {
      const msg = messagesRef.current.find(m => m.clientMsgId === clientMsgId);
      if (!msg) return;
      applyMessages(prev => prev.map(m => (m.clientMsgId === clientMsgId ? { ...m, pending: true, failed: false } : m)));
      patch({ sending: true, error: null });
      await deliver({ ...msg, pending: true, failed: false }, msg.meta || null);
    },
    [applyMessages, deliver, patch],
  );

  const clearError = useCallback(() => patch({ error: null }), [patch]);

  return { ...state, connected: ctx.connected, send, retry, loadMore, onTyping, markRead, clearError };
}
