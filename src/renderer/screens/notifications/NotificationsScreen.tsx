import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@shared/modules/store';
import {
  getNotifications,
  markRead,
  notificationsErrorMessage,
  type NotificationCategory,
  type NotificationItem,
} from '@shared/modules/api/notifications';
import { PageHeader } from '../../shell/PageHeader';
import { useAppNavigation } from '../../app/navigation';
import { NOTIFY_SETTINGS_ROUTE, useNotificationsContext } from '../../notifications/NotificationsProvider';
import { BellIcon, CategoryBubble, CheckIcon, GearIcon, notificationVisual } from './notificationsUi';
import './notifications.css';

// Экран «Уведомления» (DESIGN.md, desktop): PageHeader + «N непрочитанных», «Прочитать все», шестерёнка;
// колонка 800 по центру: чипы-фильтры, группы «Сегодня / Вчера / Ранее», элементы с иконкой категории,
// «Показать ещё» (before=<id>), пустое состояние. Данные — calling_api_v2 /api/notifications*.

const PAGE = 30;

type Filter = { key: NotificationCategory | 'all'; label: string; categories?: NotificationCategory[] };
const FILTERS: Filter[] = [
  { key: 'all', label: 'Все' },
  { key: 'orders', label: 'Заказы и оплата' },
  { key: 'documents', label: 'Документы' },
  { key: 'reminders', label: 'Напоминания' },
  { key: 'support', label: 'Поддержка' },
  { key: 'promo', label: 'Акции' },
];

const timeFmt = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' });
const dateFmt = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' });
const dateFmtYear = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });

type Group = 'today' | 'yesterday' | 'earlier';
const GROUP_LABEL: Record<Group, string> = { today: 'Сегодня', yesterday: 'Вчера', earlier: 'Ранее' };

function dayDiff(iso: string): number {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 99;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const that = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((today.getTime() - that.getTime()) / 86400000);
}

function groupOf(iso: string): Group {
  const diff = dayDiff(iso);
  if (diff <= 0) return 'today';
  if (diff === 1) return 'yesterday';
  return 'earlier';
}

/** HH:MM сегодня, «Вчера», «5 сен» (с годом — если не текущий). */
function timeLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diff = dayDiff(iso);
  if (diff <= 0) return timeFmt.format(d);
  if (diff === 1) return 'Вчера';
  const label = d.getFullYear() === new Date().getFullYear() ? dateFmt.format(d) : dateFmtYear.format(d);
  return label.replace(/\.$/, '');
}

function pluralUnread(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} непрочитанное`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${n} непрочитанных`;
  return `${n} непрочитанных`;
}

const NotificationRow: React.FC<{ item: NotificationItem; onOpen: (item: NotificationItem) => void }> = ({ item, onOpen }) => {
  const unread = !item.readAt;
  const visual = notificationVisual(item.type, item.category);
  return (
    <button type="button" className={'notify-item' + (unread ? ' notify-item--unread' : '')} onClick={() => onOpen(item)}>
      <CategoryBubble visual={visual} size={44} />
      <span className="notify-item__text">
        <span className="notify-item__head">
          <span className="notify-item__title">{item.title}</span>
          {unread ? <span className="notify-item__dot" aria-label="Непрочитанное" /> : null}
        </span>
        {item.body ? <span className="notify-item__body">{item.body}</span> : null}
      </span>
      <span className="notify-item__time">{timeLabel(item.createdAt)}</span>
    </button>
  );
};

