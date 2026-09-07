import React, { useCallback, useMemo } from 'react';
import type { HotelInfo } from '@shared/types/hotel/hotelCard';
import type { ApiHotelData } from '@shared/types/hotel';
import { openExternal } from '../../lib/desktop';

// Порт hotel/components/HotelAddressCardTablet.tsx: «Расположение», адрес, «Показать на карте»
// (deep link в системный браузер: Apple Maps на macOS, Google Maps на остальных платформах).

type Props = {
  hotel: HotelInfo;
  apiHotelData?: ApiHotelData;
};

const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform);

export const HotelAddressCard: React.FC<Props> = ({ hotel, apiHotelData }) => {
  const address = hotel.address || 'Адрес не указан';

  const mapsUrl = useMemo(() => {
    const lat = toNumber(apiHotelData?.lat ?? apiHotelData?.latitude);
    const lng = toNumber(apiHotelData?.long ?? apiHotelData?.lng ?? apiHotelData?.longitude);
    const query = encodeURIComponent([hotel.name, hotel.address].filter(Boolean).join(', '));
    if (lat !== null && lng !== null) {
      return isMac
        ? `https://maps.apple.com/?ll=${lat},${lng}&q=${query}`
        : `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    }
    if (!hotel.address) return null;
    return isMac ? `https://maps.apple.com/?q=${query}` : `https://www.google.com/maps/search/?api=1&query=${query}`;
  }, [apiHotelData?.lat, apiHotelData?.latitude, apiHotelData?.long, apiHotelData?.lng, apiHotelData?.longitude, hotel.name, hotel.address]);

  const openMap = useCallback(() => {
    if (!mapsUrl) return;
    openExternal(mapsUrl);
  }, [mapsUrl]);

  return (
    <div className="hotel-address">
      <div className="hotel-address__title">Расположение</div>
      <div className="hotel-address__text">{address}</div>
      {mapsUrl ? (
        <button type="button" className="btn btn--outline btn--sm" onClick={openMap}>
          Показать на карте
        </button>
      ) : null}
    </div>
  );
};

export default HotelAddressCard;
