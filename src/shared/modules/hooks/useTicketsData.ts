import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PackagesActualize, Packagesflights } from '../api/levelTravelApi';
import type { PackagesFlightsParams } from '../../types/packages';
import {
  coerceTicketsFilterPayload,
  normalizeTicketsFilterSelections,
  sanitizeTicketsFilterPayload,
} from '../../utils/ticketsUtils/sanitizeTicketsFilterPayload';

const ITEMS_PER_PAGE = 20;
const PAGINATION_THRESHOLD = 100;

export type TicketsErrorKind = 'package' | 'flights' | null;

/** Match kedam-WEB — strip nulls / empty arrays before POST /packages/flights. */
function sanitizePackageFlightsParams(
  params: Record<string, unknown>,
): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(params || {})) {
    if (value == null) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    if (
      typeof value === 'object' &&
      !Array.isArray(value) &&
      Object.values(value as Record<string, unknown>).every(
        v => v == null || v === '',
      )
    ) {
      continue;
    }
    cleaned[key] = value;
  }

  return cleaned;
}

/** kedam-WEB `isPackageGoneError` — stale package id → re-actualize once. */
function isPackageGoneError(err: unknown): boolean {
  const status = (err as { response?: { status?: number } })?.response?.status;
  if (status !== 400 && status !== 404 && status !== 422) return false;
  const data = (err as { response?: { data?: { error?: string } } })?.response
    ?.data;
  const msg = String(data?.error || '').toLowerCase();
  return (
    msg.includes('package not found') ||
    msg.includes('invalid_params') ||
    msg.includes('package')
  );
}

function getFriendlyFlightsError(err: unknown): string {
  if (isPackageGoneError(err)) {
    return 'Не удалось загрузить варианты перелёта. Попробуйте выбрать тур заново.';
  }
  const status = (err as { response?: { status?: number } })?.response?.status;
  if (status != null && status >= 500) {
    return 'Сервис перелётов временно недоступен. Попробуйте ещё раз чуть позже.';
  }
  return 'Не удалось загрузить варианты перелёта. Попробуйте выбрать тур заново.';
}

