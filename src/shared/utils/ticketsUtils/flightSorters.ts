import { FlightCard } from '../../types/tickets';

type SortOption = 'cheapFirst' | 'duration';

const sorters: Record<SortOption, (a: FlightCard, b: FlightCard) => number> = {
  duration: (a, b) => a.durationSeconds - b.durationSeconds,
  cheapFirst: (a, b) => a.priceValue - b.priceValue,
};

export const applySorting = (flights: FlightCard[], sortOption: SortOption): FlightCard[] => {
  const copy = [...flights];
  const sorter = sorters[sortOption] || sorters.cheapFirst;
  copy.sort(sorter);
  return copy;
};

