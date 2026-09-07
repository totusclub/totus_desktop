import { useState, useEffect, useRef } from 'react';
import { getHotelRooms, getSearchStatus } from '../api/levelTravelApi';
import { HotelRoom, HotelRoomsResponse } from '../store/types/hotels';
import {
  cloneRoomFilters,
  type HotelRoomFilters,
} from '../../utils/hotelUtils/roomFilters';
import {
  getReadySearchOperators,
  isSearchFullyComplete,
  isStaleSearchRequestError,
} from '../../utils/searchStatus';

/** Wait long enough for late operators (pending → completed). Matches kedam-WEB. */
const MAX_POLLS = 30;
const POLL_DELAY_MS = 2000;

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

type UseHotelRoomsOptions = {
  isReady?: boolean;
  refreshKey?: number;
  onRequestIdStale?: (failedRequestId: string) => void;
};

/**
 * Fetch hotel rooms for a hotel-details search.
 * Shows rooms as soon as any arrive, but keeps polling while operators are
 * still pending so later offers are not missed (same as kedam-WEB).
 */
export const useHotelRooms = (
  requestId: string | null,
  hotelId: string | null,
  options?: UseHotelRoomsOptions,
) => {
  const isReady = options?.isReady !== false;
  const refreshKey = options?.refreshKey ?? 0;

  const [rooms, setRooms] = useState<HotelRoom[]>([]);
  const [roomFilters, setRoomFilters] = useState<HotelRoomFilters | null>(null);
  const [roomsResponse, setRoomsResponse] = useState<HotelRoomsResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onRequestIdStaleRef = useRef(options?.onRequestIdStale);
  const prevFetchKeyRef = useRef<string | null>(null);

  useEffect(() => {
    onRequestIdStaleRef.current = options?.onRequestIdStale;
  }, [options?.onRequestIdStale]);

  useEffect(() => {
    if (!isReady || !hotelId) {
      setLoading(false);
      return;
    }

    if (!requestId) {
      setLoading(true);
      return;
    }

    const requestIdStr = String(requestId);
    const hotelIdStr = String(hotelId);
    const currentFetchKey = `${requestIdStr}:${hotelIdStr}:${refreshKey}`;

    if (prevFetchKeyRef.current === currentFetchKey) {
      setLoading(false);
      return;
    }

    const isSubsequentSearch = prevFetchKeyRef.current !== null;
    prevFetchKeyRef.current = currentFetchKey;

    if (isSubsequentSearch) {
      setRooms([]);
      setRoomFilters(null);
      setRoomsResponse(null);
    }
    setLoading(true);
    setError(null);

    let isMounted = true;
    let staleNotified = false;

    const finishLoading = () => {
      if (isMounted) {
        setLoading(false);
      }
    };

    const fetchRooms = async (): Promise<{
      gotRooms: boolean;
      requestFailed: boolean;
    }> => {
      try {
        const response = await getHotelRooms({
          request_id: requestIdStr,
          hotel_id: hotelIdStr,
        });

        // kedam-WEB uses result directly — do not require `success` flag
        // (some LT responses omit it even when rooms are present).
        const result = response?.result || [];

        if (!isMounted) {
          return { gotRooms: result.length > 0, requestFailed: false };
        }

        setRooms(result);
        setRoomFilters(cloneRoomFilters(response?.filters ?? null));
        setRoomsResponse(response);
        setError(null);

        return { gotRooms: result.length > 0, requestFailed: false };
      } catch (err: unknown) {
        console.error('[useHotelRooms] Failed to fetch hotel rooms:', err);
        if (isMounted) {
          setRooms([]);
          setRoomFilters(null);
          setRoomsResponse(null);
          setError(
            err instanceof Error ? err.message : 'Failed to fetch hotel rooms',
          );
        }
        return {
          gotRooms: false,
          requestFailed: isStaleSearchRequestError(err),
        };
      }
    };

    const notifyStaleRequestId = () => {
      if (!isMounted || staleNotified) return;
      staleNotified = true;
      finishLoading();
      onRequestIdStaleRef.current?.(requestIdStr);
    };

    const loadRooms = async () => {
      let lastReadyCount = 0;
      let sawAnyRooms = false;
      let statusFailStreak = 0;

      for (let poll = 0; poll < MAX_POLLS; poll += 1) {
        if (!isMounted) return;

        const searchStatus = await getSearchStatus(requestIdStr);
        const statusMap = searchStatus?.status;
        const completeness = searchStatus?.completeness;
        const readyCount = statusMap
          ? getReadySearchOperators(statusMap).length
          : 0;
        const searchDone = statusMap
          ? isSearchFullyComplete(statusMap, completeness)
          : false;

        if (!searchStatus) {
          statusFailStreak += 1;
        } else {
          statusFailStreak = 0;
        }

        const shouldFetchRooms =
          poll === 0 ||
          searchDone ||
          readyCount > lastReadyCount ||
          (!sawAnyRooms && readyCount > 0);

        if (shouldFetchRooms) {
          const fetched = await fetchRooms();
          if (!isMounted) return;

          if (fetched.requestFailed) {
            notifyStaleRequestId();
            return;
          }

          if (fetched.gotRooms) {
            sawAnyRooms = true;
            // Show first rooms while remaining operators are still pending.
            finishLoading();
          }

          lastReadyCount = Math.max(lastReadyCount, readyCount);
        }

        if (searchDone) {
          const finalFetch = await fetchRooms();
          if (!isMounted) return;

          if (finalFetch.requestFailed && !sawAnyRooms) {
            notifyStaleRequestId();
            return;
          }

          finishLoading();
          return;
        }

        // Status API unavailable for several polls and still no rooms → stale.
        if (!sawAnyRooms && statusFailStreak >= 3) {
          const retry = await fetchRooms();
          if (!isMounted) return;
          if (retry.requestFailed || !retry.gotRooms) {
            notifyStaleRequestId();
            return;
          }
          sawAnyRooms = true;
          finishLoading();
        }

        if (poll < MAX_POLLS - 1) {
          await sleep(POLL_DELAY_MS);
        }
      }

      const finalTry = await fetchRooms();
      if (!isMounted) return;

      finishLoading();

      if (!finalTry.gotRooms && (finalTry.requestFailed || !sawAnyRooms)) {
        notifyStaleRequestId();
      }
    };

    void loadRooms();

    return () => {
      isMounted = false;
    };
  }, [isReady, requestId, hotelId, refreshKey]);

  return { rooms, roomFilters, roomsResponse, loading, error };
};
