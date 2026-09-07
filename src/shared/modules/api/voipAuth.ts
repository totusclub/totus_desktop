// JWT для voip.totus.club (desktop-версия). Тот же токен, что уходит на api.totus.club.
// Источник — redux store (auth.accessToken); без AsyncStorage/CallKeep.
import {VOIP_BASE_URL} from '../../config/server';

let currentAccessToken: string | null = null;
let tokenGetter: (() => string | null) | null = null;

export function setVoipAccessToken(token: string | null | undefined): void {
  currentAccessToken = token || null;
}

/** Ленивая регистрация источника токена (store), чтобы не создавать цикл импортов. */
export function setVoipTokenGetter(getter: () => string | null): void {
  tokenGetter = getter;
}

export async function getVoipAccessToken(): Promise<string | null> {
  if (currentAccessToken) return currentAccessToken;
  const fromGetter = tokenGetter ? tokenGetter() : null;
  if (fromGetter) currentAccessToken = fromGetter;
  return fromGetter;
}

function isVoipUrl(url: string): boolean {
  return url.startsWith(VOIP_BASE_URL);
}

/** fetch() с Bearer-токеном для voip.totus.club. Сигнатура совпадает с fetch. */
export async function voipFetch(url: string, init: RequestInit = {}): Promise<Response> {
  if (!isVoipUrl(url)) return fetch(url, init);
  const token = await getVoipAccessToken();
  const headers: Record<string, string> = {
    ...((init.headers as Record<string, string> | undefined) || {}),
  };
  if (token && !headers.Authorization) headers.Authorization = `Bearer ${token}`;
  return fetch(url, {...init, headers});
}

/** Опция `auth` для socket.io-client: функция вызывается при каждом (ре)коннекте. */
export function voipSocketAuth(cb: (data: Record<string, unknown>) => void): void {
  getVoipAccessToken()
    .then(token => cb(token ? {token} : {}))
    .catch(() => cb({}));
}
