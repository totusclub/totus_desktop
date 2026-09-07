import type { SearchParams } from '../../types/search';
import type { HotelSearchSnapshot } from '../../types/hotel';
import {
  formatDateForAPI,
  getDefaultStartDate,
} from '../../component/home/searchSection/utils/searchHelpers';

/**
 * Home “recommended hotels” → hotel details params.
 * Matches kedam_WEB `buildHotelDetailsDeepLinkQuery` — hotel_ids only,
 * no hardcoded to_city / to_country (those come from hotel details API).
 */
export function buildRecommendedHotelRouteParams(hotelId: string | number): {
  hotelId: string;
  searchParams: SearchParams;
  searchSnapshot: HotelSearchSnapshot;
} {
  const id = String(hotelId);
  const numericId = parseInt(id, 10);
  const startDate = getDefaultStartDate();
  const nights = 7;
  const endDate = new Date(`${startDate}T00:00:00`);
  endDate.setDate(endDate.getDate() + nights);

  return {
    hotelId: id,
    searchParams: {
      from_city: 'Moscow',
      from_country: 'RU',
      // Intentionally omit to_country / to_city — resolved from hotel API on details.
      adults: '2',
      kids: '0',
      start_date: startDate,
      start_date_from: startDate,
      end_date_till: formatDateForAPI(endDate),
      nights: String(nights),
      search_type: 'package',
      flex_dates: 0,
      hotel_ids: [Number.isFinite(numericId) ? numericId : Number(id)],
      page_number: 1,
      page_limit: 20,
      sort_by: 'relevance',
    },
    searchSnapshot: {
      startDateISO: startDate,
      nights,
      adults: 2,
      kids: 0,
      kidsAges: [],
    },
  };
}
