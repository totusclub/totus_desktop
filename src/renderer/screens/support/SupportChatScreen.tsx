import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@shared/modules/store';
import type { SupportMessageMeta } from '@shared/modules/api/supportChat';
import { PageHeader } from '../../shell/PageHeader';
import { Icon } from '../../icons';
import { useAppNavigation } from '../../app/navigation';
import { getCallState, startOutgoingVoiceCallByLoyaltyId } from '../../voip/VoipClient';
import { useSupportChat, type SupportUiMessage } from '../../support/useSupportChat';
import {
  SUPPORT_DISPLAY_NAME,
  SUPPORT_HOURS_FALLBACK,
  SUPPORT_LOYALTY_ID,
  SUPPORT_ONLINE_TEXT,
  SUPPORT_TOPICS,
} from '../../support/constants';
import './support.css';

// Экран «Чат с поддержкой» (Figma «Desktop / Support chat», «Desktop / Support chat (empty)»):
// структура как AiScreen — колонка 800 по центру, список с прокруткой, композер внизу.
// Данные — calling_api_v2 /api/support/chat* + socket.io (support/useSupportChat).

const timeFmt = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' });
const dateFmt = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });
const dateFmtYear = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

function dayKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** «Сегодня» / «Вчера» / «12 сентября» / «12 сентября 2025» */
function dayLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const that = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((today.getTime() - that.getTime()) / 86400000);
  if (diffDays === 0) return 'Сегодня';
  if (diffDays === 1) return 'Вчера';
  return d.getFullYear() === now.getFullYear() ? dateFmt.format(d) : dateFmtYear.format(d);
}

function timeLabel(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : timeFmt.format(d);
}

const PaperclipIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg viewBox="0 0 24 24" fill="none" width={size} height={size} style={{ display: 'block' }} aria-hidden="true">
    <path
      d="M20.5 11.5 12.4 19.6a5 5 0 0 1-7.1-7.1l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.5 8.5a1.7 1.7 0 0 1-2.4-2.4l7.8-7.8"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const SendIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg viewBox="0 0 24 24" fill="none" width={size} height={size} style={{ display: 'block' }} aria-hidden="true">
    <path d="M4 12 20 4l-4 16-4-7-8-1Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    <path d="M12 13l8-9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);

