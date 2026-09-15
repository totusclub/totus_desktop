import React, { useMemo } from 'react';
import { formatTotusGuests, formatTotusMoney, formatTotusStayPeriod, type TotusBooking } from '@shared/utils/totusBooking';
import { useAppNavigation } from '../../app/navigation';
import { TotusBookingBanner } from './TotusBookingBanner';
import { BigCheckIcon } from './TotusBookingIcons';
import './totusBooking.css';

// Экран после успешной оплаты внутреннего заказа (Figma «Оформление — успех»):
// «Оплата прошла» → баннер «Проверяем бронирование» → 3 шага → «Перейти к заказу» / «На главную».

type Props = {
  orderId: string | number;
  /** `totus_booking` из ответа /check_pay или /orders (может отсутствовать — тогда без деталей). */
  booking?: TotusBooking | null;
};

const STEPS = [
  { title: 'Проверяем наличие мест у отеля', text: 'Обычно это занимает несколько часов, максимум — 24 часа' },
  { title: 'Пришлём решение', text: 'Уведомление и письмо на e-mail, статус также виден в разделе «Заказы»' },
  { title: 'Ваучер появится в заказе', text: 'Если мест нет — деньги вернутся на карту в течение 1–3 дней' },
];

function formatShortPeriod(booking: TotusBooking | null | undefined): string {
  if (!booking?.checkIn || !booking?.checkOut) return '';
  const start = new Date(booking.checkIn);
  const end = new Date(booking.checkOut);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '';
  const dayFmt = new Intl.DateTimeFormat('ru-RU', { day: 'numeric' });
  const dayMonthFmt = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  return sameMonth
    ? `${dayFmt.format(start)} – ${dayMonthFmt.format(end)}`
    : `${dayMonthFmt.format(start)} – ${dayMonthFmt.format(end)}`;
}

export const TotusBookingSuccess: React.FC<Props> = ({ orderId, booking }) => {
  const nav = useAppNavigation();

  const subtitle = useMemo(() => {
    const parts: string[] = [];
    const paid = formatTotusMoney(booking?.paidAmount ?? booking?.finalPrice);
    if (paid) parts.push(`Оплачено ${paid}`);
    const hotel = booking?.hotel;
    if (hotel?.name) parts.push(hotel.stars ? `${hotel.name} ${hotel.stars}*` : hotel.name);
    if (booking?.room) parts.push(booking.room);
    const period = formatShortPeriod(booking) || formatTotusStayPeriod(booking);
    if (period) parts.push(period);
    const guests = formatTotusGuests(booking);
    if (guests) parts.push(guests);
    if (booking?.operator) parts.push(`Туроператор: ${booking.operator}`);
    const head = `Бронирование № ${orderId} отправлено на подтверждение.`;
    return parts.length ? `${head} ${parts.join(' · ')}` : head;
  }, [booking, orderId]);

  const goToOrder = () => nav.navigate('orderDetails', { orderId });
  const goHome = () => nav.navigate('home');

  return (
    <div className="tb-success">
      <div className="card card--shadow tb-success__card" role="status" aria-live="polite">
        <div className="tb-success__icon">
          <BigCheckIcon size={34} />
        </div>

        <div className="tb-success__head">
          <h1 className="tb-success__title">Оплата прошла</h1>
          <p className="tb-success__subtitle">{subtitle}</p>
        </div>

        {booking ? (
          <TotusBookingBanner
            booking={{ ...booking, status: 'pending_confirmation' }}
            title="Проверяем бронирование"
            text="Подтвердим в течение 24 часов и пришлём ваучер. Если мест у отеля не окажется — вернём деньги полностью."
          />
        ) : null}

        <div className="tb-success__steps">
          <div className="tb-success__steps-title">Что дальше</div>
          {STEPS.map((step, index) => (
            <div className="tb-success__step" key={step.title}>
              <span className="tb-success__step-num">{index + 1}</span>
              <div className="tb-success__step-body">
                <div className="tb-success__step-title">{step.title}</div>
                <div className="tb-success__step-text">{step.text}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="tb-success__actions">
          <button type="button" className="btn" onClick={goToOrder}>
            Перейти к заказу
          </button>
          <button type="button" className="btn btn--outline" onClick={goHome}>
            На главную
          </button>
        </div>
      </div>
    </div>
  );
};

export default TotusBookingSuccess;
