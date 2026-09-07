import React from 'react';
import { HotelCardSkeleton } from '../../components/HotelCardSkeleton';
import { RoomsSectionSkeleton } from './RoomsSectionSkeleton';

// Скелетон страницы отеля (аналог UI/HotelSkeleton) в раскладке десктопа: фото-карточка + правая колонка + номера.

const Box: React.FC<{ w?: number | string; h: number; r?: number }> = ({ w = '100%', h, r = 8 }) => (
  <div className="skeleton" style={{ width: w, height: h, borderRadius: r, flex: 'none' }} />
);

export const HotelSkeleton: React.FC = () => (
  <div className="hotel-page" aria-hidden="true">
    <div className="hotel-columns">
      <div className="hotel-columns__main">
        <HotelCardSkeleton variant="detail" imageHeight={400} />
      </div>
      <div className="hotel-columns__side">
        <div className="hotel-skel-card">
          <Box w={160} h={34} />
          <Box w={200} h={20} />
          <Box w={140} h={18} />
          <Box h={48} r={999} />
        </div>
        <div className="hotel-skel-card" style={{ borderRadius: 24 }}>
          <div className="hotel-skel-row">
            <Box h={44} />
            <Box h={44} />
          </div>
          <Box h={44} />
          <Box h={48} r={999} />
        </div>
        <div className="hotel-skel-card" style={{ borderRadius: 24 }}>
          <Box w={120} h={20} />
          <Box w="80%" h={18} />
          <Box w={150} h={36} r={999} />
        </div>
      </div>
    </div>
    <RoomsSectionSkeleton />
  </div>
);

export default HotelSkeleton;
