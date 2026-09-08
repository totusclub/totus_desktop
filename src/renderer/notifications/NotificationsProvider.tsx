import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '@shared/modules/store';
import {
  getUnread,
  markOpened,
  type NotificationData,
  type NotificationNewEvent,
} from '@shared/modules/api/notifications';
import { ROUTES } from '../app/navigation';
import { Modal } from '../components/Modal';
import { openExternal, setBadgeCount } from '../lib/desktop';
import { onSupportEvent } from '../support/supportSocket';
import '../screens/notifications/notifications.css';

/**
 * Центр уведомлений (аналог SupportChatProvider): после входа — GET /api/notifications/unread,
 * события сокета calling_api_v2 `notify:new` / `notify:badge` (тот же сокет, что у чата поддержки),
 * системное уведомление при неактивном окне, бейдж на иконке приложения (Dock/taskbar),
 * локальные настройки desktop-каналов («Уведомления в приложении», «Звук») и диалог
 * «Включить уведомления?» один раз после входа.
 *
 * Устройство в хабе НЕ регистрируем: у desktop нет FCM/Web Push — уведомления приходят по сокету.
 */

export const NOTIFY_ROUTE = '/account/notifications';
export const NOTIFY_SETTINGS_ROUTE = '/account/notifications/settings';

const LS_DESKTOP_SETTINGS = 'totus:notify:desktop';
const LS_PROMPTED = 'totus:notify:prompted';

export type DesktopNotifySettings = { inApp: boolean; sound: boolean };
const DEFAULT_DESKTOP_SETTINGS: DesktopNotifySettings = { inApp: true, sound: true };

function loadDesktopSettings(): DesktopNotifySettings {
  try {
    const raw = localStorage.getItem(LS_DESKTOP_SETTINGS);
    if (!raw) return DEFAULT_DESKTOP_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<DesktopNotifySettings>;
    return {
      inApp: typeof parsed.inApp === 'boolean' ? parsed.inApp : DEFAULT_DESKTOP_SETTINGS.inApp,
      sound: typeof parsed.sound === 'boolean' ? parsed.sound : DEFAULT_DESKTOP_SETTINGS.sound,
    };
  } catch {
    return DEFAULT_DESKTOP_SETTINGS;
  }
}

