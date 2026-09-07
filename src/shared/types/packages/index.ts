export interface CreatePackageParams {
  request_id: string;
  tour_id: number | string;
}

export interface PackageDetails {
  id: number;
  [key: string]: any;
}

export interface ActualizePackageParams {
  package_id: number;
  search_type?: string;
}

export interface PackagesFlightsParams {
  package_id: number;
  [key: string]: any;
}

export interface ActualizePackageFlightParams {
  package_id: number;
  flight_pair_id: number;
  search_type?: string;
}

