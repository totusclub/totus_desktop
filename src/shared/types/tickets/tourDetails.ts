export type TourDetails = {
  resort: {
    country: string;
    city: string;
  };
  flightDates: {
    startDate: string;
    endDate: string;
    nights: number;
  };
  tourists: {
    adults: number;
    kids: number;
    kidsAges?: number[];
  };
  hotel: {
    name: string;
  };
  room: {
    name: string;
  };
  meals: string;
  transfer: {
    included: boolean;
  };
  insurance: {
    included: boolean;
  };
  operator: string;
};

