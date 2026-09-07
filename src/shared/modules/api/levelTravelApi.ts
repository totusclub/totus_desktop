import {get, post, instance} from '../axios';
import type {
  FetchDestinationsParams,
  DestinationsResponse,
} from '../../types/destinations';
import type {
  SearchParams,
  FilterParams,
  SearchStatus,
  GroupedHotelsResponse,
  StartSearchResponse,
} from '../../types/search';
import type {
  GetHotelOffersParams,
  GetHotelRoomsParams,
  GetHotelInfoParams,
  GetHotelReviewsParams,
  HotelOffer,
  HotelRoom,
  HotelRoomsResponse,
  HotelInfo,
  HotelReviewsResponse,
} from '../../types/hotel';
import type {
  CreatePackageParams,
  PackageDetails,
  ActualizePackageParams,
  PackagesFlightsParams,
  ActualizePackageFlightParams,
} from '../../types/packages';
import type {
  ValidateTouristParams,
  CreateOrderParams,
  CreatePayParams,
  CheckPayParams,
  Order,
} from '../../types/orders';
import type {DeparturesResponse} from '../../types/departures';
import {
  prepareGroupedHotelsParams,
  prepareStartSearchParams,
} from '../../utils/searchParamsUtils';

// Destinations API
export async function fetchDestinationsRequest(
  params: FetchDestinationsParams,
): Promise<DestinationsResponse> {
  try {
    // Build query string manually to match the Next.js format exactly
    const query = params.query ? `"${params.query}"` : '""';
    const fromCity = params?.from_city || '';
    const searchType = params?.search_type || 'package';
    // Build URL with proper encoding - match Next.js format exactly
    const url = `/references/autocomplete_v2?query=${encodeURIComponent(query)}&from_city=${encodeURIComponent(fromCity)}&search_type=${encodeURIComponent(searchType)}`;
    
    // Use instance directly to avoid axios params processing when URL already has query string
    const res = await instance.get<DestinationsResponse>(url);
    return res.data;
  } catch (error: any) {
    console.error('Error fetching destinations:', error);
    // Return more detailed error info
    if (error.response) {
      console.error('Response error:', error.response.data);
      throw new Error(error.response.data?.message || 'Failed to fetch destinations');
    }
    throw error;
  }
}

// Departures API
export async function fetchDeparturesRequest(): Promise<DeparturesResponse> {
  try {
    const res = await get<DeparturesResponse>(`/references/departures`, {
      prioritized_count: 10,
    });
    return res.data;
  } catch (error) {
    console.error('Error fetching departures:', error);
    throw error;
  }
}

// Search API
export async function startSearch(
  params: SearchParams,
): Promise<StartSearchResponse> {
  try {
    const flat = prepareStartSearchParams(params as Record<string, unknown>);
    console.log('[Search] start-search flat params', flat);
    const res = await get<StartSearchResponse>(`/start-search`, flat);
    return res.data;
  } catch (error) {
    console.error('Error starting search:', error);
    throw error;
  }
}

export async function checkSearchStatus(
  requestId: string,
): Promise<SearchStatus> {
  try {
    const res = await get<{status: SearchStatus}>(`/search-status`, {
      request_id: requestId,
    });
    return res.data.status; // Object: {1: 'completed', 2: 'performing', ...}
  } catch (error) {
    console.error('Error checking search status:', error);
    throw error;
  }
}

export type SearchStatusResult = {
  status: SearchStatus;
  completeness: number;
};

/**
 * Soft status check for hotel-details rooms polling (matches kedam-WEB).
 * Returns null on network / parse errors instead of throwing.
 */
export async function getSearchStatus(
  requestId: string,
): Promise<SearchStatusResult | null> {
  if (!requestId) return null;

  try {
    const res = await get<{ status?: SearchStatus; completeness?: number }>(
      `/search-status`,
      { request_id: requestId },
    );
    const status = res.data?.status;
    if (!status || typeof status !== 'object') return null;
    return {
      status,
      completeness: Number(res.data?.completeness) || 0,
    };
  } catch (error) {
    console.warn('[getSearchStatus] Failed to check search status:', error);
    return null;
  }
}

/** Poll until at least one operator is ready (same as listing search flow). */
export async function waitForSearchReady(
  requestId: string,
  maxPolls = 15,
  intervalMs = 6000,
): Promise<boolean> {
  for (let i = 0; i < maxPolls; i++) {
    const statusMap = await checkSearchStatus(requestId);
    const ready = Object.values(statusMap).some(
      (s) => s === 'completed' || s === 'cached',
    );
    if (ready) return true;
    if (i < maxPolls - 1) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }
  return false;
}

