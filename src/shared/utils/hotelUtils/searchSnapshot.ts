import type { SearchParams } from '../../types/search';
import type { HotelSearchSnapshot } from '../../types/hotel';

const parseNumber = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const buildSnapshotFromParams = (params?: SearchParams | null): HotelSearchSnapshot | null => {
  if (!params?.start_date) {
    return null;
  }

  return {
    startDateISO: params.start_date,
    nights: parseNumber(params.nights, 7),
    adults: parseNumber(params.adults, 2),
    kids: parseNumber(params.kids, 0),
    kidsAges: params.kids_ages || [],
  };
};

