import React from 'react';
import type { FlightCard, FlightSegment } from '@shared/types/tickets';
import { ChevronRightIcon } from '../../components/uiIcons';

// Порт tickets/FlightCardView.tsx: сегменты Туда/Обратно, авиакомпания, время, длительность, багаж, цена, стрелка.

type Props = {
  flight: FlightCard;
  priceLabel?: string;
  feesLabel?: string | null;
  onPress: () => void;
};

const directionLabel = (direction: FlightSegment['direction']) => (direction === 'back' ? 'Обратно' : 'Туда');

const FlightCardViewBase: React.FC<Props> = ({ flight, priceLabel, feesLabel, onPress }) => {
  const displayPrice = priceLabel || flight.price;

  return (
    <button type="button" className="flight-card" onClick={onPress}>
      {flight.note ? <span className="flight-card__note">{flight.note}</span> : null}

      {flight.segments.map((segment, index) => (
        <div
          key={segment.id}
          className={'flight-card__segment' + (index === flight.segments.length - 1 ? ' flight-card__segment--last' : '')}>
          <span className="flight-card__direction">{directionLabel(segment.direction)}</span>

          <div className="flight-card__segment-row">
            {segment.airlineLogo ? (
              <img className="flight-card__logo" src={segment.airlineLogo} alt={segment.airlineName || ''} />
            ) : (
              <span className="flight-card__logo flight-card__logo--placeholder">{segment.airlineName?.charAt(0) || 'A'}</span>
            )}

            <div className="flight-card__segment-content">
              <div className="flight-card__top">
                <div className="flight-card__times">
                  <span className="flight-card__times-text">
                    {segment.departureTime} - {segment.arrivalTime}
                  </span>
                  <span className="flight-card__meta">{segment.dateLabel}</span>
                </div>
                <div className="flight-card__duration">
                  <span className="flight-card__duration-text">{segment.duration}</span>
                  <span className="flight-card__meta">{segment.isDirect ? 'Прямой' : 'С пересадкой'}</span>
                </div>
              </div>

              <div className="flight-card__bottom">
                <span className="flight-card__airline">{segment.airlineName}</span>
                <div className="flight-card__route">
                  {segment.routeTitle ? <span className="flight-card__route-title">{segment.routeTitle}</span> : null}
                  {segment.airportTitle ? <span className="flight-card__airport">{segment.airportTitle}</span> : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}

      {flight.baggage.length > 0 ? (
        <div className="flight-card__badges">
          {flight.baggage.map((item, index) => (
            <span key={`${flight.id}-${index}`} className="flight-card__badge">
              {item}
            </span>
          ))}
        </div>
      ) : null}

      <div className="flight-card__footer">
        <div className="flight-card__price-block">
          <span className="flight-card__price">{displayPrice}</span>
          {feesLabel ? <span className="flight-card__fees">{feesLabel}</span> : null}
          <span className="flight-card__price-label">За тур с перелётом</span>
        </div>
        <span className="flight-card__arrow" aria-hidden="true">
          <ChevronRightIcon size={24} />
        </span>
      </div>
    </button>
  );
};

export const FlightCardView = React.memo(
  FlightCardViewBase,
  (prevProps, nextProps) =>
    prevProps.flight.id === nextProps.flight.id &&
    prevProps.flight.priceValue === nextProps.flight.priceValue &&
    prevProps.flight.fuelCharge === nextProps.flight.fuelCharge &&
    prevProps.priceLabel === nextProps.priceLabel &&
    prevProps.feesLabel === nextProps.feesLabel &&
    prevProps.flight.segments === nextProps.flight.segments &&
    prevProps.onPress === nextProps.onPress,
);

export default FlightCardView;
