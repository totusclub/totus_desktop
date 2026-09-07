import type { FilterSection } from '../../types/tickets';
import { formatMoneyRub, toMoney } from '../packagePrice';

/**
 * Flight filter metadata → UI sections.
 * Mirrors kedam-WEB `searchResult/filtersPackage.tsx` + `UI/checkboxGroup`:
 * same section order, titles, value keys and labels.
 */

const INTERVAL_LABELS: Record<string, string> = {
  night: 'Ночь',
  evening: 'Вечер',
  morning: 'Утро',
  midday: 'День',
  afternoon: 'День',
};

const LUGGAGE_LABELS: Record<string, string> = {
  all: 'Все',
  hold: 'С багажом',
  heavy: 'С багажом от 20кг',
  hand: 'Ручная кладь',
};

const FLIGHT_CLASS_LABELS: Record<string, string> = {
  econom: 'Эконом',
  business: 'Бизнес',
};

const FLIGHT_TYPE_LABELS: Record<string, string> = {
  regular: 'Регулярный рейс',
  charter: 'Чартерный рейс',
};

const CONFIRMABILITY_LABELS: Record<string, string> = {
  '1': 'Мгновенное подтверждение',
  '2': 'Быстрое подтверждение',
  '3': 'Любое подтверждение',
};

function pluralizeRu(count: number, forms: [string, string, string]): string {
  const abs = Math.abs(count) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return forms[2];
  if (last > 1 && last < 5) return forms[1];
  if (last === 1) return forms[0];
  return forms[2];
}

/** kedam-WEB `getOptionValue` — LT uses a different id field per filter group. */
function getOptionValue(sectionId: string, item: any): unknown {
  if (sectionId === 'transitions_count') return item?.number;
  return (
    item?.id ??
    item?.operator_id ??
    item?.luggage_type ??
    item?.flight_class ??
    item?.number ??
    item?.flight_type ??
    item?.interval
  );
}

function getOptionLabel(sectionId: string, item: any, value: string): string {
  switch (sectionId) {
    case 'forward_departure_intervals':
    case 'backward_departure_intervals':
      return INTERVAL_LABELS[String(item?.interval)] || String(item?.interval ?? value);
    case 'luggage_types':
      return LUGGAGE_LABELS[String(item?.luggage_type)] || item?.name || value;
    case 'flight_classes':
      return FLIGHT_CLASS_LABELS[String(item?.flight_class)] || item?.name || value;
    case 'flight_types':
      return FLIGHT_TYPE_LABELS[String(item?.flight_type)] || item?.name || value;
    case 'transitions_count': {
      const number = Number(item?.number);
      if (number === 0) return 'Без пересадки';
      return `${number} ${pluralizeRu(number, ['пересадка', 'пересадки', 'пересадок'])}`;
    }
    case 'confirmability':
      return CONFIRMABILITY_LABELS[value] || item?.name || value;
    default:
      return item?.name || item?.title || value;
  }
}

/**
 * kedam-WEB shows "{suitable_flights} рейсов от {netPrice + min_fuel_charge} ₽"
 * next to every flight filter option.
 */
function getOptionMeta(item: any, netPrice?: number): string | undefined {
  const suitable = item?.suitable_flights;
  if (suitable == null) return undefined;

  const count = Number(suitable);
  const flightsLabel = `${count} ${pluralizeRu(count, ['рейс', 'рейса', 'рейсов'])}`;

  if (netPrice == null) return flightsLabel;

  const from = toMoney(netPrice) + toMoney(item?.min_fuel_charge);
  return `${flightsLabel} от ${formatMoneyRub(from)}`;
}

export const buildFilterSections = (
  filters: any,
  netPrice?: number,
): FilterSection[] => {
  if (!filters) {
    return [];
  }

  const sections: FilterSection[] = [];

  const pushSection = (id: string, title: string, items?: any[]) => {
    if (!Array.isArray(items) || items.length === 0) {
      return;
    }

    const options = items
      .filter(item => !item?.disabled)
      .map(item => {
        const rawValue = getOptionValue(id, item);
        const value = rawValue == null ? '' : String(rawValue);
        return {
          id: value,
          label: getOptionLabel(id, item, value),
          meta: getOptionMeta(item, netPrice),
        };
      })
      .filter(option => option.id !== '');

    if (options.length === 0) {
      return;
    }

    sections.push({ id, title, options });
  };

  // Section order mirrors kedam-WEB filtersPackage.tsx
  pushSection('forward_airlines', 'Авиакомпания туда', filters.forward_airlines);
  pushSection('backward_airlines', 'Авиакомпания обратно', filters.backward_airlines);
  pushSection('departure_airports', 'Аэропорт вылета', filters.departure_airports?.airports);
  pushSection('arrival_airports', 'Аэропорт прибытия', filters.arrival_airports?.airports);
  pushSection(
    'forward_departure_intervals',
    'Время вылета туда',
    filters.forward_departure_intervals,
  );
  pushSection(
    'backward_departure_intervals',
    'Время вылета обратно',
    filters.backward_departure_intervals,
  );
  pushSection('operators', 'Туроператор', filters.operators);
  pushSection('luggage_types', 'Багаж', filters.luggage_types);
  pushSection('flight_classes', 'Класс перелета', filters.flight_classes);
  pushSection('flight_types', 'Тип рейса', filters.flight_types);
  pushSection('transitions_count', 'Пересадки', filters.transitions_count);

  return sections;
};

/**
 * kedam-WEB `getFastConfirmIds` — the "Быстрое подтверждение" switch sends
 * `confirmability`, preferring the API option over the hardcoded id `2`.
 */
export const getFastConfirmIds = (filters: any): string[] => {
  const fromConfirmability = filters?.confirmability;
  if (Array.isArray(fromConfirmability) && fromConfirmability.length > 0) {
    const match = fromConfirmability.find((item: any) => {
      const id = Number(item?.id);
      const name = String(item?.name ?? '').toLowerCase();
      return id === 2 || name.includes('быстр');
    });
    if (match?.id != null) return [String(match.id)];
  }

  const fromInstant = filters?.instant_confirm;
  if (Array.isArray(fromInstant) && fromInstant.length > 0) {
    const selectedOrFirst =
      fromInstant.find((item: any) => item?.selected) ?? fromInstant[0];
    if (selectedOrFirst?.id != null) return [String(selectedOrFirst.id)];
  }

  return ['2'];
};