import React from 'react';
import { getTotusBookingBanner, getTotusBookingTone, type TotusBooking } from '@shared/utils/totusBooking';
import { ToneIcon } from './TotusBookingIcons';
import './totusBooking.css';

// Цветной баннер статуса внутреннего бронирования (жёлтый «Проверяем» / зелёный «Подтверждено» / красный «Отклонено»).

type Props = {
  booking: TotusBooking;
  /** Переопределить заголовок/текст (например, на экране «Оплата прошла»). */
  title?: string;
  text?: string;
  className?: string;
};

export const TotusBookingBanner: React.FC<Props> = ({ booking, title, text, className }) => {
  const tone = getTotusBookingTone(booking.status);
  const content = getTotusBookingBanner(booking);
  const finalTitle = title ?? content.title;
  const finalText = text ?? content.text;

  return (
    <div className={`tb-banner tb-banner--${tone}${className ? ` ${className}` : ''}`} role="status">
      <span className="tb-banner__icon">
        <ToneIcon tone={tone} />
      </span>
      <div className="tb-banner__body">
        {finalTitle ? <div className="tb-banner__title">{finalTitle}</div> : null}
        {finalText ? <div className="tb-banner__text">{finalText}</div> : null}
      </div>
    </div>
  );
};

export default TotusBookingBanner;
