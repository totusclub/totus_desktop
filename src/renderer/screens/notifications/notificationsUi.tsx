import React from 'react';
import type { NotificationCategory, NotificationType } from '@shared/modules/api/notifications';

// Общие элементы экранов «Уведомления» / «Настройки уведомлений»: иконки категорий (DESIGN.md:
// заказы brand, оплата зелёный, документы/поддержка голубой, напоминания фиолетовый, акции жёлтый, система серый),
// колокольчик, шестерёнка, галочка. Все — currentColor, как остальные инлайн-иконки приложения.

export type NotifyVisual = { color: string; icon: 'bag' | 'ruble' | 'doc' | 'chat' | 'plane' | 'tag' | 'info' | 'phone' };

export function notificationVisual(type: NotificationType, category: NotificationCategory): NotifyVisual {
  switch (type) {
    case 'payment_success':
    case 'payment_failed':
      return { color: '#288556', icon: 'ruble' };
    case 'documents_ready':
    case 'order_confirmed':
    case 'order_status':
      return { color: '#2BA9E2', icon: 'doc' };
    case 'trip_reminder':
      return { color: '#5856D6', icon: 'plane' };
    case 'support_message':
      return { color: '#2BA9E2', icon: 'chat' };
    case 'missed_call':
      return { color: '#2BA9E2', icon: 'phone' };
    case 'promo':
      return { color: '#FF9500', icon: 'tag' };
    case 'system':
      return { color: '#7A7A7A', icon: 'info' };
    default:
      break;
  }
  switch (category) {
    case 'orders':
      return { color: '#FE732E', icon: 'bag' };
    case 'documents':
      return { color: '#2BA9E2', icon: 'doc' };
    case 'reminders':
      return { color: '#5856D6', icon: 'plane' };
    case 'support':
      return { color: '#2BA9E2', icon: 'chat' };
    case 'promo':
      return { color: '#FF9500', icon: 'tag' };
    default:
      return { color: '#7A7A7A', icon: 'info' };
  }
}

const S = { display: 'block' } as const;

export const CategoryIcon: React.FC<{ icon: NotifyVisual['icon']; size?: number }> = ({ icon, size = 20 }) => {
  const common = { viewBox: '0 0 24 24', fill: 'none', width: size, height: size, style: S, 'aria-hidden': true } as const;
  switch (icon) {
    case 'bag':
      return (
        <svg {...common}>
          <path d="M5 8h14l-1 12H6L5 8Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
          <path d="M9 8V6a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
    case 'ruble':
      return (
        <svg {...common}>
          <path d="M9 20V4h5a4 4 0 0 1 0 8H9M7 16h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'doc':
      return (
        <svg {...common}>
          <path d="M7 3h7l4 4v14H7V3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
          <path d="M14 3v4h4M10 12h5M10 16h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
    case 'chat':
      return (
        <svg {...common}>
          <path
            d="M12 3C6.925 3 3 6.58 3 10.9c0 2.23 1.03 4.24 2.72 5.66L5 21l4.3-2.03c.86.2 1.77.31 2.7.31 5.075 0 9-3.58 9-7.9S17.075 3 12 3Z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'plane':
      return (
        <svg {...common}>
          <path
            d="M21 4.5 14.5 11l1.5 8-2 2-3-6.5L7 18.5l.5 3-1.5 1-2-4-4-2 1-1.5 3 .5L8 12 1.5 9l2-2 8 1.5L18 2l3 2.5Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'tag':
      return (
        <svg {...common}>
          <path d="M3 12V4h8l10 10-8 8L3 12Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
          <circle cx="7.5" cy="8.5" r="1.3" fill="currentColor" />
        </svg>
      );
    case 'phone':
      return (
        <svg {...common}>
          <path
            d="M6.5 3.5 9 6.5 7.3 8.7a12 12 0 0 0 8 8L17.5 15l3 2.5-1.6 2.6c-.6.9-1.7 1.3-2.7 1C9.8 19.5 4.5 14.2 2.9 7.8c-.3-1 .1-2.1 1-2.7l2.6-1.6Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'info':
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
          <path d="M12 11v5M12 8h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
  }
};

export const BellIcon: React.FC<{ size?: number; off?: boolean }> = ({ size = 20, off }) => (
  <svg viewBox="0 0 24 24" fill="none" width={size} height={size} style={S} aria-hidden="true">
    <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    <path d="M10 20a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    {off ? <path d="M4 4l16 16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /> : null}
  </svg>
);

export const GearIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg viewBox="0 0 24 24" fill="none" width={size} height={size} style={S} aria-hidden="true">
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
    <path
      d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
);

export const CheckIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg viewBox="0 0 24 24" fill="none" width={size} height={size} style={S} aria-hidden="true">
    <path d="m5 12.5 4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Круг 44 с подложкой 12 % цвета категории и иконкой внутри. */
export const CategoryBubble: React.FC<{ visual: NotifyVisual; size?: number }> = ({ visual, size = 44 }) => (
  <span
    className="notify-item__icon"
    style={{ width: size, height: size, color: visual.color, background: `color-mix(in srgb, ${visual.color} 12%, transparent)` }}>
    <CategoryIcon icon={visual.icon} size={Math.round(size * 0.5)} />
  </span>
);
