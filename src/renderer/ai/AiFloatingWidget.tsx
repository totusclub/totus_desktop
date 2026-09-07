import React, { useRef } from 'react';
import { useSelector } from 'react-redux';
import { ChatWidget } from '@tosmedia/ai-assistant';
import type { RootState } from '@shared/modules/store';
import { useUserAccess } from '../app/useUserAccess';
import { useAiLinkInterceptor } from './useAiLinkInterceptor';
import { AiProvider } from './AiRoot';

// Плавающая кнопка Милы на всех экранах (как GlobalAiChat на сайте): только для авторизованных
// с access === 0 (как гейт вкладки в приложении). Ссылки из карточек перехватываются в экран отеля.
export const AiFloatingWidget: React.FC = () => {
  const accessToken = useSelector((s: RootState) => s.auth.accessToken);
  const access = useUserAccess();
  const ref = useRef<HTMLDivElement | null>(null);
  useAiLinkInterceptor(ref);
  if (!accessToken || access !== 0) return null;
  return (
    <AiProvider shell="widget">
      <div ref={ref}>
        <ChatWidget />
      </div>
    </AiProvider>
  );
};
