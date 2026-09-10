// Хаб уведомлений — REST calling_api_v2 (voip.totus.club, /api/notifications*, /api/push/devices).
// Все запросы с Bearer пользовательского JWT (voipFetch). Ошибки сервера переводим в русские тексты.
// Общий код с приложением: только типы и клиент, без платформенных зависимостей.
import {VOIP_BASE_URL} from '../../config/server';
import {voipFetch} from './voipAuth';

export type NotificationCategory = 'orders' | 'documents' | 'reminders' | 'support' | 'promo' | 'system';

export type NotificationType =
  | 'order_created'
  | 'payment_success'
  | 'payment_failed'
  | 'order_request_status'
  | 'order_confirmed'
  | 'order_status'
  | 'order_cancelled'
  | 'documents_ready'
  | 'trip_reminder'
  | 'support_message'
  | 'missed_call'
  | 'promo'
  | 'system'
  | (string & {});

export type NotificationRoute =
  | 'home'
  | 'order'
  | 'orders'
  | 'documents'
  | 'order_request'
  | 'support_chat'
  | 'account'
  | 'notifications'
  | 'url'
  | 'search'
  | (string & {});

/** Данные к маршруту (в payload — только id, без персональных данных). */
export type NotificationData = {
  route?: NotificationRoute;
  orderId?: string | number;
  chatId?: string | number;
  url?: string;
  notificationId?: string | number;
  campaignId?: string | number;
  ruleId?: string | number;
  [key: string]: unknown;
};

export type NotificationItem = {
  id: number;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  body: string;
  data: NotificationData | null;
  source?: string | null;
  readAt: string | null;
  openedAt: string | null;
  createdAt: string;
};

/** Событие сокета notify:new (комната u:<userId>). */
export type NotificationNewEvent = {
  id: number;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  body: string;
  data: NotificationData | null;
  createdAt: string;
};

export type NotificationBadgeEvent = {unread: number};

export type PushPlatform = 'ios' | 'android' | 'web' | 'desktop';
export type PushChannel = 'fcm' | 'webpush';

export type PushDevice = {
  id: number;
  platform: PushPlatform;
  channel: PushChannel;
  deviceId: string | null;
  deviceName: string | null;
  enabled: boolean;
  tokenTail?: string | null;
  lastSeenAt?: string | null;
  appVersion?: string | null;
};

export type NotificationPrefs = {
  orders: boolean;
  documents: boolean;
  reminders: boolean;
  support: boolean;
  promo: boolean;
  system: boolean;
};

export type NotificationCategoryInfo = {
  key: NotificationCategory;
  title: string;
  mandatory: boolean;
  enabled: boolean;
};

export type NotificationSettings = {
  prefs: NotificationPrefs;
  email: boolean;
  sound: boolean;
  categories: NotificationCategoryInfo[];
  quietHours?: {from?: string; to?: string; tz?: string} | string | null;
};

export type GetNotificationsParams = {
  before?: number | null;
  limit?: number;
  category?: NotificationCategory | null;
  unread?: boolean;
};

export type GetNotificationsResponse = {
  items: NotificationItem[];
  hasMore: boolean;
  unread: number;
};

export type UnreadResponse = {unread: number};
export type OkUnreadResponse = {ok: boolean; unread: number};

export type GetSettingsResponse = {
  settings: NotificationSettings;
  devices: PushDevice[];
};

export type UpdateSettingsPayload = {
  prefs?: Partial<NotificationPrefs>;
  email?: boolean;
  sound?: boolean;
};

export type RegisterDevicePayload = {
  platform: PushPlatform;
  channel: PushChannel;
  token?: string;
  subscription?: {endpoint: string; keys: {p256dh: string; auth: string}};
  deviceId?: string;
  deviceName?: string;
  appVersion?: string;
  locale?: string;
};

export type RegisterDeviceResponse = {ok: boolean; device: PushDevice; unread: number};

/** Названия категорий для фильтров/настроек (DESIGN.md). */
export const NOTIFICATION_CATEGORY_TITLES: Record<NotificationCategory, string> = {
  orders: 'Заказы и оплата',
  documents: 'Документы и статусы тура',
  reminders: 'Напоминания о поездке',
  support: 'Сообщения поддержки',
  promo: 'Акции и предложения',
  system: 'Важное',
};

/** Ошибка API уведомлений с кодом сервера и русским текстом. */
export class NotificationsError extends Error {
  code: string;
  status: number;
  constructor(code: string, status: number, message: string) {
    super(message);
    this.name = 'NotificationsError';
    this.code = code;
    this.status = status;
  }
}

