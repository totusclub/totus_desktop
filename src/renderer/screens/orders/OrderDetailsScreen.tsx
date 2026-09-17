import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { jwtDecode } from 'jwt-decode';
import type { RootState } from '@shared/modules/store';
import type { Order } from '@shared/types/orders';
import {
  formatPrice,
  getPackageData,
  getStatusColor,
  getStatusLabel,
  isOrderAwaitingPayment,
  canPayWithSbp,
  isOrderCancelled,
  ORDER_STATUS_COLORS,
  type OrderDocumentApiItem,
} from '@shared/utils/ordersUtils';
import { getOrder, getOrderDocuments } from '@shared/modules/api/levelTravelApi';
import {
  getTotusBooking,
  getTotusBookingShortLabel,
  getTotusBookingStatusColor,
  type TotusBooking,
} from '@shared/utils/totusBooking';
import { useAppNavigation, useRouteParams } from '../../app/navigation';
import { PageHeader } from '../../shell/PageHeader';
import { SbpPayButton } from '../checkout/SbpPayButton';
import { TotusBookingSummary } from '../../components/totusBooking/TotusBookingSummary';
import { OrderDetailsSections } from './OrderDetailsSections';
import './orders.css';

// Порт component/orders/order/OrderDetails.tsx: PageHeader «Тур № N» + статус; слева карточка заказа
// (статус, «Получение заказа», оплата, «Туристы», «Итого», СБП «Оплатить»), справа — секции OrderDetailsSections.
// Внутренний заказ (наш номер, оператор Arlekino, `totus_booking` в ответе /orders) — Figma «ROOMS · Bookings · Desktop»:
// «Заказ № N» + пилюля «Проверяем / Подтверждено / Отклонено», слева панель «Статус / Оплачено (Возврат) / Туристы»
// и кнопки поддержки, справа — документы с ваучером, «Туроператор: Arlekino». Действий Level.Travel нет.

/** Подзаголовок шапки для внутреннего заказа: «Проверяем бронирование · подтвердим в течение 24 часов». */
function getTotusHeaderSubtitle(booking: TotusBooking): string {
  switch (booking.status) {
    case 'confirmed':
      return booking.hotelBookingRef
        ? `Бронирование подтверждено · номер брони ${booking.hotelBookingRef}`
        : 'Бронирование подтверждено';
    case 'rejected':
    case 'cancelled': {
      const refund = booking.refund
        ? booking.refund.status === 'done'
          ? 'возврат выполнен'
          : 'возврат выполним в течение 1–3 дней'
        : '';
      return `${booking.statusLabel}${refund ? ` · ${refund}` : ''}`;
    }
    case 'pending_payment':
      return 'Ожидает оплаты';
    default:
      return 'Проверяем бронирование · подтвердим в течение 24 часов';
  }
}

type OrderDetailsParams = {
  orderId?: number | string;
  order?: Order;
};

