export interface Tourist {
  surname: string;
  name: string;
  patronymic: string;
  birthday: string;
  gender: string | null;
  nationality_id: number | null | undefined;
  doc_type: string;
  passport_number: string | number;
  passport_expires_on: string;
  child?: boolean;
  child_age?: number;
  noPatronymic?: boolean;
}

export interface TouristErrors {
  surname?: string;
  name?: string;
  patronymic?: string;
  birthday?: string;
  gender?: string;
  nationality_id?: string;
  doc_type?: string;
  passport_number?: string;
  passport_expires_on?: string;
}

export interface BookingValidationErrors {
  email?: string;
  phone?: string;
  general?: string;
  tourists?: {
    [index: number]: TouristErrors;
  };
}

export interface BookingRouteParams {
  flightData?: any;
  packageInfo?: any;
  hotelMeta?: any;
  searchType?: 'package' | 'hotel';
  searchContext?: {
    startDateISO?: string;
    startDate?: string;
    nights?: number;
    adults?: number;
    kids?: number;
    kidsAges?: number[];
  };
  totalPrice?: number;
  transferDuration?: string;
}

export interface BookingFormData {
  email: string;
  phone: string;
  tourists: Tourist[];
}

