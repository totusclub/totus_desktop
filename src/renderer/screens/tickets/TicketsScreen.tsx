import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTicketsData } from '@shared/modules/hooks/useTicketsData';
import { transformFlightPair, extractPackagePrice, buildFlightPriceMap } from '@shared/utils/ticketsUtils/flightTransformers';
import { applySorting } from '@shared/utils/ticketsUtils/flightSorters';
import { getFlightPriceBreakdown } from '@shared/utils/ticketsUtils/flightPriceUtils';
import { getHeaderDestination, getHeaderSubtitle } from '@shared/utils/ticketsUtils/headerUtils';
import { getFlightOfferTotal, toMoney } from '@shared/utils/packagePrice';
import type { FlightCard } from '@shared/types/tickets';
import { useAppNavigation, useRouteParams } from '../../app/navigation';
import { PageHeader } from '../../shell/PageHeader';
import { Icon } from '../../icons';
import { SortDropdown, type SortOption } from '../search/SortDropdown';
// Стили выпадающего списка сортировки (search-sort__*) живут в search.css.
import '../search/search.css';
import { FlightCardView } from './FlightCardView';
import { SelectedTourCard } from './SelectedTourCard';
import { TicketsEmptyState } from './TicketsEmptyState';
import { FlightsFiltersModal } from './FlightsFiltersModal';
import { FlightCardSkeleton, TicketsListHeaderSkeleton } from './TicketsSkeletons';
import './tickets.css';

// Порт component/tickets/Tickets.tsx (+ TicketsHeader, TicketsListHeader, TicketsFiltersContext → локальное состояние):
// PageHeader «Перелёты» + подзаголовок (headerUtils), «Выбранный тур», сортировка + «Найдено вариантов: N»,
// карточки перелётов сеткой 3 колонки, фильтры — центрированный диалог; onEndReached → sentinel в скролле.

export type TicketsRouteParams = {
  packageId?: number;
  searchType?: 'package' | 'hotel';
  hotelMeta?: { name?: string; country?: string; city?: string };
  searchContext?: { startDate: string; nights: number; adults: number; kids: number; kidsAges?: number[] };
};

const sortOptions: SortOption[] = [
  { id: 'cheapFirst', label: 'Сначала дешёвые', icon: 'lineArrowDown' },
  { id: 'duration', label: 'Самый быстрый', icon: 'lineArrowUp' },
];

const COLUMNS = 3;