/** Код ошибки сервера → русский текст (RULES.md). */
export function notificationsErrorText(code: string | null | undefined, status?: number): string {
  switch (code) {
    case 'notifications_not_migrated':
    case 'network':
      return 'Уведомления временно недоступны';
    case 'not_found':
      return 'Уведомление не найдено';
    case 'platform_invalid':
    case 'token_invalid':
    case 'subscription_invalid':
      return 'Не удалось зарегистрировать устройство';
    default:
      if (status === 401 || status === 403) return 'Войдите в аккаунт, чтобы видеть уведомления';
      return 'Уведомления временно недоступны';
  }
}

/** Текст ошибки для показа пользователю из любого исключения. */
export function notificationsErrorMessage(e: unknown): string {
  if (e instanceof NotificationsError) return e.message;
  return notificationsErrorText('network');
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
    throw new NotificationsError('network', 0, notificationsErrorText('network'));
  }
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const code = (data && typeof data.error === 'string' && data.error) || `http_${res.status}`;
    throw new NotificationsError(code, res.status, notificationsErrorText(code, res.status));
  }
  return data as T;
}

// ---------------------------------------------------------------------------
// Устройства (push). Desktop НЕ регистрирует устройство (нет FCM) — функции для будущего.
// ---------------------------------------------------------------------------

/** POST /api/push/devices — регистрация после входа / при обновлении токена (upsert по токену). */
export function registerDevice(payload: RegisterDevicePayload): Promise<RegisterDeviceResponse> {
  return request<RegisterDeviceResponse>('/api/push/devices', {method: 'POST', body: JSON.stringify(payload)});
}

/** DELETE /api/push/devices — при выходе ({ token } | { subscription } | { deviceId }). */
export function unregisterDevice(payload: {token?: string; deviceId?: string; subscription?: RegisterDevicePayload['subscription']}): Promise<{ok: boolean}> {
  return request<{ok: boolean}>('/api/push/devices', {method: 'DELETE', body: JSON.stringify(payload)});
}

/** GET /api/push/devices — свои устройства. */
export function getDevices(): Promise<{devices: PushDevice[]}> {
  return request<{devices: PushDevice[]}>('/api/push/devices');
}

// ---------------------------------------------------------------------------
// Центр уведомлений
// ---------------------------------------------------------------------------

/** GET /api/notifications?before=&limit=&category=&unread=1 */
export function getNotifications(params: GetNotificationsParams = {}): Promise<GetNotificationsResponse> {
  const q: string[] = [];
  if (params.before) q.push(`before=${encodeURIComponent(String(params.before))}`);
  q.push(`limit=${encodeURIComponent(String(params.limit ?? 30))}`);
  if (params.category) q.push(`category=${encodeURIComponent(params.category)}`);
  if (params.unread) q.push('unread=1');
  return request<GetNotificationsResponse>(`/api/notifications?${q.join('&')}`);
}

/** GET /api/notifications/unread → { unread } */
export function getUnread(): Promise<UnreadResponse> {
  return request<UnreadResponse>('/api/notifications/unread');
}

/** POST /api/notifications/read — { ids } | { id } | { all: true } */
export function markRead(arg: {ids: number[]} | {id: number} | {all: true}): Promise<OkUnreadResponse> {
  return request<OkUnreadResponse>('/api/notifications/read', {method: 'POST', body: JSON.stringify(arg)});
}

/** POST /api/notifications/opened — тап по пушу/элементу (статистика «открыто», помечает прочитанным). */
export function markOpened(id: number): Promise<OkUnreadResponse> {
  return request<OkUnreadResponse>('/api/notifications/opened', {method: 'POST', body: JSON.stringify({id})});
}

/** DELETE /api/notifications/:id */
export function deleteNotification(id: number): Promise<{ok: boolean; unread?: number}> {
  return request<{ok: boolean; unread?: number}>(`/api/notifications/${encodeURIComponent(String(id))}`, {method: 'DELETE'});
}

// ---------------------------------------------------------------------------
// Настройки
// ---------------------------------------------------------------------------

/** GET /api/notifications/settings → { settings, devices } */
export function getSettings(): Promise<GetSettingsResponse> {
  return request<GetSettingsResponse>('/api/notifications/settings');
}

/** PUT /api/notifications/settings — { prefs, email, sound }; обязательные категории всегда true. */
export function updateSettings(payload: UpdateSettingsPayload): Promise<GetSettingsResponse> {
  return request<GetSettingsResponse>('/api/notifications/settings', {method: 'PUT', body: JSON.stringify(payload)});
}
