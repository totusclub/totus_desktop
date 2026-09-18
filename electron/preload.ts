import { contextBridge, ipcRenderer } from 'electron';

// Мост renderer ↔ main. Только явные методы, без доступа к Node.
const desktop = {
  getPlatform: (): Promise<NodeJS.Platform> => ipcRenderer.invoke('desktop:get-platform'),
  openExternal: (url: string): Promise<void> => ipcRenderer.invoke('desktop:open-external', url),
  setTitleBarTheme: (mode: 'light' | 'dark'): Promise<void> =>
    ipcRenderer.invoke('desktop:set-title-bar-theme', mode),
  getSystemTheme: (): Promise<'light' | 'dark'> => ipcRenderer.invoke('desktop:system-theme'),
  onSystemThemeChanged: (cb: (mode: 'light' | 'dark') => void): (() => void) => {
    const handler = (_e: unknown, mode: 'light' | 'dark') => cb(mode);
    ipcRenderer.on('desktop:system-theme-changed', handler);
    return () => ipcRenderer.removeListener('desktop:system-theme-changed', handler);
  },
  getCaptcha: (): Promise<{ url: string; partition: string; preload: string }> =>
    ipcRenderer.invoke('desktop:get-captcha'),
  // Бейдж непрочитанных уведомлений на иконке Dock (macOS) / taskbar (Windows, где поддерживается)
  setBadgeCount: (count: number): Promise<boolean> => ipcRenderer.invoke('desktop:set-badge-count', count),
  // Deep link totus://… — возврат из браузера после входа через Яндекс ID
  onDeepLink: (cb: (url: string) => void): (() => void) => {
    const handler = (_e: unknown, url: string) => cb(url);
    ipcRenderer.on('desktop:deep-link', handler);
    return () => ipcRenderer.removeListener('desktop:deep-link', handler);
  },
  takeDeepLink: (): Promise<string | null> => ipcRenderer.invoke('desktop:take-deep-link'),
};

export type DesktopApi = typeof desktop;

contextBridge.exposeInMainWorld('desktop', desktop);
