export type ExpandableSection = {
  id: string;
  title: string;
  subtitle: string;
};

// API Hotel Data Type (from /references/hotels endpoint)
export type ApiHotelData = {
  short_info?: string;
  hotel_info?: string;
  territory?: string[];
  kids_facilities?: string[];
  attractions?: string[];
  facts?: Array<{
    title: string;
    description: string;
    icon_path: string;
  }>;
  faq?: Array<{
    question: string;
    answer: string;
  }>;
  [key: string]: any;
};

