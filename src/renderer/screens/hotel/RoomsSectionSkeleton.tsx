import React from 'react';

// Порт hotel/RoomsSectionSkeleton.tsx: заголовок + фильтры, чипы дат, карточки номеров (3 колонки на десктопе).

const Box: React.FC<{ w?: number | string; h: number; r?: number }> = ({ w = '100%', h, r = 8 }) => (
  <div className="skeleton" style={{ width: w, height: h, borderRadius: r, flex: 'none' }} />
);

export const RoomsSectionSkeleton: React.FC = () => (
  <div className="hotel-rooms" aria-hidden="true">
    <div className="hotel-rooms__head">
      <Box w={140} h={20} />
      <Box w={96} h={32} r={16} />
    </div>
    <div className="hotel-dates">
      {[1, 2, 3].map(index => (
        <div key={`date-${index}`} className="hotel-date-chip" style={{ gap: 4 }}>
          <Box w={88} h={18} />
          <Box w={64} h={18} />
        </div>
      ))}
    </div>
    <div className="hotel-rooms__grid">
      {[1, 2, 3].map(index => (
        <div key={`room-${index}`} className="hotel-skel-room">
          <Box h={200} r={0} />
          <div className="hotel-skel-row" style={{ justifyContent: 'center', gap: 6, margin: '12px 16px 4px' }}>
            {[1, 2, 3, 4, 5].map(dot => (
              <Box key={dot} w={8} h={8} r={4} />
            ))}
          </div>
          <div className="hotel-skel-room__body">
            <Box w="75%" h={20} />
            <Box w={158} h={18} />
            {[1, 2, 3].map(feature => (
              <div key={`feature-${feature}`} className="hotel-skel-row" style={{ gap: 8 }}>
                <Box w={16} h={16} r={4} />
                <Box w="70%" h={16} />
              </div>
            ))}
            <Box w={124} h={24} />
            <Box w={168} h={20} />
            <Box h={48} r={999} />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default RoomsSectionSkeleton;
