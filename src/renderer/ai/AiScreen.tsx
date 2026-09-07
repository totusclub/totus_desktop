import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { ChatMessage, QuickActions, useAssistant, useAssistantStore } from '@tosmedia/ai-assistant';
import type { RootState } from '@shared/modules/store';
import { PageHeader } from '../shell/PageHeader';
import { Icon } from '../icons';
import { useAppNavigation } from '../app/navigation';
import { useAiLinkInterceptor } from './useAiLinkInterceptor';
import { AiProvider } from './AiRoot';

// Экран «Totus AI» (Figma «Desktop / Totus AI»). Логика — useAssistant() из @tosmedia/ai-assistant:
// тот же WebSocket-протокол, история, карточки туров/номеров/направлений, что на сайте и в приложении.
export const AiScreen: React.FC = () => {
  const nav = useAppNavigation();
  const accessToken = useSelector((s: RootState) => s.auth.accessToken);
  if (!accessToken) {
    return (
      <>
        <PageHeader title="Totus AI" subtitle="Мила — ваш персональный турагент" />
        <div className="page-body">
          <div className="empty card" style={{ padding: 48 }}>
            <Icon name="radiologo" size={64} />
            <div className="empty__title">Войдите, чтобы общаться с Милой</div>
            <div>Мила подбирает туры, показывает номера и помогает оформить бронирование.</div>
            <button type="button" className="btn" onClick={() => nav.navigate('login')}>
              Войти
            </button>
          </div>
        </div>
      </>
    );
  }
  return (
    <AiProvider shell="widget">
      <AiChat />
    </AiProvider>
  );
};

const AiChat: React.FC = () => {
  const { isConnected, isTyping, messages, send, newChat, openChat } = useAssistant();
  const typingStatus = useAssistantStore(s => s.typingStatus);
  const chats = useAssistantStore(s => s.chats);
  const activeChatId = useAssistantStore(s => s.activeChatId);
  const [text, setText] = useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  useAiLinkInterceptor(listRef);

  // Автопрокрутка к последнему сообщению (как в ChatWidget)
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isTyping]);

  // Глобальное событие assistant:send (карточки направлений, «Забронировать») — как в веб-пакете
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === 'string' && detail.trim()) send(detail);
    };
    window.addEventListener('assistant:send', handler);
    return () => window.removeEventListener('assistant:send', handler);
  }, [send]);

  const submit = useCallback(() => {
    const value = text.trim();
    if (!value || isTyping) return;
    send(value);
    setText('');
    inputRef.current?.focus();
  }, [text, isTyping, send]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const recent = [...chats].slice(-6).reverse();

  return (
    <div className="ai-page">
      <PageHeader
        title="Totus AI"
        subtitle="Мила — ваш персональный турагент"
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span className="ai-status">
              <span className={'ai-status__dot' + (isConnected ? '' : ' ai-status__dot--off')} />
              {isConnected ? 'Онлайн · подбор туров' : 'Переподключение…'}
            </span>
            <button type="button" className="btn btn--ghost btn--sm" onClick={newChat}>
              <Icon name="plus" size={16} /> Новый чат
            </button>
          </div>
        }
      />
      <div className="ai-page__scroll" ref={scrollRef}>
        <div className="ai-page__col" ref={listRef}>
          {recent.length > 1 ? (
            <div className="ai-chats">
              {recent.map(c => (
                <button
                  key={c.id}
                  type="button"
                  className={'ai-chat-pill' + (c.id === activeChatId ? ' ai-chat-pill--active' : '')}
                  onClick={() => openChat(c.id)}
                  title={c.title}>
                  {c.title || 'Новый чат'}
                </button>
              ))}
            </div>
          ) : null}
          {messages.map(m => (
            <div key={m.id} className={'ai-msg-row' + (m.role === 'user' ? ' ai-msg-row--user' : '')}>
              {m.role !== 'user' ? (
                <span className="ai-msg-row__avatar">
                  <Icon name="radiologo" size={36} />
                </span>
              ) : null}
              <div style={{ flex: 1, minWidth: 0 }}>
                <ChatMessage message={m} />
              </div>
            </div>
          ))}
          {isTyping ? <div className="ai-typing">{typingStatus ?? 'Думаю'}…</div> : null}
        </div>
      </div>
      <div className="ai-page__composer">
        <QuickActions onSelect={send} />
        <div className="ai-composer">
          <textarea
            ref={inputRef}
            className="ai-composer__input"
            rows={1}
            placeholder="Спросите совет или опишите тур…"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <button
            type="button"
            className="ai-composer__btn ai-composer__btn--send"
            onClick={submit}
            disabled={!text.trim() || isTyping}
            aria-label="Отправить">
            <Icon name="arrowRight" size={20} color="#fff" />
          </button>
        </div>
        <div className="ai-disclaimer">Мила может ошибаться — проверяйте детали тура перед оплатой.</div>
      </div>
    </div>
  );
};

export default AiScreen;
