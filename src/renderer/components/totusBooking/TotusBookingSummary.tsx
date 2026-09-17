import React from 'react';
import {
  formatTotusGuests,
  formatTotusMoney,
  formatTotusRefundLine,
  formatTotusStayLine,
  type TotusBooking,
} from '@shared/utils/totusBooking';
import { TotusBookingActions } from './TotusBookingActions';
import './totusBooking.css';

// Левая карточка деталей внутреннего заказа (Figma «Desktop / Заказ — ожидает подтверждения / отклонено»):
// панель «Статус / Оплачено (или Возврат) / Туристы» + кнопки «Написать в поддержку» / «Подобрать другой номер».

type Props = {
  booking: TotusBooking;
  /** Туристы из package.tourists (имена), если в totus_booking только количество. */
  tourists?: Array<{ name?: string; surname?: string }> | null;
  /** Сумма заказа, если в totus_booking нет paidAmount/finalPrice. */
  fallbackAmount?: number | null;
};

/** «Иван П., Анна П. · 2 взрослых» */
function formatTouristsLine(tourists: Props['tourists'], booking: TotusBooking): string {
  const names = Array.isArray(tourists)
    ? tourists
        .map(t => {
          const name = String(t?.name || '').trim();
          const surname = String(t?.surname || '').trim();
          if (name && surname) return `${name} ${surname[0]}.`;
          return name || surname;
        })
        .filter(Boolean)
        .join(', ')
    : '';
  const guests = formatTotusGuests(booking);
  return [names, guests].filter(Boolean).join(' · ');
}

/** Текст строки «Статус» — как в макете (statusText от backend приоритетнее). */
export function getTotusStatusPanelText(booking: TotusBooking): string {
  switch (booking.status) {
    case 'confirmed': {
      const ref = booking.hotelBookingRef ? `Номер брони ${booking.hotelBookingRef}. ` : '';
      const voucher = booking.voucher ? 'Ваучер — в документах заказа.' : 'Ваучер пришлём на e-mail и добавим в документы заказа.';
      return booking.clientMessage || `${ref}${voucher}`;
    }
    case 'rejected':
    case 'cancelled': {
      const reason = booking.rejectMessage || booking.rejectReasonLabel || '';
      const refund = formatTotusRefundLine(booking);
      return [reason ? `${reason}.` : '', refund ? `${refund}.` : ''].filter(Boolean).join(' ') || booking.statusText;
    }
    case 'pending_payment':
      return booking.statusText || 'Оплатите заказ, и мы отправим бронирование на подтверждение.';
    default:
      return 'Проверяем наличие мест у отеля. Подтвердим в течение 24 часов и пришлём ваучер';
  }
}

export const TotusBookingSummary: React.FC<Props> = ({ booking, tourists, fallbackAmount }) => {
  const amount = booking.paidAmount ?? booking.finalPrice ?? fallbackAmount ?? null;
  const money = formatTotusMoney(amount);
  const rejected = booking.status === 'rejected' || booking.status === 'cancelled';
  const refund = booking.refund;
  const refundMoney = formatTotusMoney(refund?.amount ?? amount);
  const stayLine = formatTotusStayLine(booking);
  const touristsLine = formatTouristsLine(tourists, booking);

  let payTitle = 'Оплачено';
  let payTone = '';
  let payAmount = money;
  if (rejected && refund) {
    payTitle = refund.status === 'done' ? 'Возврат выполнен' : 'Возврат';
    payTone = refund.status === 'done' ? 'muted' : 'danger';
    payAmount = refundMoney;
  } else if (booking.status === 'pending_payment') {
    payTitle = 'К оплате';
  } else if (booking.status === 'confirmed') {
    payTone = 'success';
  }

  return (
    <>
      <div className="tb-panel">
        <div className="tb-panel__section">
          <div className="tb-panel__main">
            <div className="tb-panel__title">Статус</div>
            <div className="tb-panel__subtitle">{getTotusStatusPanelText(booking)}</div>
          </div>
        </div>

        {payAmount ? (
          <div className="tb-panel__section">
            <div className="tb-panel__main">
              <div className={`tb-panel__title${payTone ? ` tb-panel__title--${payTone}` : ''}`}>{payTitle}</div>
              {stayLine ? <div className="tb-panel__subtitle">{stayLine}</div> : null}
            </div>
            <div className={`tb-panel__amount${payTone ? ` tb-panel__amount--${payTone}` : ''}`}>{payAmount}</div>
          </div>
        ) : null}

        {touristsLine ? (
          <div className="tb-panel__section">
            <div className="tb-panel__main">
              <div className="tb-panel__title">Туристы</div>
              <div className="tb-panel__subtitle">{touristsLine}</div>
            </div>
          </div>
        ) : null}
      </div>

      <TotusBookingActions booking={booking} row />
    </>
  );
};

export default TotusBookingSummary;
