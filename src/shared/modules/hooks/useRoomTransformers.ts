import { HotelInfo } from '../../component/UI';
import { HotelRoom, Offer, RoomImage } from '../store/types/hotels';

// Transform room images to HotelInfo images format.
// Empty when the room has no photos — UI shows Totus radiologo instead.
export const transformRoomImages = (images?: RoomImage[]): any[] => {
  if (!images || images.length === 0) {
    return [];
  }

  const resolved = images
    .map((img) => {
      if (img.x900) {
        const x900Url =
          img.x900.startsWith('http://') || img.x900.startsWith('https://')
            ? img.x900
            : `https://img.cdn.level.travel/${img.x900}`;
        return { uri: x900Url };
      }
      if (img.x900x380) {
        const x900x380Url =
          img.x900x380.startsWith('http://') || img.x900x380.startsWith('https://')
            ? img.x900x380
            : `https://img.cdn.level.travel/${img.x900x380}`;
        return { uri: x900x380Url };
      }
      return null;
    })
    .filter(Boolean);

  return resolved;
};


// Transform room data to HotelInfo format for HotelCard
export const transformRoomToHotelInfo = (
  room: HotelRoom,
  selectedDate: string | null,
  preferredOffers?: Offer[],
): HotelInfo => {
  const images = transformRoomImages(room.room.images);

  // Get offers for selected date
  const getOffersForDate = (): Offer[] => {
    if (!selectedDate) {
      const allOffers: Offer[] = [];
      Object.values(room.offers).forEach((offerList) => {
        allOffers.push(...offerList);
      });
      return allOffers;
    }

    const offersForDate: Offer[] = [];
    Object.values(room.offers).forEach((offerList) => {
      offerList.forEach((offer) => {
        if (offer.start_date === selectedDate) {
          offersForDate.push(offer);
        }
      });
    });
    return offersForDate;
  };

  const offers = preferredOffers?.length ? preferredOffers : getOffersForDate();
  const minPrice = offers.length > 0
    ? Math.min(...offers.map((o) => o.price))
    : room.min_price;

  // Get nights count from first offer
  const nightsCount = offers.length > 0 ? offers[0].nights_count : 7;

  // Format price
  const formattedPrice = `от ${minPrice.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} ₽`;
  const dateRange = `за ${nightsCount} ночей с перелётом`;

  return {
    id: room.ID,
    name: room.room.name_ru,
    reviews: 0,
    rating: 0,
    stars: 0,
    images,
    tags: [],
    price: formattedPrice,
    dateRange,
    address: undefined,
  };
};

// Get room-specific features for display
export const getRoomFeatures = (room: HotelRoom, offers: Offer[]) => {
  const features: string[] = [];

  // Get operators from offers
  const operators = new Set<string>();
  offers.forEach((offer) => {
    if (offer.operator_name) {
      operators.add(offer.operator_name);
    }
  });
  const operatorNames = Array.from(operators).join(', ');
  if (operatorNames) {
    features.push(operatorNames);
  }

  // Get meal types
  const mealTypes = room.meal_types || [];
  const mealTypeNames = mealTypes.map((mt) => mt.description).join(', ');
  if (mealTypeNames) {
    features.push(mealTypeNames);
  }

  // Check for instant confirm
  if (offers.some((o) => o.extras.instant_confirm)) {
    features.push('Быстрое подтверждение');
  }
  return features;
};

