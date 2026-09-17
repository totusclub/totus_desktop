/**
 * Вход через Яндекс ID (docs/YANDEX_AUTH_API.md в totus_API).
 *
 * Код на токен меняет только сервер. Десктоп открывает /start во внешнем браузере
 * (shell.openExternal), получает одноразовый ticket по deep link totus://auth/yandex
 * и меняет его на наши обычные токены.
 */
import {instance, get, post} from '../axios';

export interface IYandexExchangeResult {
  auth?: boolean;
  authToken?: string;
  accessToken?: string;
  refreshToken?: string;
  user?: Record<string, any> | null;
  isNew?: boolean;
  needsPhone?: boolean;
}

function apiOrigin(): string {
  return String(instance.defaults.baseURL || 'https://api.totus.club').replace(/\/+$/, '');
}

/** Адрес для внешнего браузера: сервер сам редиректит на oauth.yandex.ru. */
export function yandexStartUrl(): string {
  return `${apiOrigin()}/api/auth/yandex/start?client=desktop&return=%2F`;
}

export async function yandexExchange(ticket: string): Promise<IYandexExchangeResult> {
  const response = await post<IYandexExchangeResult>('/api/auth/yandex/exchange', {ticket});
  return response.data;
}

/** Шаг «Почти готово»: телефон у нового пользователя (Яндекс его не отдаёт). */
export async function updateProfilePhone(phone: string) {
  const response = await instance.patch('/api/auth/me/phone', {phone});
  return response.data;
}

/**
 * Раздел включён? Пока на сервере нет настроек, /status отвечает 503 — кнопку не показываем.
 * Когда всё готово — 200 (есть токен) или 401 (гость).
 */
let enabledCache: boolean | null = null;

export async function isYandexAuthEnabled(): Promise<boolean> {
  if (enabledCache !== null) return enabledCache;
  try {
    await get('/api/auth/yandex/status');
    enabledCache = true;
  } catch (error: any) {
    const status = error?.response?.status;
    enabledCache = status === 401 || status === 403;
  }
  return enabledCache;
}

/** Разбор deep link: totus://auth/yandex?ticket=… или ?error=… */
export function parseYandexDeepLink(url: string): {ticket?: string; error?: string} | null {
  if (!url || url.indexOf('auth/yandex') === -1) return null;
  const queryIndex = url.indexOf('?');
  if (queryIndex === -1) return {};
  const result: {ticket?: string; error?: string} = {};
  for (const pair of url.slice(queryIndex + 1).split('&')) {
    const [rawKey, rawValue = ''] = pair.split('=');
    const key = decodeURIComponent(rawKey);
    const value = decodeURIComponent(rawValue.replace(/\+/g, ' '));
    if (key === 'ticket') result.ticket = value;
    if (key === 'error') result.error = value;
  }
  return result;
}
