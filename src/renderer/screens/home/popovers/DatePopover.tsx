import React, { useEffect, useState } from 'react';
import { DatePicker, MONTH_NAMES } from '../../../components/DatePicker';
import { CloseIcon } from '../../../components/uiIcons';

// Порт home/searchSection/modals/DateSelectionModal: календарь + кнопка с выбранной датой.

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (date: Date) => void;
  title: string;
  initialDate?: Date;
};

const getValidInitialDate = (initialDate?: Date): Date => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (!initialDate) return today;
  const date = new Date(initialDate);
  date.setHours(0, 0, 0, 0);
  return date < today ? today : date;
};

export const DatePopover: React.FC<Props> = ({ open, onClose, onSelect, title, initialDate }) => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => getValidInitialDate(initialDate));

  useEffect(() => {
    if (open) setSelectedDate(getValidInitialDate(initialDate));
  }, [open, initialDate]);

  const formatSelectedDate = () => {
    if (!selectedDate) return '';
    return `${selectedDate.getDate()} ${MONTH_NAMES[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;
  };

  const handleConfirm = () => {
    if (selectedDate) onSelect(selectedDate);
    onClose();
  };

  return (
    <div className="home-pop">
      <div className="home-pop__head">
        <div className="home-pop__title">{title}</div>
        <button type="button" className="home-pop__close" onClick={onClose} aria-label="Закрыть">
          <CloseIcon size={20} />
        </button>
      </div>
      <DatePicker value={selectedDate} onChange={setSelectedDate} />
      <div className="home-pop__footer">
        <button type="button" className="btn btn--block" onClick={handleConfirm} disabled={!selectedDate}>
          {formatSelectedDate() || 'Выбрать дату'}
        </button>
      </div>
    </div>
  );
};

export default DatePopover;
