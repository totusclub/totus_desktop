/** Цена как в приложении: 156 764 ₽ */
export function formatPrice(value: number | string | null | undefined, currency = '₽'): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  return `${Math.round(n).toLocaleString('ru-RU')} ${currency}`;
}

const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const DAYS_SHORT = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

/** 2026-09-11 → «11 сентября» */
export function formatDateRu(iso?: string | null, withWeekday = false): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const base = `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`;
  return withWeekday ? `${base}, ${DAYS_SHORT[d.getDay()]}` : base;
}

export function nightsWord(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return `${n} ночь`;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return `${n} ночи`;
  return `${n} ночей`;
}

export function pluralRu(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}
