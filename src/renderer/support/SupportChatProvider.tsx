import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '@shared/modules/store';
import { getSupportChat, type SupportChat } from '@shared/modules/api/supportChat';
import { ROUTES } from '../app/navigation';
import { SUPPORT_DISPLAY_NAME } from './constants';
import { connectSupportSocket, disconnectSupportSocket, onSupportEvent } from './supportSocket';

/**
 * Глобальное состояние чата с поддержкой (аналог VoipManager для звонков): как только пользователь
 * авторизован — держим сокет к calling_api_v2, считаем непрочитанные (бейдж на «Аккаунте»),
 * показываем системное уведомление о новом сообщении, когда окно не в фокусе. При логауте — отключаемся.
 */
export type SupportChatContextValue = {
  /** Последнее известное состояние диалога (userUnread → бейдж). */
  chat: SupportChat | null;
  unreadCount: number;
  connected: boolean;
  /** Обновить диалог из ответа REST/сокета (экран чата вызывает после read/send). */
  setChat: (chat: SupportChat | null) => void;
};

const SupportChatContext = createContext<SupportChatContextValue | null>(null);

export function useSupportChatContext(): SupportChatContextValue {
  const ctx = useContext(SupportChatContext);
  if (!ctx) throw new Error('useSupportChatContext: SupportChatProvider не смонтирован');
  return ctx;
}

/** Безопасный вариант для компонентов, которые могут рендериться вне провайдера (рейл). */
export function useSupportUnread(): number {
  const ctx = useContext(SupportChatContext);
  return ctx?.unreadCount ?? 0;
}

function isWindowInactive(): boolean {
  try {
    return document.hidden || !document.hasFocus();
  } catch {
    return false;
  }
}

function showSupportNotification(body: string, onClick: () => void): void {
  try {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'denied') return;
    const show = () => {
      const n = new Notification(SUPPORT_DISPLAY_NAME, { body, tag: 'totus-support-chat', silent: false });
      n.onclick = () => {
        try {
          window.focus();
        } catch {
          /* ignore */
        }
        onClick();
        n.close();
      };
    };
    if (Notification.permission === 'granted') show();
    else void Notification.requestPermission().then(p => p === 'granted' && show());
  } catch (e) {
    console.warn('[support-chat] notification failed', e);
  }
}

export const SupportChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { accessToken, fullAuth, userId } = useSelector((s: RootState) => s.auth);
  const navigate = useNavigate();
  const [chat, setChatState] = useState<SupportChat | null>(null);
  const [connected, setConnected] = useState(false);

  const isLoggedIn = Boolean(fullAuth && accessToken && userId);

  const setChat = useCallback((next: SupportChat | null) => setChatState(next), []);

  // Сокет + первичная синхронизация непрочитанных после входа; отключение при логауте.
  useEffect(() => {
    if (!isLoggedIn) {
      disconnectSupportSocket();
      setConnected(false);
      setChatState(null);
      return;
    }
    let cancelled = false;
    const socket = connectSupportSocket();
    setConnected(Boolean(socket.connected));
    const offConnect = onSupportEvent('connect', () => setConnected(true));
    const offDisconnect = onSupportEvent('disconnect', () => setConnected(false));
    // GET /api/support/chat создаёт диалог при первом обращении и возвращает userUnread
    getSupportChat(1)
      .then(res => {
        // Событие сокета могло прийти раньше ответа — не затираем более свежее состояние
        if (!cancelled && res?.chat) setChatState(prev => prev ?? res.chat);
      })
      .catch(e => console.warn('[support-chat] не удалось получить состояние диалога', e?.message || e));
    return () => {
      cancelled = true;
      offConnect();
      offDisconnect();
    };
  }, [isLoggedIn, userId]);

  // События сервера: новое сообщение / изменение диалога / прочтение.
  useEffect(() => {
    if (!isLoggedIn) return;
    const openChatScreen = () => navigate(ROUTES.supportChat);
    const offMessage = onSupportEvent('support:message', ({ chat: c, message }) => {
      if (c) setChatState(c);
      if (!message || message.senderRole === 'user') return;
      // Уведомляем только при свёрнутом/неактивном окне — внутри приложения достаточно бейджа
      // (на экране чата сообщение и так видно).
      if (!isWindowInactive()) return;
      const preview = (message.body || '').replace(/\s+/g, ' ').trim();
      showSupportNotification(preview.length > 140 ? `${preview.slice(0, 137)}…` : preview, openChatScreen);
    });
    const offUpdated = onSupportEvent('support:chat-updated', ({ chat: c }) => {
      if (c) setChatState(c);
    });
    const offRead = onSupportEvent('support:read', ev => {
      if (ev?.chat) setChatState(ev.chat);
    });
    return () => {
      offMessage();
      offUpdated();
      offRead();
    };
  }, [isLoggedIn, navigate]);

  const unreadCount = chat?.userUnread ?? 0;
  const value = useMemo<SupportChatContextValue>(
    () => ({ chat, unreadCount, connected, setChat }),
    [chat, unreadCount, connected, setChat],
  );
  return <SupportChatContext.Provider value={value}>{children}</SupportChatContext.Provider>;
};

export default SupportChatProvider;
