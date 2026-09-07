import React from 'react';

// Порт component/orders/OrderListItemSkeleton.tsx: заголовок + статус, цена, разделитель, детали тура.

const Box: React.FC<{ w?: number | string; h: number; r?: number }> = ({ w = '100%', h, r = 8 }) => (
  <div className="skeleton" style={{ width: w, height: h, borderRadius: r, flex: 'none' }} />
);

export const OrderListItemSkeleton: React.FC = () => (
  <div className="card card--shadow order-card order-card--skeleton">
    <div className="order-card__header">
      <Box w="55%" h={20} />
      <Box w={104} h={24} r={15} />
    </div>
    <Box w={128} h={18} />
    <Box w={112} h={18} />
    <Box w={136} h={18} />
    <div className="divider order-card__divider" />
    <Box w="85%" h={18} />
    <Box w="70%" h={18} />
    <Box w="60%" h={18} />
    <Box w="75%" h={17} />
  </div>
);

export default OrderListItemSkeleton;
