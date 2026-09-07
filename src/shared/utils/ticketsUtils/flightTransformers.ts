import { FlightCard, FlightSegment } from "../../types/tickets/flightCard";
import { formatMoneyRub, toMoney } from '../packagePrice';

export const RUS_MONTHS_SHORT = [
  'янв',
  'фев',
  'мар',
  'апр',
  'май',
  'июн',
  'июл',
  'авг',
  'сен',
  'окт',
  'ноя',
  'дек',
];

export const RUS_WEEKDAYS_SHORT = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

// Helper to safely parse dates
export const safeDate = (dateStr?: string): Date | null => {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
};

const priceFormatter = new Intl.NumberFormat('ru-RU');

export const transformFlightPair = (flight: any): FlightCard => {
  const segments: FlightSegment[] = [];
  if (flight?.to) {
    segments.push(createSegment(flight.to, 'to'));
  }
  if (flight?.back) {
    segments.push(createSegment(flight.back, 'back'));
  }
  const firstSegment = segments[0];

  // LT: fuel_charge is the flight surcharge (Доплаты и сборы), not the tour total.
  const fuelCharge = toMoney(flight?.fuel_charge);
  const priceValue = fuelCharge;

  const flightId = flight?.flight_pair_id ?? flight?.id ?? `tmp_${Date.now()}`;

  return {
    id: String(flightId),
    airlineName: firstSegment?.airlineName || 'Авиакомпания',
    airlineId: String(flight?.to?.airline?.id || ''),
    takeoff: firstSegment?.departureTime || '--:--',
    landing: firstSegment?.arrivalTime || '--:--',
    duration: firstSegment?.duration || '',
    durationSeconds: firstSegment?.durationSeconds || 0,
    date: firstSegment?.dateLabel || '',
    transfer: firstSegment?.isDirect ? 'Прямой' : 'С пересадкой',
    direct: segments.every(segment => segment.isDirect),
    baggage: buildBaggageBadges(flight),
    price: formatMoneyRub(priceValue),
    priceValue,
    fuelCharge,
    secondaryOperator: segments[1]?.airlineName,
    note: flight?.warning ? flight?.availability?.tooltip : undefined,
    segments,
  };
};

const createSegment = (segment: any, direction: 'to' | 'back'): FlightSegment => {
  const segmentId = segment?.flight_id ?? `tmp_${Date.now()}_${direction}`;
  return {
    id: `${direction}-${segmentId}`,
    direction,
    airlineName: segment?.airline?.name || 'Авиакомпания',
    airlineLogo: getLogoUrl(segment?.airline?.logo),
    departureTime: formatTime(segment?.departure),
    arrivalTime: formatTime(segment?.arrival),
    dateLabel: formatDateLabel(segment?.departure),
    dateRaw: segment?.departure,
    duration: formatDuration(segment?.time),
    durationSeconds: segment?.time || 0,
    isDirect: Boolean(segment?.direct),
    routeTitle: formatRouteTitle(segment),
    airportTitle: formatAirportTitle(segment),
    warning: segment?.airline?.warning,
  };
};

/** Same as kedam-WEB ticketItem getPlaceName / formatRoute. */
const getPlaceName = (place: any): string =>
  place?.city?.name ||
  place?.city?.name_ru ||
  place?.name?.split(',')[0] ||
  place?.name ||
  place?.code ||
  '';

const formatRouteTitle = (flight: any): string => {
  const from = getPlaceName(flight?.origin);
  const to = getPlaceName(flight?.destination);
  if (from && to) return `${from} — ${to}`;
  const fromCode = flight?.origin?.code;
  const toCode = flight?.destination?.code;
  if (fromCode && toCode) return `${fromCode}-${toCode}`;
  return '';
};

const formatAirportTitle = (flight: any): string => {
  const from = flight?.origin?.code || '';
  const to = flight?.destination?.code || '';
  if (from && to) return `${from} — ${to}`;
  return from || to || '';
};

