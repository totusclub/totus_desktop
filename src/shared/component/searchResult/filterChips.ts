import { LIST_FILTER_PARAM_KEYS } from './modals/filterConstants';

// Подписи и ключи фильтров продублированы из FiltersModalContent (там они не экспортируются),
// чтобы не трогать большой файл модалки. При изменении списков — синхронизировать оба места.
const WIFI_LABELS: Record<string, string> = {
  FREE: 'Бесплатный Wi-Fi',
  LOBBY_FREE: 'Бесплатный Wi-Fi в лобби',
  LOBBY_PAID: 'Платный Wi-Fi в лобби',
  LOBBY_UNKNOWN: 'Wi-Fi в лобби',
  NONE: 'Без Wi-Fi',
  PAID: 'Платный Wi-Fi',
};

const BEACH_SURFACE_LABELS: Record<string, string> = {
  SAND: 'Песок',
  'SAND+PEBBLE': 'Песок с галькой',
  PEBBLE: 'Галька',
  PLATFORM: 'Платформа',
};

const BEACH_TYPE_LABELS: Record<string, string> = {
  DESIGNATED: 'Собственный пляж',
  PUBLIC: 'Общественный пляж',
};

const CATEGORY_LABELS: Record<string, string> = {
  FAMILY: 'Для семьи',
  COUPLES: 'Для пар',
  ACTIVE: 'Активный отдых',
};

const CONFIRMABILITY_LABELS: Record<string, string> = {
  '1': 'Мгновенное подтверждение',
  '2': 'Быстрое подтверждение',
  '3': 'Любое подтверждение',
};

const AMENITY_FILTERS: { key: string; label: string; apiKey: string }[] = [
  { key: 'adults_only', label: 'Только для взрослых', apiKey: 'filter_adults_only' },
  { key: 'direct_flight', label: 'Прямой перелёт', apiKey: 'filter_direct_flight' },
  { key: 'aquapark', label: 'Аквапарк', apiKey: 'filter_aquapark' },
  { key: 'pool', label: 'Бассейн', apiKey: 'filter_pool' },
  { key: 'kids_pool', label: 'Детский бассейн', apiKey: 'filter_kids_pool' },
  { key: 'heated_pool', label: 'Подогреваемый бассейн', apiKey: 'filter_heated_pool' },
  { key: 'kids_club', label: 'Детский клуб', apiKey: 'filter_kids_club' },
  { key: 'kids_menu', label: 'Детское меню', apiKey: 'filter_kids_menu' },
  { key: 'nanny', label: 'Няня', apiKey: 'filter_nanny' },
  { key: 'aircon', label: 'Кондиционер', apiKey: 'filter_aircon' },
  { key: 'parking', label: 'Парковка', apiKey: 'filter_parking' },
  { key: 'bar', label: 'Бар', apiKey: 'filter_bar' },
  { key: 'massage', label: 'Массаж', apiKey: 'filter_massage' },
  { key: 'thermal_fun', label: 'Термальные процедуры', apiKey: 'filter_thermal_fun' },
  { key: 'no_single_men', label: 'Без одиноких мужчин', apiKey: 'filter_no_single_men' },
];

const MULTI_FILTER_KEYS = [
  'filter_hotel_type',
  'filter_meals',
  'filter_stars',
  'filter_regions',
  'filter_line',
  'filter_operators',
  'filter_rating',
  'filter_wifi',
  'filter_beach_surface',
  'filter_beach_type',
  'filter_category',
  'filter_confirmability',
] as const;

const parseCsv = (value: string | number | boolean | undefined | null): string[] => {
  if (value === undefined || value === null || value === '') return [];
  return String(value)
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);
};

const selectedFromApi = (items: any[] | undefined): string[] =>
  (items || [])
    .filter((item: any) => item?.selected)
    .map((item: any) => String(item.id))
    .filter(id => id && id !== 'undefined' && id !== 'null');

const starLabel = (id: number | string): string => {
  const n = Number(id);
  if (n === 1) return '1 звезда';
  if (n > 0 && n < 5) return `${n} звезды`;
  if (n === 5) return '5 звёзд';
  return String(id);
};