export const OrderDetailsScreen: React.FC = () => {
  const nav = useAppNavigation();
  const params = useRouteParams<OrderDetailsParams>();
  const { user: userFromState, accessToken } = useSelector((state: RootState) => state.auth);
  const initialOrder = (params?.order as Order) || null;
  const orderIdParam = params?.orderId ?? initialOrder?.order_id ?? initialOrder?.id ?? null;

  const [order, setOrder] = useState<Order | null>(initialOrder);
  const [apiDocuments, setApiDocuments] = useState<OrderDocumentApiItem[]>([]);
  const [loading, setLoading] = useState(Boolean(orderIdParam));

  useEffect(() => {
    if (!orderIdParam) return;

    let cancelled = false;
    setLoading(true);

    Promise.all([getOrder(Number(orderIdParam)), getOrderDocuments(orderIdParam).catch(() => ({ documents: [] }))])
      .then(([orderResponse, documentsResponse]) => {
        if (cancelled) return;
        setOrder(orderResponse);
        setApiDocuments(documentsResponse?.documents ?? []);
      })
      .catch(err => {
        console.error('[OrderDetails] Failed to fetch order:', err);
        if (!cancelled && initialOrder) {
          setOrder(initialOrder);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [orderIdParam, initialOrder]);

  const pkg = useMemo(() => getPackageData(order || undefined), [order]);
  const totusBooking = useMemo(() => getTotusBooking(order), [order]);

  const handlePaySbp = useCallback(() => {
    const id = order?.order_id ?? order?.id;
    if (id != null) {
      nav.navigate('checkout', { order_id: id });
    }
  }, [nav, order]);

  const showPay = order
    ? totusBooking
      ? totusBooking.status === 'pending_payment' && canPayWithSbp(order)
      : isOrderAwaitingPayment(order) && canPayWithSbp(order)
    : false;
  const isCancelled = order ? isOrderCancelled(order, pkg) : false;
  const paymentSectionTitle = showPay ? 'К оплате' : isCancelled ? 'Отменено' : 'Оплачено';

  const statusColor = totusBooking
    ? getTotusBookingStatusColor(totusBooking.status)
    : order
      ? getStatusColor(pkg, order)
      : ORDER_STATUS_COLORS.pending;
  const orderId = order?.order_id ?? order?.id ?? '—';
  const headerOrderId = orderIdParam !== undefined && orderIdParam !== null ? orderIdParam : '—';
  const price = formatPrice(pkg?.price ?? pkg?.full_price ?? order?.package?.price);
  const statusLabel = totusBooking ? totusBooking.statusLabel : order ? getStatusLabel(order, pkg) : 'Статус заказа';
  const headerSubtitle = totusBooking ? getTotusHeaderSubtitle(totusBooking) : order ? statusLabel : undefined;
  const orderWord = totusBooking ? 'Заказ' : 'Тур';

  const hotelName = pkg?.hotel?.name || '';
  const destination = [pkg?.hotel?.city, pkg?.hotel?.country].filter(Boolean).join(', ');

  const documentsEmail = useMemo(() => {
    const fromState = (userFromState as { email?: string } | null)?.email;
    if (fromState) return fromState;

    if (accessToken) {
      try {
        const decoded = jwtDecode<{ email?: string }>(accessToken);
        if (decoded.email) return decoded.email;
      } catch {
        // ignore decode errors
      }
    }

    return order?.package?.client?.email || '';
  }, [userFromState, accessToken, order?.package?.client?.email]);

  return (
    <>
      <PageHeader title={`${orderWord} № ${headerOrderId}`} subtitle={headerSubtitle} back />
      <div className="page-body">
        {loading && !order ? (
          <div className="order-details">
            <div className="card card--shadow order-details__card">
              <div className="skeleton" style={{ height: 24, width: '50%' }} />
              <div className="skeleton" style={{ height: 180 }} />
            </div>
            <div className="card card--shadow order-details__card">
              <div className="skeleton" style={{ height: 80 }} />
              <div className="skeleton" style={{ height: 160 }} />
            </div>
          </div>
        ) : !order ? (
          <div className="empty">
            <div className="orders-empty__text">Заказ не найден</div>
          </div>
        ) : (
          <div className="order-details">
            <div className="card card--shadow order-details__card">
              <div className="order-card__header">
                <div className="order-card__title">
                  {orderWord} № {orderId}
                </div>
                <span className="order-status" style={{ background: statusColor }}>
                  {totusBooking ? getTotusBookingShortLabel(totusBooking.status) : statusLabel}
                </span>
              </div>

              {totusBooking ? (
                <TotusBookingSummary
                  booking={totusBooking}
                  tourists={order.package?.tourists}
                  fallbackAmount={pkg?.price ?? pkg?.full_price ?? order?.package?.price ?? null}
                />
              ) : (
                <div className="order-panel">
                  <div className="order-panel__section">
                    <div className="order-panel__title">Получение заказа</div>
                    <div className="order-panel__subtitle">Отправим документы на {documentsEmail || '—'}</div>
                  </div>

                  <div className="order-panel__section">
                    <div className="order-panel__title">{paymentSectionTitle}</div>
                    <div className="order-panel__subtitle">
                      {hotelName ? `Тур в ${hotelName}` : 'Данные уточняются'}
                      {destination ? `, ${destination}` : ''}
                    </div>
                    <div className="order-panel__subtitle">{price}</div>
                  </div>

                  <div className="order-panel__section">
                    <div className="order-panel__title">Туристы</div>
                    <div className="order-panel__tourists">
                      {order.package.tourists.map((tourist: any, index: number) => (
                        <div key={tourist.id ?? index}>
                          <div className="order-panel__subtitle">
                            {tourist.name} {tourist.surname}, {tourist.birthday} , До: {tourist.passport_expires_on}
                          </div>
                          <div className="order-panel__subtitle">паспорт: {tourist.passport || ''}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="order-panel__section order-panel__section--last">
                    <div className="order-panel__title">Итого</div>
                    <div className="order-panel__amount">{price}</div>
                  </div>
                </div>
              )}

              {showPay ? (
                <div className="order-card__pay">
                  <SbpPayButton onPress={handlePaySbp} />
                </div>
              ) : null}
            </div>

            <OrderDetailsSections
              pkg={pkg}
              hotelName={hotelName}
              destination={destination}
              order={order}
              apiDocuments={apiDocuments}
              totusBooking={totusBooking}
            />
          </div>
        )}
      </div>
    </>
  );
};

export default OrderDetailsScreen;
