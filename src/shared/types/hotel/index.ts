export interface HotelOffer {
  id: number;
  tour_id?: number;
  price?: number;
  [key: string]: any;
}

export interface RoomFacility {
  id: number;
  name: string;
  group_identifier: string | null;
}

export interface RoomImage {
  x900?: string;
  x900x380?: string;
}

export interface Room {
  id: number;
  name_ru: string;
  name_en: string;
  accommodation: string;
  area: number;
  description: string;
  view: string;
  facilities: RoomFacility[];
  images: RoomImage[];
}

export interface MealType {
  id: string;
  min_price: number;
  description: string;
}

export interface OfferExtras {
  cheap: boolean;
  instant_confirm: boolean;
  early_booking: boolean;
  best_price: boolean;
  surcharge: number;
  analytics_surcharge: number;
  cancellation_policy: {
    kind: string;
    description: string;
  } | null;
  included: any;
}

export interface OfferAvailability {
  flight: string;
  hotel: string;
  tooltip: string;
}

export interface Offer {
  id: string;
  nights_count: number;
  price: number;
  analytics_price: number;
  operator_id: number;
  operator_name: string;
  start_date: string;
  link: string;
  lt_extras: any;
  price_per_night: number;
  extras: OfferExtras;
  misc_data: any;
  labels: any;
  availability: OfferAvailability;
  confirmability_index: number;
  bonus_count: number;
  cashback_identifier: string | null;
  bundle_id: string;
  acm_component_id: string;
}

export interface HotelRoom {
  ID: string;
  min_price: number;
  bonus_count: number;
  cashback_identifier: string | null;
  meal_types: MealType[];
  room: Room;
  offers: {
    [mealTypeId: string]: Offer[];
  };
  lt_extras: any;
}

export interface HotelRoomsResponse {
  success: boolean;
  result: HotelRoom[];
  labels: any[];
  meta_policies: any[];
  status: {
    [operatorId: string]: string;
  };
  search_type: number;
  currency_symbol: string;
  currency_code: string;
  filters: {
    meals?: Array<{
      id: string;
      name: string;
      min_price: number;
      count: number;
      selected: boolean;
      disabled: boolean;
    }>;
    free_cancel?: any[];
    confirmability?: any[];
    [key: string]: any;
  };
}

export interface HotelInfo {
  id: number;
  name: string;
  name_en?: string;
  city_name?: string;
  stars?: number;
  [key: string]: any;
}

export interface GetHotelOffersParams {
  request_id: string;
  hotel_id: number;
  compact?: boolean;
}

export interface GetHotelRoomsParams {
  request_id: string;
  hotel_id: number | string;
  meals?: string;
  confirmability?: string;
  free_cancel?: boolean;
  operators?: string;
}

export interface GetHotelInfoParams {
  hotel_id: number;
  search_type?: SearchTypeValue | string;
}

export type SearchTypeValue = 'package' | 'hotel';

// Re-export types from submodules
export * from './roomHelpers';
export * from './hotelCard';
export * from './expandableSections';
export * from './search';
export * from './reviews';