export async function getGroupedHotels(
  params: FilterParams,
): Promise<GroupedHotelsResponse> {
  try {
    const sanitizedParams = prepareGroupedHotelsParams(
      params as Record<string, unknown>,
    );
    console.log('[Search] grouped-hotels flat params', sanitizedParams);
    const res = await get<GroupedHotelsResponse>(
      `/grouped-hotels`,
      sanitizedParams,
    );
    // Never let request params overwrite API facet data (filters/statistics/hotels).
    // Same idea as kedam_WEB searchFilters stripping `filters` / `hotels` before merge.
    const {
      filters: _ignoreFilters,
      statistics: _ignoreStatistics,
      hotels: _ignoreHotels,
      hotels_count: _ignoreCount,
      ...appliedParams
    } = params as Record<string, unknown>;

    return {
      ...res.data,
      ...appliedParams,
      filters: res.data?.filters,
      statistics: (res.data as any)?.statistics,
      hotels: res.data?.hotels,
      hotels_count: (res.data as any)?.hotels_count ?? res.data?.hotels?.length,
      request_id: res.data?.request_id ?? (params as any).request_id,
    };
  } catch (error) {
    console.error('Error getting grouped hotels:', error);
    throw error;
  }
}

// Hotels API
export async function getHotelOffers(
  data: GetHotelOffersParams,
): Promise<HotelOffer[]> {
  if (!data.request_id || !data.hotel_id) {
    throw new Error('Missing request_id or hotel_id');
  }

  const params: any = {
    request_id: data.request_id,
    hotel_id: data.hotel_id,
  };

  if (data.compact !== undefined) params.compact = data.compact;

  const response = await get<HotelOffer[]>(`/get-hotel-offers`, params);

  return response.data;
}

export async function getHotelRooms(
  data: GetHotelRoomsParams,
): Promise<HotelRoomsResponse> {
  if (!data.request_id || !data?.hotel_id) {
    throw new Error('Missing request_id or hotel_id');
  }

  const params: Record<string, string | number | boolean> = {
    request_id: data.request_id,
    hotel_id: data.hotel_id,
  };

  if (data.meals) params.meals = data.meals;
  if (data.confirmability) params.confirmability = data.confirmability;
  if (data.operators) params.operators = data.operators;
  if (data.free_cancel !== undefined) params.free_cancel = data.free_cancel;

  const response = await get<HotelRoomsResponse>(`/hotels-rooms`, params);

  return response.data;
}

export async function getHotelInfo(
  data: GetHotelInfoParams,
): Promise<HotelInfo> {
  if (!data.hotel_id) {
    throw new Error('Missing hotel_id');
  }

  const params = {
    hotel_ids: data.hotel_id,
    search_type: data.search_type === 'hotel' ? 'hotel' : 'package',
  };

  const response = await get<{hotels: HotelInfo[]}>(
    `/references/hotels`,
    params,
  );

  return response.data.hotels[0];
}

export async function getHotelReviews(
  data: GetHotelReviewsParams,
): Promise<HotelReviewsResponse> {
  if (!data.hotel_id) {
    throw new Error('Missing hotel_id');
  }

  const response = await get<HotelReviewsResponse>(
    `/references/hotel_reviews/${data.hotel_id}`,
    {
      page: data.page ?? 1,
      per_page: data.per_page ?? 10,
    },
  );

  return response.data;
}

// Packages API
export async function createPackage(
  data: CreatePackageParams,
): Promise<PackageDetails> {
  if (!data.request_id || !data.tour_id) {
    throw new Error('Missing request_id or tour_id');
  }

  const params = {
    request_id: data.request_id,
    tour_id: data.tour_id,
  };

  const response = await get<PackageDetails>(`/packages/package_details`, params);

  return response.data;
}

export async function PackagesActualize(
  id: number,
  searchType: 'package' | 'hotel' = 'package',
): Promise<PackageDetails> {
  if (!id) {
    throw new Error('Missing package_id');
  }

  const params: ActualizePackageParams = {
    package_id: id,
    search_type: searchType,
  };

  const response = await get<PackageDetails>(`/packages/actualize`, params);

  return response.data;
}

export async function Packagesflights(
  params: PackagesFlightsParams,
): Promise<any> {
  if (!params) {
    throw new Error('Missing package_id');
  }

  const packageId = (params as any).package_id ?? (params as any).packageId;
  if (packageId == null || packageId === '') {
    throw new Error('Missing package_id');
  }

  // Sanitize like kedam-WEB — empty filter arrays / search_type cause LT
  // "Failed to start search" on POST /packages/flights
  const body: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
    if (key === 'search_type' || key === 'packageId') continue;
    if (value == null) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    body[key] = value;
  }
  body.package_id = Number(packageId) || packageId;

  const response = await post<any>(`/packages/flights`, body);
  return response.data;
}

