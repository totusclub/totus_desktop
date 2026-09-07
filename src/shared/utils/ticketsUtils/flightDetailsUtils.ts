import { RUS_MONTHS_SHORT, RUS_WEEKDAYS_SHORT, safeDate } from './flightTransformers';
import type {
  AirportInfo,
  FlightDetailSegment,
  FlightDetails,
  FlightTransitionInfo,
} from '../../types/tickets';

// Re-export types for backward compatibility
export type { AirportInfo, FlightDetailSegment, FlightDetails };

/**
 * Format date for detailed view: "7 авг, чт"
 */
export const formatDetailDate = (dateStr?: string): string => {
  const date = safeDate(dateStr);
  if (!date) return '';
  const day = date.getDate();
  const month = RUS_MONTHS_SHORT[date.getMonth()];
  const weekday = RUS_WEEKDAYS_SHORT[date.getDay()];
  return `${day} ${month}, ${weekday}`;
};

/**
 * Format time: "16:10"
 */
export const formatDetailTime = (dateStr?: string): string => {
  const date = safeDate(dateStr);
  return date
    ? date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    : '--:--';
};

/**
 * Format duration: "6ч 15м"
 */
export const formatDetailDuration = (seconds?: number): string => {
  if (!seconds) return '';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}ч ${minutes}м`;
};

/**
 * Format layover duration: "23ч 0м обычная пересадка"
 */
export const formatLayoverDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}ч ${minutes}м`;
};

/**
 * Extract airport information from segment
 */
const extractAirportInfo = (airport: any): AirportInfo => {
  // Extract city name - check nested city object first, then fallback to flat properties
  const cityName =
    airport?.city?.name ||
    airport?.city_name_ru ||
    airport?.city_name ||
    airport?.city?.name_ru ||
    '';

  // Extract airport name
  const airportName = airport?.name_ru || airport?.name || '';

  // Extract code
  const code = airport?.code || '';

  return {
    city: cityName,
    airport: airportName,
    code: code,
  };
};

/**
 * Extract baggage information from segment
 */
const extractBaggageInfo = (segment: any, direction: 'туда' | 'обратно'): FlightDetailSegment['baggage'] => {
  const luggage = segment?.luggage || {};
  const handLuggage: FlightDetailSegment['baggage']['handLuggage'] = [];
  const holdLuggage: FlightDetailSegment['baggage']['holdLuggage'] = [];

  if (luggage.hand) {
    handLuggage.push({
      weight: luggage.hand.weight,
      count: luggage.hand.count,
      direction,
    });
  }

  if (luggage.hold) {
    holdLuggage.push({
      weight: luggage.hold.weight,
      count: luggage.hold.count,
      direction,
    });
  }

  const classValue = segment?.class || '';
  const formattedClass = classValue === 'econom' ? 'Эконом' : classValue === 'business' ? 'Бизнес' : classValue;

  return {
    class: formattedClass,
    handLuggage,
    holdLuggage,
    isBlock: Boolean(segment?.availability?.flight),
  };
};

const resolveLogoUrl = (logo?: { src?: string; srcset?: string }): string | undefined => {
  if (!logo) return undefined;
  if (logo.src) return logo.src;
  if (typeof logo.srcset === 'string') {
    const [first] = logo.srcset.split(' ');
    return first;
  }
  return undefined;
};

const calculateDurationSeconds = (arrival?: string, departure?: string): number | undefined => {
  const arrivalDate = safeDate(arrival);
  const departureDate = safeDate(departure);

  if (!arrivalDate || !departureDate) {
    return undefined;
  }

  const diff = Math.max(0, Math.round((departureDate.getTime() - arrivalDate.getTime()) / 1000));
  return diff;
};

const mapTransitionBaseInfo = (airportData: any = {}) => ({
  city: airportData?.city?.name || airportData?.city_name_ru || airportData?.city_name || '',
  airport: airportData?.name_ru || airportData?.name || '',
  code: airportData?.code || '',
});

const extractTransitionFromLegacyFields = (segment: any): FlightTransitionInfo | null => {
  if (!segment?.transition) {
    return null;
  }

  const airportData = segment.transition;
  const flightInfo = segment.transition_flight || {};
  const airline = flightInfo?.airline || {};
  const times = segment.transition_time || {};

  const arrivalISO = times.arrival;
  const departureISO = times.departure;
  const durationSeconds = times.duration_seconds ?? calculateDurationSeconds(arrivalISO, departureISO);
  const isLong = durationSeconds != null ? durationSeconds > 12 * 3600 : undefined;

  return {
    ...mapTransitionBaseInfo(airportData),
    arrivalTime: formatDetailTime(arrivalISO),
    arrivalDate: formatDetailDate(arrivalISO),
    departureTime: formatDetailTime(departureISO),
    departureDate: formatDetailDate(departureISO),
    duration: durationSeconds != null ? formatLayoverDuration(durationSeconds) : undefined,
    durationSeconds: durationSeconds ?? undefined,
    type: isLong ? 'long' : 'usual',
    airlineName: airline?.name || flightInfo?.airline_name,
    airlineLogo: resolveLogoUrl(airline?.logo),
    flightNo: flightInfo?.flight_no || flightInfo?.flight_number,
  };
};

