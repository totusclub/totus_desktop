import { app, BrowserWindow, ipcMain, nativeTheme, shell, session, protocol, net, systemPreferences } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCaptchaHtml, CAPTCHA_PAGE_URL, CAPTCHA_PARTITION } from './captcha';

// Totus Club desktop — главный процесс.
// Окно 1440×900 (макет Figma «DESKTOP UI»), macOS: скрытый title bar с «светофором»,
// Windows: стандартные кнопки окна поверх нашего title bar (titleBarOverlay).

const isMac = process.platform === 'darwin';
const DEV_URL = process.env.VITE_DEV_SERVER_URL;

// Deep link: возврат из браузера после входа через Яндекс ID (totus://auth/yandex?ticket=…)
const DEEP_LINK_SCHEME = 'totus';
const DEEP_LINK_PREFIX = `${DEEP_LINK_SCHEME}://`;
let pendingDeepLink: string | null = null;

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

/** Пришёл totus://… — поднимаем окно и отдаём ссылку renderer'у (или придерживаем до старта). */
function handleDeepLink(url?: string | null): void {
  if (!url || !url.startsWith(DEEP_LINK_PREFIX)) return;
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
    mainWindow.webContents.send('desktop:deep-link', url);
  } else {
    pendingDeepLink = url;
  }
}

function deepLinkFromArgv(argv: string[]): string | undefined {
  return argv.find(arg => typeof arg === 'string' && arg.startsWith(DEEP_LINK_PREFIX));
}

function registerProtocolClient(): void {
  // В dev запуск идёт через electron + путь к проекту — схему нужно регистрировать с этими аргументами.
  if (process.defaultApp && process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(DEEP_LINK_SCHEME, process.execPath, [path.resolve(process.argv[1])]);
    return;
  }
  app.setAsDefaultProtocolClient(DEEP_LINK_SCHEME);
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

/** preload webview допустим только наш captchaPreload.js (путь или file:-URL). Пустой preload тоже допустим. */
function isCaptchaPreload(preload: unknown): boolean {
  if (!preload) return true;
  let given = String(preload);
  try {
    if (given.startsWith('file:')) given = fileURLToPath(given);
  } catch {
    return false;
  }
  return path.resolve(given) === path.resolve(path.join(__dirname, 'captchaPreload.js'));
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

  // Единственный <webview> в приложении — капча (SmartCaptcha.tsx: src/partition/preload из desktop:get-captcha).
  // Любой другой webview не создаётся; внутри капчи Node и доступ к контексту хоста всегда выключены
  // (SECURITY_AUDIT_2026-11_RU.md, M9).
  mainWindow.webContents.on('will-attach-webview', (event, webPreferences, params) => {
    const src = String(params.src || '').split('#')[0];
    const preloadOk = isCaptchaPreload(webPreferences.preload ?? (webPreferences as { preloadURL?: string }).preloadURL);
    if (src !== CAPTCHA_PAGE_URL || params.partition !== CAPTCHA_PARTITION || !preloadOk) {
      event.preventDefault();
      return;
    }
    delete (webPreferences as { preloadURL?: string }).preloadURL;
    webPreferences.nodeIntegration = false;
    webPreferences.nodeIntegrationInSubFrames = false;
    webPreferences.contextIsolation = true;
    webPreferences.webSecurity = true;
    webPreferences.allowRunningInsecureContent = false;
    webPreferences.experimentalFeatures = false;
  });

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
// Deep link, пришедший до того, как renderer успел подписаться (холодный старт по ссылке).
ipcMain.handle('desktop:take-deep-link', () => {
  const url = pendingDeepLink;
  pendingDeepLink = null;
  return url;
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

// Второй запуск (Windows/Linux открывают totus:// новым процессом) — передаём ссылку первому и выходим.
const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    handleDeepLink(deepLinkFromArgv(argv));
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  // macOS отдаёт ссылку событием open-url (в том числе до whenReady).
  app.on('open-url', (event, url) => {
    event.preventDefault();
    handleDeepLink(url);
  });

  app.whenReady().then(() => {
    registerProtocolClient();
    registerCaptchaProtocol();
    registerPermissionHandlers();
    createWindow();
    // Холодный старт по ссылке на Windows/Linux: ссылка приходит аргументом командной строки.
    const initialLink = deepLinkFromArgv(process.argv);
    if (initialLink) pendingDeepLink = initialLink;

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on('window-all-closed', () => {
  if (!isMac) app.quit();
});
