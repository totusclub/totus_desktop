import { useAssistantStore } from '@tosmedia/ai-assistant';

/** Совпадает с OpenHotelInfo из @tosmedia/ai-assistant-native (мобильное приложение). */
export type OpenHotelInfo = { hotelId: string; roomType?: string; href?: string; tourId?: string };
import type { SearchParams } from '../types/search';
import type { HotelSearchSnapshot } from '../types/hotel';
import { buildRecommendedHotelRouteParams } from './hotelUtils/recommendedHotelNavigation';
import { formatDateForAPI } from '../component/home/searchSection/utils/searchHelpers';

export type HotelRouteParams = {
  hotelId: string;
  searchParams: SearchParams;
  searchSnapshot: HotelSearchSnapshot;
  aiRoomPick?: { roomType?: string };
};

type QueryBag = {
  singles: Record<string, string>;
  kidsAges: number[];
};

/** Set from TotusAiChatScreen — same stack as chat. */
let aiStackNavigate: ((params: HotelRouteParams) => void) | null = null;

export function setAiHotelNavigator(
  navigate: ((params: HotelRouteParams) => void) | null,
) {
  aiStackNavigate = navigate;
}

/** RN URLSearchParams is incomplete — parse query manually. */
function parseQueryBag(hrefOrSearch: string): QueryBag {
  const singles: Record<string, string> = {};
  const kidsAges: number[] = [];
  try {
    let search = hrefOrSearch;
    const q = search.indexOf('?');
    if (q >= 0) search = search.slice(q + 1);
    const hash = search.indexOf('#');
    if (hash >= 0) search = search.slice(0, hash);
    if (!search || search.startsWith('http') || search.startsWith('/')) {
      return { singles, kidsAges };
    }
    for (const part of search.split('&')) {
      if (!part) continue;
      const eq = part.indexOf('=');
      const rawKey = eq >= 0 ? part.slice(0, eq) : part;
      const rawVal = eq >= 0 ? part.slice(eq + 1) : '';
      const key = decodeURIComponent(rawKey.replace(/\+/g, ' '));
      const val = decodeURIComponent(rawVal.replace(/\+/g, ' '));
      if (!key) continue;
      if (key === 'kids_ages') {
        const n = parseInt(val, 10);
        if (Number.isFinite(n)) kidsAges.push(n);
        continue;
      }
      if (singles[key] === undefined) singles[key] = val;
    }
  } catch {
    /* ignore */
  }
  return { singles, kidsAges };
}

function qGet(bag: QueryBag, key: string): string | undefined {
  const v = bag.singles[key];
  return v != null && v !== '' ? v : undefined;
}

function addDaysISO(start: string, nights: number): string {
  try {
    const d = new Date(`${start}T00:00:00`);
    if (Number.isNaN(d.getTime())) return start;
    d.setDate(d.getDate() + nights);
    return formatDateForAPI(d);
  } catch {
    return start;
  }
}

