// Типизированный доступ к preload-мосту (electron/preload.ts). Вне Electron (vitest) — заглушки.
export type ThemeName = 'light' | 'dark';

export type DesktopApi = {
  getPlatform: () => Promise<string>;
  openExternal: (url: string) => Promise<void>;
  setTitleBarTheme: (mode: ThemeName) => Promise<void>;
  getSystemTheme: () => Promise<ThemeName>;
  onSystemThemeChanged: (cb: (mode: ThemeName) => void) => () => void;
  getCaptcha: () => Promise<{ url: string; partition: string; preload: string }>;
  setBadgeCount: (count: number) => Promise<boolean>;
  /** Deep link totus://… — возврат из браузера после входа через Яндекс ID. */
  onDeepLink?: (cb: (url: string) => void) => () => void;
  /** Ссылка, пришедшая до того, как renderer успел подписаться (холодный старт). */
  takeDeepLink?: () => Promise<string | null>;
};

declare global {
  interface Window {
    desktop?: DesktopApi;
  }
}

const fallback: DesktopApi = {
  getPlatform: async () => (navigator.platform.toLowerCase().includes('mac') ? 'darwin' : 'win32'),
  openExternal: async url => {
    window.open(url, '_blank', 'noopener');
  },
  setTitleBarTheme: async () => undefined,
  getSystemTheme: async () =>
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
  onSystemThemeChanged: () => () => undefined,
  getCaptcha: async () => ({ url: '', partition: '', preload: '' }),
  setBadgeCount: async () => false,
  onDeepLink: () => () => undefined,
  takeDeepLink: async () => null,
};

export const desktop: DesktopApi = (typeof window !== 'undefined' && window.desktop) || fallback;

/** Открыть ссылку в системном браузере (оплата СБП, карта, документы). */
export function openExternal(url: string): void {
  void desktop.openExternal(url);
}

/** Бейдж непрочитанных на иконке приложения (Dock/taskbar); старый preload без метода — молча пропускаем. */
export function setBadgeCount(count: number): void {
  try {
    const fn = desktop.setBadgeCount;
    if (typeof fn === 'function') void fn(count).catch(() => undefined);
  } catch {
    /* ignore */
  }
}

/** Подписка на deep link; старый preload без метода — пустая отписка. */
export function onDeepLink(cb: (url: string) => void): () => void {
  const fn = desktop.onDeepLink;
  if (typeof fn !== 'function') return () => undefined;
  return fn(cb);
}

/** Забрать ссылку, пришедшую до запуска renderer'а. */
export async function takeDeepLink(): Promise<string | null> {
  const fn = desktop.takeDeepLink;
  if (typeof fn !== 'function') return null;
  try {
    return await fn();
  } catch {
    return null;
  }
}