export const TicketsScreen: React.FC = () => {
  const nav = useAppNavigation();
  const routeParams = useRouteParams<TicketsRouteParams>();
  const packageId = routeParams?.packageId;
  const searchType = routeParams?.searchType === 'hotel' ? 'hotel' : 'package';
  const hotelMeta = routeParams?.hotelMeta;
  const searchContext = routeParams?.searchContext;

  // Порт TicketsFiltersContext: состояние фильтров живёт на экране.
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});
  const [filters, setFilters] = useState<any>(null);
  const [ctxPackageInfo, setCtxPackageInfo] = useState<any>(null);
  const [filtersModalVisible, setFiltersModalVisible] = useState(false);
  const [sortOption, setSortOption] = useState<'cheapFirst' | 'duration'>('cheapFirst');

  // Clear stale ticket filters when opening a different package
  useEffect(() => {
    setSelectedFilters({});
    setFilters(null);
    setCtxPackageInfo(null);
  }, [packageId]);

  const {
    rawFlights,
    allFlights,
    filters: filtersData,
    packageInfo,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    refetch,
  } = useTicketsData(packageId, selectedFilters, searchType);

  const hasActiveFilters = useMemo(
    () => Object.values(selectedFilters || {}).some(values => Array.isArray(values) && values.length > 0),
    [selectedFilters],
  );

  const handleResetFilters = useCallback(() => {
    setSelectedFilters({});
  }, []);

  // Update filters and packageInfo in context
  useEffect(() => {
    if (filtersData) setFilters(filtersData);
  }, [filtersData]);

  useEffect(() => {
    if (packageInfo) setCtxPackageInfo(packageInfo);
  }, [packageInfo]);

  // Heavy computations - keep memoized
  // Filtering is done server-side by POST /packages/flights (like kedam-WEB),
  // so the response is already the filtered set — only sorting stays local.
  const allNormalizedFlights = useMemo<FlightCard[]>(() => allFlights.map(transformFlightPair), [allFlights]);
  const normalizedFlights = useMemo<FlightCard[]>(() => rawFlights.map(transformFlightPair), [rawFlights]);
  const allSortedFlights = useMemo(() => applySorting(allNormalizedFlights, sortOption), [allNormalizedFlights, sortOption]);
  const sortedFlights = useMemo(() => applySorting(normalizedFlights, sortOption), [normalizedFlights, sortOption]);

  const flightPriceMap = useMemo(() => buildFlightPriceMap(packageInfo), [packageInfo]);

  const packagePrice = extractPackagePrice(packageInfo);
  const selectedSortLabel = sortOptions.find(option => option.id === sortOption)?.label || 'Сначала дешёвые';
  // Show total count of all filtered/sorted flights, not just displayed ones
  const resultCount = allSortedFlights.length;

  const handleFlightPress = useCallback(
    (flight: FlightCard) => {
      // Find the raw flight data from allFlights array
      const rawFlight = allFlights.find(f => String(f?.flight_pair_id ?? f?.id) === flight.id);

      // Total = package base + flight fuel_charge (Доплаты и сборы)
      const fuelCharge =
        toMoney(rawFlight?.fuel_charge) ||
        toMoney(flight.id != null ? flightPriceMap[String(flight.id)] : 0) ||
        toMoney(flight.fuelCharge) ||
        toMoney(flight.priceValue);
      const pkgPrice = packagePrice ?? 0;
      const totalPrice = getFlightOfferTotal(pkgPrice, { fuel_charge: fuelCharge });

      // Calculate transfer duration between to and back flights (time at destination)
      let transferDuration: string | undefined;
      if (rawFlight?.to?.arrival && rawFlight?.back?.departure) {
        const arrival = new Date(rawFlight.to.arrival);
        const departure = new Date(rawFlight.back.departure);
        const diffSeconds = Math.floor((departure.getTime() - arrival.getTime()) / 1000);
        const hours = Math.floor(diffSeconds / 3600);
        const minutes = Math.floor((diffSeconds % 3600) / 60);
        transferDuration = `${hours}ч ${minutes}м`;
      }

      const normalizedSearchContext = searchContext
        ? {
            startDate: searchContext.startDate,
            startDateISO: searchContext.startDate,
            nights: searchContext.nights,
            adults: searchContext.adults,
            kids: searchContext.kids,
            kidsAges: searchContext.kidsAges,
          }
        : undefined;

      // Navigate to ticket details screen
      nav.navigate('ticketDetails', {
        flightData: rawFlight,
        packageInfo,
        hotelMeta,
        searchContext: normalizedSearchContext,
        totalPrice,
        transferDuration,
        searchType,
      });
    },
    [allFlights, flightPriceMap, packagePrice, packageInfo, hotelMeta, searchContext, searchType, nav],
  );

  const handleSortSelect = useCallback((option: { id: string }) => {
    setSortOption(option.id as 'cheapFirst' | 'duration');
  }, []);

  const handleEndReached = useCallback(() => {
    if (hasMore && !loadingMore) loadMore();
  }, [hasMore, loadingMore, loadMore]);

  // onEndReached → IntersectionObserver на «сторожевом» элементе внизу списка.
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) handleEndReached();
      },
      { root: document.getElementById('content-scroll'), rootMargin: '300px 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleEndReached]);

  const showEmptyOrError = !loading && (Boolean(error) || sortedFlights.length === 0);
  const showSkeleton = loading && sortedFlights.length === 0;

  const handleFiltersApply = useCallback((filtersPayload: Record<string, string[]>) => {
    setSelectedFilters(filtersPayload);
    setFiltersModalVisible(false);
  }, []);

  const handleFiltersClose = useCallback(() => {
    setFiltersModalVisible(false);
  }, []);

  // Порт TicketsHeader: направление + «даты · туристы».
  const headerPackageInfo = ctxPackageInfo || packageInfo;
  const destination = getHeaderDestination(hotelMeta, headerPackageInfo);
  const headerSubtitle = getHeaderSubtitle(searchContext, headerPackageInfo, []);
  const subtitleParts = [destination || 'Выберите направление', headerSubtitle].filter(Boolean);

  // Hide sort/count row while loading with no results, or when empty/error state takes over the list body.
  const showListHeader = !(loading && sortedFlights.length === 0) && !(!loading && sortedFlights.length === 0);

  return (
    <>
      <PageHeader
        title="Перелёты"
        subtitle={subtitleParts.join(' · ')}
        back
        right={
          <button
            type="button"
            className={'tickets-filters-btn' + (hasActiveFilters ? ' tickets-filters-btn--active' : '')}
            onClick={() => setFiltersModalVisible(true)}
            aria-label="Фильтры">
            <Icon name="filters" size={24} />
          </button>
        }
      />

      <div className="page-body tickets-page">
        {showSkeleton ? (
          <>
            <TicketsListHeaderSkeleton />
            <div className="tickets-list">
              {Array.from({ length: COLUMNS * 3 }).map((_, index) => (
                <FlightCardSkeleton key={`skeleton-${index}`} />
              ))}
            </div>
          </>
        ) : (
          <>
            <SelectedTourCard packageInfo={packageInfo} flights={allFlights} />

            {showListHeader ? (
              <div className="tickets-sort-row">
                <SortDropdown selectedOption={sortOption} selectedLabel={selectedSortLabel} onSelect={handleSortSelect} options={sortOptions} />
                <span className="tickets-sort-row__count">Найдено вариантов: {resultCount}</span>
              </div>
            ) : null}

            {showEmptyOrError ? (
              <TicketsEmptyState hasActiveFilters={hasActiveFilters} onResetFilters={handleResetFilters} onRetry={refetch} />
            ) : (
              <>
                <div className="tickets-list">
                  {sortedFlights.map(flight => {
                    const breakdown = getFlightPriceBreakdown(flight, flightPriceMap, packagePrice);
                    return (
                      <FlightCardView
                        key={String(flight.id)}
                        flight={flight}
                        priceLabel={breakdown.totalLabel}
                        feesLabel={breakdown.feesLabel}
                        onPress={() => handleFlightPress(flight)}
                      />
                    );
                  })}
                </div>
                <div ref={sentinelRef} aria-hidden="true" />
                {loadingMore ? (
                  <div className="tickets-loader-more">
                    <span className="tickets-spinner tickets-spinner--sm" />
                  </div>
                ) : null}
              </>
            )}
          </>
        )}
      </div>

      <FlightsFiltersModal
        visible={filtersModalVisible}
        filters={filters}
        selectedFilters={selectedFilters}
        netPrice={toMoney(packageInfo?.price ?? packageInfo?.net_price) || undefined}
        onApply={handleFiltersApply}
        onClose={handleFiltersClose}
      />
    </>
  );
};

export default TicketsScreen;