const NotificationsList: React.FC = () => {
  const nav = useAppNavigation();
  const ctx = useNotificationsContext();
  const { unread, setUnread, incomingSeq, openNotification, permission, requestPermission } = ctx;
  const [filter, setFilter] = useState<Filter['key']>('all');
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const itemsRef = useRef<NotificationItem[]>([]);
  itemsRef.current = items;

  const category = filter === 'all' ? null : filter;

  const loadFirst = useCallback(
    async (silent = false) => {
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      try {
        const res = await getNotifications({ limit: PAGE, category });
        setItems(res.items || []);
        setHasMore(Boolean(res.hasMore));
        if (typeof res.unread === 'number') setUnread(res.unread);
        setError(null);
      } catch (e) {
        if (!silent || itemsRef.current.length === 0) setError(notificationsErrorMessage(e));
      } finally {
        setLoading(false);
      }
    },
    [category, setUnread],
  );

  // Первая страница при открытии и смене фильтра
  useEffect(() => {
    void loadFirst(false);
  }, [loadFirst]);

  // Новое уведомление по сокету — тихо перезагружаем первую страницу
  const seqRef = useRef(incomingSeq);
  useEffect(() => {
    if (seqRef.current === incomingSeq) return;
    seqRef.current = incomingSeq;
    void loadFirst(true);
  }, [incomingSeq, loadFirst]);

  const loadMore = useCallback(async () => {
    const last = itemsRef.current[itemsRef.current.length - 1];
    if (!last || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await getNotifications({ before: last.id, limit: PAGE, category });
      const incoming = (res.items || []).filter(n => !itemsRef.current.some(x => x.id === n.id));
      setItems(prev => [...prev, ...incoming]);
      setHasMore(Boolean(res.hasMore));
    } catch (e) {
      setError(notificationsErrorMessage(e));
    } finally {
      setLoadingMore(false);
    }
  }, [category, loadingMore]);

  const onOpen = useCallback(
    (item: NotificationItem) => {
      const readAt = item.readAt || new Date().toISOString();
      setItems(prev => prev.map(n => (n.id === item.id ? { ...n, readAt, openedAt: n.openedAt || readAt } : n)));
      if (!item.readAt) setUnread(Math.max(0, unread - 1));
      openNotification(item.id, item.data);
    },
    [openNotification, setUnread, unread],
  );

  const markAllRead = useCallback(async () => {
    if (markingAll) return;
    setMarkingAll(true);
    try {
      const res = await markRead({ all: true });
      const readAt = new Date().toISOString();
      setItems(prev => prev.map(n => (n.readAt ? n : { ...n, readAt })));
      setUnread(typeof res?.unread === 'number' ? res.unread : 0);
    } catch (e) {
      setError(notificationsErrorMessage(e));
    } finally {
      setMarkingAll(false);
    }
  }, [markingAll, setUnread]);

  const groups = useMemo(() => {
    const map: Record<Group, NotificationItem[]> = { today: [], yesterday: [], earlier: [] };
    items.forEach(n => map[groupOf(n.createdAt)].push(n));
    return (Object.keys(map) as Group[]).filter(g => map[g].length > 0).map(g => ({ key: g, label: GROUP_LABEL[g], items: map[g] }));
  }, [items]);

  const subtitle = unread > 0 ? pluralUnread(unread) : 'Нет непрочитанных';
  const showPushOff = permission === 'default' || permission === 'denied';

  return (
    <>
      <PageHeader
        title="Уведомления"
        subtitle={subtitle}
        back
        right={
          <div className="notify-header__right">
            <button type="button" className="btn btn--ghost btn--sm notify-header__readall" onClick={() => void markAllRead()} disabled={markingAll || unread === 0}>
              <CheckIcon size={16} />
              Прочитать все
            </button>
            <button type="button" className="notify-header__gear" onClick={() => nav.navigate(NOTIFY_SETTINGS_ROUTE)} title="Настройки уведомлений" aria-label="Настройки уведомлений">
              <GearIcon size={22} />
            </button>
          </div>
        }
      />
      <div className="page-body">
        <div className="notify-col">
          <div className="notify-filters" role="tablist" aria-label="Фильтр по категории">
            {FILTERS.map(f => (
              <button
                key={f.key}
                type="button"
                role="tab"
                aria-selected={filter === f.key}
                className={'notify-chip' + (filter === f.key ? ' notify-chip--active' : '')}
                onClick={() => setFilter(f.key)}>
                {f.label}
              </button>
            ))}
          </div>

          {error ? <div className="error-text notify-error">{error}</div> : null}

          {loading ? (
            <div className="notify-list">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="notify-item notify-item--skeleton" aria-hidden="true">
                  <span className="skeleton" style={{ width: 44, height: 44, borderRadius: 22 }} />
                  <span className="notify-item__text">
                    <span className="skeleton" style={{ width: '40%', height: 16 }} />
                    <span className="skeleton" style={{ width: '80%', height: 14 }} />
                  </span>
                </div>
              ))}
            </div>
          ) : items.length === 0 && !error ? (
            <div className="notify-empty card">
              <span className="notify-empty__icon">
                <BellIcon size={34} />
              </span>
              <div className="empty__title">Уведомлений пока нет</div>
              <div className="notify-empty__text">Здесь появятся сообщения о заказах, оплате, документах и напоминания о поездке</div>
              {showPushOff ? (
                <div className="notify-pushoff">
                  <span className="notify-pushoff__icon">
                    <BellIcon size={18} off />
                  </span>
                  <span className="notify-pushoff__text">
                    <span className="notify-pushoff__title">Системные уведомления выключены</span>
                    <span className="notify-pushoff__sub">
                      {permission === 'denied' ? 'Разрешите уведомления для Totus Club в настройках системы' : 'Разрешите показывать уведомления, когда окно свёрнуто'}
                    </span>
                  </span>
                  {permission === 'default' ? (
                    <button type="button" className="btn btn--sm" onClick={() => void requestPermission()}>
                      Включить
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : (
            <>
              {groups.map(g => (
                <section key={g.key} className="notify-group">
                  <div className="notify-group__title">{g.label}</div>
                  <div className="notify-list card">
                    {g.items.map(n => (
                      <NotificationRow key={n.id} item={n} onOpen={onOpen} />
                    ))}
                  </div>
                </section>
              ))}
              {hasMore ? (
                <button type="button" className="btn btn--ghost btn--block notify-more" onClick={() => void loadMore()} disabled={loadingMore}>
                  {loadingMore ? 'Загрузка…' : 'Показать ещё'}
                </button>
              ) : null}
            </>
          )}
        </div>
      </div>
    </>
  );
};

/** Как SupportChatScreen: без авторизации — предложение войти (returnTo → обратно на экран). */
export const NotificationsScreen: React.FC = () => {
  const nav = useAppNavigation();
  const { accessToken, fullAuth } = useSelector((s: RootState) => s.auth);
  if (!accessToken || !fullAuth) {
    return (
      <>
        <PageHeader title="Уведомления" back />
        <div className="page-body">
          <div className="empty card" style={{ padding: 48 }}>
            <span className="notify-empty__icon">
              <BellIcon size={34} />
            </span>
            <div className="empty__title">Войдите, чтобы видеть уведомления</div>
            <div>Заказы, оплата, документы и напоминания о поездке — в вашем аккаунте.</div>
            <button type="button" className="btn" onClick={() => nav.navigate('login', { returnTo: 'account' })}>
              Войти
            </button>
          </div>
        </div>
      </>
    );
  }
  return <NotificationsList />;
};

export default NotificationsScreen;
