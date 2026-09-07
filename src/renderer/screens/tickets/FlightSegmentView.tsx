import React from 'react';
import type { FlightDetailSegment } from '@shared/types/tickets';
import { PlaneIcon } from '../../components/uiIcons';

// Порт tickets/ticket/FlightSegmentView.tsx: авиакомпания + рейс + борт, багаж, таймлайн вылет/прилёт, пересадки.

type Props = {
  segment: FlightDetailSegment;
  title: string;
};

export const FlightSegmentView: React.FC<Props> = ({ segment, title }) => (
  <section className="flight-seg">
    {/* Section Title */}
    <h3 className="flight-seg__title">{title}</h3>

    {/* Airline Logo and Name */}
    <div className="flight-seg__airline-row">
      <div className="flight-seg__airline">
        {segment.airlineLogo ? (
          <img className="flight-seg__logo" src={segment.airlineLogo} alt={segment.airlineName} />
        ) : (
          <span className="flight-seg__logo flight-seg__logo--placeholder">{segment.airlineName.charAt(0)}</span>
        )}
        {segment.flightNo ? <span className="flight-seg__flight-no">{` ${segment.airlineName} ${segment.flightNo}`}</span> : null}
      </div>
      {segment.aircraft ? <span className="flight-seg__aircraft">{segment.aircraft}</span> : null}
    </div>

    {/* Baggage badges */}
    <div className="flight-seg__badges">
      {segment.baggage.isBlock ? <span className="flight-seg__badge">Блочный</span> : null}
      {segment.baggage.class ? <span className="flight-seg__badge">{segment.baggage.class}</span> : null}
      {segment.baggage.handLuggage.map((item, idx) => (
        <span key={`hand-${idx}`} className="flight-seg__badge">
          Ручная кладь {item.weight ? `${item.weight} кг` : `${item.count} шт.`} {item.direction}
        </span>
      ))}
      {segment.baggage.holdLuggage.map((item, idx) => (
        <span key={`hold-${idx}`} className="flight-seg__badge">
          Багаж {item.weight ? `${item.weight} кг` : `${item.count} шт.`} {item.direction}
        </span>
      ))}
    </div>

    {/* Flight timeline */}
    <div className="flight-seg__timeline">
      <div className="flight-seg__rail" aria-hidden="true">
        <span className="flight-seg__rail-dot" />
        <span className="flight-seg__rail-line" />
        <PlaneIcon size={20} />
        <span className="flight-seg__rail-line" />
        <span className="flight-seg__rail-dot" />
      </div>

      <div className="flight-seg__steps">
        {/* Departure */}
        <div className="flight-seg__step">
          <div className="flight-seg__step-row">
            <span className="flight-seg__time">{segment.departureTime}</span>
            <span className="flight-seg__city">{segment.departureAirport.city}</span>
          </div>
          <div className="flight-seg__step-row">
            <span className="flight-seg__date">{segment.departureDate}</span>
            <span className="flight-seg__airport">{segment.departureAirport.airport || segment.departureAirport.code}</span>
          </div>
        </div>

        {/* Duration */}
        <div className="flight-seg__duration">
          {segment.duration} в пути{segment.flightType === 'block' ? ', блочный' : ', регулярный'}
        </div>

        {/* Arrival */}
        <div className="flight-seg__step">
          <div className="flight-seg__step-row">
            <span className="flight-seg__time">{segment.arrivalTime}</span>
            <span className="flight-seg__city">{segment.arrivalAirport.city}</span>
          </div>
          <div className="flight-seg__step-row">
            <span className="flight-seg__date">{segment.arrivalDate}</span>
            <span className="flight-seg__airport">{segment.arrivalAirport.airport || segment.arrivalAirport.code}</span>
          </div>
        </div>
      </div>
    </div>

    {/* Transitions */}
    {segment.transitions?.map((transition, index) => (
      <div key={`${segment.id}-transition-${index}`} className="flight-seg__transition">
        <div className="flight-seg__transition-head">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="flight-seg__transition-title">Пересадка в {transition.city || transition.airport || transition.code}</div>
            {transition.airport ? <div className="flight-seg__transition-sub">{transition.airport}</div> : null}
          </div>
          {transition.duration ? <span className="flight-seg__transition-badge">{transition.duration}</span> : null}
        </div>

        <div className="flight-seg__transition-times">
          <div className="flight-seg__transition-block">
            <span className="flight-seg__transition-label">Прилёт</span>
            <span className="flight-seg__transition-time">{transition.arrivalTime || '--:--'}</span>
            {transition.arrivalDate ? <span className="flight-seg__transition-date">{transition.arrivalDate}</span> : null}
          </div>
          <div className="flight-seg__transition-block">
            <span className="flight-seg__transition-label">Вылет</span>
            <span className="flight-seg__transition-time">{transition.departureTime || '--:--'}</span>
            {transition.departureDate ? <span className="flight-seg__transition-date">{transition.departureDate}</span> : null}
          </div>
        </div>

        {transition.airlineName || transition.flightNo ? (
          <div className="flight-seg__transition-flight">
            {transition.airlineLogo ? <img className="flight-seg__transition-logo" src={transition.airlineLogo} alt="" /> : null}
            <div style={{ flex: 1 }}>
              {transition.airlineName ? <div className="flight-seg__transition-flight-text">{transition.airlineName}</div> : null}
              {transition.flightNo ? <div className="flight-seg__transition-flight-sub">Рейс {transition.flightNo}</div> : null}
            </div>
          </div>
        ) : null}
      </div>
    ))}
  </section>
);

export default FlightSegmentView;
