// Константы фильтров выдачи — вынесены из FiltersModalContent.tsx (totus_APP) без изменений.
export const WIFI_LABELS: Record<string, string> = {
  FREE: 'Бесплатный Wi-Fi',
  LOBBY_FREE: 'Бесплатный Wi-Fi в лобби',
  LOBBY_PAID: 'Платный Wi-Fi в лобби',
  LOBBY_UNKNOWN: 'Wi-Fi в лобби',
  NONE: 'Без Wi-Fi',
  PAID: 'Платный Wi-Fi',
};

export const BEACH_SURFACE_LABELS: Record<string, string> = {
  SAND: 'Песок',
  'SAND+PEBBLE': 'Песок с галькой',
  PEBBLE: 'Галька',
  PLATFORM: 'Платформа',
};

export const BEACH_TYPE_LABELS: Record<string, string> = {
  DESIGNATED: 'Собственный пляж',
  PUBLIC: 'Общественный пляж',
};

export const CATEGORY_LABELS: Record<string, string> = {
  FAMILY: 'Для семьи',
  COUPLES: 'Для пар',
  ACTIVE: 'Активный отдых',
};

export const CONFIRMABILITY_LABELS: Record<string, string> = {
  '1': 'Мгновенное подтверждение',
  '2': 'Быстрое подтверждение',
  '3': 'Любое подтверждение',
};

/** Amenity facet key → RU label (Удобства on totus.club) */
export const AMENITY_FILTERS: { key: string; label: string; apiKey: string }[] = [
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

export const MULTI_FILTER_KEYS = [
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

/** Keys preserved across sort / load-more (match totus.club). */
export const LIST_FILTER_PARAM_KEYS = [
  ...MULTI_FILTER_KEYS,
  'filter_price_min',
  'filter_price_max',
  'filter_instant_confirm',
  ...AMENITY_FILTERS.map(a => a.apiKey),
] as const;


// Хелперы фасетов (FiltersModalContent.tsx, totus_APP).
export const parseCsv = (value: string | number | boolean | undefined | null): string[] => {
  if (value === undefined || value === null || value === '') return [];
  return String(value)
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);
};

export const selectedFromApi = (items: any[] | undefined): string[] =>
  (items || [])
    .filter((item: any) => item?.selected)
    .map((item: any) => String(item.id))
    .filter(id => id && id !== 'undefined' && id !== 'null');

export const starLabel = (id: number | string): string => {
  const n = Number(id);
  if (n === 1) return '1 звезда';
  if (n > 0 && n < 5) return `${n} звезды`;
  if (n === 5) return '5 звёзд';
  return String(id);
};

export const formatOptionMeta = (item: any): string => {
  const parts: string[] = [];
  if (item.hotel_count != null) {
    parts.push(`${item.hotel_count} отелей`);
  }
  if (item.min_price != null) {
    parts.push(`от ${Number(item.min_price).toLocaleString('ru-RU')} ₽`);
  }
  return parts.join(' · ');
};

export const mapFacetOptions = (
  items: any[] | undefined,
  labelFn: (item: any) => string,
) =>
  (items || []).map((item: any) => ({
    label: labelFn(item),
    meta: formatOptionMeta(item) || undefined,
    count: item.hotel_count != null ? Number(item.hotel_count) : undefined,
    value: String(item.id),
    disabled: Boolean(item.disabled),
  }));

export const hotelsWord = (n: number): string => {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'отель';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'отеля';
  return 'отелей';
};

