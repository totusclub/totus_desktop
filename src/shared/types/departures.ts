export type DepartureItem = {
  id?: string | number;
  name?: string;
  name_en?: string;
  name_ru?: string;
  iata?: string;
  iso2?: string;
  [key: string]: unknown;
};

/** Alias used by home search OriginField / Search */
export type Departure = DepartureItem;

export type DeparturesResponse = {
  departures?: DepartureItem[];
  data?: DepartureItem[];
  [key: string]: unknown;
};
