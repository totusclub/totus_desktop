import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@shared/modules/store';
import type { HotelInfo } from '@shared/types/hotel/hotelCard';
import type { HotelRoom, HotelSearchSnapshot } from '@shared/types/hotel';
import type { SearchParams } from '@shared/types/search';
import { useHotelDetails } from '@shared/modules/hooks/useHotelDetails';
import { useHotelRooms } from '@shared/modules/hooks/useHotelRooms';
import { useHotelReviews } from '@shared/modules/hooks/useHotelReviews';
import { normalizeSearchType } from '@shared/utils/bookingFlowUtils';
import { buildSnapshotFromParams } from '@shared/utils/hotelUtils/searchSnapshot';
import type { AiRoomPick } from '@shared/utils/hotelUtils/aiRoomPick';
import { useRouteParams } from '../../app/navigation';
import { PageHeader } from '../../shell/PageHeader';
import { HotelCard } from '../../components/HotelCard';
import { HotelSkeleton } from './HotelSkeleton';
import { HotelDetailsPriceCard } from './HotelDetailsPriceCard';
import { HotelSearchSection } from './HotelSearchSection';
import { HotelAddressCard } from './HotelAddressCard';
import { HotelRoomsSection } from './HotelRoomsSection';
import { HotelDescriptionCard } from './HotelDescriptionCard';
import { ExpandableSectionModal } from './modals/ExpandableSectionModal';
import { HotelReviewsModal } from './modals/HotelReviewsModal';
import { RoomDetailsModal } from './modals/RoomDetailsModal';
import { AllOptionsModal } from './modals/AllOptionsModal';
import './hotel.css';

// Порт component/hotel/Hotel.tsx (ветка isTablet/TabletColumns → Figma «Desktop / Hotel page»):
// слева фото-карточка, справа «цена → поиск → адрес», ниже номера (3 колонки) и «Описание».

type SectionInfo = { id: string; title: string };

type SectionModalState = { visible: boolean; section: SectionInfo | null };

type RoomModalState = { visible: boolean; room: HotelRoom | null; selectedDate?: string | null };

export type HotelRouteParams = {
  hotel?: HotelInfo;
  hotelId?: string | number;
  requestId?: string;
  searchParams?: SearchParams;
  searchSnapshot?: HotelSearchSnapshot;
  aiRoomPick?: AiRoomPick;
};

