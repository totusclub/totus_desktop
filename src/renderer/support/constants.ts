// Константы службы поддержки — общие для «Аккаунта» (звонок) и «Чата с поддержкой».

/** Loyalty ID учётной записи поддержки в calling_api_v2 (звонок через приложение). */
export const SUPPORT_LOYALTY_ID = '0978 6356 3712 8057';
export const SUPPORT_DISPLAY_NAME = 'Поддержка Totus';
/** Резервный телефон поддержки (tel:). */
export const SUPPORT_PHONE_NUMBER = '+74951234567';

/** Статус в шапке чата (макет «Desktop / Support chat»). */
export const SUPPORT_ONLINE_TEXT = 'Онлайн · отвечаем в течение 5 минут';

/** Чипы быстрых тем над композером и в пустом состоянии. */
export const SUPPORT_TOPICS: { key: string; label: string; text: string }[] = [
  { key: 'order', label: 'Вопрос по заказу', text: 'Здравствуйте! У меня вопрос по заказу.' },
  { key: 'change', label: 'Изменить бронирование', text: 'Здравствуйте! Хочу изменить бронирование.' },
  { key: 'payment', label: 'Проблема с оплатой', text: 'Здравствуйте! У меня проблема с оплатой.' },
  { key: 'docs', label: 'Документы по туру', text: 'Здравствуйте! Подскажите, где найти документы по туру.' },
];

/** Текст часов работы, если API не вернуло hours.text. */
export const SUPPORT_HOURS_FALLBACK = 'Служба поддержки Totus Club отвечает ежедневно с 9:00 до 21:00 (МСК). Среднее время ответа — 5 минут.';
