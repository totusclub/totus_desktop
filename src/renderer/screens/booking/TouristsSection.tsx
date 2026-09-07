import React from 'react';
import type { Tourist, BookingValidationErrors } from '@shared/types/booking';
import { TouristForm } from './TouristForm';

// Порт booking/components/TouristsSection.tsx: карточка «Туристы» с формой на каждого туриста.

interface TouristsSectionProps {
  tourists: Tourist[];
  errors: BookingValidationErrors;
  onUpdateTourist: (
    index: number,
    key: keyof Tourist,
    value: string | boolean | number,
    additionalUpdates?: Partial<Tourist>,
  ) => void;
  onClearPatronymicError: (index: number) => void;
  onNoPatronymicToggle: (index: number, newValue: boolean) => void;
}

export const TouristsSection: React.FC<TouristsSectionProps> = ({
  tourists,
  errors,
  onUpdateTourist,
  onClearPatronymicError,
  onNoPatronymicToggle,
}) => (
  <section className="card booking-card">
    <div className="booking-card__head">
      <h2 className="booking-card__title">Туристы</h2>
      <div className="booking-card__subtitle">Заполните данные в точности так, как в документе, по которому полетите</div>
    </div>

    {tourists.map((tourist, index) => {
      const touristErrors = errors.tourists?.[index] || {};
      return (
        <TouristForm
          key={index}
          tourist={tourist}
          index={index}
          errors={touristErrors}
          onUpdate={(key, value, additionalUpdates) => onUpdateTourist(index, key, value, additionalUpdates)}
          onClearPatronymicError={() => onClearPatronymicError(index)}
          onNoPatronymicToggle={newValue => onNoPatronymicToggle(index, newValue)}
          showDivider={index > 0}
        />
      );
    })}
  </section>
);

export default TouristsSection;