function saveDesktopSettings(s: DesktopNotifySettings): void {
  try {
    localStorage.setItem(LS_DESKTOP_SETTINGS, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

function wasPrompted(): boolean {
  try {
    return localStorage.getItem(LS_PROMPTED) === '1';
  } catch {
    return true;
  }
}

function setPrompted(): void {
  try {
    localStorage.setItem(LS_PROMPTED, '1');
  } catch {
    /* ignore */
  }
}

export type NotificationPermission = 'default' | 'granted' | 'denied' | 'unsupported';

export function getNotificationPermission(): NotificationPermission {
  try {
    if (typeof Notification === 'undefined') return 'unsupported';
    return Notification.permission as NotificationPermission;
  } catch {
    return 'unsupported';
  }
}

/** Куда ведёт уведомление по data.route (в state — только id, как ждёт OrderDetailsScreen: { orderId }). */
export type NotificationTarget = { path: string; state?: Record<string, unknown> } | { external: string };

export function resolveNotificationTarget(data: NotificationData | null | undefined): NotificationTarget {
  const route = data?.route;
  const orderId = data?.orderId;
  switch (route) {
    case 'order':
    case 'documents':
    case 'order_request':
      return orderId ? { path: ROUTES.orderDetails, state: { orderId } } : { path: ROUTES.orders };
    case 'orders':
      return { path: ROUTES.orders };
    case 'support_chat':
      return { path: ROUTES.supportChat };
    case 'account':
      return { path: ROUTES.account };
    case 'notifications':
      return { path: NOTIFY_ROUTE };
    case 'search':
      return { path: ROUTES.searchResult };
    case 'url': {
      const url = typeof data?.url === 'string' ? data.url : '';
      if (/^https?:\/\//i.test(url)) return { external: url };
      return { path: ROUTES.home };
    }
    case 'home':
    default:
      return { path: ROUTES.home };
  }
}

function isWindowInactive(): boolean {
  try {
    return document.hidden || !document.hasFocus();
  } catch {
    return false;
  }
}

// Короткий сигнал для сообщений поддержки (WebAudio, один тон 0.18 с — как рингтон в VoipClient, но без файла).
let beepCtx: AudioContext | null = null;
function playSupportBeep(): void {
  try {
    if (typeof AudioContext === 'undefined') return;
    if (!beepCtx) beepCtx = new AudioContext();
    const ctx = beepCtx;
    if (ctx.state === 'suspended') void ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.value = 0.0001;
    osc.connect(gain);
    gain.connect(ctx.destination);
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.2, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    osc.start(t);
    osc.stop(t + 0.2);
  } catch (e) {
    console.warn('[notify] beep failed', e);
  }
}

export type NotificationsContextValue = {
  unread: number;
  /** Обновить счётчик из ответа REST (экран вызывает после read/opened). */
  setUnread: (n: number) => void;
  /** Растёт при каждом notify:new — экран списка по нему перезагружает первую страницу. */
  incomingSeq: number;
  lastIncoming: NotificationNewEvent | null;
  desktopSettings: DesktopNotifySettings;
  setDesktopSettings: (patch: Partial<DesktopNotifySettings>) => void;
  permission: NotificationPermission;
  /** Запросить системное разрешение (кнопка «Включить» в диалоге / настройках / пустом состоянии). */
  requestPermission: () => Promise<NotificationPermission>;
  /** Перейти по уведомлению (маршрут по data.route) и отметить «открыто». */
  openNotification: (id: number | null | undefined, data: NotificationData | null | undefined) => void;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function useNotificationsContext(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotificationsContext: NotificationsProvider не смонтирован');
  return ctx;
}

/** Безопасный вариант для компонентов вне провайдера (рейл, аккаунт). */
export function useNotificationsUnread(): number {
  const ctx = useContext(NotificationsContext);
  return ctx?.unread ?? 0;
}

const BellIcon: React.FC<{ size?: number }> = ({ size = 28 }) => (
  <svg viewBox="0 0 24 24" fill="none" width={size} height={size} style={{ display: 'block' }} aria-hidden="true">
    <path
      d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Z"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
    <path d="M10 20a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);

const CheckIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg viewBox="0 0 24 24" fill="none" width={size} height={size} style={{ display: 'block' }} aria-hidden="true">
    <path d="m5 12.5 4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const PROMPT_ITEMS = ['Оплата и статусы заказа', 'Готовность документов', 'Напоминания о вылете', 'Ответы поддержки'];

/** Диалог «Включить уведомления?» (DESIGN.md, desktop 480). */
const PermissionDialog: React.FC<{ open: boolean; onEnable: () => void; onLater: () => void }> = ({ open, onEnable, onLater }) => (
  <Modal open={open} onClose={onLater} width={480}>
    <div className="notify-prompt">
      <div className="notify-prompt__icon">
        <BellIcon size={30} />
      </div>
      <div className="notify-prompt__title">Включить уведомления?</div>
      <div className="notify-prompt__text">
        Сообщим, когда пройдёт оплата и будут готовы документы, напомним о вылете и ответим в чате поддержки. Акции — только по
        вашему желанию.
      </div>
      <ul className="notify-prompt__list">
        {PROMPT_ITEMS.map(t => (
          <li key={t} className="notify-prompt__item">
            <span className="notify-prompt__check">
              <CheckIcon size={14} />
            </span>
            {t}
          </li>
        ))}
      </ul>
      <div className="notify-prompt__actions">
        <button type="button" className="btn btn--block" onClick={onEnable}>
          Включить
        </button>
        <button type="button" className="btn btn--ghost btn--block" onClick={onLater}>
          Не сейчас
        </button>
      </div>
    </div>
  </Modal>
);

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { accessToken, fullAuth, userId } = useSelector((s: RootState) => s.auth);
  const navigate = useNavigate();
  const [unread, setUnreadState] = useState(0);
  const [incomingSeq, setIncomingSeq] = useState(0);
  const [lastIncoming, setLastIncoming] = useState<NotificationNewEvent | null>(null);
  const [desktopSettings, setDesktopSettingsState] = useState<DesktopNotifySettings>(loadDesktopSettings);
  const [permission, setPermission] = useState<NotificationPermission>(getNotificationPermission);
  const [promptOpen, setPromptOpen] = useState(false);
  const settingsRef = useRef(desktopSettings);
  settingsRef.current = desktopSettings;

  const isLoggedIn = Boolean(fullAuth && accessToken && userId);

  const setUnread = useCallback((n: number) => setUnreadState(Math.max(0, Number(n) || 0)), []);

  const setDesktopSettings = useCallback((patch: Partial<DesktopNotifySettings>) => {
    setDesktopSettingsState(prev => {
      const next = { ...prev, ...patch };
      saveDesktopSettings(next);
      return next;
    });
  }, []);

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    setPrompted();
    try {
      if (typeof Notification === 'undefined') return 'unsupported';
      const p = (await Notification.requestPermission()) as NotificationPermission;
      setPermission(p);
      return p;
    } catch {
      const p = getNotificationPermission();
      setPermission(p);
      return p;
    }
  }, []);

  const openNotification = useCallback(
    (id: number | null | undefined, data: NotificationData | null | undefined) => {
      const target = resolveNotificationTarget(data);
      if ('external' in target) openExternal(target.external);
      else navigate(target.path, { state: target.state ?? null });
      if (id) {
        markOpened(Number(id))
          .then(res => {
            if (res && typeof res.unread === 'number') setUnreadState(Math.max(0, res.unread));
          })
          .catch(e => console.warn('[notify] markOpened failed', e?.message || e));
      }
    },
    [navigate],
  );

  // Первичный счётчик после входа; сброс при логауте.
  useEffect(() => {
    if (!isLoggedIn) {
      setUnreadState(0);
      setLastIncoming(null);
      return;
    }
    let cancelled = false;
    getUnread()
      .then(res => {
        if (!cancelled && res && typeof res.unread === 'number') setUnreadState(Math.max(0, res.unread));
      })
      .catch(e => console.warn('[notify] не удалось получить непрочитанные', e?.message || e));
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, userId]);

  // Диалог «Включить уведомления?» — один раз после входа, если разрешение ещё не спрашивали.
  useEffect(() => {
    if (!isLoggedIn) return;
    if (getNotificationPermission() !== 'default' || wasPrompted()) return;
    const t = setTimeout(() => setPromptOpen(true), 1500);
    return () => clearTimeout(t);
  }, [isLoggedIn]);

  // События сокета (сокет держит SupportChatProvider — тот же namespace calling_api_v2).
  useEffect(() => {
    if (!isLoggedIn) return;
    const offBadge = onSupportEvent('notify:badge', ev => {
      if (ev && typeof ev.unread === 'number') setUnreadState(Math.max(0, ev.unread));
    });
    const offNew = onSupportEvent('notify:new', ev => {
      if (!ev || !ev.id) return;
      setUnreadState(n => n + 1);
      setLastIncoming(ev);
      setIncomingSeq(s => s + 1);
      const { inApp, sound } = settingsRef.current;
      if (sound && ev.type === 'support_message') playSupportBeep();
      // Системный баннер — только при неактивном окне и включённом канале «Уведомления в приложении».
      // Для support_message баннер уже показывает SupportChatProvider (support:message) — не дублируем.
      if (!inApp || ev.type === 'support_message' || !isWindowInactive()) return;
      try {
        if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
        const n = new Notification(ev.title || 'Totus Club', {
          body: ev.body || '',
          tag: `totus-notify-${ev.id}`,
        });
        n.onclick = () => {
          try {
            window.focus();
          } catch {
            /* ignore */
          }
          openNotification(ev.id, ev.data);
          n.close();
        };
      } catch (e) {
        console.warn('[notify] system notification failed', e);
      }
    });
    return () => {
      offBadge();
      offNew();
    };
  }, [isLoggedIn, openNotification]);

  // Бейдж на иконке приложения (Dock / taskbar).
  useEffect(() => {
    setBadgeCount(isLoggedIn ? unread : 0);
  }, [isLoggedIn, unread]);

  // Разрешение могли поменять в системных настройках — перечитываем при возврате фокуса.
  useEffect(() => {
    const onFocus = () => setPermission(getNotificationPermission());
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const value = useMemo<NotificationsContextValue>(
    () => ({
      unread,
      setUnread,
      incomingSeq,
      lastIncoming,
      desktopSettings,
      setDesktopSettings,
      permission,
      requestPermission,
      openNotification,
    }),
    [unread, setUnread, incomingSeq, lastIncoming, desktopSettings, setDesktopSettings, permission, requestPermission, openNotification],
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
      <PermissionDialog
        open={promptOpen}
        onEnable={() => {
          setPromptOpen(false);
          void requestPermission();
        }}
        onLater={() => {
          setPromptOpen(false);
          setPrompted();
        }}
      />
    </NotificationsContext.Provider>
  );
};

export default NotificationsProvider;
