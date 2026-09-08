// Чат с поддержкой — REST calling_api_v2 (voip.totus.club, /api/support/chat*).
// Все запросы с Bearer пользовательского JWT (voipFetch). Ошибки сервера переводим в русские тексты.
import {VOIP_BASE_URL} from '../../config/server';
import {voipFetch} from './voipAuth';

export type SupportChatStatus = 'open' | 'pending' | 'closed';
export type SupportSenderRole = 'user' | 'staff' | 'agent' | 'system';

export type SupportChatUser = {
  id: number | string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  loyaltyId?: string | null;
  online?: boolean;
};

export type SupportChat = {
  id: number;
  userId: number | string;
  status: SupportChatStatus;
  assignedId: number | string | null;
  assignedRole: string | null;
  assignedName: string | null;
  subject: string | null;
  orderId: number | string | null;
  lastMessageId: number | null;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  userUnread: number;
  staffUnread: number;
  createdAt: string;
  updatedAt: string;
  user?: SupportChatUser;
};

export type SupportMessageMeta = {
  orderId?: number | string | null;
  orderTitle?: string | null;
  orderSubtitle?: string | null;
  topic?: string | null;
};

export type SupportMessage = {
  id: number;
  chatId: number;
  senderRole: SupportSenderRole;
  senderId: number | string | null;
  senderName: string | null;
  body: string;
  meta: SupportMessageMeta | null;
  clientMsgId: string | null;
  readAt: string | null;
  createdAt: string;
};

export type SupportHours = {
  open?: string;
  close?: string;
  tz?: string;
  text?: string;
};

export type GetSupportChatResponse = {
  chat: SupportChat;
  messages: SupportMessage[];
  hasMore: boolean;
  hours?: SupportHours | null;
};

export type GetSupportMessagesResponse = {
  messages: SupportMessage[];
  hasMore: boolean;
};

export type SendSupportMessageResponse = {
  ok: boolean;
  chat: SupportChat;
  message: SupportMessage;
  duplicate?: boolean;
};

export type MarkSupportReadResponse = {
  ok: boolean;
  chat: SupportChat;
};

export const SUPPORT_MESSAGE_MAX_LENGTH = 4000;

/** Ошибка API чата с кодом сервера и русским текстом. */
export class SupportChatError extends Error {
  code: string;
  status: number;
  constructor(code: string, status: number, message: string) {
    super(message);
    this.name = 'SupportChatError';
    this.code = code;
    this.status = status;
  }
}

/** Код ошибки сервера → русский текст (RULES.md). */
export function supportErrorText(code: string | null | undefined, status?: number): string {
  switch (code) {
    case 'rate_limited':
      return 'Слишком много сообщений, подождите минуту';
    case 'message_too_long':
      return `Сообщение слишком длинное (до ${SUPPORT_MESSAGE_MAX_LENGTH} символов)`;
    case 'body_required':
      return 'Введите текст сообщения';
    case 'support_chat_not_migrated':
    case 'network':
      return 'Чат временно недоступен';
    case 'chat_not_found':
      return 'Диалог не найден';
    default:
      if (status === 401 || status === 403) return 'Войдите в аккаунт, чтобы написать в поддержку';
      return 'Чат временно недоступен';
  }
}

/** Текст ошибки для показа пользователю из любого исключения. */
export function getSupportErrorMessage(e: unknown): string {
  if (e instanceof SupportChatError) return e.message;
  return supportErrorText('network');
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await voipFetch(`${VOIP_BASE_URL}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init.body ? {'Content-Type': 'application/json'} : {}),
        ...((init.headers as Record<string, string> | undefined) || {}),
      },
    });
  } catch (e) {
    throw new SupportChatError('network', 0, supportErrorText('network'));
  }
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const code = (data && typeof data.error === 'string' && data.error) || `http_${res.status}`;
    throw new SupportChatError(code, res.status, supportErrorText(code, res.status));
  }
  return data as T;
}

/** GET /api/support/chat — диалог пользователя (создаётся при первом обращении), последние сообщения, часы работы. */
export function getSupportChat(limit = 50): Promise<GetSupportChatResponse> {
  return request<GetSupportChatResponse>(`/api/support/chat?limit=${encodeURIComponent(String(limit))}`);
}

/** GET /api/support/chat/messages?before=&limit= — страница истории вверх. */
export function getSupportMessages(before: number, limit = 50): Promise<GetSupportMessagesResponse> {
  const q = `before=${encodeURIComponent(String(before))}&limit=${encodeURIComponent(String(limit))}`;
  return request<GetSupportMessagesResponse>(`/api/support/chat/messages?${q}`);
}

/** POST /api/support/chat/messages — отправить сообщение (повтор clientMsgId → то же сообщение). */
export function sendSupportMessage(body: string, clientMsgId?: string, meta?: SupportMessageMeta | null): Promise<SendSupportMessageResponse> {
  const payload: Record<string, unknown> = {body};
  if (clientMsgId) payload.clientMsgId = clientMsgId;
  if (meta) payload.meta = meta;
  return request<SendSupportMessageResponse>('/api/support/chat/messages', {method: 'POST', body: JSON.stringify(payload)});
}

/** POST /api/support/chat/read — отметить прочитанным (обнуляет userUnread). */
export function markSupportRead(lastMessageId?: number | null): Promise<MarkSupportReadResponse> {
  const payload: Record<string, unknown> = {};
  if (lastMessageId) payload.lastMessageId = lastMessageId;
  return request<MarkSupportReadResponse>('/api/support/chat/read', {method: 'POST', body: JSON.stringify(payload)});
}

/** Идентификатор сообщения на клиенте (идемпотентная отправка, оптимистичный рендер). */
export function createClientMsgId(): string {
  const c = (globalThis as any).crypto as Crypto | undefined;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 10)}`;
}
