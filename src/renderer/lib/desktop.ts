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
