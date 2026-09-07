import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '@shared/modules/store';
import { searchFilters, setAllMyHotels } from '@shared/modules/store/slices/search';
import { parseNightsValue } from '@shared/component/home/searchSection/utils/searchHelpers';
import { withSearchTypeFilters } from '@shared/utils/searchParamsUtils';
import { buildAiRoomPickFromSearchHotel, normalizeSearchMealsToRoomCodes } from '@shared/utils/hotelUtils/aiRoomPick';
import { LIST_FILTER_PARAM_KEYS } from '@shared/component/searchResult/modals/filterConstants';
import { useAppNavigation } from '../../app/navigation';
import { HotelCard } from '../../components/HotelCard';
import { HotelCardSkeleton } from '../../components/HotelCardSkeleton';
import { EmptyState } from './EmptyState';
import { SortDropdown, sortOptions, type SortOption } from './SortDropdown';
import { transformHotel } from './transformHotel';

// Порт searchResult/ResultList (+ ListHeader): сортировка, сетка карточек 2 колонки,
// бесконечная прокрутка через IntersectionObserver → loadMoreHotels.

const sortByMap: Record<string, string> = {
  recommended: 'relevance',
  highRating: 'rating,desc',
  cheapFirst: 'price,asc',
  expensiveFirst: 'price,desc',
};

/** Preserve applied list filters (including empty string = cleared). */
const pickAppliedListFilters = (hotels: any): Record<string, unknown> => {
  if (!hotels) return {};
  const out: Record<string, unknown> = {};
  for (const key of LIST_FILTER_PARAM_KEYS) {
    if (hotels[key] !== undefined && hotels[key] !== null) out[key] = hotels[key];
  }
  return out;
};

const COLUMNS = 2;

