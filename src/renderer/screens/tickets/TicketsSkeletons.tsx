import React from 'react';

// Порт tickets/TicketsListHeaderSkeleton.tsx и tickets/FlightCardSkeleton.tsx.

const Box: React.FC<{ w?: number | string; h: number; r?: number; style?: React.CSSProperties }> = ({ w = '100%', h, r = 8, style }) => (
  <div className="skeleton" style={{ width: w, height: h, borderRadius: r, flex: 'none', ...style }} />
);

/** Mirrors the real list header: SelectedTourCard + sort/count row. */
export const TicketsListHeaderSkeleton: React.FC = () => (
  <div className="tickets-page" aria-hidden="true">
    <div className="tickets-tour">
      <Box w={140} h={26} r={999} />
      <div className="tickets-tour__body">
        <Box w={92} h={92} r={18} />
        <div className="tickets-tour__info">
          <div className="tickets-skel-row" style={{ gap: 2, marginBottom: 2 }}>
            {[1, 2, 3, 4, 5].map(star => (
              <Box key={star} w={12} h={12} r={6} />
            ))}
          </div>
          <Box w="80%" h={20} />
          <Box w="55%" h={17} />
          <Box w="70%" h={17} />
          <Box w="45%" h={16} />
        </div>
      </div>
      <div className="tickets-tour__divider" />
      <div className="tickets-tour__price-row">
        <Box w={132} h={17} />
        <div className="tickets-tour__price-values">
          <Box w={104} h={22} />
          <Box w={86} h={14} />
        </div>
      </div>
    </div>
    <div className="tickets-sort-row">
      <Box w={150} h={38} r={18} />
      <Box w={126} h={16} />
    </div>
  </div>
);

/** Mirrors FlightCardView: two segment rows, badges, price + arrow footer. */
export const FlightCardSkeleton: React.FC = () => {
  const renderSegment = (isLast: boolean) => (
    <div className={'flight-card__segment' + (isLast ? ' flight-card__segment--last' : '')}>
      <Box w={64} h={14} />
      <div className="flight-card__segment-row">
        <Box w={44} h={44} r={8} />
        <div className="flight-card__segment-content">
          <div className="flight-card__top">
            <div className="flight-card__times">
              <Box w={120} h={20} />
              <Box w={90} h={16} />
            </div>
            <div className="flight-card__duration">
              <Box w={56} h={18} />
              <Box w={78} h={16} />
            </div>
          </div>
          <div className="flight-card__bottom">
            <Box w={104} h={16} />
            <div className="flight-card__route">
              <Box w={116} h={17} />
              <Box w={88} h={16} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flight-card" style={{ cursor: 'default' }} aria-hidden="true">
      <Box w={128} h={14} />
      {renderSegment(false)}
      {renderSegment(true)}
      <div className="flight-card__badges">
        <Box w={96} h={26} r={12} />
        <Box w={72} h={26} r={12} />
        <Box w={110} h={26} r={12} />
      </div>
      <div className="flight-card__footer">
        <div className="flight-card__price-block">
          <Box w={128} h={24} />
          <Box w={104} h={18} />
          <Box w={136} h={17} />
        </div>
        <Box w={44} h={44} r={22} />
      </div>
    </div>
  );
};
