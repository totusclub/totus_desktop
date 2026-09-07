import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { getHotelRooms } from '../api/levelTravelApi';
import type { HotelRoom } from '../../types/hotel';
import {
  applyRoomFilters,
  buildHotelRoomsQueryParams,
  clearRoomFilters,
  enrichRoomFilterOptions,
  hasActiveRoomFilters,
  hasHotelRoomsQueryParams,
  mergeRoomFiltersWithOperators,
  type HotelRoomFilters,
} from '../../utils/hotelUtils/roomFilters';
import {
  applyAiPickToRoomFilters,
  filterRoomsByMealCodes,
  resolveAiSelectedRoom,
  resolveExactMealIdsFromPick,
  type AiRoomPick,
} from '../../utils/hotelUtils/aiRoomPick';

type UseHotelRoomFiltersParams = {
  rooms: HotelRoom[];
  roomFiltersFromApi: HotelRoomFilters | null;
  requestId: string | null;
  hotelId: string | null;
  initialAiPick?: AiRoomPick | null;
};

export const useHotelRoomFilters = ({
  rooms,
  roomFiltersFromApi,
  requestId,
  hotelId,
  initialAiPick = null,
}: UseHotelRoomFiltersParams) => {
  const [activeRoomFilters, setActiveRoomFilters] = useState<HotelRoomFilters | null>(null);
  const [filterApiRooms, setFilterApiRooms] = useState<HotelRoom[] | null>(null);
  const [filtersLoading, setFiltersLoading] = useState(false);

  const prevBaseRoomsKeyRef = useRef<string | null>(null);
  const lastFilterRequestKeyRef = useRef<string | null>(null);
  const filterRequestSeqRef = useRef(0);
  const aiPickAppliedRef = useRef(false);
  const userChangedFiltersRef = useRef(false);

  const prevInitialAiPickKeyRef = useRef<string | null>(null);

  const baseRoomsKey = useMemo(
    () => `${rooms.length}:${rooms[0]?.ID ?? ''}`,
    [rooms],
  );

  useEffect(() => {
    const isNewRoomSet =
      prevBaseRoomsKeyRef.current !== null && prevBaseRoomsKeyRef.current !== baseRoomsKey;
    prevBaseRoomsKeyRef.current = baseRoomsKey;

    setFilterApiRooms(null);
    lastFilterRequestKeyRef.current = null;

    if (isNewRoomSet) {
      aiPickAppliedRef.current = false;
      userChangedFiltersRef.current = false;
    }

    setActiveRoomFilters((previous) => {
      const merged = mergeRoomFiltersWithOperators(
        roomFiltersFromApi,
        rooms,
        isNewRoomSet ? null : previous,
        rooms,
      );

      const pickKey = JSON.stringify(initialAiPick ?? null);
      if (prevInitialAiPickKeyRef.current !== pickKey) {
        aiPickAppliedRef.current = false;
        userChangedFiltersRef.current = false;
        prevInitialAiPickKeyRef.current = pickKey;
      }

      if (initialAiPick && !aiPickAppliedRef.current && !userChangedFiltersRef.current && merged) {
        const withAiPick = applyAiPickToRoomFilters(merged, initialAiPick);
        const hasMealsSelected =
          Boolean(initialAiPick.enforceMealFilter) &&
          withAiPick?.meals?.some((meal) => meal.selected);
        const hasOperatorSelected = withAiPick?.operators?.some((operator) => operator.selected);

        if (hasMealsSelected || hasOperatorSelected) {
          aiPickAppliedRef.current = true;
          return withAiPick;
        }
      }

      return merged;
    });
  }, [roomFiltersFromApi, baseRoomsKey, rooms, initialAiPick]);

  const handleFilterChange = useCallback(
    (next: HotelRoomFilters | ((current: HotelRoomFilters) => HotelRoomFilters)) => {
      userChangedFiltersRef.current = true;
      setActiveRoomFilters((current) => {
        if (!current) return current;
        return typeof next === 'function' ? next(current) : next;
      });
    },
    [],
  );

  const filterQueryParams = useMemo(
    () => buildHotelRoomsQueryParams(activeRoomFilters),
    [activeRoomFilters],
  );

  const filterQueryKey = useMemo(
    () => JSON.stringify(filterQueryParams),
    [filterQueryParams],
  );

  const hasActiveFilters = hasActiveRoomFilters(activeRoomFilters);

  useEffect(() => {
    if (!hasActiveFilters) {
      setFilterApiRooms(null);
      lastFilterRequestKeyRef.current = null;
      setFiltersLoading(false);
      return;
    }

    if (!requestId || !hotelId || !activeRoomFilters) return;
    if (!hasHotelRoomsQueryParams(filterQueryParams)) return;
    if (filterQueryKey === lastFilterRequestKeyRef.current) return;

    setFiltersLoading(true);

    const requestSeq = ++filterRequestSeqRef.current;

    const timer = setTimeout(async () => {
      lastFilterRequestKeyRef.current = filterQueryKey;

      try {
        const parsedHotelId = parseInt(hotelId, 10);
        if (isNaN(parsedHotelId)) return;

        const response = await getHotelRooms({
          request_id: requestId,
          hotel_id: parsedHotelId,
          ...filterQueryParams,
        });

        if (requestSeq !== filterRequestSeqRef.current) return;

        const apiRooms = Array.isArray(response?.result) ? response.result : [];
        setFilterApiRooms(apiRooms);

        setActiveRoomFilters((previous) => {
          const merged = mergeRoomFiltersWithOperators(
            response?.filters,
            apiRooms.length > 0 ? apiRooms : rooms,
            previous,
            rooms,
          );
          if (
            initialAiPick?.enforceMealFilter &&
            !userChangedFiltersRef.current
          ) {
            return applyAiPickToRoomFilters(merged, initialAiPick) ?? merged;
          }
          return merged;
        });
      } catch (error) {
        if (requestSeq !== filterRequestSeqRef.current) return;
        console.error('[useHotelRoomFilters] Failed to fetch filtered rooms:', error);
        lastFilterRequestKeyRef.current = null;
        setFilterApiRooms(null);
      } finally {
        if (requestSeq === filterRequestSeqRef.current) {
          setFiltersLoading(false);
        }
      }
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [
    activeRoomFilters,
    filterQueryKey,
    filterQueryParams,
    hasActiveFilters,
    hotelId,
    requestId,
    rooms,
    initialAiPick,
  ]);

  const displayBaseRooms = useMemo(() => {
    if (!hasActiveFilters) return rooms;
    // While filtered API loads, keep base rooms — meal codes applied client-side below.
    if (filtersLoading) return rooms;
    return filterApiRooms ?? rooms;
  }, [rooms, hasActiveFilters, filtersLoading, filterApiRooms]);

  const searchMealIds = useMemo(() => {
    if (!initialAiPick?.enforceMealFilter) return [];
    return resolveExactMealIdsFromPick({ mealId: initialAiPick.mealId });
  }, [initialAiPick]);

  const filteredRooms = useMemo(() => {
    let result = hasActiveFilters
      ? (applyRoomFilters(displayBaseRooms, activeRoomFilters) as HotelRoom[])
      : rooms;

    // Enforce search meal filter only when user selected filter_meals.
    if (searchMealIds.length > 0 && !userChangedFiltersRef.current) {
      result = filterRoomsByMealCodes(result, searchMealIds);
    }

    if (initialAiPick && !userChangedFiltersRef.current) {
      const selectedMealIds = (activeRoomFilters?.meals ?? [])
        .filter((meal) => meal.selected)
        .map((meal) => String(meal.id).toUpperCase());
      const pickMealIds = searchMealIds;
      const pickMealStillActive =
        !initialAiPick.enforceMealFilter ||
        !selectedMealIds.length ||
        pickMealIds.some((id) => selectedMealIds.includes(id));

      if (pickMealStillActive) {
        const matchedRoom = resolveAiSelectedRoom(
          rooms,
          initialAiPick,
          initialAiPick.startDate ?? null,
        );
        if (matchedRoom && !result.some((room) => String(room.ID) === String(matchedRoom.ID))) {
          const mealFiltered = filterRoomsByMealCodes(
            [matchedRoom],
            searchMealIds.length ? searchMealIds : null,
          );
          if (mealFiltered[0]) {
            result = [mealFiltered[0], ...result];
          }
        }
      }
    }

    return result;
  }, [
    rooms,
    displayBaseRooms,
    activeRoomFilters,
    hasActiveFilters,
    initialAiPick,
    searchMealIds,
  ]);

  const displayRoomFilters = useMemo(
    () => enrichRoomFilterOptions(rooms, activeRoomFilters),
    [rooms, activeRoomFilters],
  );

  const handleClearFilters = useCallback(() => {
    if (!activeRoomFilters) return;
    userChangedFiltersRef.current = true;
    lastFilterRequestKeyRef.current = null;
    setFilterApiRooms(null);
    setActiveRoomFilters(clearRoomFilters(activeRoomFilters));
  }, [activeRoomFilters]);

  return {
    filteredRooms,
    displayRoomFilters,
    hasActiveFilters,
    filtersLoading,
    handleFilterChange,
    handleClearFilters,
  };
};
