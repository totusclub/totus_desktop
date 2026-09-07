export type TourAssistantV2MessageType = 'text' | 'hotels';

export type TourAssistantV2Role = 'user' | 'assistant';

export interface AiHotelResult {
  id?: number | string;
  name?: string;
  city_name?: string;
  stars?: number;
  rating?: number;
  reviews_count?: number;
  min_price?: number;
  room_type?: string;
  meal_type?: string;
  meal_id?: string;
  room_id?: number | string;
  room_listing_id?: number | string;
  offer_id?: string;
  operator_id?: number | string;
  operator_name?: string;
  room_price?: number;
  start_date?: string;
  images?: unknown[];
  description?: string;
  amenities?: string[];
  hotel?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface TourAssistantV2Message {
  id: string;
  role: TourAssistantV2Role;
  type: TourAssistantV2MessageType;
  content: string;
  hotels?: AiHotelResult[];
  createdAt: string;
}

export interface TourAssistantV2ConversationSummary {
  id: string;
  title: string;
  updatedAt: string;
  preview?: string;
}

export type TourAssistantV2State =
  | 'collecting_params'
  | 'ready_to_search'
  | 'searching'
  | 'results';

export interface TourAssistantV2SearchParams {
  from_city?: string;
  from_country?: string;
  to_country?: string;
  to_city?: string;
  hotel_name?: string;
  adults?: string;
  kids?: string;
  kids_ages?: string[];
  start_date?: string;
  nights?: number;
  search_intent?: 'hotel' | 'package' | '';
  search_type?: string;
  hotel_ids?: string[];
  filter_price_max?: string;
  filter_meals?: string;
  page_number?: number;
  page_limit?: number;
  sort_by?: string;
}

export interface TourAssistantV2Results {
  hotels: AiHotelResult[];
}

export interface TourAssistantV2SearchSession {
  requestId: string | null;
  readyOperators?: string[];
  currentPage?: number;
}

export interface SendMessageV2Response {
  ok: boolean;
  conversationId: string;
  state: TourAssistantV2State;
  messages: TourAssistantV2Message[];
  results: TourAssistantV2Results;
  searchParams?: TourAssistantV2SearchParams;
  searchSession?: TourAssistantV2SearchSession;
}

export interface ListConversationsV2Response {
  ok: boolean;
  conversations: TourAssistantV2ConversationSummary[];
}

export interface CreateConversationV2Response {
  ok: boolean;
  conversationId: string;
  state: TourAssistantV2State;
  messages: TourAssistantV2Message[];
  results: TourAssistantV2Results;
  searchParams?: TourAssistantV2SearchParams;
  searchSession?: TourAssistantV2SearchSession;
  conversation: {
    id: string;
    title: string;
    updatedAt: string;
  };
}