export async function PackagesActualizeFlight(
  id: number,
  f_id: number,
): Promise<PackageDetails> {
  if (!id) {
    throw new Error('Missing package_id');
  }

  const params = {
    package_id: id,
    flight_pair_id: f_id,
    search_type: 'package',
    offset: 0,
    limit: 10,
    page: 1,
  };

  const response = await get<PackageDetails>(`/packages/actualize`, params);

  return response.data;
}

// Orders API
export async function validateTourist(
  params: ValidateTouristParams,
): Promise<any> {
  try {
    if (!params) {
      throw new Error('Missing params');
    }
    const response = await post<any>(`/validate-tourists`, params);
    return response.data;
  } catch (err) {
    return err;
  }
}

/** Final price / validity check before create-package (kedam_WEB parity). */
export async function prebuildOrder(
  params: Record<string, unknown>,
): Promise<any> {
  if (!params?.package_id) {
    throw new Error('Missing package_id');
  }
  const response = await post<any>(`/orders/prebuild`, params);
  return response.data;
}

/**
 * Operator prebook for flight packages.
 * On partner/API-version errors returns a skippable shape (do not throw).
 */
export async function prebookPackage(
  params: Record<string, unknown>,
): Promise<any> {
  if (!params?.package_id) {
    throw new Error('Missing package_id');
  }
  try {
    const response = await post<any>(`/packages/prebook`, params);
    return response.data;
  } catch (err: any) {
    return {
      success: false,
      error: err?.response?.data?.error ?? err?.response?.data ?? err?.message,
      errors: err?.response?.data?.errors ?? [],
      skippable: Boolean(err?.response?.data?.skippable),
      status: err?.response?.status,
      isAxiosError: true,
    };
  }
}

export async function createOrder(params: CreateOrderParams): Promise<any> {
  try {
    if (!params) {
      throw new Error('Missing params');
    }
    const response = await post<any>(`/create-package`, params);
    return response.data;
  } catch (err) {

    return err as any;
  }
}

const PAY_RETRY_ATTEMPTS = 3;
const PAY_RETRY_DELAY_MS = 900;

/**
 * The VTB gateway behind /vtb/create-order intermittently drops the upstream
 * connection (backend answers 500 "read ECONNRESET"), so transient failures are
 * retried before surfacing an error to the user.
 */
function isRetryablePayError(err: any): boolean {
  const status = err?.response?.status;
  if (status != null) {
    if (status < 500) return false;
    const details = String(
      err?.response?.data?.details || err?.response?.data?.error || '',
    );
    return status >= 500 && !/invalid payment amount/i.test(details);
  }
  // No response at all: network/timeout
  return true;
}

function normalizePayError(err: any) {
  return {
    status: 'error',
    error:
      err?.response?.data?.details ||
      err?.response?.data?.error ||
      err?.response?.data?.message ||
      err?.message ||
      'Failed to create payment',
    details: err?.response?.data?.details,
    httpStatus: err?.response?.status,
    isAxiosError: true,
  };
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function createPay(params: CreatePayParams): Promise<any> {
  if (!params) {
    return normalizePayError(new Error('Missing params'));
  }

  let lastError: any = null;

  for (let attempt = 1; attempt <= PAY_RETRY_ATTEMPTS; attempt++) {
    try {
      const response = await post<any>(`/vtb/create-order`, params);
      return response.data;
    } catch (err: any) {
      lastError = err;
      if (attempt === PAY_RETRY_ATTEMPTS || !isRetryablePayError(err)) {
        break;
      }
      await delay(PAY_RETRY_DELAY_MS * attempt);
    }
  }

  return normalizePayError(lastError);
}

export async function getHomeData(): Promise<any> {
  try {
    const response = await get<any>(`/home/data`);
    return response.data ;
  } catch (err) {
    return err;
  }
}

export async function checkPay(params: CheckPayParams): Promise<any> {
  try {
    if (!params) {
      throw new Error('Missing params');
    }
    const response = await post<any>(`/check_pay`, params);
    return response.data;
  } catch (err) {
    return err;
  }
}

export async function getOrder(id: number): Promise<Order> {
  if (!id) {
    throw new Error('Missing order_id');
  }

  const response = await get<Order>(`/orders`, {order_id: id});
  return response.data;
}

export type OrderDocumentsResponse = {
  documents?: Array<{
    title?: string;
    public_url?: string;
    source_url?: string;
    url?: string;
  }>;
};

export async function getOrderDocuments(
  orderId: string | number,
): Promise<OrderDocumentsResponse> {
  if (!orderId) {
    throw new Error('Missing order_id');
  }

  const response = await get<OrderDocumentsResponse>(`/orders/documents`, {
    order_id: orderId,
  });
  return response.data;
}

export async function getOrdersUsers(id: number): Promise<Order[]> {
  if (!id) {
    throw new Error('Missing user_id');
  }

  const response = await get<Order[]>(`/user/orders`, {user_id: id});
  return response.data;
}

