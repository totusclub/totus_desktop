import React from 'react';
import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Icon, type IconName } from '../icons';
import { useTheme } from '../theme/ThemeContext';
import type { RootState } from '@shared/modules/store';
import { useUserAccess } from '../app/useUserAccess';
import { useSupportUnread } from '../support/SupportChatProvider';
import { useNotificationsUnread } from '../notifications/NotificationsProvider';

// Сайдбар-рейл 88 pt (Figma «DESKTOP UI»): только иконки с подписями под ними.
// Набор вкладок — как в таб-баре приложения (navigation/authStack.tsx):
// Totus AI и Избранное только для авторизованных; Totus AI ещё и по access === 0.
type Item = { to: string; icon: IconName; label: string };

const NAV_ALL: Item[] = [
  { to: '/', icon: 'search', label: 'Поиск' },
  { to: '/orders', icon: 'orders', label: 'Заказы' },
  { to: '/ai', icon: 'radiologo', label: 'Totus AI' },
  { to: '/favorites', icon: 'heart', label: 'Избранное' },
  { to: '/account', icon: 'account', label: 'Аккаунт' },
];

export const RailSidebar: React.FC = () => {
  const { isDark, toggle } = useTheme();
  const { accessToken, user } = useSelector((s: RootState) => s.auth);
  const access = useUserAccess();
  const supportUnread = useSupportUnread();
  const notificationsUnread = useNotificationsUnread();
  // Бейдж «Аккаунта» = непрочитанные сообщения поддержки + непрочитанные уведомления
  const accountBadge = supportUnread + notificationsUnread;
  const isLoggedIn = Boolean(accessToken);
  const items = NAV_ALL.filter(it => {
    if (it.to === '/ai') return isLoggedIn && access === 0;
    if (it.to === '/favorites') return isLoggedIn;
    return true;
  });
  const displayName = (user as any)?.name || (user as any)?.fName || (isLoggedIn ? 'Профиль' : 'Гость');
  const initial = isLoggedIn ? String(displayName).trim().charAt(0).toUpperCase() || 'T' : '?';

  return (
    <nav className="rail" aria-label="Разделы">
      <div className="rail__logo" title="Totus Club">
        <Icon name="bird" size={30} />
      </div>
      {items.map(it => (
        <NavLink
          key={it.to}
          to={it.to}
          end={it.to === '/'}
          className={({ isActive }) => 'rail__item' + (isActive ? ' rail__item--active' : '')}>
          <span className="rail__icon">
            <Icon name={it.icon} size={it.icon === 'radiologo' ? 30 : 24} />
            {/* Непрочитанные сообщения поддержки + уведомления — бейдж на «Аккаунте» (вход в чат и центр уведомлений) */}
            {it.to === '/account' && isLoggedIn && accountBadge > 0 ? (
              <span className="rail__badge" aria-label={`Непрочитанных: ${accountBadge}`}>
                {accountBadge > 99 ? '99+' : accountBadge}
              </span>
            ) : null}
          </span>
          <span>{it.label}</span>
        </NavLink>
      ))}
      <div className="rail__spacer" />
      <button type="button" className="rail__item" onClick={toggle} title="Переключить тему">
        <Icon name={isDark ? 'moon' : 'sun'} size={22} color={isDark ? '#5856D6' : '#FF9500'} />
        <span>{isDark ? 'Тёмная' : 'Светлая'}</span>
      </button>
      <NavLink to="/account" className="rail__item" title={isLoggedIn ? String(displayName) : 'Войти в аккаунт'}>
        <span className="rail__avatar">{initial}</span>
        <span style={{ maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {isLoggedIn ? String(displayName).split(' ')[0] : 'Гость'}
        </span>
      </NavLink>
    </nav>
  );
};