export const ResultList: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const nav = useAppNavigation();
  const [selectedSort, setSelectedSort] = useState<string>('recommended');
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const prevSearchParamsRef = useRef<string | null>(null);
  const prevFilterParamsRef = useRef<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { allMyHotels, hotels, loading, requestId, searchParams } = useSelector((state: RootState) => state.search);

  const operators = hotels?.readyOperators || [];
  const activeSearchType = searchParams?.search_type || hotels?.search_type;
  const buildFilterRequest = (base: Record<string, unknown>) => withSearchTypeFilters(activeSearchType, base);

  // «от 17 мая на 7 ночей»
  const formattedDateRange = useMemo(() => {
    if (!searchParams?.start_date || !searchParams?.nights) return '';
    const startDate = new Date(searchParams.start_date);
    if (isNaN(startDate.getTime())) return '';
    const day = startDate.getDate();
    const nights = parseNightsValue(searchParams.nights);
    const monthsGenitive = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    const month = monthsGenitive[startDate.getMonth()];
    let nightsText = '';
    if (nights === 1) nightsText = '1 ночь';
    else if (nights >= 2 && nights <= 4) nightsText = `${nights} ночи`;
    else nightsText = `${nights} ночей`;
    return `от ${day} ${month} на ${nightsText}`;
  }, [searchParams?.start_date, searchParams?.nights]);

  // Detect when search params change and clear old data (useFocusEffect в RN)
  useEffect(() => {
    const currentSearchParamsStr = searchParams
      ? JSON.stringify({
          to_city: searchParams.to_city,
          to_country: searchParams.to_country,
          start_date: searchParams.start_date,
          nights: searchParams.nights,
          adults: searchParams.adults,
          kids: searchParams.kids,
        })
      : null;
    if (prevSearchParamsRef.current !== null && prevSearchParamsRef.current !== currentSearchParamsStr) {
      dispatch(setAllMyHotels([]));
      setCurrentPage(1);
    }
    prevSearchParamsRef.current = currentSearchParamsStr;
  }, [searchParams, dispatch]);

  // Sync currentPage with API response and detect filter changes
  useEffect(() => {
    if (!hotels) return;
    const apiPageNumber = hotels.page_number || 1;
    setCurrentPage(apiPageNumber);
    const currentFilterParamsStr = JSON.stringify(pickAppliedListFilters(hotels));
    if (prevFilterParamsRef.current !== null && prevFilterParamsRef.current !== currentFilterParamsStr) {
      setCurrentPage(1);
    }
    prevFilterParamsRef.current = currentFilterParamsStr;
  }, [hotels, dispatch]);

  // Map API sort_by back to our sort option ID
  useEffect(() => {
    if (hotels?.sort_by) {
      const sortId = Object.entries(sortByMap).find(([, value]) => value === hotels.sort_by)?.[0] || 'recommended';
      setSelectedSort(sortId);
    }
  }, [hotels?.sort_by]);

  const selectedOption = useMemo(() => sortOptions.find(opt => opt.id === selectedSort) || sortOptions[0], [selectedSort]);

  const transformedHotels = useMemo(() => {
    if (!allMyHotels || allMyHotels.length === 0) return [];
    return allMyHotels.map(transformHotel);
  }, [allMyHotels]);

  const handleSortSelect = (option: SortOption) => {
    setSelectedSort(option.id);
    const apiSortBy = sortByMap[option.id] || 'relevance';
    if (!requestId || !operators || operators.length === 0) {
      console.warn('Missing requestId or operators for sorting');
      return;
    }
    const filterParams: any = {
      request_id: requestId,
      readyOperators: operators,
      sort_by: apiSortBy,
      page_number: 1,
      page_limit: 20,
      ...pickAppliedListFilters(hotels),
    };
    dispatch(setAllMyHotels([]));
    setCurrentPage(1);
    dispatch(searchFilters(buildFilterRequest(filterParams) as any));
  };

  const loadMoreHotels = useCallback(() => {
    if (loadingMore || loading || !requestId || !operators || operators.length === 0) return;
    const totalHotels = hotels?.hotels_count || 0;
    const currentHotelsCount = allMyHotels?.length || 0;
    if (currentHotelsCount >= totalHotels) return;
    const nextPage = (hotels?.page_number || currentPage) + 1;
    setLoadingMore(true);
    const filterParams: any = {
      request_id: requestId,
      readyOperators: operators,
      page_number: nextPage,
      page_limit: 20,
      sort_by: hotels?.sort_by || 'relevance',
      ...pickAppliedListFilters(hotels),
    };
    dispatch(searchFilters(buildFilterRequest(filterParams) as any)).finally(() => {
      setLoadingMore(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingMore, loading, requestId, operators, hotels, currentPage, allMyHotels?.length, dispatch, activeSearchType]);

  // Бесконечная прокрутка: сентинел в конце сетки (onEndReached в RN)
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting) && !loadingMore && !loading) loadMoreHotels();
      },
      { root: null, rootMargin: '400px 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMoreHotels, loadingMore, loading]);

  // Handle reset filters — same defaults as kedam_WEB resultList handleResetFilters
  const handleResetFilters = useCallback(() => {
    if (!requestId || !operators || operators.length === 0) {
      console.warn('Missing requestId or operators for resetting filters');
      return;
    }
    const availableStars = (hotels?.filters?.stars || [])
      .map((star: any) => star?.id)
      .filter((id: any) => id !== null && id !== undefined && String(id) !== '0');
    const filterParams: Record<string, unknown> = {
      request_id: requestId,
      readyOperators: operators,
      page_limit: 20,
      page_number: 1,
      sort_by: 'relevance',
      filter_instant_confirm: false,
      filter_price_min: hotels?.filters?.prices?.min,
      filter_price_max: hotels?.filters?.prices?.max,
    };
    if (availableStars.length > 0) filterParams.filter_stars = availableStars.join(',');
    dispatch(setAllMyHotels([]));
    setCurrentPage(1);
    setSelectedSort('recommended');
    dispatch(searchFilters(buildFilterRequest(filterParams) as any));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId, operators, hotels?.filters, dispatch, activeSearchType]);

  const openHotel = (item: ReturnType<typeof transformHotel>) => {
    const hotelData = (item as any).hotel || item;
    const hotelIdValue = hotelData.id || item.id;
    const sourceItem = ((item as any)._source as Record<string, unknown> | undefined) || (item as unknown as Record<string, unknown>);
    const listingMealOptions = hotels?.filters?.meals ?? null;
    const mealCodes = normalizeSearchMealsToRoomCodes(hotels?.filter_meals, listingMealOptions);
    const filterMealsForHotel = mealCodes.length > 0 ? mealCodes.join(',') : hotels?.filter_meals || undefined;
    const aiRoomPick = buildAiRoomPickFromSearchHotel(sourceItem as any, {
      filterMeals: filterMealsForHotel,
      filterOperators: hotels?.filter_operators,
      startDate: searchParams?.start_date,
      listPrice:
        sourceItem?.analytics_min_price != null
          ? Number(sourceItem.analytics_min_price)
          : sourceItem?.min_price != null
            ? Number(sourceItem.min_price)
            : undefined,
      listingMealOptions,
    });
    nav.navigate('hotel', {
      hotel: item,
      hotelId: String(hotelIdValue),
      searchParams: {
        ...searchParams,
        hotel_ids: [Number(hotelIdValue)],
        search_type: searchParams?.search_type || 'package',
        // Hotel rooms: fixed date only (no ±2 days).
        flex_dates: 0,
        ...(filterMealsForHotel ? { filter_meals: filterMealsForHotel } : {}),
        ...(hotels?.filter_operators ? { filter_operators: hotels.filter_operators } : {}),
      },
      searchSnapshot: {
        startDateISO: searchParams?.start_date,
        nights: parseNightsValue(searchParams?.nights || '7'),
        adults: parseInt(searchParams?.adults || '2', 10),
        kids: parseInt(searchParams?.kids || '0', 10),
        kidsAges: searchParams?.kids_ages || [],
      },
      aiRoomPick,
    });
  };

  const showSkeleton = transformedHotels.length === 0 && (loading || !hotels);
  const showEmptyState = !loading && !!hotels && transformedHotels.length === 0;

  if (showSkeleton) {
    return (
      <div className="search-list">
        <div className="search-list__header" aria-hidden="true">
          <div className="skeleton" style={{ width: 150, height: 24, borderRadius: 12 }} />
          <div className="skeleton" style={{ width: 126, height: 16 }} />
        </div>
        <div className="grid grid--2">
          {Array.from({ length: COLUMNS * 3 }).map((_, index) => (
            <HotelCardSkeleton key={`skeleton-${index}`} />
          ))}
        </div>
      </div>
    );
  }

  if (showEmptyState) {
    return <EmptyState onResetFilters={handleResetFilters} emptyType={hotels?.emptyType} />;
  }

  return (
    <div className="search-list">
      <div className="search-list__header">
        <SortDropdown selectedOption={selectedSort} selectedLabel={selectedOption.label} onSelect={handleSortSelect} />
        <span className="search-list__count">{`Найдено ${hotels?.hotels_count || transformedHotels.length} отелей`}</span>
      </div>
      <div className="grid grid--2">
        {transformedHotels.map((item, index) => (
          <HotelCard
            key={`${item.id}-${index}`}
            hotel={item}
            imageHeight={200}
            showTags={true}
            dateRange={formattedDateRange}
            onPress={() => openHotel(item)}
          />
        ))}
        {loadingMore ? Array.from({ length: COLUMNS }).map((_, i) => <HotelCardSkeleton key={`footer-skeleton-${i}`} />) : null}
      </div>
      <div ref={sentinelRef} className="search-list__sentinel" aria-hidden="true" />
    </div>
  );
};

export default ResultList;