/**
 * Chips for the currently applied list filters (SelectedFiltersRow).
 * Reads the same `filter_*` params / facets as FiltersModalContent.buildInitialFilters,
 * so the row and the modal always agree on what is "applied".
 */
export type FilterChip = {
  /** API param key, e.g. 'filter_stars'. Price uses 'filter_price_min' and resets both bounds. */
  key: string;
  /** Option id for CSV list filters; null for boolean / price filters. */
  value: string | null;
  label: string;
};

type MultiFilterKey = (typeof MULTI_FILTER_KEYS)[number];

/** filter_* param → facet key inside hotels.filters */
const FACET_BY_PARAM: Record<MultiFilterKey, string> = {
  filter_hotel_type: 'hotel_type',
  filter_meals: 'meals',
  filter_stars: 'stars',
  filter_regions: 'regions',
  filter_line: 'line',
  filter_operators: 'operators',
  filter_rating: 'rating',
  filter_wifi: 'wifi',
  filter_beach_surface: 'beach_surface',
  filter_beach_type: 'beach_type',
  filter_category: 'category',
  filter_confirmability: 'confirmability',
};

const STATIC_LABELS: Partial<Record<MultiFilterKey, Record<string, string>>> = {
  filter_wifi: WIFI_LABELS,
  filter_beach_surface: BEACH_SURFACE_LABELS,
  filter_beach_type: BEACH_TYPE_LABELS,
  filter_category: CATEGORY_LABELS,
  filter_confirmability: CONFIRMABILITY_LABELS,
};

const PRICE_KEY = 'filter_price_min';
const INSTANT_CONFIRM_KEY = 'filter_instant_confirm';

const isTrue = (value: unknown): boolean => value === true || value === 'true';

// Без toLocaleString: Intl в Hermes на Android неполный, формат должен быть одинаковым везде.
const NARROW_NBSP = String.fromCharCode(0x202f); // узкий неразрывный пробел — разделитель тысяч
const formatPrice = (value: number): string =>
  `${String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, NARROW_NBSP)} ₽`;

/** Same as ResultList.pickAppliedListFilters (kept here to avoid a circular import). */
export const pickAppliedListFilters = (hotels: any): Record<string, unknown> => {
  if (!hotels) return {};
  const out: Record<string, unknown> = {};
  for (const key of LIST_FILTER_PARAM_KEYS) {
    if (hotels[key] !== undefined && hotels[key] !== null) {
      out[key] = hotels[key];
    }
  }
  return out;
};

/** Price bounds — mirrors FiltersModalContent.priceBounds. */
export const getPriceBounds = (hotels: any): { min: number; max: number } | null => {
  const prices = hotels?.filters?.prices;
  if (!prices) return null;
  const min = Number(prices.min ?? hotels?.statistics?.shown_min_price ?? 0);
  const max = Number(prices.max ?? hotels?.statistics?.shown_max_price ?? min);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  return { min, max: max >= min ? max : min };
};

/** Available star ids (facet), without the "0" pseudo-option — same as handleResetFilters. */
const availableStarIds = (hotels: any): string[] =>
  (hotels?.filters?.stars || [])
    .map((s: any) => String(s?.id))
    .filter((id: string) => id && id !== '0' && id !== 'undefined' && id !== 'null');

/**
 * Current ids for a CSV list filter: applied `filter_*` param wins,
 * otherwise facet `selected` flags (same `pick` rule as buildInitialFilters).
 */
const currentListIds = (hotels: any, key: MultiFilterKey): string[] => {
  const applied = hotels?.[key];
  const facet = hotels?.filters?.[FACET_BY_PARAM[key]];
  const ids =
    applied !== undefined && applied !== null
      ? parseCsv(applied)
      : selectedFromApi(Array.isArray(facet) ? facet : undefined);
  return key === 'filter_stars' ? ids.filter(id => id !== '0') : ids;
};

const isAmenityActive = (hotels: any, amenity: { key: string; apiKey: string }): boolean => {
  const applied = hotels?.[amenity.apiKey];
  if (isTrue(applied)) return true;
  if (applied !== undefined && applied !== null) return false;
  const facet = hotels?.filters?.[amenity.key];
  const trueOpt = Array.isArray(facet)
    ? facet.find((x: any) => isTrue(x?.id))
    : null;
  return Boolean(trueOpt?.selected);
};

