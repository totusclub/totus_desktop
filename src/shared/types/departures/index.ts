export interface Airport {
  id: number;
  name: string;
  code: string;
  lat: string;
  long: string;
  timezone: string;
}

export interface Departure {
  id: number;
  name_ru: string;
  name_ru_form1?: string;
  name_ru_form2?: string;
  name_en: string;
  iata: string;
  priority: number;
  iso2: string;
  prioritized: boolean;
  airports: Airport[];
}

export interface DeparturesResponse {
  success: boolean;
  prioritized_count: number;
  departures: Departure[];
}

