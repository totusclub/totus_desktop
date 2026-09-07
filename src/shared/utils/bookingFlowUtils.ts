/** Минимальный интерфейс навигации (desktop: react-router обёртка, RN: NavigationProp). */
export type NavigationLike = { navigate: (route: string, params?: any) => void };

export type SearchTypeValue = 'package' | 'hotel';

export function isHotelOnlySearch(searchType?: string | null): boolean {
  return searchType === 'hotel';
}

export function normalizeSearchType(value?: string | null): SearchTypeValue {
  return value === 'hotel' ? 'hotel' : 'package';
}

export function getOfferPriceSubtitle(searchType?: string | null): string {
  return isHotelOnlySearch(searchType) ? 'за проживание' : 'тур с перелётом';
}

/** Header title above «от …₽» on hotel details (kedam-WEB parity). */
export function getOfferPriceTitle(searchType?: string | null): string {
  return isHotelOnlySearch(searchType)
    ? 'Цена за проживание'
    : 'Цена за тур с перелётом';
}

export type HotelSearchContextNav = {
  startDateISO?: string;
  nights?: number;
  adults?: number;
  kids?: number;
  kidsAges?: number[];
};

export type NavigateAfterPackageParams = {
  packageId: number;
  searchType?: string | null;
  hotelMeta?: {
    name?: string;
    country?: string;
    city?: string;
  };
  searchContext?: HotelSearchContextNav | null;
  packageDetails?: unknown;
};

/** Tour → tickets; hotel-only → booking (skip flights). */
export function navigateAfterPackageCreate(
  navigation: NavigationLike,
  params: NavigateAfterPackageParams,
): void {
  const { packageId, searchType, hotelMeta, searchContext, packageDetails } = params;

  if (isHotelOnlySearch(searchType)) {
    navigation.navigate('booking', {
      packageInfo: packageDetails ?? { id: packageId },
      hotelMeta,
      searchContext,
      searchType: 'hotel',
    });
    return;
  }

  navigation.navigate('tickets', {
    packageId,
    searchType: normalizeSearchType(searchType),
    hotelMeta,
    searchContext: searchContext
      ? {
          startDate: searchContext.startDateISO,
          nights: searchContext.nights,
          adults: searchContext.adults,
          kids: searchContext.kids,
          kidsAges: searchContext.kidsAges,
        }
      : undefined,
  });
}
