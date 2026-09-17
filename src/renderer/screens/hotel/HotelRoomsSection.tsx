import React, { forwardRef, useMemo } from 'react';
import type { HotelRoom } from '@shared/types/hotel';
import type { HotelRoomFilters } from '@shared/utils/hotelUtils/roomFilters';
import type { AiRoomPick } from '@shared/utils/hotelUtils/aiRoomPick';
import {
  sortRoomsWithAiPickFirst,
  getOffersForAiPickRoom,
  resolveAiSelectedRoom,
  resolveAiSelectedOffer,
  resolveAiPriceChange,
  isSameHotelRoom,
  enrichAiRoomPickFromRooms,
} from '@shared/utils/hotelUtils/aiRoomPick';
import { transformRoomToHotelInfo, getRoomFeatures } from '@shared/modules/hooks/useRoomTransformers';
import { useRoomsByDate } from '@shared/modules/hooks/useRoomsByDate';
import { useHotelRoomFilters } from '@shared/modules/hooks/useHotelRoomFilters';
import { getOffersForDate } from '@shared/utils/hotelUtils/roomOffers';
import { HotelCard } from '../../components/HotelCard';
import { RoomsSectionSkeleton } from './RoomsSectionSkeleton';
import { DateSelectorBar } from './DateSelectorBar';
import { RoomFilters } from './RoomFilters';

// Порт hotel/HotelRoomsSection.tsx (ветка isTablet → TabletGrid): «Выберите номер» + фильтры, чипы дат, сетка 3 колонки.

/** Порт hotel/components/EmptyState.tsx */
export const EmptyState: React.FC<{ title: string }> = ({ title }) => <div className="hotel-empty">{title}</div>;

type Props = {
  rooms: HotelRoom[];
  roomFilters?: HotelRoomFilters | null;
  requestId?: string | null;
  hotelId?: string | null;
  loading: boolean;
  /** True after room search has finished (with or without results). */
  searchAttempted?: boolean;
  onViewAllOptions: (room: HotelRoom, selectedDate: string | null) => void;
  onMoreDetails: (room: HotelRoom) => void;
  initialSelectedDate?: string | null;
  /** Exact nights from hotel search — match kedam-WEB fixed-date rooming. */
  searchNights?: number | null;
  /** Тип текущего поиска (package | hotel) — подпись «с перелётом»/«без перелёта» у цены номера. */
  searchType?: string | null;
  aiRoomPick?: AiRoomPick | null;
};

