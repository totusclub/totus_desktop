import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { jwtDecode } from 'jwt-decode';
import type { RootState } from '@shared/modules/store';
import {
  getSettings,
  NOTIFICATION_CATEGORY_TITLES,
  notificationsErrorMessage,
  updateSettings,
  type NotificationCategory,
  type NotificationPrefs,
  type NotificationSettings,
  type PushDevice,
} from '@shared/modules/api/notifications';
import { PageHeader } from '../../shell/PageHeader';
import { useAppNavigation } from '../../app/navigation';
import { desktop } from '../../lib/desktop';
import { useNotificationsContext } from '../../notifications/NotificationsProvider';
import { BellIcon, CheckIcon } from './notificationsUi';
import './notifications.css';

// Экран «Настройки уведомлений» (DESIGN.md, desktop): подзаголовок «Что и куда присылать», две колонки —
// слева «ЧТО ПРИСЫЛАТЬ» (категории, обязательные disabled) + пояснение; справа «КАНАЛЫ»
// («Уведомления в приложении», «Звук», «Электронная почта») и «Ваши устройства».
// Переключатель — глобальный .toggle (как тема в AccountScreen).

type CategoryRow = { key: NotificationCategory; title: string; subtitle: string; mandatory: boolean };
const CATEGORY_ROWS: CategoryRow[] = [
  { key: 'orders', title: 'Заказы и оплата', subtitle: 'Создание, оплата, отмена', mandatory: true },
  { key: 'documents', title: 'Документы и статусы тура', subtitle: 'Подтверждение, ваучеры, билеты', mandatory: true },
  { key: 'reminders', title: 'Напоминания о поездке', subtitle: 'За 3 дня и за сутки до вылета', mandatory: false },
  { key: 'support', title: 'Сообщения поддержки', subtitle: 'Ответы в чате и пропущенные звонки', mandatory: false },
  { key: 'promo', title: 'Акции и предложения', subtitle: 'Горящие туры и подборки, не чаще 2 раз в неделю', mandatory: false },
];

const DEFAULT_PREFS: NotificationPrefs = { orders: true, documents: true, reminders: true, support: true, promo: false, system: true };

const PLATFORM_LABEL: Record<string, string> = { ios: 'iPhone', android: 'Android', web: 'Сайт totus.club', desktop: 'Desktop' };

function deviceLabel(d: PushDevice): string {
  const name = (d.deviceName || '').trim() || PLATFORM_LABEL[d.platform] || d.platform;
  const platform = PLATFORM_LABEL[d.platform] || d.platform;
  const status = d.enabled ? 'push включён' : 'push выключен';
  return name === platform ? `${name} · ${status}` : `${name} · ${platform} · ${status}`;
}

const Toggle: React.FC<{ on: boolean; disabled?: boolean; label: string; onChange: (v: boolean) => void }> = ({ on, disabled, label, onChange }) => (
  <button
    type="button"
    className={'toggle' + (on ? ' toggle--on' : '') + (disabled ? ' toggle--disabled' : '')}
    role="switch"
    aria-checked={on}
    aria-label={label}
    disabled={disabled}
    onClick={() => !disabled && onChange(!on)}
  />
);

const SettingRow: React.FC<{ title: string; subtitle?: string; right: React.ReactNode; last?: boolean }> = ({ title, subtitle, right, last }) => (
  <>
    <div className="notify-setting">
      <span className="notify-setting__text">
        <span className="notify-setting__title">{title}</span>
        {subtitle ? <span className="notify-setting__subtitle">{subtitle}</span> : null}
      </span>
      {right}
    </div>
    {last ? null : <div className="notify-setting__hairline" />}
  </>
);

