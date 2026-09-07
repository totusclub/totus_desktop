import type { HotelRoom, Offer } from '../../types/hotel';
import type { DateOption, OffersByMealType } from '../../types/hotel/roomHelpers';

// Re-export types for backward compatibility
export type { DateOption, OffersByMealType };

/** Exact nights match — same as kedam-WEB offerMatchesSearchNights (no flex range). */
export function offerMatchesSearchNights(
  offer: { nights_count?: number | string | null },
  searchNights: number | null | undefined,
): boolean {
  if (searchNights == null) return true;
  const nights = Number(offer?.nights_count);
  if (!Number.isFinite(nights)) return false;
  return nights === searchNights;
}

function offerMatchesDateAndNights(
  offer: Offer,
  selectedDate: string | null | undefined,
  searchNights?: number | null,
): boolean {
  if (selectedDate && offer.start_date !== selectedDate) return false;
  return offerMatchesSearchNights(offer, searchNights);
}

/**
 * Extract unique departure dates from room offers (exact nights when provided).
 * Prefer the search start date only (no ±2 flex tabs) — same as kedam_WEB flex_dates=0.
 */
export const extractDateOptions = (
  rooms: HotelRoom[],
  searchNights?: number | null,
  preferredStartDate?: string | null,
): DateOption[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dateMap = new Map<string, { date: string; minPrice: number }>();

  rooms.forEach((room) => {
    Object.values(room.offers).forEach((offerList: Offer[]) => {
      offerList.forEach((offer) => {
        if (!offer.start_date) return;
        if (!offerMatchesSearchNights(offer, searchNights)) return;

        const offerDate = new Date(offer.start_date);
        offerDate.setHours(0, 0, 0, 0);
        if (offerDate < today) return;

        const existing = dateMap.get(offer.start_date);
        if (!existing || offer.price < existing.minPrice) {
          dateMap.set(offer.start_date, {
            date: offer.start_date,
            minPrice: offer.price,
          });
        }
      });
    });
  });

  // Fixed search date: if that day has offers, show only that tab.
  if (preferredStartDate && dateMap.has(preferredStartDate)) {
    const only = dateMap.get(preferredStartDate)!;
    dateMap.clear();
    dateMap.set(only.date, only);
  }

  const sortedDates = Array.from(dateMap.values()).sort((a, b) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  return sortedDates.map((item) => {
    const date = new Date(item.date);
    const day = date.getDate();
    const monthFormatter = new Intl.DateTimeFormat('ru-RU', {
      month: 'long',
    });
    const month = monthFormatter.format(date);
    const dayFormatter = new Intl.DateTimeFormat('ru-RU', {
      weekday: 'short',
    });

    return {
      date: item.date,
      formattedDate: `${day} ${month}`,
      dayOfWeek: dayFormatter.format(date),
      minPrice: item.minPrice,
    };
  });
};

/**
 * Keep rooms that have offers for selected date + exact search nights.
 * Trims in-room offers to matching ones (kedam-WEB filterRoomsBySelectedDate).
 */
export const filterRoomsByDate = (
  rooms: HotelRoom[],
  selectedDate: string | null,
  searchNights?: number | null,
): HotelRoom[] => {
  if (!selectedDate && searchNights == null) {
    return rooms;
  }

  return rooms
    .map((room) => {
      const filteredOffers: { [key: string]: Offer[] } = {};

      Object.entries(room.offers ?? {}).forEach(([mealType, offerList]) => {
        const offers = (offerList ?? []).filter((offer) =>
          offerMatchesDateAndNights(offer, selectedDate, searchNights),
        );
        if (offers.length > 0) {
          filteredOffers[mealType] = offers;
        }
      });

      if (Object.keys(filteredOffers).length === 0) return null;
      return { ...room, offers: filteredOffers };
    })
    .filter(Boolean) as HotelRoom[];
};

/**
 * Extract all unique operators from room offers
 */
export const extractOperators = (room: HotelRoom): string[] => {
  const operatorSet = new Set<string>();
  Object.values(room.offers).forEach((offerList: Offer[]) => {
    offerList.forEach((offer) => {
      operatorSet.add(offer.operator_name);
    });
  });
  return Array.from(operatorSet);
};

/**
 * Group offers by meal type, filtered by selected operator
 */
export const groupOffersByMealType = (
  room: HotelRoom,
  selectedOperator: string | null,
): OffersByMealType => {
  const grouped: OffersByMealType = {};

  room.meal_types.forEach((mealType) => {
    const offers = room.offers[mealType.id] || [];
    // Filter offers by selected operator
    const filteredOffers = offers.filter(
      (offer) => !selectedOperator || offer.operator_name === selectedOperator,
    );
    // Only add to grouped if there are offers after filtering
    if (filteredOffers.length > 0) {
      grouped[mealType.id] = {
        mealType,
        offers: filteredOffers,
      };
    }
  });

  return grouped;
};

/**
 * Format date string to "до ДД.ММ" format
 */
export const formatOfferDate = (dateStr: string): string => {
  const [year, month, day] = dateStr.split('-');
  return `до ${day}.${month}`;
};

/**
 * Format price with non-breaking spaces for thousands separator
 */
export const formatOfferPrice = (price: number): string => {
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

/** Prefer analytics_price (kedam-WEB getOfferPriceValue). */
export function getOfferPriceValue(offer: {
  analytics_price?: number | string | null;
  price?: number | string | null;
}): number | null {
  const value = Number(offer?.analytics_price ?? offer?.price);
  return Number.isFinite(value) ? value : null;
}

/**
 * Cheapest offer for a start_date across all rooms (kedam-WEB parity).
 * Optionally restrict by nights and meal codes.
 */
export function findCheapestOfferForStartDate(
  rooms: HotelRoom[] | null | undefined,
  startDate: string,
  nightsCount?: number | null,
  mealIds?: string[] | null,
): Offer | null {
  if (!rooms?.length || !startDate) return null;

  let best: Offer | null = null;
  let bestPrice = Infinity;
  const mealSet =
    mealIds?.length
      ? new Set(mealIds.map(id => String(id).toUpperCase()))
      : null;

  rooms.forEach(room => {
    const offers = room?.offers || {};
    Object.entries(offers).forEach(([mealType, offerList]) => {
      if (mealSet && !mealSet.has(String(mealType).toUpperCase())) return;
      if (!Array.isArray(offerList)) return;
      offerList.forEach((offer: Offer) => {
        if (offer?.start_date !== startDate) return;
        if (!offerMatchesSearchNights(offer, nightsCount ?? null)) return;
        const price = getOfferPriceValue(offer);
        if (price == null) return;
        if (price < bestPrice) {
          bestPrice = price;
          best = offer;
        }
      });
    });
  });

  return best;
}