/** Галочки доставки: одна — отправлено, двойная — прочитано; часы — отправляется. */
const Ticks: React.FC<{ state: 'pending' | 'sent' | 'read' | 'failed' }> = ({ state }) => {
  if (state === 'pending') {
    return (
      <svg viewBox="0 0 16 16" width={14} height={14} fill="none" aria-label="Отправляется" style={{ display: 'block' }}>
        <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.3" />
        <path d="M8 5v3.2l2 1.3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    );
  }
  if (state === 'failed') {
    return (
      <svg viewBox="0 0 16 16" width={14} height={14} fill="none" aria-label="Не отправлено" style={{ display: 'block' }}>
        <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.3" />
        <path d="M8 5v3.5M8 10.6v.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 20 14" width={18} height={12} fill="none" aria-label={state === 'read' ? 'Прочитано' : 'Отправлено'} style={{ display: 'block' }}>
      <path d="M1.5 7.5l3.5 3.5L11.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      {state === 'read' ? (
        <path d="M8 7.5l3.5 3.5L18.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      ) : null}
    </svg>
  );
};

const SupportAvatar: React.FC<{ size: number; online?: boolean }> = ({ size, online = true }) => (
  <span className="support-avatar" style={{ width: size, height: size }}>
    <Icon name="bird" size={Math.round(size * 0.58)} color="#FFFFFF" />
    {online ? <span className="support-avatar__dot" style={{ width: Math.max(10, size / 4), height: Math.max(10, size / 4) }} /> : null}
  </span>
);

const OrderCard: React.FC<{ meta: SupportMessageMeta; mine: boolean; onOpen: (orderId: number | string) => void }> = ({ meta, mine, onOpen }) => {
  const id = meta.orderId as number | string;
  return (
    <button type="button" className={'support-order' + (mine ? ' support-order--mine' : '')} onClick={() => onOpen(id)} title="Открыть заказ">
      <span className="support-order__icon">
        <Icon name="orders" size={18} />
      </span>
      <span className="support-order__text">
        <span className="support-order__title">{meta.orderTitle ? `Заказ № ${id} · ${meta.orderTitle}` : `Заказ № ${id}`}</span>
        {meta.orderSubtitle ? <span className="support-order__subtitle">{meta.orderSubtitle}</span> : null}
      </span>
      <Icon name="arrowRight" size={14} />
    </button>
  );
};

type BubbleProps = { m: SupportUiMessage; onOpenOrder: (orderId: number | string) => void; onRetry: (clientMsgId: string) => void };

const MessageBubble: React.FC<BubbleProps> = ({ m, onOpenOrder, onRetry }) => {
  if (m.senderRole === 'system') {
    return (
      <div className="support-system">
        <span>{m.body}</span>
      </div>
    );
  }
  const mine = m.senderRole === 'user';
  const tick: 'pending' | 'sent' | 'read' | 'failed' = m.failed ? 'failed' : m.pending ? 'pending' : m.readAt ? 'read' : 'sent';
  const hasOrder = Boolean(m.meta && m.meta.orderId);
  return (
    <div className={'support-row' + (mine ? ' support-row--mine' : '')}>
      {!mine ? (
        <span className="support-row__avatar">
          <SupportAvatar size={32} online={false} />
        </span>
      ) : null}
      <div className={'support-bubble' + (mine ? ' support-bubble--mine' : '') + (m.failed ? ' support-bubble--failed' : '')}>
        {!mine ? (
          <div className="support-bubble__author">
            {m.senderName ? `${m.senderName} · ${SUPPORT_DISPLAY_NAME}` : SUPPORT_DISPLAY_NAME}
          </div>
        ) : null}
        {m.body ? <div className="support-bubble__text">{m.body}</div> : null}
        {hasOrder ? <OrderCard meta={m.meta as SupportMessageMeta} mine={mine} onOpen={onOpenOrder} /> : null}
        <div className="support-bubble__meta">
          {m.failed && m.clientMsgId ? (
            <button type="button" className="support-bubble__retry" onClick={() => onRetry(m.clientMsgId as string)}>
              Не отправлено · Повторить
            </button>
          ) : null}
          <span className="support-bubble__time">{timeLabel(m.createdAt)}</span>
          {mine ? (
            <span className="support-bubble__ticks" title={tick === 'read' ? 'Прочитано' : tick === 'sent' ? 'Отправлено' : undefined}>
              <Ticks state={tick} />
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
};

const TopicChips: React.FC<{ onPick: (text: string, topic: string) => void; disabled?: boolean }> = ({ onPick, disabled }) => (
  <div className="support-chips">
    {SUPPORT_TOPICS.map(t => (
      <button key={t.key} type="button" className="support-chip" disabled={disabled} onClick={() => onPick(t.text, t.key)}>
        {t.label}
      </button>
    ))}
  </div>
);

export const SupportChatScreen: React.FC = () => {
  const nav = useAppNavigation();
  const { accessToken, fullAuth } = useSelector((s: RootState) => s.auth);
  if (!accessToken || !fullAuth) {
    return (
      <>
        <PageHeader title="Чат с поддержкой" back />
        <div className="page-body">
          <div className="empty card" style={{ padding: 48 }}>
            <SupportAvatar size={80} />
            <div className="empty__title">Войдите, чтобы написать в поддержку</div>
            <div>Переписка сохраняется в вашем аккаунте — продолжить можно с любого устройства.</div>
            <button type="button" className="btn" onClick={() => nav.navigate('login', { returnTo: 'supportChat' })}>
              Войти
            </button>
          </div>
        </div>
      </>
    );
  }
  return <SupportChat />;
};

const SupportChat: React.FC = () => {
  const nav = useAppNavigation();
  const user = useSelector((s: RootState) => s.auth.user) as { name?: string; l_name?: string } | null;
  const userName = user ? `${user.name || ''} ${user.l_name || ''}`.trim() || null : null;
  const chat = useSupportChat(userName);
  const { messages, loading, loadingMore, hasMore, staffTyping, error, hours, send, retry, loadMore, onTyping, clearError } = chat;

  const [text, setText] = useState('');
  const [topic, setTopic] = useState<string | null>(null);
  const [callError, setCallError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const stickToBottomRef = useRef(true);
  const prevFirstIdRef = useRef<number | null>(null);
  const prevHeightRef = useRef(0);
  const lastCountRef = useRef(0);

  // Прокрутка: к последнему сообщению при загрузке/новых сообщениях (если пользователь был внизу),
  // сохранение позиции при подгрузке истории вверх.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const firstId = messages.find(m => m.id > 0)?.id ?? null;
    const prependedHistory = prevFirstIdRef.current !== null && firstId !== null && firstId < prevFirstIdRef.current && messages.length > lastCountRef.current;
    if (prependedHistory) {
      el.scrollTop += el.scrollHeight - prevHeightRef.current;
    } else if (stickToBottomRef.current || messages.length > lastCountRef.current) {
      const last = messages[messages.length - 1];
      if (stickToBottomRef.current || (last && last.senderRole === 'user')) el.scrollTop = el.scrollHeight;
    }
    prevFirstIdRef.current = firstId;
    prevHeightRef.current = el.scrollHeight;
    lastCountRef.current = messages.length;
  }, [messages, staffTyping, loading]);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (el.scrollTop < 40 && hasMore && !loadingMore && !loading) {
      prevHeightRef.current = el.scrollHeight;
      void loadMore();
    }
  }, [hasMore, loadMore, loading, loadingMore]);

  useEffect(() => {
    if (!loading) inputRef.current?.focus();
  }, [loading]);

  const submit = useCallback(() => {
    const value = text.trim();
    if (!value) return;
    void send(value, topic ? { topic } : null);
    setText('');
    setTopic(null);
    stickToBottomRef.current = true;
    inputRef.current?.focus();
  }, [send, text, topic]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const pickTopic = useCallback((t: string, key: string) => {
    setText(t);
    setTopic(key);
    inputRef.current?.focus();
  }, []);

  const openOrder = useCallback((orderId: number | string) => nav.navigate('orderDetails', { orderId }), [nav]);

  // «Позвонить» — тот же поток, что «Звонок через приложение» в «Аккаунте»; окно звонка покажет VoipManager
  const handleCall = useCallback(async () => {
    const cs = getCallState();
    if (cs.state !== 'idle' && cs.state !== 'ended' && cs.state !== 'rejected') {
      setCallError('У вас уже есть активный звонок');
      return;
    }
    setCallError(null);
    try {
      await startOutgoingVoiceCallByLoyaltyId(SUPPORT_LOYALTY_ID, SUPPORT_DISPLAY_NAME);
    } catch (e: any) {
      setCallError(`Не удалось соединиться: ${e?.message || 'Неизвестная ошибка'}`);
    }
  }, []);

  useEffect(() => {
    if (!callError) return;
    const t = setTimeout(() => setCallError(null), 4000);
    return () => clearTimeout(t);
  }, [callError]);

  // Группировка по дням для разделителей
  const grouped = useMemo(() => {
    const out: { key: string; label: string; items: SupportUiMessage[] }[] = [];
    for (const m of messages) {
      const key = dayKey(m.createdAt);
      const last = out[out.length - 1];
      if (last && last.key === key) last.items.push(m);
      else out.push({ key, label: dayLabel(m.createdAt), items: [m] });
    }
    return out;
  }, [messages]);

  const isEmpty = !loading && messages.length === 0;
  const hoursText = hours?.text || SUPPORT_HOURS_FALLBACK;

  return (
    <div className="support-page">
      <header className="page-header support-header">
        <div className="page-header__left">
          <button type="button" className="page-header__back" onClick={nav.goBack} aria-label="Назад">
            <Icon name="chevronLeft" size={24} />
          </button>
          <SupportAvatar size={48} />
          <div style={{ minWidth: 0 }}>
            <h1 className="page-header__title">Чат с поддержкой</h1>
            <div className="support-header__status">
              {SUPPORT_DISPLAY_NAME} · {SUPPORT_ONLINE_TEXT}
            </div>
          </div>
        </div>
        <div className="support-header__right">
          {callError ? <span className="error-text support-header__error">{callError}</span> : null}
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => void handleCall()}>
            <Icon name="phone" size={18} /> Позвонить
          </button>
        </div>
      </header>

      <div className="support-page__scroll" ref={scrollRef} onScroll={onScroll}>
        <div className="support-page__col">
          {loading ? (
            <div className="support-skeletons" aria-busy="true">
              <div className="skeleton support-skeleton support-skeleton--in" />
              <div className="skeleton support-skeleton support-skeleton--out" />
              <div className="skeleton support-skeleton support-skeleton--in" />
            </div>
          ) : null}

          {isEmpty ? (
            <div className="support-empty">
              <SupportAvatar size={80} />
              <div className="support-empty__title">Напишите нам</div>
              <div className="support-empty__text">{hoursText}</div>
              <div className="support-empty__ask">С чем помочь?</div>
              <TopicChips onPick={pickTopic} />
            </div>
          ) : null}

          {loadingMore ? <div className="support-more">Загружаем историю…</div> : null}
          {!loadingMore && hasMore && !loading ? (
            <button type="button" className="support-more support-more--btn" onClick={() => void loadMore()}>
              Показать более ранние сообщения
            </button>
          ) : null}

          {grouped.map(g => (
            <React.Fragment key={g.key}>
              <div className="support-day">
                <span>{g.label}</span>
              </div>
              {g.items.map(m => (
                <MessageBubble key={m.id > 0 ? `id-${m.id}` : `c-${m.clientMsgId}`} m={m} onOpenOrder={openOrder} onRetry={id => void retry(id)} />
              ))}
            </React.Fragment>
          ))}

          {staffTyping ? (
            <div className="support-row">
              <span className="support-row__avatar">
                <SupportAvatar size={32} online={false} />
              </span>
              <div className="support-bubble support-bubble--typing" aria-label="Поддержка печатает">
                <span className="support-typing">
                  <i />
                  <i />
                  <i />
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="support-page__composer">
        {error ? (
          <div className="support-error" role="alert">
            <span>{error}</span>
            <button type="button" onClick={clearError} aria-label="Скрыть">
              ×
            </button>
          </div>
        ) : null}
        {!isEmpty ? <TopicChips onPick={pickTopic} /> : null}
        <div className="support-composer">
          <button type="button" className="support-composer__btn support-composer__btn--ghost" disabled title="Вложения — скоро" aria-label="Вложения — скоро">
            <PaperclipIcon size={20} />
          </button>
          <textarea
            ref={inputRef}
            className="support-composer__input"
            rows={1}
            placeholder="Напишите сообщение…"
            value={text}
            maxLength={4000}
            onChange={e => {
              setText(e.target.value);
              onTyping();
            }}
            onKeyDown={onKeyDown}
          />
          <button type="button" className="support-composer__btn support-composer__btn--send" onClick={submit} disabled={!text.trim()} aria-label="Отправить">
            <SendIcon size={20} />
          </button>
        </div>
        <div className="support-note">Переписка сохраняется в вашем аккаунте. Для срочных вопросов — кнопка «Позвонить».</div>
      </div>
    </div>
  );
};

export default SupportChatScreen;