export const HotelScreen: React.FC = () => {
  const routeParams = useRouteParams<HotelRouteParams>();

  // Modal state
  const [sectionModal, setSectionModal] = useState<SectionModalState>({ visible: false, section: null });
  const [roomModal, setRoomModal] = useState<RoomModalState>({ visible: false, room: null });
  const [optionsModal, setOptionsModal] = useState<RoomModalState>({ visible: false, room: null });
  const [reviewsModalOpen, setReviewsModalOpen] = useState(false);
  const [isHotelSearching, setIsHotelSearching] = useState(false);
  const [hotelSearchSettled, setHotelSearchSettled] = useState(false);

  const passedHotelId = routeParams?.hotelId ?? routeParams?.hotel?.id ?? null;
  const hotelId = passedHotelId ? String(passedHotelId) : null;

  const hotelSearchType = normalizeSearchType(routeParams?.searchParams?.search_type);

  const { hotel, apiHotelData, loading } = useHotelDetails(hotelId, hotelSearchType);

  const {
    reviews,
    loading: reviewsLoading,
    loadingMore: reviewsLoadingMore,
    hasMore: reviewsHasMore,
    error: reviewsError,
    hotelRating,
    loadMore: loadMoreReviews,
  } = useHotelReviews(hotelId);

  const { requestId: storeRequestId, searchParams: globalSearchParams } = useSelector((state: RootState) => state.search);
  const initialRequestId = storeRequestId || null;

  /** Listing/package request_id is invalid for /hotels-rooms when opening a specific hotel. */
  const routeRequestId = useMemo(() => {
    const rid = routeParams?.requestId ?? null;
    if (!rid || !hotelId) return rid;
    const targetsThisHotel = routeParams?.searchParams?.hotel_ids?.some(id => String(id) === String(hotelId));
    // Hotel-scoped search already targets this hotel → still need a fresh
    // hotel-details request_id (listing / hotel_ids handoff is not reusable).
    if (targetsThisHotel) return null;
    return rid;
  }, [routeParams?.requestId, routeParams?.searchParams?.hotel_ids, hotelId]);

  /**
   * Never reuse Redux listing request_id for /hotels-rooms (matches kedam-WEB
   * useRequestIdSync). Always start a hotel-scoped search on this screen.
   */
  const ignoreStoreRequestId = Boolean(hotelId);

  const [localRequestId, setLocalRequestId] = useState<string | null>(() => routeRequestId || null);
  const [roomsRefreshKey, setRoomsRefreshKey] = useState(0);
  const [staleRefreshCount, setStaleRefreshCount] = useState(0);
  const attemptedStaleIdsRef = useRef<Set<string>>(new Set());

  const routeSearchKey = useMemo(() => JSON.stringify(routeParams?.searchParams ?? null), [routeParams?.searchParams]);
  const prevRouteSearchKeyRef = useRef<string | null>(null);

  // При смене параметров перехода с hotel_ids этого отеля сбрасываем request_id (не смешиваем со старым из Redux).
  useEffect(() => {
    if (prevRouteSearchKeyRef.current === routeSearchKey) return;
    prevRouteSearchKeyRef.current = routeSearchKey;
    setHotelSearchSettled(false);
    attemptedStaleIdsRef.current.clear();
    setStaleRefreshCount(0);
    if (ignoreStoreRequestId && !routeRequestId) setLocalRequestId(null);
  }, [routeSearchKey, ignoreStoreRequestId, routeRequestId]);

  useEffect(() => {
    if (ignoreStoreRequestId) return;
    if (initialRequestId && !localRequestId) setLocalRequestId(initialRequestId);
  }, [ignoreStoreRequestId, initialRequestId, localRequestId]);

  /** Один ключ на «визит» (+ stale retry): после монтирования HotelSearchSection делается тот же startSearch, что по кнопке «Найти». */
  const hotelMountSearchSignature = useMemo(
    () => `${hotelId}|${routeSearchKey}|${staleRefreshCount}`,
    [hotelId, routeSearchKey, staleRefreshCount],
  );

  /** Уже есть hotel-scoped request_id — номера уже грузятся, не слать второй старт автоматически. */
  const skipAutoMountSearch = useMemo(() => Boolean(routeRequestId || localRequestId), [localRequestId, routeRequestId]);

  const requestId = useMemo(() => {
    if (localRequestId) return localRequestId;
    return ignoreStoreRequestId ? null : initialRequestId;
  }, [localRequestId, ignoreStoreRequestId, initialRequestId]);

  const handleStaleRequestId = useCallback((failedRequestId: string) => {
    if (attemptedStaleIdsRef.current.has(failedRequestId)) return;
    if (attemptedStaleIdsRef.current.size >= 2) {
      console.warn('[Hotel] Max stale request_id refresh attempts reached');
      return;
    }
    attemptedStaleIdsRef.current.add(failedRequestId);
    setHotelSearchSettled(false);
    setLocalRequestId(null);
    setStaleRefreshCount(count => count + 1);
    setRoomsRefreshKey(key => key + 1);
  }, []);

  const { rooms, roomFilters, loading: roomsLoading } = useHotelRooms(requestId, hotelId, {
    isReady: Boolean(hotelId),
    refreshKey: roomsRefreshKey,
    onRequestIdStale: handleStaleRequestId,
  });

  const awaitingInitialSearch = !skipAutoMountSearch && !hotelSearchSettled && !requestId;
  const roomsSectionLoading = roomsLoading || isHotelSearching || awaitingInitialSearch;
  const roomsSearchAttempted = Boolean(requestId) || hotelSearchSettled;

  const fallbackSnapshot = useMemo(
    () => buildSnapshotFromParams(routeParams?.searchParams) || buildSnapshotFromParams(globalSearchParams),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      routeParams?.searchParams,
      globalSearchParams?.start_date,
      globalSearchParams?.nights,
      globalSearchParams?.adults,
      globalSearchParams?.kids,
      globalSearchParams?.kids_ages,
    ],
  );

  const initialSnapshot = routeParams?.searchSnapshot || fallbackSnapshot;
  const [overrideSnapshot, setOverrideSnapshot] = useState<HotelSearchSnapshot | null>(null);
  const searchSnapshot = overrideSnapshot || initialSnapshot;
  const aiRoomPick = routeParams?.aiRoomPick;
  // На десктопе hotel и hotelFromAi ведут на один маршрут — признак AI-перехода только по aiRoomPick.
  const isFromAiAssistant = Boolean(aiRoomPick);
  const safeApiHotelData = apiHotelData ?? undefined;
  const roomsSectionRef = useRef<HTMLDivElement>(null);
  const hasAutoScrolledToRoomsRef = useRef(false);

  const scrollToRoomsSection = useCallback((animated = false) => {
    roomsSectionRef.current?.scrollIntoView({ behavior: animated ? 'smooth' : 'auto', block: 'start' });
  }, []);

  useEffect(() => {
    hasAutoScrolledToRoomsRef.current = false;
  }, [hotelId, routeSearchKey]);

  useEffect(() => {
    if (!isFromAiAssistant || hasAutoScrolledToRoomsRef.current) return;
    if (roomsSectionLoading || !roomsSearchAttempted) return;
    requestAnimationFrame(() => {
      scrollToRoomsSection(false);
      hasAutoScrolledToRoomsRef.current = true;
    });
  }, [isFromAiAssistant, roomsSectionLoading, roomsSearchAttempted, rooms.length, scrollToRoomsSection]);

  const handleSectionPress = useCallback((section: SectionInfo) => {
    setSectionModal({ visible: true, section });
  }, []);

  const handleSectionClose = useCallback(() => {
    setSectionModal({ visible: false, section: null });
  }, []);

  const handleRoomDetailsOpen = useCallback((room: HotelRoom) => {
    setRoomModal({ visible: true, room });
  }, []);

  const handleRoomDetailsClose = useCallback(() => {
    setRoomModal({ visible: false, room: null });
  }, []);

  const handleOptionsOpen = useCallback((room: HotelRoom, selectedDate: string | null) => {
    setOptionsModal({ visible: true, room, selectedDate });
  }, []);

  const handleOptionsClose = useCallback(() => {
    setOptionsModal({ visible: false, room: null });
  }, []);

  const handleSearchComplete = useCallback((newRequestId: string) => {
    setLocalRequestId(newRequestId);
  }, []);

  const handleParamsChange = useCallback((snapshot: HotelSearchSnapshot) => {
    setOverrideSnapshot(snapshot);
  }, []);

  const handleSearchSettled = useCallback(() => setHotelSearchSettled(true), []);

  const displayHotel = useMemo(() => {
    if (!hotel) return null;
    const routeReviews = routeParams?.hotel?.reviews ?? 0;
    const routeRating = routeParams?.hotel?.rating ?? 0;
    const reviewsCount = hotel.reviews || routeReviews || (reviews.length > 0 ? reviews.length : 0);
    const rating = hotel.rating || routeRating || hotelRating || 0;
    return { ...hotel, reviews: reviewsCount, rating };
  }, [hotel, routeParams?.hotel, reviews.length, hotelRating]);

  if (!hotelId) return null;

  const headerTitle = displayHotel?.name || routeParams?.hotel?.name || '';

  if (loading || !hotel || !displayHotel) {
    return (
      <>
        <PageHeader title="Отель" subtitle={headerTitle || undefined} back />
        <div className="page-body">
          <HotelSkeleton />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Отель" subtitle={headerTitle || undefined} back />
      <div className="page-body hotel-page">
        {/* Figma «Desktop / Hotel page»: photo card left; right column = price → search → address/map. */}
        <div className="hotel-columns">
          <div className="hotel-columns__main">
            <HotelCard
              hotel={displayHotel}
              imageHeight={400}
              showAddress
              showTags={false}
              showSlider
              onReviewsPress={() => setReviewsModalOpen(true)}
            />
          </div>
          <aside className="hotel-columns__side">
            <HotelDetailsPriceCard
              rooms={rooms}
              loading={roomsSectionLoading}
              searchAttempted={roomsSearchAttempted}
              searchType={hotelSearchType}
              searchSnapshot={searchSnapshot}
              aiRoomPick={aiRoomPick}
              onChooseRoom={() => scrollToRoomsSection(true)}
            />
            {/* Rendered exactly once (it runs the auto mount search). */}
            <HotelSearchSection
              hotelId={hotelId}
              apiHotelData={safeApiHotelData}
              onSearchComplete={handleSearchComplete}
              onSearchingChange={setIsHotelSearching}
              onSearchSettled={handleSearchSettled}
              onParamsChange={handleParamsChange}
              initialSearchParams={routeParams?.searchParams}
              mountSearchSignature={hotelMountSearchSignature}
              skipAutoMountSearch={skipAutoMountSearch}
            />
            <HotelAddressCard hotel={displayHotel} apiHotelData={safeApiHotelData} />
          </aside>
        </div>

        <HotelRoomsSection
          ref={roomsSectionRef}
          rooms={rooms}
          roomFilters={roomFilters}
          requestId={requestId}
          hotelId={hotelId}
          loading={roomsSectionLoading}
          searchAttempted={roomsSearchAttempted}
          onViewAllOptions={handleOptionsOpen}
          onMoreDetails={handleRoomDetailsOpen}
          initialSelectedDate={searchSnapshot?.startDateISO || null}
          searchNights={searchSnapshot?.nights ?? null}
          searchType={hotelSearchType}
          aiRoomPick={aiRoomPick}
        />

        <HotelDescriptionCard hotel={hotel} apiHotelData={safeApiHotelData} onSectionPress={handleSectionPress} />
      </div>

      {sectionModal.visible && sectionModal.section ? (
        <ExpandableSectionModal
          visible={sectionModal.visible}
          onClose={handleSectionClose}
          sectionId={sectionModal.section.id}
          sectionTitle={sectionModal.section.title}
          apiHotelData={safeApiHotelData}
        />
      ) : null}

      <HotelReviewsModal
        visible={reviewsModalOpen}
        onClose={() => setReviewsModalOpen(false)}
        reviews={reviews}
        loading={reviewsLoading}
        loadingMore={reviewsLoadingMore}
        hasMore={reviewsHasMore}
        error={reviewsError}
        reviewsCount={displayHotel.reviews}
        rating={displayHotel.rating}
        onLoadMore={loadMoreReviews}
      />

      <RoomDetailsModal visible={roomModal.visible} onClose={handleRoomDetailsClose} room={roomModal.room} />

      <AllOptionsModal
        visible={optionsModal.visible}
        onClose={handleOptionsClose}
        room={optionsModal.room}
        selectedDate={optionsModal.selectedDate}
        requestId={requestId}
        aiRoomPick={aiRoomPick}
        hotelMeta={{
          name: hotel?.name,
          country: safeApiHotelData?.country?.name || (hotel as any)?.country_name,
          city: safeApiHotelData?.city?.name_ru || (hotel as any)?.city_name,
        }}
        searchContext={searchSnapshot}
        searchType={hotelSearchType}
      />
    </>
  );
};

export default HotelScreen;
