import type { Offer, HotelRoom } from '../../types/hotel';
import { offerMatchesSearchNights } from './roomHelpers';

export function getOffersForDate(
  room: HotelRoom,
  date: string | null,
  searchNights?: number | null,
): Offer[] {
  const allOffers = (Object.values(room.offers) as Offer[][]).flat();

  return allOffers.filter((offer) => {
    if (date && offer.start_date !== date) return false;
    return offerMatchesSearchNights(offer, searchNights);
  });
}
