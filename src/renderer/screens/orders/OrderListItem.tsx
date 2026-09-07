import React, { useCallback, useMemo } from 'react';
import type { Order } from '@shared/types/orders';
import {
  getPackageData,
  formatPrice,
  formatOrderDate,
  formatPeriod,
  formatDeparture,
  collectTourists,
  getStatusColor,
  getStatusLabel,
  getPaymentMethodLabel,
  isOrderAwaitingPayment,
  canPayWithSbp,
} from '@shared/utils/ordersUtils';
import { useAppNavigation } from '../../app/navigation';
import { SbpPayButton } from '../checkout/SbpPayButton';

// Порт component/orders/OrderListItem.tsx: карточка заказа в сетке «Заказы» (3 колонки).

type Props = {
  order: Order;
};

export const OrderListItem: React.FC<Props> = ({ order }) => {
  const nav = useAppNavigation();
  const pkg = useMemo(() => getPackageData(order), [order]);

  const statusColor = useMemo(() => getStatusColor(pkg, order), [pkg, order]);
  const statusLabel = useMemo(() => getStatusLabel(order, pkg), [order, pkg]);

  const location = pkg?.hotel ? [pkg.hotel.city, pkg.hotel.country].filter(Boolean).join(', ') : '';
  const hotelName = pkg?.hotel?.name || '';
  const tourists = collectTourists(order, pkg);
  const travelPeriod = formatPeriod(pkg);
  const departureInfo = formatDeparture(pkg);
  const nightsCount = order?.package?.package?.nights_count ?? pkg?.nights_count;

  const handleOpenDetails = useCallback(() => {
    nav.navigate('orderDetails', {
      orderId: order?.order_id ?? order?.id,
      order,
    });
  }, [nav, order]);

  const handlePaySbp = useCallback(() => {
    const id = order?.order_id ?? order?.id;
    if (id != null) {
      nav.navigate('checkout', { order_id: id });
    }
  }, [nav, order]);

  const showPay = isOrderAwaitingPayment(order) && canPayWithSbp(order);

  return (
    <article className="card card--shadow order-card" style={{ borderBottomColor: `${statusColor}80` }}>
      <button type="button" className="order-card__body" onClick={handleOpenDetails}>
        <div className="order-card__header">
          <div className="order-card__title">
            Тур <span className="order-card__id">№ {order?.order_id ?? order?.id}</span>
          </div>
          <span className="order-status" style={{ background: statusColor }}>
            {statusLabel}
          </span>
        </div>

        <div className="order-card__date">От {formatOrderDate((order as any)?.c_date || pkg?.created_at)}</div>
        <div className="order-card__price">{formatPrice(pkg?.price ?? pkg?.full_price)}</div>
        {getPaymentMethodLabel(order) ? <div className="order-card__payment">{getPaymentMethodLabel(order)}</div> : null}

        <div className="divider order-card__divider" />
        {hotelName ? <div className="order-card__hotel">{[hotelName, location].filter(Boolean).join(', ')}</div> : null}
        {travelPeriod ? (
          <div className="order-card__period">
            {travelPeriod}
            {nightsCount ? ` · ${nightsCount} ночей` : ''}
          </div>
        ) : null}
        {departureInfo ? <div className="order-card__departure">{departureInfo}</div> : null}
        {tourists ? (
          <div className="order-card__tourists">
            Туристы: <span className="order-card__tourists-list">{tourists}</span>
          </div>
        ) : null}
      </button>
      {showPay ? (
        <div className="order-card__pay">
          <SbpPayButton onPress={handlePaySbp} />
        </div>
      ) : null}
    </article>
  );
};

export default OrderListItem;