export function parseAiHotelUrl(url: string): {
  hotelId: string;
  roomType?: string;
  query: QueryBag;
} | null {
  try {
    let pathname = '';
    let search = '';
    if (/^https?:\/\//i.test(url)) {
      const m = url.match(/^https?:\/\/[^/?#]+([^?#]*)(\?[^#]*)?/i);
      pathname = m?.[1] || '';
      search = m?.[2] || '';
    } else {
      const q = url.indexOf('?');
      pathname = (q >= 0 ? url.slice(0, q) : url).split('#')[0];
      search = q >= 0 ? url.slice(q) : '';
    }
    pathname = pathname.replace(/\/+$/, '');
    const query = parseQueryBag(search);

    let hotelId =
      qGet(query, 'hotel_id') || qGet(query, 'hotelId') || '';

    if (!hotelId) {
      const m = pathname.match(
        /\/(?:hotel-details|ai\/tours|tours)\/([^/?#]+)/i,
      );
      if (m) hotelId = decodeURIComponent(m[1]);
    }
    if (!hotelId) {
      const ltAnywhere = /lt_(\d+)/i.exec(url);
      if (ltAnywhere) hotelId = ltAnywhere[1];
    }
    if (!hotelId) return null;

    const lt = /^lt_(\d+)$/i.exec(hotelId.trim());
    hotelId = lt ? lt[1] : hotelId.replace(/^lt_/i, '').trim();
    if (!/^\d+$/.test(hotelId)) return null;

    const roomType = qGet(query, 'room_type') || qGet(query, 'room');
    return { hotelId, roomType, query };
  } catch {
    const ltAnywhere = /lt_(\d+)/i.exec(url);
    if (ltAnywhere) {
      return { hotelId: ltAnywhere[1], query: { singles: {}, kidsAges: [] } };
    }
    return null;
  }
}

/**
 * Build hotel route params from AI booking link.
 * Matches working `buildAiHotelRouteParams`:
 * - uses AI search dates/guests/destination from the link
 * - never passes listing request_id (hotel page must start a hotel-scoped search)
 */
function buildParamsFromQuery(
  hotelId: string,
  query: QueryBag,
  roomType?: string,
): HotelRouteParams {
  const startDate = qGet(query, 'start_date') || qGet(query, 'start_date_from');
  const fromCity = qGet(query, 'from_city');

  // No AI search context in the link → safe defaults (same as home recommendations).
  if (!startDate && !fromCity) {
    const base = buildRecommendedHotelRouteParams(hotelId);
    return {
      ...base,
      aiRoomPick: roomType ? { roomType } : undefined,
    };
  }

  const nights = parseInt(qGet(query, 'nights') || '7', 10) || 7;
  const adults = parseInt(qGet(query, 'adults') || '2', 10) || 2;
  const kidsAges = query.kidsAges;
  const kids =
    parseInt(qGet(query, 'kids') || String(kidsAges.length || 0), 10) || 0;
  const start = startDate || buildRecommendedHotelRouteParams(hotelId).searchParams.start_date!;
  const endTill =
    qGet(query, 'end_date_till') || addDaysISO(start, nights);
  const numericId = parseInt(hotelId, 10);

  const searchParams: SearchParams = {
    from_city: fromCity || 'Moscow',
    from_country: qGet(query, 'from_country') || 'RU',
    to_country: qGet(query, 'to_country') || undefined,
    to_city: qGet(query, 'to_city') || undefined,
    adults: String(adults),
    kids: String(kids),
    ...(kidsAges.length ? { kids_ages: kidsAges } : {}),
    start_date: start,
    start_date_from: qGet(query, 'start_date_from') || start,
    end_date_till: endTill,
    nights: String(nights),
    search_type: qGet(query, 'search_type') || 'package',
    // Hotel rooms: fixed date only (no ±2 flex) — same as kedam / old AI.
    flex_dates: 0,
    hotel_ids: [Number.isFinite(numericId) ? numericId : Number(hotelId)],
    page_number: 1,
    page_limit: 20,
    sort_by: 'relevance',
  };

  return {
    hotelId,
    // Do NOT pass listing request_id — Hotel screen must startSearch for this hotel.
    searchParams,
    searchSnapshot: {
      startDateISO: start,
      nights,
      adults,
      kids,
      kidsAges,
    },
    aiRoomPick: roomType ? { roomType } : undefined,
  };
}

function navigateToHotelScreen(routeParams: HotelRouteParams) {
  try {
    useAssistantStore.getState().setOpen(false);
  } catch {
    /* ignore */
  }

  if (aiStackNavigate) {
    aiStackNavigate(routeParams);
    return;
  }
  console.warn('[AI hotel] navigator is not set (setAiHotelNavigator)');
}

export function openHotelFromAiAssistantUrl(url: string): boolean {
  const parsed = parseAiHotelUrl(url);
  if (!parsed) {
    console.warn('[AI hotel] could not parse url', url);
    return false;
  }
  navigateToHotelScreen(
    buildParamsFromQuery(parsed.hotelId, parsed.query, parsed.roomType),
  );
  return true;
}

export function openHotelFromAiAssistantInfo(info: OpenHotelInfo): boolean {
  const hotelId = String(info.hotelId || '').trim();
  if (!/^\d+$/.test(hotelId)) {
    if (info.href) return openHotelFromAiAssistantUrl(info.href);
    console.warn('[AI hotel] invalid hotelId', info);
    return false;
  }

  // Prefer full AI booking link (dates / destination / guests).
  if (info.href && (info.href.includes('?') || /hotel-details/i.test(info.href))) {
    const parsed = parseAiHotelUrl(info.href);
    if (parsed) {
      navigateToHotelScreen(
        buildParamsFromQuery(
          hotelId,
          parsed.query,
          info.roomType || parsed.roomType,
        ),
      );
      return true;
    }
  }

  navigateToHotelScreen(
    buildParamsFromQuery(hotelId, { singles: {}, kidsAges: [] }, info.roomType),
  );
  return true;
}
