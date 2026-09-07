export type FetchDestinationsParams = {
  query?: string;
  from_city?: string;
  search_type?: string;
};

export type DestinationItem = {
  id?: string | number;
  name?: string;
  name_en?: string;
  name_ru?: string;
  type?: string;
  country_name?: string;
  country_name_ru?: string;
  city_name?: string;
  iso2?: string;
  visa_type?: string;
  active_regions?: string;
  description?: string;
  image?: string;
  [key: string]: unknown;
};

/** Alias used by search destination field / modal */
export type DestinationResult = DestinationItem;

export type DestinationGroup = {
  group_name?: string;
  results?: DestinationResult[];
  [key: string]: unknown;
};

export type DestinationsResponse = {
  results?: DestinationItem[];
  data?: DestinationItem[];
  [key: string]: unknown;
};
