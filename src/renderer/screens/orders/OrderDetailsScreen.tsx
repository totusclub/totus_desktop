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
import { useAppNavigation, useRouteParams } from '../../app/navigation';
import { PageHeader } from '../../shell/PageHeader';
import { SbpPayButton } from '../checkout/SbpPayButton';
import { OrderDetailsSections } from './OrderDetailsSections';
import './orders.css';

// Порт component/orders/order/OrderDetails.tsx: PageHeader «Тур № N» + статус; слева карточка заказа
// (статус, «Получение заказа», оплата, «Туристы», «Итого», СБП «Оплатить»), справа — секции OrderDetailsSections.

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

  const handlePaySbp = useCallback(() => {
    const id = order?.order_id ?? order?.id;
    if (id != null) {
      nav.navigate('checkout', { order_id: id });
    }
  }, [nav, order]);

  const showPay = order ? isOrderAwaitingPayment(order) && canPayWithSbp(order) : false;
  const isCancelled = order ? isOrderCancelled(order, pkg) : false;
  const paymentSectionTitle = showPay ? 'К оплате' : isCancelled ? 'Отменено' : 'Оплачено';

  const statusColor = order ? getStatusColor(pkg, order) : ORDER_STATUS_COLORS.pending;
  const orderId = order?.order_id ?? order?.id ?? '—';
  const headerOrderId = orderIdParam !== undefined && orderIdParam !== null ? orderIdParam : '—';
  const price = formatPrice(pkg?.price ?? pkg?.full_price ?? order?.package?.price);
  const statusLabel = order ? getStatusLabel(order, pkg) : 'Статус заказа';

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
      <PageHeader title={`Тур № ${headerOrderId}`} subtitle={order ? statusLabel : undefined} back />
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
                <div className="order-card__title">Тур № {orderId}</div>
                <span className="order-status" style={{ background: statusColor }}>
                  {statusLabel}
                </span>
              </div>

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
            />
          </div>
        )}
      </div>
    </>
  );
};

export default OrderDetailsScreen;
