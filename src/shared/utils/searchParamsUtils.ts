import type {SearchParams} from '../types/search';
import {
  formatDateForAPI,
  getDefaultStartDate,
  parseNightsValue,
} from '../component/home/searchSection/utils/searchHelpers';

export type SearchTypeValue = 'package' | 'hotel';

export function normalizeSearchType(value?: string | null): SearchTypeValue {
  return value === 'hotel' ? 'hotel' : 'package';
}

/** Ensure every API call in a search session carries search_type. */
export function withSearchTypeFilters<T extends Record<string, unknown>>(
  searchType: string | undefined | null,
  filters: T,
): T & {search_type: SearchTypeValue} {
  return {
    ...filters,
    search_type: normalizeSearchType(searchType),
  };
}

/** Same shape as kedam_WEB `buildApiSearchParams`. */
export function buildApiSearchParams(data: SearchParams): SearchParams {
  const nightCount = parseNightsValue(data.nights) || 7;
  const startDate = data.start_date || getDefaultStartDate();
  const endDate =
    data.end_date_till ||
    formatDateForAPI(
      (() => {
        const end = new Date(`${startDate}T00:00:00`);
        end.setDate(end.getDate() + nightCount);
        return end;
      })(),
    );

  const searchType = normalizeSearchType(data.search_type);
  const hasHotelIds =
    Array.isArray(data.hotel_ids) && data.hotel_ids.length > 0;
  // Hotel-details / room search: exact date only (kedam_WEB flex_dates=0).
  const flexDates = hasHotelIds ? 0 : data.flex_dates ?? 0;

  const merged: SearchParams = {
    ...data,
    search_type: searchType,
    start_date: startDate,
    start_date_from: hasHotelIds ? startDate : data.start_date_from || startDate,
    end_date_till: endDate,
    nights: String(nightCount),
    flex_dates: flexDates,
    kids: data.kids ?? '0',
  };

  if (searchType === 'hotel') {
    const {from_city: _fromCity, from_country: _fromCountry, ...hotelParams} =
      merged;
    return hotelParams;
  }

  return merged;
}

/** Flatten params for GET requests — matches kedam_WEB `prepareStartSearchParams`. */
export function prepareStartSearchParams(
  raw: Record<string, unknown>,
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  if (!raw || typeof raw !== 'object') {
    return out;
  }

  for (const [key, value] of Object.entries(raw)) {
    if (value === undefined || value === null) {
      continue;
    }
    if (typeof value === 'string' && value.trim() === '') {
      continue;
    }
    if (Array.isArray(value)) {
      if (value.length === 0) {
        continue;
      }
      out[key] = value.map(v => String(v)).join(',');
      continue;
    }
    if (typeof value === 'object') {
      continue;
    }
    out[key] = value as string | number | boolean;
  }

  return out;
}

/** Flatten grouped-hotels / filter params (arrays → comma-separated). */
export function prepareGroupedHotelsParams(
  raw: Record<string, unknown>,
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  if (!raw || typeof raw !== 'object') {
    return out;
  }

  // Response-only fields — must never be sent as query params
  const skipKeys = new Set([
    'filters',
    'statistics',
    'hotels',
    'hotels_count',
    'emptyType',
    'ui_page_number',
    'progress',
  ]);

  for (const [key, value] of Object.entries(raw)) {
    if (skipKeys.has(key)) {
      continue;
    }
    if (value === null || value === undefined) {
      continue;
    }
    if (typeof value === 'string' && value.trim() === '') {
      continue;
    }
    if (Array.isArray(value)) {
      if (value.length === 0) {
        continue;
      }
      out[key] = value.map(v => String(v)).join(',');
      continue;
    }
    if (typeof value === 'object') {
      continue;
    }
    out[key] = value as string | number | boolean;
  }

  return out;
}
