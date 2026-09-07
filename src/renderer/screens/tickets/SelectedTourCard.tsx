import React, { useMemo, useState } from 'react';
import { formatMoneyRub, getMinFlightOfferTotal, getPackageBasePrice, toMoney } from '@shared/utils/packagePrice';
import { Icon } from '../../icons';
import { CheckmarkIcon } from '../../components/uiIcons';

// Порт tickets/SelectedTourCard.tsx: бейдж «Выбранный тур», фото, звёзды, отель, номер · «питание», оператор, цена.

type Props = {
  packageInfo: any;
  flights?: any[] | null;
};

const formatTourPrice = (amount: number) => formatMoneyRub(amount).replace(' ₽', ' ₽');

const SelectedTourCardBase: React.FC<Props> = ({ packageInfo, flights }) => {
  const [imageFailed, setImageFailed] = useState(false);

  const { totalPrice, fees, hasFlights } = useMemo(() => {
    const basePrice = getPackageBasePrice(packageInfo);
    const fromFlights =
      Array.isArray(flights) && flights.length > 0
        ? getMinFlightOfferTotal(basePrice, flights)
        : basePrice + toMoney(packageInfo?.predicted_surcharge);
    return {
      totalPrice: fromFlights,
      fees: Math.max(0, fromFlights - basePrice),
      hasFlights: Array.isArray(flights) && flights.length > 0,
    };
  }, [packageInfo, flights]);

  if (!packageInfo) return null;

  const hotel = packageInfo.hotel ?? {};
  const stars = Number(hotel.stars) || 0;
  const roomName = packageInfo.room_info?.name_ru || packageInfo.room?.name_ru || '';
  const meal = packageInfo.pansion_description || packageInfo.meal_type || '';
  const location = [hotel.city, hotel.country].filter(Boolean).join(', ');
  const imageUri =
    packageInfo.room_info?.images?.[0]?.['x260x150'] ||
    packageInfo.room_info?.images?.[0]?.x500 ||
    hotel.images?.[0]?.webp_x620 ||
    hotel.images?.[0]?.x500;

  return (
    <div className="tickets-tour">
      <span className="tickets-tour__badge">
        <CheckmarkIcon size={14} />
        Выбранный тур
      </span>

      <div className="tickets-tour__body">
        {imageUri && !imageFailed ? (
          <img className="tickets-tour__image" src={String(imageUri)} alt="" onError={() => setImageFailed(true)} />
        ) : (
          <div className="tickets-tour__image tickets-tour__image--placeholder">
            <Icon name="radiologo" size={44} />
          </div>
        )}

        <div className="tickets-tour__info">
          {stars > 0 ? (
            <div className="tickets-tour__stars">
              {[1, 2, 3, 4, 5].map(star => (
                <Icon key={star} name="starFilled" size={12} color={stars >= star ? 'var(--brand)' : 'var(--border)'} />
              ))}
            </div>
          ) : null}

          <div className="tickets-tour__name">{hotel.name || 'Отель'}</div>
          {location ? <div className="tickets-tour__meta">{location}</div> : null}
          {roomName || meal ? (
            <div className="tickets-tour__meta tickets-tour__meta--secondary">
              {[roomName, meal ? `«${meal}»` : ''].filter(Boolean).join(' · ')}
            </div>
          ) : null}
          {packageInfo.operator?.name ? <div className="tickets-tour__operator">{packageInfo.operator.name}</div> : null}
        </div>
      </div>

      <div className="tickets-tour__divider" />

      <div className="tickets-tour__price-row">
        <span className="tickets-tour__price-label">{hasFlights ? 'Тур с перелётом от' : 'Стоимость тура'}</span>
        <div className="tickets-tour__price-values">
          <span className="tickets-tour__total">{formatTourPrice(totalPrice)}</span>
          {fees > 0 ? <span className="tickets-tour__fees">Доплаты +{formatTourPrice(fees)}</span> : null}
        </div>
      </div>
    </div>
  );
};

export const SelectedTourCard = React.memo(SelectedTourCardBase);
export default SelectedTourCard;