const listOptionLabel = (hotels: any, key: MultiFilterKey, id: string): string => {
  if (key === 'filter_stars') return starLabel(id);
  if (key === 'filter_line') return `${id}-я линия`;
  if (key === 'filter_rating') return `Рейтинг: ${id}+`;

  const facet = hotels?.filters?.[FACET_BY_PARAM[key]];
  const option = Array.isArray(facet)
    ? facet.find((item: any) => String(item?.id) === id)
    : null;
  const staticLabel = STATIC_LABELS[key]?.[id];
  return staticLabel || option?.name || id;
};

export function buildFilterChips(hotels: any): FilterChip[] {
  if (!hotels) return [];
  const chips: FilterChip[] = [];

  // Быстрое подтверждение (default false → no chip)
  if (isTrue(hotels[INSTANT_CONFIRM_KEY])) {
    chips.push({
      key: INSTANT_CONFIRM_KEY,
      value: null,
      label: 'Быстрое подтверждение',
    });
  }

  // Price — single chip only when the applied range differs from the facet bounds
  const bounds = getPriceBounds(hotels);
  if (bounds) {
    const hasMin = hotels.filter_price_min !== undefined && hotels.filter_price_min !== null;
    const hasMax = hotels.filter_price_max !== undefined && hotels.filter_price_max !== null;
    const min = hasMin ? Number(hotels.filter_price_min) : bounds.min;
    const max = hasMax ? Number(hotels.filter_price_max) : bounds.max;
    const narrowed =
      (Number.isFinite(min) && min > bounds.min) ||
      (Number.isFinite(max) && max < bounds.max);
    if (narrowed) {
      chips.push({
        key: PRICE_KEY,
        value: null,
        label: `от ${formatPrice(min)} – до ${formatPrice(max)}`,
      });
    }
  }

  // CSV list filters — one chip per selected option
  for (const key of MULTI_FILTER_KEYS) {
    const ids = currentListIds(hotels, key);
    if (ids.length === 0) continue;

    if (key === 'filter_stars') {
      // All available stars selected == default (see handleResetFilters) → no chip
      const available = availableStarIds(hotels);
      const allSelected =
        available.length > 0 && available.every(id => ids.includes(id));
      if (allSelected) continue;
    }

    for (const id of ids) {
      chips.push({ key, value: id, label: listOptionLabel(hotels, key, id) });
    }
  }

  // Boolean amenities (Удобства)
  for (const amenity of AMENITY_FILTERS) {
    if (isAmenityActive(hotels, amenity)) {
      chips.push({ key: amenity.apiKey, value: null, label: amenity.label });
    }
  }

  return chips;
}

export function countActiveFilters(hotels: any): number {
  return buildFilterChips(hotels).length;
}

/**
 * Applied filter params with a single chip removed.
 * Cleared values use the same shape FiltersModalContent.handleApply sends:
 * CSV → '' when empty, amenities → '' , instant confirm → false, price → facet bounds.
 */
export function removeChipFromParams(
  applied: Record<string, unknown>,
  chip: FilterChip,
  hotels: any,
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...applied };

  if (chip.key === INSTANT_CONFIRM_KEY) {
    next[INSTANT_CONFIRM_KEY] = false;
    return next;
  }

  if (chip.key === PRICE_KEY) {
    const bounds = getPriceBounds(hotels);
    if (bounds) {
      next.filter_price_min = bounds.min;
      next.filter_price_max = bounds.max;
    } else {
      delete next.filter_price_min;
      delete next.filter_price_max;
    }
    return next;
  }

  if (AMENITY_FILTERS.some(a => a.apiKey === chip.key)) {
    next[chip.key] = '';
    return next;
  }

  if ((MULTI_FILTER_KEYS as readonly string[]).includes(chip.key)) {
    const key = chip.key as MultiFilterKey;
    const remaining = currentListIds(hotels, key).filter(id => id !== chip.value);
    next[key] = remaining.join(',');
    return next;
  }

  return next;
}
