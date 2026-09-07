import React from 'react';
import './HotelCard.css';

type Props = {
  /** 'search' — теги + цена; 'detail' — адрес + футер с ценой (как в приложении). */
  variant?: 'search' | 'detail';
  imageHeight?: number;
};

const Box: React.FC<{ w?: number | string; h: number; r?: number }> = ({ w = '100%', h, r = 8 }) => (
  <div className="skeleton" style={{ width: w, height: h, borderRadius: r, flex: 'none' }} />
);

/** Порт searchResult/HotelCardSkeleton — пропорции карточки отеля во время загрузки. */
export const HotelCardSkeleton: React.FC<Props> = ({ variant = 'search', imageHeight = 200 }) => {
  const isDetail = variant === 'detail';
  return (
    <div className="hotel-card-skeleton" aria-hidden="true">
      <Box h={imageHeight} r={8} />
      {isDetail ? (
        <div className="hotel-card-skeleton__row hotel-card-skeleton__row--dots">
          {[1, 2, 3, 4, 5].map(d => (
            <Box key={d} w={8} h={8} r={4} />
          ))}
        </div>
      ) : null}
      <div className="hotel-card-skeleton__content">
        <div className="hotel-card-skeleton__row" style={{ gap: 4 }}>
          {[1, 2, 3, 4, 5].map(s => (
            <Box key={s} w={16} h={16} r={4} />
          ))}
        </div>
        <Box w="80%" h={20} />
        <div className="hotel-card-skeleton__row">
          <Box w={40} h={24} r={8} />
          {!isDetail ? <Box w={18} h={18} r={4} /> : null}
          <Box w={16} h={16} r={4} />
          <Box w={92} h={18} />
        </div>
        {isDetail ? (
          <Box w="65%" h={20} />
        ) : (
          <>
            <div className="hotel-card-skeleton__row hotel-card-skeleton__row--wrap">
              <Box w={96} h={28} r={16} />
              <Box w={72} h={28} r={16} />
              <Box w={110} h={28} r={16} />
            </div>
            <div className="hotel-card-skeleton__row">
              <Box w={124} h={24} />
              <Box w={132} h={18} />
            </div>
          </>
        )}
      </div>
      {isDetail ? (
        <div className="hotel-card-skeleton__footer">
          <div className="hotel-card-skeleton__footer-text">
            <Box w={110} h={22} />
            <Box w={140} h={14} />
            <Box w={120} h={13} />
          </div>
          <Box w={132} h={40} r={999} />
        </div>
      ) : null}
    </div>
  );
};

export default HotelCardSkeleton;
