import type { Departure } from '../../../../types/departures';
import type { DestinationResult } from '../../../../types/destinations';

/**
 * Get current date in format DD.MM.YY (+7 days default for search)
 */
export const getCurrentDate = (): string => {
  const today = new Date();
  today.setDate(today.getDate() + 7);

  const day = today.getDate().toString().padStart(2, '0');
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const year = today.getFullYear().toString().slice(-2);

  return `${day}.${month}.${year}`;
};

export const getCurrentDateHotel = (): string => {
  // Same as getDefaultStartDate — YYYY-MM-DD, +7 days (was wrongly YY-MM-DD).
  return getDefaultStartDate();
};

/**
 * Calculate date 7 days from now in YYYY-MM-DD format
 */
export const getDefaultStartDate = (): string => {
  const today = new Date();
  const plus7 = new Date();
  plus7.setDate(today.getDate() + 7);
  const year = plus7.getFullYear();
  const month = String(plus7.getMonth() + 1).padStart(2, '0');
  const day = String(plus7.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Set default origin from departures data (Moscow if available)
 */
export const getDefaultOrigin = (
  departuresData: { departures?: Departure[] } | Departure[] | null,
): Departure | null => {
  const list = Array.isArray(departuresData)
    ? departuresData
    : departuresData?.departures;
  if (list && list.length > 0) {
    const moscow = list.find(
      d => d.name_en === 'Moscow' || (d as any).name_ru === 'Москва',
    );
    return moscow || list[0] || null;
  }
  return null;
};

/**
 * Set default destination from destinations data (Egypt if available).
 * Supports both grouped autocomplete responses and flat destination lists.
 */
export const getDefaultDestination = (
  destinationsData:
    | Array<{ group_name?: string; results?: DestinationResult[] } | DestinationResult>
    | null,
): DestinationResult | null => {
  if (!destinationsData || destinationsData.length === 0) {
    return null;
  }

  const isEgypt = (d: DestinationResult) =>
    d.name === 'Египет' ||
    d.name_en === 'Egypt' ||
    d.iso2 === 'EG';

  // Grouped response: [{ group_name: 'countries', results: [...] }, ...]
  const countriesGroup = destinationsData.find(
    (g: any) => g && typeof g === 'object' && g.group_name === 'countries' && Array.isArray(g.results),
  ) as { results?: DestinationResult[] } | undefined;

  if (countriesGroup?.results?.length) {
    return countriesGroup.results.find(isEgypt) || countriesGroup.results[0] || null;
  }

  // Flat list of destinations
  const flat = destinationsData.filter(
    (d: any) => d && typeof d === 'object' && !d.group_name && (d.name || d.name_en || d.iso2),
  ) as DestinationResult[];

  if (flat.length > 0) {
    return flat.find(isEgypt) || flat[0] || null;
  }

  // Fallback: first group's first result
  for (const g of destinationsData as any[]) {
    if (Array.isArray(g?.results) && g.results.length > 0) {
      return g.results.find(isEgypt) || g.results[0];
    }
  }

  return null;
};

/**
 * Convert DD.MM.YY format to YYYY-MM-DD format
 */
export const convertDateToISO = (dateStr: string): string => {
  const parts = dateStr.split('.');
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = '20' + parts[2];
    return `${year}-${month}-${day}`;
  }
  return getDefaultStartDate();
};

/**
 * Convert YYYY-MM-DD format to DD.MM.YY format
 */
export const convertISOToDisplay = (isoDate: string): string => {
  const parts = isoDate.split('-');
  if (parts.length === 3) {
    const year = parts[0].slice(-2);
    const month = parts[1];
    const day = parts[2];
    return `${day}.${month}.${year}`;
  }
  return getCurrentDate();
};

/**
 * Format Date object to YYYY-MM-DD format for API
 */
export const formatDateForAPI = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/** Format Date object to DD.MM.YY display */
export const formatDateToDisplay = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear().toString().slice(-2);
  return `${day}.${month}.${year}`;
};

/**
 * Russian plural forms: one / few (2–4) / many (5+, 11–14).
 * e.g. pluralizeRu(2, ['человек', 'человека', 'человек']) → 'человека'
 */
