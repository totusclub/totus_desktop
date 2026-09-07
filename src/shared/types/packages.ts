export type CreatePackageParams = {
  request_id: string;
  tour_id: string | number;
};

export type ActualizePackageParams = {
  package_id: number;
  search_type?: 'package' | 'hotel' | string;
  flight_pair_id?: number;
  offset?: number;
  limit?: number;
  page?: number;
};

export type PackagesFlightsParams = {
  package_id: number;
  [key: string]: unknown;
};

export type PackageDetails = {
  id?: number;
  package_id?: number;
  price?: number;
  full_price?: number;
  hotel?: Record<string, unknown>;
  flights?: unknown[];
  [key: string]: unknown;
};