export const HotelRoomsSection = forwardRef<HTMLDivElement, Props>(
  (
    {
      rooms,
      roomFilters = null,
      requestId = null,
      hotelId = null,
      loading,
      searchAttempted = false,
      onViewAllOptions,
      onMoreDetails,
      initialSelectedDate,
      searchNights = null,
      searchType = null,
      aiRoomPick = null,
    },
    ref,
  ) => {
    const initialEnrichedAiPick = useMemo(
      () => enrichAiRoomPickFromRooms(aiRoomPick, rooms, initialSelectedDate ?? null),
      [aiRoomPick, rooms, initialSelectedDate],
    );

    const {
      filteredRooms: roomsAfterFilters,
      displayRoomFilters,
      hasActiveFilters,
      filtersLoading,
      handleFilterChange,
      handleClearFilters,
    } = useHotelRoomFilters({
      rooms,
      roomFiltersFromApi: roomFilters,
      requestId,
      hotelId,
      initialAiPick: initialEnrichedAiPick,
    });

    const { selectedDate, setSelectedDate, dateOptions, filteredRooms } = useRoomsByDate(
      roomsAfterFilters,
      initialSelectedDate,
      searchNights,
    );

    const enrichedAiRoomPick = useMemo(
      () => enrichAiRoomPickFromRooms(aiRoomPick, rooms, selectedDate ?? initialSelectedDate ?? null),
      [aiRoomPick, rooms, selectedDate, initialSelectedDate],
    );

    const selectedAiRoom = useMemo(
      () => resolveAiSelectedRoom(rooms, enrichedAiRoomPick, selectedDate ?? initialSelectedDate ?? null),
      [rooms, enrichedAiRoomPick, selectedDate, initialSelectedDate],
    );

    const displayRooms = useMemo(() => {
      let nextRooms = sortRoomsWithAiPickFirst(filteredRooms, enrichedAiRoomPick, selectedDate);
      if (selectedAiRoom && !nextRooms.some(room => String(room.ID) === String(selectedAiRoom.ID))) {
        nextRooms = [selectedAiRoom, ...nextRooms];
      }
      return nextRooms;
    }, [filteredRooms, enrichedAiRoomPick, selectedDate, selectedAiRoom]);

    if (loading) {
      return (
        <div ref={ref}>
          <RoomsSectionSkeleton />
        </div>
      );
    }

    if (!rooms.length) {
      if (!searchAttempted) return <div ref={ref} />;
      return (
        <div ref={ref}>
          <EmptyState title="К сожалению, для данного отеля нет доступных номеров" />
        </div>
      );
    }

    const showFilteredEmpty = hasActiveFilters && !filtersLoading && roomsAfterFilters.length === 0;
    const showNoRoomsForDate = !filtersLoading && roomsAfterFilters.length > 0 && filteredRooms.length === 0;

    return (
      <section ref={ref} className="hotel-rooms">
        <div className="hotel-rooms__head">
          <h2 className="hotel-rooms__title">Выберите номер</h2>
          <RoomFilters
            filters={displayRoomFilters}
            hasActiveFilters={hasActiveFilters}
            loading={filtersLoading}
            onChange={handleFilterChange}
            onClear={handleClearFilters}
          />
        </div>

        <DateSelectorBar dateOptions={dateOptions} selectedDate={selectedDate} onSelect={setSelectedDate} />

        {showFilteredEmpty ? (
          <div className="hotel-rooms__empty-wrap">
            <EmptyState title="По выбранным фильтрам номера не найдены" />
            <button type="button" className="hotel-rooms__clear" onClick={handleClearFilters}>
              Сбросить фильтры
            </button>
          </div>
        ) : showNoRoomsForDate ? (
          <EmptyState title="На выбранную дату нет номеров по этим фильтрам" />
        ) : (
          <div className="hotel-rooms__grid">
            {displayRooms.map(room => {
              const isAiFoundRoom = isSameHotelRoom(room, selectedAiRoom);
              const offers = isAiFoundRoom
                ? getOffersForAiPickRoom(room, selectedDate, enrichedAiRoomPick, searchNights)
                : getOffersForDate(room, selectedDate, searchNights);
              const aiPriceChange = isAiFoundRoom
                ? resolveAiPriceChange(
                    enrichedAiRoomPick,
                    offers[0] ?? resolveAiSelectedOffer(room, enrichedAiRoomPick, selectedDate)?.offer,
                  )
                : null;
              // Room Type v3: «от» — минимум по всем offers на дату (Arlekino + Level.Travel), подпись по search_type.
              const hotelInfo = transformRoomToHotelInfo(room, selectedDate, offers, searchType);
              const roomFeatures = getRoomFeatures(room, offers);
              return (
                <HotelCard
                  key={room.ID}
                  hotel={hotelInfo}
                  type="room"
                  imageHeight={200}
                  showSlider
                  roomFeatures={roomFeatures}
                  showAiBadge={isAiFoundRoom}
                  aiPriceChange={aiPriceChange}
                  onViewAllOptions={() => onViewAllOptions(room, selectedDate)}
                  onMoreDetails={() => onMoreDetails(room)}
                />
              );
            })}
          </div>
        )}
      </section>
    );
  },
);

HotelRoomsSection.displayName = 'HotelRoomsSection';

export default HotelRoomsSection;
