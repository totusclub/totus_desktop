import { RUS_MONTHS_SHORT, RUS_WEEKDAYS_SHORT, safeDate } from './flightTransformers';
import type { TourDetails } from '../../types/tickets';

// Re-export type for backward compatibility
export type { TourDetails };

function pluralizeRu(
  count: number,
  forms: [one: string, few: string, many: string],
): string {
  const abs = Math.abs(Math.trunc(count));
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1];
  return forms[2];
}

/**
 * Format date range: "17 мая, сб – 24 мая, сб"
 */
export const formatDateRange = (startDate: string, nights: number): string => {
  const start = safeDate(startDate);
  if (!start) return '';

  const end = new Date(start);
  end.setDate(end.getDate() + nights);

  const startDay = start.getDate();
  const startMonth = RUS_MONTHS_SHORT[start.getMonth()];
  const startWeekday = RUS_WEEKDAYS_SHORT[start.getDay()];

  const endDay = end.getDate();
  const endMonth = RUS_MONTHS_SHORT[end.getMonth()];
  const endWeekday = RUS_WEEKDAYS_SHORT[end.getDay()];

  return `${startDay} ${startMonth}, ${startWeekday} – ${endDay} ${endMonth}, ${endWeekday}`;
};

/**
 * Format tourists text: "2 взрослых" or "2 взрослых, 1 ребёнок"
 */
export const formatTouristsText = (adults: number, kids: number, kidsAges?: number[]): string => {
  const parts: string[] = [];

  if (adults > 0) {
    parts.push(
      `${adults} ${pluralizeRu(adults, ['взрослый', 'взрослых', 'взрослых'])}`,
    );
  }

  if (kids > 0) {
    parts.push(
      `${kids} ${pluralizeRu(kids, ['ребёнок', 'ребёнка', 'детей'])}`,
    );
  }

  return parts.join(', ') || '0 взрослых';
};

/**
 * Format nights text: "7 ночей"
 */
export const formatNightsText = (nights: number): string => {
  if (nights === 1) return '1 ночь';
  if (nights < 5) return `${nights} ночи`;
  return `${nights} ночей`;
};

/**
 * Extract tour details from package info and search context
 */
export const extractTourDetails = (
  packageInfo: any,
  hotelMeta?: { name?: string; country?: string; city?: string },
  searchContext?: {
    startDate?: string;
    nights?: number;
    adults?: number;
    kids?: number;
    kidsAges?: number[];
  },
): TourDetails => {
  const hotel = packageInfo?.hotel || {};
  const tour = packageInfo?.tour || {};

  // Resort info
  const country = hotelMeta?.country || hotel?.country?.name || hotel?.country_name || '';
  const city = hotelMeta?.city || hotel?.city?.name_ru || hotel?.city_name || '';

  // Dates
  const startDate =
    searchContext?.startDate ||
    packageInfo?.start_date ||
    tour?.start_date ||
    '';
  const nights = searchContext?.nights || packageInfo?.nights || tour?.nights || 0;

  // Tourists
  const adults = searchContext?.adults || packageInfo?.tourists?.adults || 2;
  const kids = searchContext?.kids || packageInfo?.tourists?.kids || 0;
  const kidsAges = searchContext?.kidsAges || packageInfo?.tourists?.kids_ages || [];

  // Hotel and room
  const hotelName = hotelMeta?.name || hotel?.name || '';
  const roomName =
    packageInfo?.room_type ||
    packageInfo?.room?.name ||
    packageInfo?.room?.name_ru ||
    tour?.room?.name ||
    tour?.room?.name_ru ||
    tour?.room_type ||
    '';

  // Meals
  const mealType = packageInfo?.meal_type || tour?.meal_type || {};
  const mealName = mealType?.name_ru || mealType?.name || 'Завтрак';

  // Transfer
  const transferIncluded = Boolean(
    packageInfo?.transfer?.included ||
      tour?.transfer?.included ||
      packageInfo?.transfer_included,
  );

  // Insurance
  const insuranceIncluded = Boolean(
    packageInfo?.insurance?.included ||
      tour?.insurance?.included ||
      packageInfo?.insurance_included,
  );

  // Operator
  const operator = packageInfo?.operator?.name || tour?.operator?.name || '';

  return {
    resort: {
      country,
      city,
    },
    flightDates: {
      startDate,
      endDate: '', // Will be calculated from startDate + nights
      nights,
    },
    tourists: {
      adults,
      kids,
      kidsAges,
    },
    hotel: {
      name: hotelName,
    },
    room: {
      name: roomName,
    },
    meals: mealName,
    transfer: {
      included: transferIncluded,
    },
    insurance: {
      included: insuranceIncluded,
    },
    operator,
  };
};