const extractTransitionFromTransfer = (transfer: any): FlightTransitionInfo | null => {
  if (!transfer) {
    return null;
  }

  const airportData = transfer?.airport || transfer?.transition || transfer;
  const arrivalISO =
    transfer?.arrival_time ||
    transfer?.arrival ||
    transfer?.transition_time?.arrival ||
    transfer?.arrival_at;
  const departureISO =
    transfer?.departure_time ||
    transfer?.departure ||
    transfer?.transition_time?.departure ||
    transfer?.departure_at;

  const durationSeconds =
    transfer?.duration_seconds ?? transfer?.duration ?? calculateDurationSeconds(arrivalISO, departureISO);
  const isLong = durationSeconds != null ? durationSeconds > 12 * 3600 : undefined;

  const flightInfo = transfer?.transition_flight || {};
  const airline = transfer?.airline || flightInfo?.airline || {};

  return {
    ...mapTransitionBaseInfo(airportData),
    arrivalTime: formatDetailTime(arrivalISO),
    arrivalDate: formatDetailDate(arrivalISO),
    departureTime: formatDetailTime(departureISO),
    departureDate: formatDetailDate(departureISO),
    duration: durationSeconds != null ? formatLayoverDuration(durationSeconds) : undefined,
    durationSeconds: durationSeconds ?? undefined,
    type: isLong ? 'long' : 'usual',
    airlineName: airline?.name || flightInfo?.airline_name,
    airlineLogo: resolveLogoUrl(airline?.logo || flightInfo?.airline?.logo),
    flightNo: transfer?.flight_no || transfer?.flight_number || flightInfo?.flight_no,
  };
};

const extractTransitions = (segment: any): FlightTransitionInfo[] | undefined => {
  const transitions: FlightTransitionInfo[] = [];

  if (Array.isArray(segment?.transfers)) {
    segment.transfers.forEach((transfer: any) => {
      const info = extractTransitionFromTransfer(transfer);
      if (info) {
        transitions.push(info);
      }
    });
  }

  const legacy = extractTransitionFromLegacyFields(segment);
  if (legacy) {
    transitions.push(legacy);
  }

  return transitions.length ? transitions : undefined;
};

const buildLayoverFromTransitions = (
  transitions?: FlightTransitionInfo[],
): FlightDetailSegment['layover'] => {
  if (!transitions || transitions.length === 0) {
    return undefined;
  }

  const [first] = transitions;
  return {
    city: first.city,
    airport: first.airport,
    code: first.code,
    duration: first.duration || '',
    durationSeconds: first.durationSeconds || 0,
    type: first.type || 'usual',
  };
};

/**
 * Transform raw flight segment to detailed flight segment
 */
export const transformFlightSegment = (
  segment: any,
  direction: 'to' | 'back',
  flightPair?: any, // Pass flight pair in case airport data is at flight level
): FlightDetailSegment => {
  const segmentId = segment?.flight_id ?? `tmp_${Date.now()}_${direction}`;
  const airline = segment?.airline || {};
  
  // Get logo URL
  const logo = airline?.logo || {};
  const airlineLogo = resolveLogoUrl(logo);

  // Extract aircraft info
  const aircraft = segment?.aircraft?.name || segment?.aircraft_name || '';

  // Extract flight number
  const flightNo = segment?.flight_no || segment?.flight_number || '';

  // Extract airports - check multiple possible field names
  // Try segment level first, then flight pair level
  const departureAirportData =
    segment?.departure_airport ||
    segment?.departure_airport_info ||
    segment?.origin ||
    segment?.origin_airport ||
    (direction === 'to'
      ? flightPair?.departure_airport || flightPair?.origin || flightPair?.origin_airport
      : flightPair?.back_departure_airport || flightPair?.back_origin) ||
    {};

  const arrivalAirportData =
    segment?.arrival_airport ||
    segment?.arrival_airport_info ||
    segment?.destination ||
    segment?.destination_airport ||
    (direction === 'to'
      ? flightPair?.arrival_airport || flightPair?.destination || flightPair?.destination_airport
      : flightPair?.back_arrival_airport || flightPair?.back_destination) ||
    {};



  const departureAirport = extractAirportInfo(departureAirportData);
  const arrivalAirport = extractAirportInfo(arrivalAirportData);

  // Extract baggage info
  const baggage = extractBaggageInfo(segment, direction === 'to' ? 'туда' : 'обратно');

  // Extract transitions / layovers
  const transitions = extractTransitions(segment);
  const layover = buildLayoverFromTransitions(transitions);

  // Determine flight type
  const flightType: 'regular' | 'block' = segment?.availability?.flight ? 'block' : 'regular';

  return {
    id: `${direction}-${segmentId}`,
    direction,
    airlineName: airline?.name || 'Авиакомпания',
    airlineLogo,
    aircraft,
    flightNo,
    departureTime: formatDetailTime(segment?.departure),
    arrivalTime: formatDetailTime(segment?.arrival),
    departureDate: formatDetailDate(segment?.departure),
    arrivalDate: formatDetailDate(segment?.arrival),
    departureAirport,
    arrivalAirport,
    duration: formatDetailDuration(segment?.time),
    durationSeconds: segment?.time || 0,
    isDirect: Boolean(segment?.direct),
    flightType,
    transitions,
    layover,
    baggage,
  };
};

/**
 * Transform raw flight pair to detailed flight information
 */
export const transformFlightDetails = (flight: any): FlightDetails => {
  const details: FlightDetails = {};

  if (flight?.to) {
    details.to = transformFlightSegment(flight.to, 'to');
  }

  if (flight?.back) {
    details.back = transformFlightSegment(flight.back, 'back');
  }

  return details;
};

