export interface HotelReview {
  id: number;
  average_rating: number;
  name: string;
  author: number;
  avatar_url: string;
  title: string;
  content: string;
  answer?: string;
  created_at: string;
}

export interface HotelReviewsResponse {
  success: boolean;
  hotel: {
    id: number;
    rating: number;
    name: string;
  };
  reviews: HotelReview[];
}

export interface GetHotelReviewsParams {
  hotel_id: number | string;
  page?: number;
  per_page?: number;
}
