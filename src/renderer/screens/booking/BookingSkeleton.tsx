import React from 'react';

// Порт booking/BookingSkeleton.tsx: карточка контактов, формы туристов, «Ваш заказ», кнопка.

const Box: React.FC<{ w?: number | string; h: number; r?: number; className?: string }> = ({ w = '100%', h, r = 8, className }) => (
  <div className={'skeleton' + (className ? ` ${className}` : '')} style={{ width: w, height: h, borderRadius: r, flex: 'none' }} />
);

const Input: React.FC = () => <Box h={46} r={12} />;

const TouristFormSkeleton: React.FC<{ index: number }> = ({ index }) => (
  <div className="booking-tourist">
    {index > 0 ? <div className="divider booking-tourist__divider" /> : null}
    <div className="booking-card__head booking-skeleton__head">
      <Box w={130} h={24} />
      <Box w={110} h={18} />
    </div>
    <div className="booking-form">
      <div className="booking-row">
        <Input />
        <Input />
      </div>
      <div className="booking-row">
        <Input />
        <div className="booking-skeleton__toggle">
          <Box w={112} h={20} />
          <Box w={44} h={26} r={13} />
        </div>
      </div>
      <div className="booking-row">
        <Input />
        <div className="booking-skeleton__gender">
          <Box w={38} h={20} />
          <Box w={20} h={20} r={10} />
          <Box w={72} h={20} />
          <Box w={20} h={20} r={10} />
          <Box w={72} h={20} />
        </div>
      </div>
      <div className="booking-row">
        <Box h={52} r={12} />
        <Box h={52} r={12} />
      </div>
      <div className="booking-row">
        <Input />
        <Input />
      </div>
    </div>
  </div>
);

export const BookingSkeleton: React.FC = () => (
  <div className="booking">
    <div className="booking__main">
      <section className="card booking-card">
        <div className="booking-card__head booking-skeleton__head">
          <Box w={210} h={24} />
          <Box w={190} h={18} />
        </div>
        <div className="booking-row">
          <Input />
          <Input />
        </div>
      </section>

      <section className="card booking-card">
        <div className="booking-card__head booking-skeleton__head">
          <Box w={110} h={24} />
          <Box w="90%" h={18} />
        </div>
        {[0, 1].map(i => (
          <TouristFormSkeleton key={`tourist-${i}`} index={i} />
        ))}
      </section>
    </div>

    <aside className="booking__side">
      <div className="card booking-side-card">
        <div className="booking-order">
          <Box w={104} h={20} />
          <div className="booking-order__row">
            <Box w="55%" h={18} />
            <Box w={92} h={18} />
          </div>
          <Box w="65%" h={16} />
          <div className="booking-order__row">
            <Box w={132} h={18} />
            <Box w={80} h={18} />
          </div>
          <div className="divider booking-order__divider" />
          <div className="booking-order__row">
            <Box w={64} h={20} />
            <Box w={104} h={20} />
          </div>
        </div>
        <div className="booking-legal booking-skeleton__legal">
          <Box h={16} />
          <Box h={16} />
          <Box w="70%" h={16} />
        </div>
        <div className="booking-footer">
          <Box h={50} r={999} />
        </div>
      </div>
    </aside>
  </div>
);

export default BookingSkeleton;
