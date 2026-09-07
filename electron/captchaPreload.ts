import { contextBridge, ipcRenderer } from 'electron';

// Preload для <webview> с SmartCaptcha: страница вызывает window.desktopCaptchaPost(type, payload),
// хост получает событие 'ipc-message' с channel 'captcha'.
contextBridge.exposeInMainWorld('desktopCaptchaPost', (type: string, payload: Record<string, unknown>) => {
  ipcRenderer.sendToHost('captcha', { type, ...(payload || {}) });
});
