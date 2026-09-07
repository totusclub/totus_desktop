import React from 'react';
import type { DateOption } from '@shared/utils/hotelUtils/roomHelpers';

// Порт hotel/components/DateSelectorBar.tsx + hotel/DateSelector.tsx: чипы «12 сен, пт / от 125 000 ₽».

type Props = {
  dateOptions: DateOption[];
  selectedDate: string | null;
  onSelect: (date: string) => void;
};

const formatPrice = (price: number) => price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

export const DateSelectorBar: React.FC<Props> = ({ dateOptions, selectedDate, onSelect }) => {
  // Match kedam-WEB: date tabs removed when only one fixed departure date.
  if (dateOptions.length <= 1) return null;

  return (
    <div className="hotel-dates" role="tablist">
      {dateOptions.map(dateOption => {
        const isSelected = selectedDate === dateOption.date;
        return (
          <button
            type="button"
            role="tab"
            aria-selected={isSelected}
            key={dateOption.date}
            className={'hotel-date-chip' + (isSelected ? ' hotel-date-chip--active' : '')}
            onClick={() => onSelect(dateOption.date)}>
            <span className="hotel-date-chip__date">
              {dateOption.formattedDate}, {dateOption.dayOfWeek}
            </span>
            <span className="hotel-date-chip__price">от {formatPrice(dateOption.minPrice)} ₽</span>
          </button>
        );
      })}
    </div>
  );
};

export default DateSelectorBar;
