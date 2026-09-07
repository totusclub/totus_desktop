import React, { useMemo } from 'react';
import type { HotelRoom, Offer } from '@shared/types/hotel';
import type { HotelSearchSnapshot } from '@shared/types/hotel/search';
import type { AiRoomPick } from '@shared/utils/hotelUtils/aiRoomPick';
import { enrichAiRoomPickFromRooms, resolveAiSelectedOffer, resolveAiSelectedRoom } from '@shared/utils/hotelUtils/aiRoomPick';
import { findCheapestOfferForStartDate, formatOfferPrice, getOfferPriceValue } from '@shared/utils/hotelUtils/roomHelpers';
import { getOfferPriceTitle } from '@shared/utils/bookingFlowUtils';

// Порт hotel/HotelDetailsPriceCard.tsx: «от …₽» + «Выбрать номер» (kedam-WEB HotelDetailsInfoPrice parity).

type Props = {
  rooms: HotelRoom[];
  loading: boolean;
  searchAttempted: boolean;
  searchType?: 'package' | 'hotel';
  searchSnapshot?: HotelSearchSnapshot | null;
  aiRoomPick?: AiRoomPick | null;
  onChooseRoom: () => void;
};

const MEAL_LABELS: Record<string, string> = {
  BB: 'Завтрак',
  RO: 'Без питания',
  AI: 'Всё включено',
  UAI: 'Ультра всё включено',
  HB: 'Завтрак и ужин',
  FB: 'Завтрак, обед, ужин',
  HBD: 'Завтрак и ужин',
  AI24: 'Всё включено 24 часа',
  DNR: 'Ужин',
  AIL: 'Всё включено с ограничениями',
  'FB+': 'Завтрак, обед, ужин +',
  'HB+': 'Завтрак и ужин +',
  HBL: 'Завтрак и обед',
};

function formatStartDateRu(startDate?: string | null): string {
  if (!startDate) return '';
  const date = new Date(startDate);
  if (Number.isNaN(date.getTime())) return '';
  const formatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });
  return `с ${formatter.format(date)}`;
}

function formatNightsLabel(nights?: number | null): string {
  if (nights == null || !Number.isFinite(nights)) return '';
  const n = Math.round(Number(nights));
  const mod10 = n % 10;
  const mod100 = n % 100;
  let word = 'ночей';
  if (mod10 === 1 && mod100 !== 11) word = 'ночь';
  else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) word = 'ночи';
  return `${n} ${word}`;
}

function formatRoomOfferLabel(pick: AiRoomPick | null | undefined, roomName?: string | null): string {
  if (!pick) return '';
  const mealId = pick.mealId ? String(pick.mealId).split(',')[0]?.trim() : '';
  const meal = pick.mealType || (mealId ? MEAL_LABELS[mealId.toUpperCase()] || mealId : '') || '';
  const parts = [roomName || pick.roomType, meal].filter(Boolean);
  return parts.join(' · ');
}

export const HotelDetailsPriceCard: React.FC<Props> = ({
  rooms,
  loading,
  searchAttempted,
  searchType,
  searchSnapshot,
  aiRoomPick,
  onChooseRoom,
}) => {
  const startDate = searchSnapshot?.startDateISO || aiRoomPick?.startDate || '';
  const searchNights = searchSnapshot?.nights ?? null;

  const enrichedPick = useMemo(
    () => enrichAiRoomPickFromRooms(aiRoomPick, rooms, startDate || null),
    [aiRoomPick, rooms, startDate],
  );

  const listMatched = useMemo(() => {
    if (!enrichedPick || !rooms.length) return null;
    const room = resolveAiSelectedRoom(rooms, enrichedPick, startDate || null);
    if (!room) return null;
    const selected = resolveAiSelectedOffer(room, enrichedPick, startDate || null);
    if (!selected) return null;
    return { room, ...selected };
  }, [rooms, enrichedPick, startDate]);

  const searchMealIds = useMemo(() => {
    if (!enrichedPick?.mealId) return null;
    const ids = String(enrichedPick.mealId)
      .split(',')
      .map(id => id.trim())
      .filter(Boolean);
    return ids.length ? ids : null;
  }, [enrichedPick?.mealId]);

  const cheapestOffer = useMemo(() => {
    if (!startDate) return null;
    return findCheapestOfferForStartDate(rooms, startDate, searchNights, searchMealIds);
  }, [rooms, startDate, searchNights, searchMealIds]);

  const highlightOffer: Offer | null = listMatched?.offer ?? cheapestOffer ?? null;

  const listPrice =
    enrichedPick?.roomPrice != null && Number.isFinite(Number(enrichedPick.roomPrice)) ? Number(enrichedPick.roomPrice) : null;

  const matchedOfferPrice = useMemo(() => {
    if (!highlightOffer) return null;
    return getOfferPriceValue(highlightOffer);
  }, [highlightOffer]);

  const hasRooms = rooms.length > 0;

  // Stick to list/AI card price until rooms produce a matching offer.
  const offerPrice = useMemo(() => {
    if (listPrice != null) {
      if (matchedOfferPrice != null && Math.round(matchedOfferPrice) === Math.round(listPrice)) {
        return matchedOfferPrice;
      }
      if (loading || !hasRooms || !searchAttempted) return listPrice;
      if (searchMealIds?.length && !listMatched) return listPrice;
    }
    return matchedOfferPrice ?? listPrice ?? undefined;
  }, [listPrice, matchedOfferPrice, listMatched, searchAttempted, loading, hasRooms, searchMealIds]);

  const showNoRoomsPrice = searchAttempted && !loading && !hasRooms && listPrice == null && !highlightOffer;

  const priceFormatted = offerPrice != null ? formatOfferPrice(Math.round(Number(offerPrice))) : '—';

  const roomOfferLabel = formatRoomOfferLabel(enrichedPick, listMatched?.room?.room?.name_ru);

  const dateLine = useMemo(() => {
    const dateStr = formatStartDateRu(highlightOffer?.start_date || enrichedPick?.startDate || startDate || null);
    const nightsStr = formatNightsLabel(highlightOffer?.nights_count ?? searchNights);
    return [dateStr, nightsStr].filter(Boolean).join(', ');
  }, [highlightOffer?.start_date, highlightOffer?.nights_count, enrichedPick?.startDate, startDate, searchNights]);

  if (loading && !listPrice && !hasRooms) {
    return (
      <div className="hotel-price-card">
        <div className="hotel-price-card__loader">
          <span className="hotel-spinner" aria-label="Загрузка" />
        </div>
      </div>
    );
  }

  return (
    <div className="hotel-price-card">
      <div className="hotel-price-card__block">
        {showNoRoomsPrice ? (
          <>
            <div className="hotel-price-card__empty-title">Номера не найдены</div>
            <div className="hotel-price-card__meta" style={{ whiteSpace: 'normal' }}>
              По выбранным параметрам поиска нет доступных номеров
            </div>
          </>
        ) : (
          <>
            <div className="hotel-price-card__price">от {priceFormatted}₽</div>
            <div className="hotel-price-card__title">{getOfferPriceTitle(searchType)}</div>
            {roomOfferLabel ? <div className="hotel-price-card__meta">{roomOfferLabel}</div> : null}
            {dateLine ? <div className="hotel-price-card__meta">{dateLine}</div> : null}
          </>
        )}
      </div>
      <button type="button" className="btn btn--block" onClick={onChooseRoom}>
        Выбрать номер
      </button>
    </div>
  );
};

export default HotelDetailsPriceCard;
