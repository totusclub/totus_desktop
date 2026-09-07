import React from 'react';
import type { Order } from '@shared/types/orders';
import { getOrderPayAmount } from '@shared/utils/orderPayment';
import { SbpPayButton } from './SbpPayButton';

// Порт checkout/components/CheckoutCard.tsx: «Всего за тур» + СБП «Перейти к оплате». На десктопе — правая колонка.

interface CheckoutCardProps {
  order: Order | null;
  onPay: () => void;
  loading?: boolean;
}

const formatPrice = (price: number | string | undefined): string => {
  if (!price) return '0';
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return numPrice.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

export const CheckoutCard: React.FC<CheckoutCardProps> = ({ order, onPay, loading = false }) => {
  if (!order) return null;

  const amount = getOrderPayAmount(order);

  return (
    <div className="card card--shadow checkout-total">
      <div className="checkout-total__content">
        <div className="checkout-total__label">Всего за тур</div>
        <div className="checkout-total__price">{formatPrice(amount || order.full_price || order.package?.price)} ₽</div>
      </div>
      <SbpPayButton label="Перейти к оплате" onPress={onPay} loading={loading} disabled={loading} />
    </div>
  );
};

export default CheckoutCard;
