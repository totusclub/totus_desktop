import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { AiAssistantProvider } from '@tosmedia/ai-assistant';
import '@tosmedia/ai-assistant/styles.css';
import './ai.css';
import type { RootState } from '@shared/modules/store';
import { store } from '@shared/modules/store';
import { setAiHotelNavigator, type HotelRouteParams } from '@shared/utils/aiAssistantOpenHotel';
import { useAppNavigation } from '../app/navigation';
import { AI_API_BASE, AI_TOUR_BASE_PATH, AI_WS_URL } from './config';

// Тот же провайдер и та же логика, что на сайте (GlobalAiChat.tsx) и в приложении (AiAssistantBridge):
// WebSocket-протокол, история в MySQL по JWT (historyMode auto), карточки туров/номеров.
const getAccessToken = () => store.getState().auth.accessToken || null;

const NavigatorBridge: React.FC = () => {
  const nav = useAppNavigation();
  useEffect(() => {
    // Карточка Милы → экран отеля с теми же параметрами, что hotelFromAi в приложении.
    setAiHotelNavigator((params: HotelRouteParams) => nav.navigate('hotelFromAi', params));
    return () => setAiHotelNavigator(null);
  }, [nav]);
  return null;
};

/**
 * Глобальная часть: только мост навигации. Сам AiAssistantProvider НЕ оборачивает приложение —
 * его styles.css содержит сбросы (`.totus-ai-root * { border: 0 }`, `input/button { background: transparent }`),
 * которые ломали инпуты, чекбоксы и кнопки всех экранов (особенно в Dark Mode).
 */
export const AiRoot: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <>
    <NavigatorBridge />
    {children}
  </>
);

/** Провайдер Милы — оборачивает ТОЛЬКО AI-контент (экран Totus AI и плавающий виджет). */
export const AiProvider: React.FC<{ children: React.ReactNode; shell?: 'page' | 'widget' }> = ({
  children,
  shell = 'widget',
}) => {
  const accessToken = useSelector((s: RootState) => s.auth.accessToken);
  return (
    <AiAssistantProvider
      key={accessToken ? 'auth' : 'guest'}
      shell={shell}
      apiBase={AI_API_BASE}
      wsUrl={AI_WS_URL}
      tourBasePath={AI_TOUR_BASE_PATH}
      homePath="/"
      getAccessToken={getAccessToken}
      historyMode="auto">
      {children}
    </AiAssistantProvider>
  );
};
