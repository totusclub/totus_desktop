import type { SearchParams } from '../types/search';
import type { HotelSearchSnapshot } from '../types/hotel';
import type { TourAssistantV2SearchParams, AiHotelResult } from '../types/tourAssistantV2';
import type { AiRoomPick } from './hotelUtils/aiRoomPick';
import { normalizeSearchMealsToRoomCodes } from './hotelUtils/aiRoomPick';

export type AiHotelRouteParams = {
  hotelId: string;
  requestId?: string;
  searchParams: SearchParams;
  searchSnapshot: HotelSearchSnapshot;
  aiRoomPick?: AiRoomPick;
};

export function buildAiRoomPickFromHotel(
  hotel: AiHotelResult,
  searchParams: TourAssistantV2SearchParams,
): AiRoomPick | undefined {
  const nested = (hotel.hotel as AiHotelResult | undefined) ?? {};

  const roomType = hotel.room_type || nested.room_type;
  const mealType = hotel.meal_type || nested.meal_type;
  const mealCodesFromFilter = normalizeSearchMealsToRoomCodes(searchParams.filter_meals);
  const enforceMealFilter = mealCodesFromFilter.length > 0;
  // Only hide other meals when search filter_meals was set — never from card/AI item alone.
  const mealId = enforceMealFilter
    ? mealCodesFromFilter.join(',')
    : undefined;
  const roomId =
    normalizePickIdFromHotel(hotel.room_id) ||
    normalizePickIdFromHotel(nested.room_id) ||
    normalizePickIdFromHotel((hotel as { roomId?: number | string }).roomId) ||
    normalizePickIdFromHotel((nested as { roomId?: number | string }).roomId);
  const roomListingId =
    normalizePickIdFromHotel(hotel.room_listing_id) ||
    normalizePickIdFromHotel(nested.room_listing_id);
  const offerId =
    normalizePickIdFromHotel(hotel.offer_id) ||
    normalizePickIdFromHotel(nested.offer_id);
  const operatorId =
    normalizePickIdFromHotel(hotel.operator_id) ||
    normalizePickIdFromHotel(nested.operator_id);
  const operatorName =
    normalizePickIdFromHotel(hotel.operator_name) ||
    normalizePickIdFromHotel(nested.operator_name);
  const roomPrice = hotel.room_price || hotel.min_price || nested.room_price || nested.min_price;
  const startDate =
    normalizePickIdFromHotel(hotel.start_date) ||
    normalizePickIdFromHotel(nested.start_date) ||
    normalizePickIdFromHotel(searchParams.start_date);

  if (!roomType && !mealType && !mealId && !roomId && !roomListingId && !operatorId && !operatorName) {
    return undefined;
  }

  return {
    roomType,
    mealType,
    mealId,
    roomId,
    roomListingId,
    offerId,
    operatorId,
    operatorName,
    roomPrice: roomPrice ? Number(roomPrice) : undefined,
    startDate,
    enforceMealFilter,
  };
}

function normalizePickIdFromHotel(value?: unknown): string | undefined {
  if (typeof value === 'number' || typeof value === 'string') {
    const normalized = String(value).trim();
    return normalized ? normalized : undefined;
  }
  return undefined;
}

export function buildAiHotelRouteParams(
  searchParams: TourAssistantV2SearchParams,
  hotelId: string | number,
  hotel?: AiHotelResult,
): AiHotelRouteParams {
  const id = String(hotelId);
  const numericId = parseInt(id, 10);
  const nights =
    typeof searchParams.nights === 'number'
      ? searchParams.nights
      : parseInt(String(searchParams.nights || 7), 10) || 7;

  const routeSearchParams: SearchParams = {
    from_city: searchParams.from_city || 'Moscow',
    from_country: searchParams.from_country || 'RU',
    to_country: searchParams.to_country,
    to_city: searchParams.to_city,
    adults: searchParams.adults || '2',
    kids: searchParams.kids ?? '0',
    kids_ages: (searchParams.kids_ages || []).map((age) => parseInt(String(age), 10)),
    start_date: searchParams.start_date,
    nights: String(nights),
    search_type: searchParams.search_type || 'package',
    // Hotel rooms: exact departure date only (no ±2 flex) — same as kedam_WEB.
    flex_dates: 0,
    hotel_ids: [Number.isFinite(numericId) ? numericId : Number(id)],
    filter_meals: searchParams.filter_meals,
    filter_price_max: searchParams.filter_price_max,
    page_number: 1,
    page_limit: 20,
    sort_by: 'relevance',
  };

  return {
    hotelId: id,
    // Do not pass package-listing requestId — /hotels-rooms needs a hotel-scoped startSearch.
    searchParams: routeSearchParams,
    searchSnapshot: {
      startDateISO: searchParams.start_date || '',
      nights,
      adults: parseInt(searchParams.adults || '2', 10),
      kids: parseInt(String(searchParams.kids ?? '0'), 10),
      kidsAges: (searchParams.kids_ages || []).map((age) => parseInt(String(age), 10)),
    },
    aiRoomPick: hotel ? buildAiRoomPickFromHotel(hotel, searchParams) : undefined,
  };
}
