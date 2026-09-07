export type HotelInfo = {
  id?: string | number;
  name?: string;
  name_en?: string;
  city_name?: string;
  country_name?: string;
  stars?: number;
  rating?: number;
  reviews?: number;
  min_price?: number;
  price?: string | number;
  dateRange?: string;
  tags?: string[];
  images?: Array<string | { uri: string } | number>;
  image?: string;
  address?: string;
  [key: string]: unknown;
};
