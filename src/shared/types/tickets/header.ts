export type HotelMeta = {
  name?: string;
  country?: string;
  city?: string;
};

export type SearchContext = {
  startDate?: string;
  nights?: number;
  adults?: number;
  kids?: number;
  kidsAges?: number[];
};

