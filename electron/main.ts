import { app, BrowserWindow, ipcMain, nativeTheme, shell, session, protocol, net, systemPreferences } from 'electron';
import path from 'node:path';
import { buildCaptchaHtml, CAPTCHA_PAGE_URL, CAPTCHA_PARTITION } from './captcha';

// Totus Club desktop — главный процесс.
// Окно 1440×900 (макет Figma «DESKTOP UI»), macOS: скрытый title bar с «светофором»,
// Windows: стандартные кнопки окна поверх нашего title bar (titleBarOverlay).

const isMac = process.platform === 'darwin';
const DEV_URL = process.env.VITE_DEV_SERVER_URL;

type TitleBarTheme = { background: string; symbol: string };
const TITLE_BAR: Record<'light' | 'dark', TitleBarTheme> = {
  light: { background: '#FFFFFF', symbol: '#1F1F1F' },
  dark: { background: '#000000', symbol: '#FFFFFF' },
};

let mainWindow: BrowserWindow | null = null;

// Внешние ссылки: только https и tel/mailto, остальное игнорируем.
function openExternalSafe(url: string): void {
  if (/^(https:|mailto:|tel:)/i.test(url)) {
    void shell.openExternal(url);
  }
}

// SmartCaptcha должна открываться с origin https://totus.club (как в приложении: WebView с baseUrl).
// Для этого в отдельной сессии перехватываем ОДИН url и отдаём HTML с виджетом, всё остальное — в сеть.
function registerCaptchaProtocol(): void {
  const captchaSession = session.fromPartition(CAPTCHA_PARTITION);
  captchaSession.protocol.handle('https', request => {
    if (request.url.split('#')[0] === CAPTCHA_PAGE_URL) {
      return new Response(buildCaptchaHtml(), {
        headers: { 'content-type': 'text/html; charset=utf-8' },
      });
    }
    return net.fetch(request, { bypassCustomProtocolHandlers: true });
  });
}

function createWindow(): void {
  const theme: 'light' | 'dark' = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    backgroundColor: TITLE_BAR[theme].background,
    titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
    trafficLightPosition: isMac ? { x: 20, y: 13 } : undefined,
    titleBarOverlay: isMac
      ? undefined
      : { color: TITLE_BAR[theme].background, symbolColor: TITLE_BAR[theme].symbol, height: 38 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webviewTag: true,
      spellcheck: true,
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow?.show());

  // Любые window.open / target=_blank → системный браузер.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    openExternalSafe(url);
    return { action: 'deny' };
  });
  // Навигация основного окна за пределы приложения запрещена.
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const allowed = DEV_URL ? url.startsWith(DEV_URL) : url.startsWith('file://');
    if (!allowed) {
      event.preventDefault();
      openExternalSafe(url);
    }
  });

  if (DEV_URL) {
    void mainWindow.loadURL(DEV_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    void mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC: renderer → main
ipcMain.handle('desktop:get-platform', () => process.platform);
ipcMain.handle('desktop:open-external', (_e, url: string) => {
  openExternalSafe(String(url));
});
ipcMain.handle('desktop:set-title-bar-theme', (_e, mode: 'light' | 'dark') => {
  const t = TITLE_BAR[mode === 'dark' ? 'dark' : 'light'];
  mainWindow?.setBackgroundColor(t.background);
  if (!isMac && mainWindow && 'setTitleBarOverlay' in mainWindow) {
    try {
      (mainWindow as any).setTitleBarOverlay({ color: t.background, symbolColor: t.symbol, height: 38 });
    } catch {
      /* старые версии Electron */
    }
  }
});
ipcMain.handle('desktop:get-captcha', () => ({
  url: CAPTCHA_PAGE_URL,
  partition: CAPTCHA_PARTITION,
  preload: `file://${path.join(__dirname, 'captchaPreload.js')}`,
}));
ipcMain.handle('desktop:system-theme', () => (nativeTheme.shouldUseDarkColors ? 'dark' : 'light'));
// Бейдж непрочитанных уведомлений (Dock на macOS; на Windows setBadgeCount возвращает false — игнорируем).
ipcMain.handle('desktop:set-badge-count', (_e, n: unknown) => {
  const count = Math.max(0, Math.floor(Number(n) || 0));
  try {
    return app.setBadgeCount(count);
  } catch {
    return false;
  }
});

nativeTheme.on('updated', () => {
  mainWindow?.webContents.send('desktop:system-theme-changed', nativeTheme.shouldUseDarkColors ? 'dark' : 'light');
});

protocol.registerSchemesAsPrivileged([]);

// Микрофон для звонков в поддержку (WebRTC): разрешаем только media-audio, остальные запросы — запрет.
function registerPermissionHandlers(): void {
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback, details) => {
    if (permission === 'media') {
      const types = (details as { mediaTypes?: string[] }).mediaTypes;
      callback(!types || types.every(t => t === 'audio'));
      return;
    }
    callback(permission === 'notifications');
  });
  if (isMac) {
    // Системный запрос доступа к микрофону (NSMicrophoneUsageDescription в Info.plist) — без него
    // getUserMedia в собранном приложении молча падает.
    systemPreferences.askForMediaAccess('microphone').catch(() => undefined);
  }
}

app.whenReady().then(() => {
  registerCaptchaProtocol();
  registerPermissionHandlers();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (!isMac) app.quit();
});
