import { describe, expect, it } from 'vitest';

// Внутренние бронирования (оператор Arlekino, без Level.Travel): разбор `totus_booking` из ответов API
// (CUSTOM_ROOMS_API.md, раздел 6.2) и тексты статусов для списка/карточки заказа.
import {
  formatTotusRefundLine,
  formatTotusStayLine,
  getTotusBooking,
  getTotusBookingBanner,
  getTotusBookingShortLabel,
  getTotusBookingStatusColor,
  isTotusInternalOrder,
} from '../shared/utils/totusBooking';

const raw = {
  internal: true,
  bookingId: 12,
  orderId: '900000012',
  operator: 'Arlekino',
  status: 'pending_confirmation',
  statusLabel: 'Проверяем бронирование',
  statusText: 'Оплачено 86 850 ₽. Подтвердим бронирование и пришлём ваучер.',
  paymentStatus: 'paid',
  paidAt: '2026-09-10T14:20:00.000Z',
  paidAmount: 86850,
  hotel: { id: 123, name: 'Rixos Premium', stars: 5, city: 'Белек' },
  room: 'Deluxe Sea View',
  meal: 'AI',
  mealName: 'Всё включено',
  checkIn: '2026-10-12',
  checkOut: '2026-10-19',
  nights: 7,
  adults: 2,
  kids: 0,
  finalPrice: 86850,
};

describe('getTotusBooking', () => {
  it('обычный LT-заказ → null', () => {
    expect(getTotusBooking({ id: 1, package: { id: 1 } })).toBeNull();
    expect(isTotusInternalOrder({ id: 1 })).toBe(false);
  });

  it('разбирает totus_booking из строки /orders и из ответа check_pay', () => {
    const fromOrder = getTotusBooking({ order_id: '900000012', totus_booking: raw });
    expect(fromOrder?.status).toBe('pending_confirmation');
    expect(fromOrder?.operator).toBe('Arlekino');
    expect(fromOrder?.hotel?.id).toBe(123);
    expect(formatTotusStayLine(fromOrder)).toContain('Rixos Premium 5*');

    const fromCheckPay = getTotusBooking({ paid: true, order_id: '900000012', internal: true, totus_booking: raw });
    expect(fromCheckPay?.orderId).toBe('900000012');
    expect(isTotusInternalOrder({ package: { _totus_booking: { internal: true } } })).toBe(true);
  });

  it('статусы: подписи, цвета и строка возврата', () => {
    const rejected = getTotusBooking({
      totus_booking: {
        ...raw,
        status: 'rejected',
        statusLabel: 'Бронирование отклонено',
        rejectReason: 'no_availability',
        refund: { amount: 86850, method: 'manual', status: 'pending', at: null },
      },
    });
    expect(rejected?.rejectReasonLabel).toBe('Нет мест на эти даты');
    expect(getTotusBookingShortLabel(rejected!.status)).toBe('Отклонено');
    expect(getTotusBookingStatusColor(rejected!.status)).toBe('#CF3030');
    expect(formatTotusRefundLine(rejected)).toMatch(/^Возврат 86.850 ₽ выполним/);

    const confirmed = getTotusBooking({ totus_booking: { ...raw, status: 'confirmed', hotelBookingRef: 'HTL-7781' } });
    expect(getTotusBookingBanner(confirmed!).title).toContain('HTL-7781');
    expect(getTotusBookingStatusColor(confirmed!.status)).toBe('#288556');
  });
});
