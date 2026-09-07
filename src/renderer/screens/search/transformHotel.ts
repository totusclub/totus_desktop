import type { HotelInfo } from '../../components/HotelCard';
import { CARD_IMAGE_PLACEHOLDER_SRC } from '../../components/HotelCard';

// Порт searchResult/ResultList.transformHotel — отель API → HotelInfo для карточки.
export const transformHotel = (hotel: any): HotelInfo => {
  const hotelData = hotel.hotel || hotel;
  const features = hotelData.features || {};

  const minPrice = hotel.min_price || hotelData.min_price || 0;
  const price = minPrice ? `${Number(minPrice).toLocaleString('ru-RU')} ₽` : '0 ₽';

  const minPriceNights = hotel.min_price_nights || hotelData.min_price_nights;
  const dateRange = minPriceNights ? `от ${minPriceNights} ночей` : '';

  const tags: string[] = [];
  if (features.line) tags.push(`${features.line}-я линия`);
  if (features.beach_surface) {
    const raw = String(features.beach_surface).trim().toUpperCase().replace(/\s+/g, '');
    const beachTypes: Record<string, string> = {
      SAND: 'Песок',
      PEBBLE: 'Галька',
      'SAND+PEBBLE': 'Песок с галькой',
      'SAND+BPEBBLE': 'Песок с галькой',
      SAND_PEBBLE: 'Песок с галькой',
      PLATFORM: 'Платформа',
    };
    tags.push(beachTypes[raw] || features.beach_surface);
  }
  if (features.beach_distance) tags.push(`${features.beach_distance} м до пляжа`);
  if (features.airport_distance) {
    const km = Math.round(features.airport_distance / 1000);
    tags.push(`${km} км до аэропорта`);
  }
  if (features.wi_fi === 'FREE') tags.push('Бесплатный Wi-Fi');
  else if (features.wi_fi === 'PAID') tags.push('Платный Wi-Fi');

  const images: Array<string | { uri: string }> = hotelData.images?.map((img: any) => {
    if (img.webp_x620) return { uri: img.webp_x620 };
    if (img.x500) return { uri: img.x500 };
    return CARD_IMAGE_PLACEHOLDER_SRC;
  }) || [CARD_IMAGE_PLACEHOLDER_SRC];

  return {
    id: String(hotelData.id || hotel.id || ''),
    name: hotelData.name || '',
    reviews: hotelData.reviews_count || 0,
    rating: hotelData.rating || 0,
    stars: hotelData.stars || 0,
    images,
    tags,
    price,
    dateRange,
    // Keep API item for hotel-details meal/room pick (AI / All Inclusive handoff).
    _source: hotel,
  };
};
