import { FlightCard } from '../../types/tickets';
import {
  formatMoneyRub,
  getFlightOfferTotal,
  toMoney,
} from '../packagePrice';

export type FlightPriceBreakdown = {
  total: number;
  fees: number;
  totalLabel: string;
  feesLabel: string | null;
};

export const getFlightPriceBreakdown = (
  flight: FlightCard,
  flightPriceMap: Record<string, number>,
  packagePrice: number | null,
): FlightPriceBreakdown => {
  const fuelCharge =
    toMoney(flight.fuelCharge) ||
    toMoney(flight.id != null ? flightPriceMap[flight.id] : 0) ||
    toMoney(flight.priceValue);
  const base = toMoney(packagePrice);
  const total = getFlightOfferTotal(base, { fuel_charge: fuelCharge });

  return {
    total,
    fees: fuelCharge,
    totalLabel: total > 0 ? formatMoneyRub(total).replace(' ₽', '₽') : '',
    feesLabel:
      fuelCharge > 0
        ? `Доплаты и сборы: +${formatMoneyRub(fuelCharge).replace(' ₽', '₽')}`
        : null,
  };
};

/** @deprecated Prefer getFlightPriceBreakdown */
export const getFlightPriceLabel = (
  flight: FlightCard,
  flightPriceMap: Record<string, number>,
  packagePrice: number | null,
): string | undefined => {
  const { totalLabel } = getFlightPriceBreakdown(flight, flightPriceMap, packagePrice);
  return totalLabel || undefined;
};
