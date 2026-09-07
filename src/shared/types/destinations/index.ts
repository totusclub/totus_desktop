export interface DestinationResult {
  id: number;
  name: string;
  name_en?: string | null;
  iso2?: string;
  visa_type?: string | null;
  visa_type_code?: string | null;
  active_regions?: string;
  description?: string;
  country_name_ru?: string;
  country_name_en?: string;
  city_name?: string;
  budget?: number;
  image?: string;
  name_ru_form3?: string;
  country_id?: number;
  public_url?: string;
  stars?: number;
  icon?: string | null;
}

export interface DestinationGroup {
  group_name: 'countries' | 'regions' | 'metaregions' | 'hotels';
  results: DestinationResult[];
}

export type DestinationsResponse = DestinationGroup[];

export interface FetchDestinationsParams {
  query: string;
  from_city?: string;
  search_type?: string;
}

