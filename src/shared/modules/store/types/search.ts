export interface SearchParams {
  from_city?: string;
  from_country?: string;
  to_country?: string;
  to_city?: string;
  adults?: string;
  kids?: string;
  kids_ages?: number[];
  start_date?: string;
  nights?: string;
  flex_dates?: number;
  start_date_from?: string;
  start_date_till?: string;
  end_date_from?: string;
  end_date_till?: string;
  search_type?: string;
  hotel_ids?: number[];
  page_number?: number;
  page_limit?: number;
  sort_by?: string;
  
}

export interface FilterParams {
  request_id?: string;
  readyOperators?: string[];
  filter_instant_confirm?: boolean;
  filter_stars?: string;
  filter_meals?: string;
  page_number?: number;
  page_limit?: number;
  sort_by?: string;
  [key: string]: any;
}

export interface SearchStatus {
  [operatorId: string]: 'completed' | 'cached' | 'performing' | 'pending';
}

export interface Hotel {
  id: number;
  name: string;
  name_en?: string;
  city_name?: string;
  stars?: number;
  [key: string]: any;
}

export interface GroupedHotelsResponse {
  hotels: Hotel[];
  request_id?: string;
  page_number?: number;
  page_limit?: number;
  [key: string]: any;
}

export interface StartSearchResponse {
  request_id: string;
}

