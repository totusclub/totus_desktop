export type AirportInfo = {
  city: string;
  airport: string;
  code: string;
};

export type FlightTransitionInfo = {
  city: string;
  airport: string;
  code: string;
  arrivalTime?: string;
  arrivalDate?: string;
  departureTime?: string;
  departureDate?: string;
  duration?: string;
  durationSeconds?: number;
  type?: 'usual' | 'long';
  airlineName?: string;
  airlineLogo?: string;
  flightNo?: string;
};

export type FlightDetailSegment = {
  id: string;
  direction: 'to' | 'back';
  airlineName: string;
  airlineLogo?: string;
  aircraft?: string;
  flightNo?: string;
  departureTime: string;
  arrivalTime: string;
  departureDate: string;
  arrivalDate: string;
  departureAirport: AirportInfo;
  arrivalAirport: AirportInfo;
  duration: string;
  durationSeconds: number;
  isDirect: boolean;
  flightType: 'regular' | 'block';
  transitions?: FlightTransitionInfo[];
  layover?: {
    city: string;
    airport: string;
    code: string;
    duration: string;
    durationSeconds: number;
    type: 'usual' | 'long';
  };
  baggage: {
    class: string;
    handLuggage: Array<{ weight?: number; count?: number; direction: 'туда' | 'обратно' }>;
    holdLuggage: Array<{ weight?: number; count?: number; direction: 'туда' | 'обратно' }>;
    isBlock: boolean;
  };
};

export type FlightDetails = {
  to?: FlightDetailSegment;
  back?: FlightDetailSegment;
};

