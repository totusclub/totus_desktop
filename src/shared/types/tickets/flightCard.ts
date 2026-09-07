export type FlightSegment = {
  id: string;
  direction: 'to' | 'back';
  airlineName: string;
  airlineLogo?: string;
  departureTime: string;
  arrivalTime: string;
  dateLabel: string;
  dateRaw?: string;
  duration: string;
  durationSeconds: number;
  isDirect: boolean;
  /** City route title, e.g. "Москва — Анталья" (kedam-WEB formatRoute). */
  routeTitle?: string;
  /** Airport codes, e.g. "SVO — AYT" (kedam-WEB formatAirports). */
  airportTitle?: string;
  warning?: boolean;
};

export type FlightCard = {
  id: string;
  airlineLogo?: string;
  airlineName: string;
  airlineId?: string;
  takeoff: string;
  landing: string;
  duration: string;
  durationSeconds: number;
  date: string;
  transfer: string;
  direct: boolean;
  baggage: string[];
  price: string;
  /** Flight fuel_charge / surcharge (Доплаты и сборы), not tour total. */
  priceValue: number;
  fuelCharge: number;
  note?: string;
  secondaryOperator?: string;
  segments: FlightSegment[];
};

