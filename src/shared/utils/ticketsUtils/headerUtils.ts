import {
  formatDateRangeShort,
  formatTouristsText,
} from '../../component/home/searchSection/utils/searchHelpers';
import type { HotelMeta, SearchContext } from '../../types/tickets';

// Re-export types for backward compatibility
export type { HotelMeta, SearchContext };

type PackageInfo = any;

type FlightLike = {
  segments?: Array<{ dateRaw?: string }>;
};

export const getHeaderDestination = (
  hotelMeta: HotelMeta | undefined,
  packageInfo: PackageInfo,
) => {
  const city =
    hotelMeta?.city ||
    packageInfo?.hotel?.city_name ||
    packageInfo?.hotel?.city?.name_ru;
  const country =
    hotelMeta?.country ||
    packageInfo?.hotel?.country?.name ||
    packageInfo?.hotel?.country_name;
  const hotelName = hotelMeta?.name || packageInfo?.hotel?.name;

  if (hotelName) {
    if (country) {
      return `${hotelName}, ${country}`;
    }
    if (city) {
      return `${hotelName}, ${city}`;
    }
    return hotelName;
  }

  return city || country || 'Билеты';
};

export const getHeaderSubtitle = (
  searchContext: SearchContext | undefined,
  packageInfo: PackageInfo,
  flights: FlightLike[],
) => {
  const startDate =
    searchContext?.startDate ||
    packageInfo?.start_date ||
    flights[0]?.segments?.[0]?.dateRaw;
  const nights =
    searchContext?.nights ||
    packageInfo?.nights ||
    flights.length ||
    0;

  const dateRange = startDate ? formatDateRangeShort(startDate, nights) : '';
  const adults = searchContext?.adults ?? packageInfo?.tourists?.adults ?? 2;
  const kids = searchContext?.kids ?? packageInfo?.tourists?.kids ?? 0;
  const tourists = formatTouristsText(String(adults), String(kids));

  return [dateRange, tourists].filter(Boolean).join(' · ');
};