export const formatTime = (dateStr?: string) => {
  const date = safeDate(dateStr);
  return date
    ? date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    : '--:--';
};

export const formatDuration = (seconds?: number) => {
  if (!seconds) return '';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}ч ${minutes}м`;
};

export const formatDateLabel = (dateStr?: string) => {
  const date = safeDate(dateStr);
  if (!date) return '';
  const day = date.getDate();
  const month = RUS_MONTHS_SHORT[date.getMonth()];
  const weekday = RUS_WEEKDAYS_SHORT[date.getDay()];
  return `${day} ${month}, ${weekday}`;
};

export const formatPrice = (value?: number) => {
  if (!value) {
    return '—';
  }
  return `${priceFormatter.format(value)} ₽`;
};

const getLogoUrl = (logo?: { src?: string; srcset?: string }) => {
  if (!logo) return undefined;
  if (logo.src) return logo.src;
  if (logo.srcset) {
    const [first] = logo.srcset.split(' ');
    return first;
  }
  return undefined;
};

// Split baggage badge building into smaller functions
const getClassBadge = (flight: any): string[] => {
  if (flight?.to?.class) {
    return [formatFlightClass(flight.to.class)];
  }
  return [];
};

const getHandLuggageBadges = (flight: any): string[] => {
  const badges: string[] = [];
  const toLuggage = flight?.to?.luggage;
  const backLuggage = flight?.back?.luggage;

  const handTo = formatLuggageLabel(toLuggage?.hand, 'туда', 'Ручная кладь');
  if (handTo) badges.push(handTo);
  const handBack = formatLuggageLabel(backLuggage?.hand, 'обратно', 'Ручная кладь');
  if (handBack) badges.push(handBack);

  return badges;
};

const getHoldLuggageBadges = (flight: any): string[] => {
  const badges: string[] = [];
  const toLuggage = flight?.to?.luggage;
  const backLuggage = flight?.back?.luggage;

  const holdTo = formatLuggageLabel(toLuggage?.hold, 'туда', 'Багаж');
  if (holdTo) badges.push(holdTo);
  const holdBack = formatLuggageLabel(backLuggage?.hold, 'обратно', 'Багаж');
  if (holdBack) badges.push(holdBack);

  return badges;
};

const buildBaggageBadges = (flight: any): string[] => {
  const badges: string[] = [];

  if (flight?.availability?.flight) {
    badges.push('Блочный');
  }

  return [
    ...badges,
    ...getClassBadge(flight),
    ...getHandLuggageBadges(flight),
    ...getHoldLuggageBadges(flight),
  ];
};

const formatFlightClass = (value: string) => {
  switch (value) {
    case 'econom':
      return 'Эконом';
    case 'business':
      return 'Бизнес';
    default:
      return value;
  }
};

const formatLuggageLabel = (
  luggage: any,
  direction: 'туда' | 'обратно',
  label: string,
) => {
  if (!luggage) return '';
  if (luggage.weight) {
    return `${label} ${luggage.weight} кг ${direction}`;
  }
  if (luggage.count) {
    return `${label} ${luggage.count} шт. ${direction}`;
  }
  return '';
};

export const extractPackagePrice = (pkg: any): number | null => {
  if (!pkg) return null;
  const base = toMoney(pkg.price ?? pkg.net_price);
  return base > 0 ? base : null;
};

/** Map flight_pair_id → fuel_charge (surcharge only). */
export const buildFlightPriceMap = (pkg: any): Record<string, number> => {
  const map: Record<string, number> = {};
  if (!pkg) {
    return map;
  }

  const walk = (node: any) => {
    if (!node || typeof node !== 'object') {
      return;
    }

    if (node.flight_pair_id != null) {
      const fuel = toMoney(node.fuel_charge);
      if (fuel > 0) {
        map[String(node.flight_pair_id)] = fuel;
      }
    }

    if (Array.isArray(node)) {
      node.forEach(walk);
    } else {
      Object.values(node).forEach(walk);
    }
  };

  walk(pkg);
  return map;
};

