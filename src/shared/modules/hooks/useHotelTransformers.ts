// Desktop: заглушка вместо require(png) из RN.
export const CARD_IMAGE_PLACEHOLDER = { uri: './images/cardImage.svg' };
import { HotelInfo } from '../../component/UI';

type ApiHotelImage = {
  x500?: string;
  x620?: string;
  x900?: string;
  x800x600x?: string;
  [key: string]: any;
};

type ApiHotelFeatures = {
  line?: number;
  beach_surface?: string;
  beach_distance?: number;
  airport_distance?: number;
  wi_fi?: string;
  [key: string]: any;
};

type ApiHotel = {
  id: number;
  name: string;
  rating?: number;
  stars?: number;
  reviews_count?: number;
  reviews?: number;
  images?: ApiHotelImage[];
  features?: ApiHotelFeatures;
  price?: number;
  address?: string;
};

// Transform API images to HotelInfo images format
export const transformHotelImages = (images?: ApiHotelImage[]): any[] => {
  if (!images || images.length === 0) {
    return [CARD_IMAGE_PLACEHOLDER];
  }

  return images.map((img) => {
    if (img.x800x600x) {
      return { uri: `https://img.cdn.level.travel/${img.x800x600x}` };
    }
    // Fallback to other sizes if x800x600x not available
    if (img.x620) {
      return { uri: `https://img.cdn.level.travel/${img.x620}` };
    }
    if (img.x500) {
      return { uri: `https://img.cdn.level.travel/${img.x500}` };
    }
    if (img.x900) {
      return { uri: `https://img.cdn.level.travel/${img.x900}` };
    }
    return CARD_IMAGE_PLACEHOLDER;
  });
};

// Transform API features to tags array
export const transformHotelTags = (features?: ApiHotelFeatures): string[] => {
  const tags: string[] = [];
  if (!features) return tags;

  if (features.line) {
    tags.push(`${features.line}-я линия`);
  }

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

  if (features.beach_distance) {
    tags.push(`${features.beach_distance} м до пляжа`);
  }

  if (features.airport_distance) {
    const km = Math.round(features.airport_distance / 1000);
    tags.push(`${km} км до аэропорта`);
  }

  if (features.wi_fi === 'FREE' || features.wi_fi === 'LOBBY_FREE') {
    tags.push('Бесплатный Wi-Fi');
  } else if (features.wi_fi === 'PAID') {
    tags.push('Платный Wi-Fi');
  }

  return tags;
};

// Transform API hotel data to HotelInfo format
export const transformApiHotelToHotelInfo = (apiHotel: ApiHotel): HotelInfo => {
  const images = transformHotelImages(apiHotel.images);
  const tags = transformHotelTags(apiHotel.features);

  return {
    id: String(apiHotel.id),
    name: apiHotel.name,
    reviews: apiHotel.reviews_count ?? apiHotel.reviews ?? 0,
    rating: apiHotel.rating || 0,
    stars: apiHotel.stars || 0,
    images,
    tags,
    price: apiHotel.price
      ? `${apiHotel.price.toLocaleString('ru-RU')} ₽`
      : 'Цена по запросу',
    dateRange: '',
    address: apiHotel.address || '',
  };
};

