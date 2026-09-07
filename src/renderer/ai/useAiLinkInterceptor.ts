import { useEffect, type RefObject } from 'react';
import { openHotelFromAiAssistantUrl } from '@shared/utils/aiAssistantOpenHotel';
import { openExternal } from '../lib/desktop';
import { AI_SITE_ORIGIN } from './config';

/**
 * Карточки Милы в веб-пакете — обычные <a href>. В desktop перехватываем клик:
 * ссылка на отель (hotel-details / ai/tours / lt_<id>) → экран отеля внутри приложения
 * (та же логика, что onOpenHotel в мобильном приложении), остальное → системный браузер.
 */
export function useAiLinkInterceptor(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handler = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute('href') || '';
      if (!href || href.startsWith('#')) return;
      event.preventDefault();
      event.stopPropagation();
      if (openHotelFromAiAssistantUrl(href)) return;
      const absolute = /^https?:/i.test(href) ? href : AI_SITE_ORIGIN + (href.startsWith('/') ? href : '/' + href);
      openExternal(absolute);
    };
    el.addEventListener('click', handler, true);
    return () => el.removeEventListener('click', handler, true);
  }, [ref]);
}