const SettingsBody: React.FC = () => {
  const { accessToken, user: userFromState } = useSelector((s: RootState) => s.auth);
  const { desktopSettings, setDesktopSettings, permission, requestPermission } = useNotificationsContext();
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [devices, setDevices] = useState<PushDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [platformLabel, setPlatformLabel] = useState('Компьютер');

  const email = useMemo(() => {
    const fromState = (userFromState as any)?.email;
    if (typeof fromState === 'string' && fromState) return fromState;
    if (!accessToken) return '';
    try {
      const decoded = jwtDecode<{ email?: string }>(accessToken);
      return decoded?.email || '';
    } catch {
      return '';
    }
  }, [accessToken, userFromState]);

  useEffect(() => {
    desktop
      .getPlatform()
      .then(p => setPlatformLabel(p === 'darwin' ? 'MacBook' : p === 'win32' ? 'Windows' : 'Компьютер'))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getSettings()
      .then(res => {
        if (cancelled) return;
        setSettings(res.settings);
        setDevices(res.devices || []);
        setError(null);
      })
      .catch(e => {
        if (!cancelled) setError(notificationsErrorMessage(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const prefs: NotificationPrefs = { ...DEFAULT_PREFS, ...(settings?.prefs || {}) };

  const save = useCallback(
    async (key: string, payload: Parameters<typeof updateSettings>[0], optimistic: (s: NotificationSettings) => NotificationSettings) => {
      const prev = settings;
      if (prev) setSettings(optimistic(prev));
      setSaving(key);
      setError(null);
      try {
        const res = await updateSettings(payload);
        if (res?.settings) setSettings(res.settings);
        if (res?.devices) setDevices(res.devices);
      } catch (e) {
        if (prev) setSettings(prev);
        setError(notificationsErrorMessage(e));
      } finally {
        setSaving(null);
      }
    },
    [settings],
  );

  const setPref = (key: NotificationCategory, value: boolean) =>
    void save(`pref:${key}`, { prefs: { [key]: value } }, s => ({ ...s, prefs: { ...s.prefs, [key]: value } }));

  const mandatoryKeys = useMemo(() => {
    const set = new Set<NotificationCategory>(CATEGORY_ROWS.filter(r => r.mandatory).map(r => r.key));
    (settings?.categories || []).forEach(c => {
      if (c.mandatory) set.add(c.key);
    });
    return set;
  }, [settings]);

  const rows = useMemo(
    () =>
      CATEGORY_ROWS.map(r => ({
        ...r,
        title: settings?.categories?.find(c => c.key === r.key)?.title || NOTIFICATION_CATEGORY_TITLES[r.key] || r.title,
        mandatory: mandatoryKeys.has(r.key),
      })),
    [mandatoryKeys, settings],
  );

  const busy = loading || Boolean(saving);
  const inAppSubtitle =
    permission === 'granted'
      ? 'Системные уведомления macOS / Windows'
      : permission === 'denied'
        ? 'Запрещены в настройках системы'
        : 'Системные уведомления macOS / Windows — нужно разрешение';

  return (
    <div className="notify-settings">
      {error ? <div className="error-text notify-error">{error}</div> : null}
      <div className="notify-settings__cols">
        <div className="notify-settings__col">
          <div className="notify-section-title">Что присылать</div>
          <div className="card notify-card">
            {rows.map((r, i) => (
              <SettingRow
                key={r.key}
                title={r.title}
                subtitle={r.subtitle}
                last={i === rows.length - 1}
                right={
                  <Toggle
                    on={r.mandatory ? true : Boolean(prefs[r.key])}
                    disabled={r.mandatory || busy}
                    label={r.title}
                    onChange={v => setPref(r.key, v)}
                  />
                }
              />
            ))}
          </div>
          <div className="notify-hint">
            Уведомления о заказах, оплате и документах отключить нельзя — они нужны, чтобы вы не пропустили важное по вашему туру. Акции
            приходят только с вашего согласия и не ночью (21:00–09:00 МСК).
          </div>
        </div>

        <div className="notify-settings__col">
          <div className="notify-section-title">Каналы</div>
          <div className="card notify-card">
            <SettingRow
              title="Уведомления в приложении"
              subtitle={inAppSubtitle}
              right={
                permission === 'default' ? (
                  <button type="button" className="btn btn--sm" onClick={() => void requestPermission()}>
                    Включить
                  </button>
                ) : (
                  <Toggle on={desktopSettings.inApp && permission !== 'denied'} disabled={permission === 'denied'} label="Уведомления в приложении" onChange={v => setDesktopSettings({ inApp: v })} />
                )
              }
            />
            <SettingRow title="Звук" subtitle="Для сообщений поддержки" right={<Toggle on={desktopSettings.sound} label="Звук" onChange={v => setDesktopSettings({ sound: v })} />} />
            <SettingRow
              title="Электронная почта"
              subtitle={email ? `${email} · документы и чеки` : 'Документы и чеки'}
              last
              right={<Toggle on={Boolean(settings?.email)} disabled={busy} label="Электронная почта" onChange={v => void save('email', { email: v }, s => ({ ...s, email: v }))} />}
            />
          </div>

          <div className="notify-section-title notify-section-title--gap">Ваши устройства</div>
          <div className="card notify-card">
            <div className="notify-device">
              <span className={'notify-device__dot' + (permission === 'granted' && desktopSettings.inApp ? '' : ' notify-device__dot--off')} />
              <span className="notify-device__text">{platformLabel} · это устройство</span>
              {permission === 'granted' ? (
                <span className="notify-device__ok">
                  <CheckIcon size={14} />
                </span>
              ) : null}
            </div>
            {devices.map(d => (
              <React.Fragment key={d.id}>
                <div className="notify-setting__hairline notify-setting__hairline--device" />
                <div className="notify-device">
                  <span className={'notify-device__dot' + (d.enabled ? '' : ' notify-device__dot--off')} />
                  <span className="notify-device__text">{deviceLabel(d)}</span>
                </div>
              </React.Fragment>
            ))}
            {!loading && devices.length === 0 ? (
              <>
                <div className="notify-setting__hairline notify-setting__hairline--device" />
                <div className="notify-device notify-device--muted">
                  <BellIcon size={16} />
                  <span className="notify-device__text">Другие устройства появятся после входа в приложение Totus Club на телефоне</span>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export const NotificationSettingsScreen: React.FC = () => {
  const nav = useAppNavigation();
  const { accessToken, fullAuth } = useSelector((s: RootState) => s.auth);
  if (!accessToken || !fullAuth) {
    return (
      <>
        <PageHeader title="Настройки уведомлений" back />
        <div className="page-body">
          <div className="empty card" style={{ padding: 48 }}>
            <div className="empty__title">Войдите, чтобы настроить уведомления</div>
            <button type="button" className="btn" onClick={() => nav.navigate('login', { returnTo: 'account' })}>
              Войти
            </button>
          </div>
        </div>
      </>
    );
  }
  return (
    <>
      <PageHeader title="Настройки уведомлений" subtitle="Что и куда присылать" back />
      <div className="page-body">
        <SettingsBody />
      </div>
    </>
  );
};

export default NotificationSettingsScreen;
