import React, { useCallback } from 'react';
import type { TotusBooking } from '@shared/utils/totusBooking';
import { useAppNavigation } from '../../app/navigation';
import './totusBooking.css';

// Кнопки внутреннего бронирования (Arlekino): «Написать в поддержку» (существующий чат поддержки)
// и при отклонении/отмене — «Подобрать другой номер» (страница отеля по hotel.id, иначе — главная/поиск).

type Props = {
  booking: TotusBooking;
  /** Кнопки в ряд (карточка заказа) вместо столбика (список). */
  row?: boolean;
  className?: string;
};

export const TotusBookingActions: React.FC<Props> = ({ booking, row = false, className }) => {
  const nav = useAppNavigation();
  const rejected = booking.status === 'rejected' || booking.status === 'cancelled';

  const openSupport = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      nav.navigate('supportChat');
    },
    [nav],
  );

  const pickAnotherRoom = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const hotelId = booking.hotel?.id;
      if (hotelId && hotelId > 0) {
        // Только hotelId: параметры поиска HotelScreen возьмёт из Redux (последний поиск), как при переходе из ИИ.
        nav.navigate('hotel', { hotelId: String(hotelId) });
        return;
      }
      nav.navigate('home');
    },
    [nav, booking.hotel?.id],
  );

  return (
    <div className={`tb-actions${row ? ' tb-actions--row' : ''}${className ? ` ${className}` : ''}`}>
      {rejected ? (
        <button type="button" className="btn btn--dark btn--block" onClick={pickAnotherRoom}>
          Подобрать другой номер
        </button>
      ) : null}
      <button
        type="button"
        className={`btn btn--block ${rejected ? 'btn--outline' : 'btn--dark'}`}
        onClick={openSupport}>
        Написать в поддержку
      </button>
    </div>
  );
};

export default TotusBookingActions;