export const pluralizeRu = (
  count: number,
  forms: [one: string, few: string, many: string],
): string => {
  const abs = Math.abs(Math.trunc(count));
  const mod10 = abs % 10;
  const mod100 = abs % 100;

  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1];
  return forms[2];
};

/**
 * Search-field tourists label:
 * - adults only → «1 взрослый», «2 взрослых», «5 взрослых»
 * - with children → total as «1 человек», «2 человека», «5 человек»
 */
export const formatTouristsText = (adults: string, kids: string): string => {
  const adultsCount = Math.max(0, parseInt(adults, 10) || 0);
  const kidsCount = Math.max(0, parseInt(kids, 10) || 0);
  const total = adultsCount + kidsCount;

  if (total <= 0) {
    return `0 ${pluralizeRu(0, ['взрослый', 'взрослых', 'взрослых'])}`;
  }

  if (kidsCount > 0) {
    return `${total} ${pluralizeRu(total, ['человек', 'человека', 'человек'])}`;
  }

  return `${adultsCount} ${pluralizeRu(adultsCount, ['взрослый', 'взрослых', 'взрослых'])}`;
};

/** Слово «год» в правильной форме для целого возраста: 1 год, 2–4 года (кроме 11–14), иначе лет. */
export const getYearsWordForm = (n: number): 'год' | 'года' | 'лет' => {
  const abs = Math.floor(Math.abs(n));
  const d10 = abs % 10;
  const d100 = abs % 100;
  if (d10 === 1 && d100 !== 11) {
    return 'год';
  }
  if (d10 >= 2 && d10 <= 4 && (d100 < 10 || d100 >= 20)) {
    return 'года';
  }
  return 'лет';
};

/** Ноль — только «0»; остальное: «7 лет», «1 год», «3 года», «11 лет». */
export const formatAgeWithYearsWord = (age: number): string =>
  age === 0 ? '0' : `${age} ${getYearsWordForm(age)}`;

export const parseNightsValue = (value?: string | number | null): number => {
  if (typeof value === 'number' && !isNaN(value)) {
    return value;
  }

  if (value == null) {
    return 0;
  }

  const stringValue = String(value).trim();
  if (!stringValue) {
    return 0;
  }

  if (stringValue.includes('..')) {
    const [start] = stringValue.split('..');
    const parsed = parseInt(start, 10);
    if (!isNaN(parsed)) {
      return parsed;
    }
  }

  const digitsOnly = stringValue.replace(/[^\d]/g, '');
  const parsed = parseInt(digitsOnly, 10);
  return isNaN(parsed) ? 0 : parsed;
};

const RUS_MONTHS_SHORT = [
  'янв',
  'фев',
  'мар',
  'апр',
  'май',
  'июн',
  'июл',
  'авг',
  'сен',
  'окт',
  'ноя',
  'дек',
];

const RUS_WEEKDAYS_SHORT = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

export const formatDateLabel = (date: Date): string => {
  const day = date.getDate();
  const month = RUS_MONTHS_SHORT[date.getMonth()];
  const weekday = RUS_WEEKDAYS_SHORT[date.getDay()];
  return `${day} ${month}, ${weekday}`;
};

const toLocalDate = (value?: string): Date | null => {
  if (!value) return null;
  const normalized = value.includes('T') ? value : `${value}T00:00:00`;
  const date = new Date(normalized);
  if (isNaN(date.getTime())) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

export const formatDateRangeShort = (
  startDate?: string,
  nights?: string | number | null,
): string => {
  const start = toLocalDate(startDate);
  if (!start) return '';

  const nightsCount = parseNightsValue(nights);
  const end = new Date(start);
  if (nightsCount > 0) {
    end.setDate(start.getDate() + nightsCount);
  }

  const startLabel = formatDateLabel(start);
  const endLabel = formatDateLabel(end);

  if (startLabel === endLabel) {
    return startLabel;
  }

  return `${startLabel} – ${endLabel}`;
};

export function formatDateRange(..._args: any[]): string {
  return '';
}