export const useTicketsData = (
  packageId?: number,
  filtersPayload?: Record<string, unknown>,
  _searchType: 'package' | 'hotel' = 'package',
) => {
  const [rawFlights, setRawFlights] = useState<any[]>([]);
  const [allFlights, setAllFlights] = useState<any[]>([]);
  const [filters, setFilters] = useState<any | null>(null);
  const [packageInfo, setPackageInfo] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<TicketsErrorKind>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  /**
   * Filter metadata from the *unfiltered* response — the full option universe.
   * Pruning against the latest (already filtered) response would drop the very
   * selections that narrowed it down and cause a request loop.
   */
  const baseFiltersMetaRef = useRef<unknown>(null);
  const actualizedPackageIdRef = useRef<number | null>(null);

  const filtersKey = useMemo(
    () => JSON.stringify(normalizeTicketsFilterSelections(filtersPayload)),
    [filtersPayload],
  );

  const clearFlightsOnly = useCallback(() => {
    setRawFlights([]);
    setAllFlights([]);
    setFilters(null);
    setCurrentPage(1);
    setHasMore(false);
  }, []);

  const resetState = useCallback(() => {
    clearFlightsOnly();
    setPackageInfo(null);
    baseFiltersMetaRef.current = null;
    actualizedPackageIdRef.current = null;
  }, [clearFlightsOnly]);

  const fetchFlights = useCallback(async () => {
    if (!packageId) {
      setError('Не найден пакет для перелётов');
      setErrorKind('package');
      resetState();
      return;
    }

    // kedam_WEB: actualize once, then reuse package.id for every filtered
    // request — re-actualizing on each filter change is slow and can hand back
    // a different package id mid-session.
    const resolvePackageId = async () => {
      const cached = actualizedPackageIdRef.current;
      if (cached != null) {
        return cached;
      }

      const actualized = await PackagesActualize(packageId, 'package');
      const normalizedPackage = (actualized as any)?.package ?? null;
      const actualizedId = normalizedPackage?.id;

      if (!actualizedId) {
        throw new Error('Package actualize returned no package.id');
      }

      const resolved = Number(actualizedId) || actualizedId;
      actualizedPackageIdRef.current = resolved;
      setPackageInfo(normalizedPackage);

      if (__DEV__) {
        console.log('[Tickets] actualized package.id', actualizedId, {
          routePackageId: packageId,
        });
      }

      return resolved;
    };

    const requestFlights = async (allowRetry = true) => {
      const flightsPackageId = await resolvePackageId();

      const sanitizedSelections = sanitizeTicketsFilterPayload(
        baseFiltersMetaRef.current,
        filtersPayload,
      );

      // kedam_WEB posts only package_id (+ optional filter arrays) — no search_type
      const payload = sanitizePackageFlightsParams({
        package_id: flightsPackageId,
        ...coerceTicketsFilterPayload(sanitizedSelections),
      }) as PackagesFlightsParams;

      try {
        const flightsResponse = await Packagesflights(payload);
        if (__DEV__) {
          console.log('[Tickets] flightsResponse', {
            count: flightsResponse?.flights?.length,
            package_id: payload.package_id,
          });
        }

        const allFlightsData = flightsResponse?.flights || [];
        setAllFlights(allFlightsData);

        const nextFilters = flightsResponse?.filters || null;
        setFilters(nextFilters);
        if (nextFilters && Object.keys(payload).length === 1) {
          baseFiltersMetaRef.current = nextFilters;
        }

        if (allFlightsData.length > PAGINATION_THRESHOLD) {
          setRawFlights(allFlightsData.slice(0, ITEMS_PER_PAGE));
          setCurrentPage(1);
          setHasMore(allFlightsData.length > ITEMS_PER_PAGE);
        } else {
          setRawFlights(allFlightsData);
          setCurrentPage(1);
          setHasMore(false);
        }
      } catch (err: unknown) {
        // kedam-WEB: expired package → actualize once and retry with fresh id.
        if (allowRetry && isPackageGoneError(err)) {
          actualizedPackageIdRef.current = null;
          try {
            const refreshed = await PackagesActualize(packageId, 'package');
            const freshId = (refreshed as any)?.package?.id;
            if (freshId != null) {
              const resolved = Number(freshId) || freshId;
              actualizedPackageIdRef.current = resolved;
              setPackageInfo((refreshed as any)?.package ?? null);
              await requestFlights(false);
              return;
            }
          } catch (retryErr) {
            console.error('[Tickets] retry after actualize failed:', retryErr);
          }
        }
        throw err;
      }
    };

    try {
      setLoading(true);
      setError(null);
      setErrorKind(null);
      clearFlightsOnly();

      await requestFlights(true);
    } catch (err: unknown) {
      console.error('[Tickets] Flights loading failed:', err);
      // Keep package card when only /packages/flights failed (kedam-WEB does the same).
      const hadPackage = actualizedPackageIdRef.current != null;
      clearFlightsOnly();
      if (!hadPackage) {
        setPackageInfo(null);
        actualizedPackageIdRef.current = null;
        baseFiltersMetaRef.current = null;
        setErrorKind('package');
        setError('Не удалось загрузить пакет. Вернитесь к выбору номера.');
      } else {
        setErrorKind('flights');
        setError(getFriendlyFlightsError(err));
      }
    } finally {
      setLoading(false);
    }
  }, [packageId, filtersKey, clearFlightsOnly, filtersPayload]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore || allFlights.length === 0) return;

    setLoadingMore(true);
    setRawFlights(prevFlights => {
      const nextPage = currentPage + 1;
      const start = currentPage * ITEMS_PER_PAGE;
      const end = start + ITEMS_PER_PAGE;
      const nextChunk = allFlights.slice(start, end);

      if (nextChunk.length === 0) {
        setHasMore(false);
        return prevFlights;
      }

      setCurrentPage(nextPage);
      setHasMore(end < allFlights.length);
      return [...prevFlights, ...nextChunk];
    });
    setLoadingMore(false);
  }, [currentPage, hasMore, allFlights, loadingMore]);

  // Reset filter meta when package changes so stale selections aren't reused
  useEffect(() => {
    baseFiltersMetaRef.current = null;
    actualizedPackageIdRef.current = null;
  }, [packageId]);

  useEffect(() => {
    fetchFlights();
  }, [fetchFlights]);

  return {
    rawFlights,
    allFlights,
    filters,
    packageInfo,
    loading,
    loadingMore,
    error,
    errorKind,
    hasMore,
    refetch: fetchFlights,
    loadMore,
  };
};
