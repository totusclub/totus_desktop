import React from 'react';
import { formatDateRange, formatNightsText, formatTouristsText } from '@shared/utils/ticketsUtils/tourDetailsUtils';
import type { TourDetails } from '@shared/types/tickets';

// Порт tickets/ticket/TourSection.tsx: «Тур» — Курорт, Даты перелёта, Туристы, Отель, Номер, Питание, Трансфер, Страховка, Туроператор.

type Props = { tourDetails: TourDetails };

const Item: React.FC<{ label: string; last?: boolean; children: React.ReactNode }> = ({ label, last, children }) => (
  <div className={'tour-item' + (last ? ' tour-item--last' : '')}>
    <div className="tour-item__label">{label}</div>
    {children}
  </div>
);

export const TourSection: React.FC<Props> = ({ tourDetails }) => (
  <section className="tour-section">
    <h3 className="tour-section__title">Тур</h3>

    <div className="tour-section__content">
      <Item label="Курорт">
        <div className="tour-item__value">
          {tourDetails.resort.country && tourDetails.resort.city
            ? `${tourDetails.resort.country}, ${tourDetails.resort.city}`
            : tourDetails.resort.country || tourDetails.resort.city || ''}
        </div>
      </Item>

      <Item label="Даты перелёта">
        <div className="tour-item__row">
          <span className="tour-item__value">{formatDateRange(tourDetails.flightDates.startDate, tourDetails.flightDates.nights)}</span>
          <span className="tour-item__nights">{formatNightsText(tourDetails.flightDates.nights)}</span>
        </div>
      </Item>

      <Item label="Туристы">
        <div className="tour-item__value">
          {formatTouristsText(tourDetails.tourists.adults, tourDetails.tourists.kids, tourDetails.tourists.kidsAges)}
        </div>
      </Item>

      <Item label="Отель">
        <div className="tour-item__value">{tourDetails.hotel.name}</div>
      </Item>

      {tourDetails.room.name ? (
        <Item label="Номер">
          <div className="tour-item__value">{tourDetails.room.name}</div>
        </Item>
      ) : null}

      <Item label="Питание">
        <div className="tour-item__value">{tourDetails.meals}</div>
      </Item>

      {tourDetails.transfer.included !== undefined ? (
        <Item label="Трансфер">
          <div className="tour-item__value">{tourDetails.transfer.included ? 'Включен в стоимость' : 'Не включен в стоимость'}</div>
        </Item>
      ) : null}

      {tourDetails.insurance.included !== undefined ? (
        <Item label="Страховка">
          <div className="tour-item__value">{tourDetails.insurance.included ? 'Включена в стоимость' : 'Не включена в стоимость'}</div>
        </Item>
      ) : null}

      <Item label="Туроператор" last>
        <div className="tour-item__value">{tourDetails.operator}</div>
      </Item>
    </div>
  </section>
);

export default TourSection;
