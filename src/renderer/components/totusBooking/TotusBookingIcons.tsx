import React from 'react';
import type { TotusBookingTone } from '@shared/utils/totusBooking';

// Иконки статусов внутреннего бронирования (Arlekino) — currentColor, как в components/uiIcons.tsx.

type P = { size?: number; className?: string };

const base = (size: number): React.CSSProperties => ({ width: size, height: size, display: 'block', flex: 'none' });

/** Часы — «Проверяем бронирование». */
export const ClockIcon: React.FC<P> = ({ size = 24, className }) => (
  <svg viewBox="0 0 24 24" fill="none" style={base(size)} className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
    <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Галочка в круге — «Подтверждено» / «Оплата прошла». */
export const CheckCircleIcon: React.FC<P> = ({ size = 24, className }) => (
  <svg viewBox="0 0 24 24" fill="none" style={base(size)} className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
    <path d="M8.5 12.5l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Крестик в круге — «Отклонено» / «Отменено». */
export const CrossCircleIcon: React.FC<P> = ({ size = 24, className }) => (
  <svg viewBox="0 0 24 24" fill="none" style={base(size)} className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
    <path d="M9 9l6 6M15 9l-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Крупная галочка — иконка экрана «Оплата прошла». */
export const BigCheckIcon: React.FC<P> = ({ size = 34, className }) => (
  <svg viewBox="0 0 24 24" fill="none" style={base(size)} className={className} aria-hidden="true">
    <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ToneIcon: React.FC<{ tone: TotusBookingTone; size?: number }> = ({ tone, size = 24 }) => {
  if (tone === 'success') return <CheckCircleIcon size={size} />;
  if (tone === 'danger') return <CrossCircleIcon size={size} />;
  return <ClockIcon size={size} />;
};
