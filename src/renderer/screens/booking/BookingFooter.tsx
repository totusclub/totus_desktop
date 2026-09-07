import React, { useMemo } from 'react';
import { formatMoneyRub, getBookingPriceBreakdown } from '@shared/utils/packagePrice';

// Порт booking/components/BookingFooter.tsx: «Ваш заказ» (BookingOrderSummary), юридический текст
// (BookingLegalInfo) и кнопка «Отправить запрос» (BookingFooter). На десктопе — правая колонка 340px.

export const BookingOrderSummary: React.FC<{ packageData?: any; selectedFlight?: any }> = ({ packageData, selectedFlight }) => {
  const { basePrice, fees, totalPrice } = useMemo(
    () => getBookingPriceBreakdown(packageData, selectedFlight),
    [packageData, selectedFlight],
  );

  const destination = useMemo(() => {
    const city = packageData?.hotel?.city;
    const country = packageData?.hotel?.country;
    if (city && country) return `Тур в ${city}, ${country}`;
    if (city) return `Тур в ${city}`;
    return 'Тур';
  }, [packageData]);

  const dateLabel = useMemo(() => {
    const start = packageData?.dates_info?.start_date;
    const end = packageData?.dates_info?.end_date;
    const nights = packageData?.nights_count;
    if (!start || !end) return null;

    const startDate = new Date(start);
    const endDate = new Date(end);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return null;
    }

    const formatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });
    const range = `${formatter.format(startDate)} – ${formatter.format(endDate)}`;
    return nights ? `${range}, на ${nights} ночей` : range;
  }, [packageData]);

  if (!packageData || totalPrice <= 0) return null;

  return (
    <div className="booking-order">
      <div className="booking-order__title">Ваш заказ</div>

      <div className="booking-order__row">
        <span className="booking-order__label">{destination}</span>
        <span className="booking-order__value">{formatMoneyRub(basePrice)}</span>
      </div>

      {dateLabel ? <div className="booking-order__date">{dateLabel}</div> : null}

      {fees > 0 ? (
        <div className="booking-order__row">
          <span className="booking-order__label">Доплаты и сборы</span>
          <span className="booking-order__value">+{formatMoneyRub(fees)}</span>
        </div>
      ) : null}

      <div className="divider booking-order__divider" />

      <div className="booking-order__row">
        <span className="booking-order__total-label">Итого</span>
        <span className="booking-order__total-value">{formatMoneyRub(totalPrice)}</span>
      </div>
    </div>
  );
};

export const BookingLegalInfo: React.FC = () => (
  <div className="booking-legal">
    Нажимая на кнопку, вы ознакомлены и соглашаетесь с <span className="booking-legal__link">Политикой по перс. данным</span> и{' '}
    <span className="booking-legal__link">Условиями продажи</span>, в т.ч. с потреб. свойствами Тура, указанными в Заказе
  </div>
);

interface BookingFooterProps {
  disabled: boolean;
  loading: boolean;
}

/** Кнопка отправки — submit формы BookingScreen (Enter в полях тоже отправляет). */
export const BookingFooter: React.FC<BookingFooterProps> = ({ disabled, loading }) => (
  <div className="booking-footer">
    <button type="submit" className="btn btn--block" disabled={disabled || loading}>
      {loading ? <span className="booking-spinner" aria-hidden="true" /> : null}
      Отправить запрос
    </button>
  </div>
);
