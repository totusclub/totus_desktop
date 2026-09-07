import React, { useMemo, useState } from 'react';
import { Icon } from '../icons';
import './DatePicker.css';

// Месячный календарь (порт логики home/searchSection/modals/DateSelectionModal):
// неделя с понедельника, прошедшие даты недоступны, выбранная — брендовым кругом.

export const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];
const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

type Props = {
  value: Date | null;
  onChange: (date: Date) => void;
  /** Минимальная дата (по умолчанию — сегодня). */
  minDate?: Date;
  /** Сколько месяцев вперёд можно листать (в приложении — 13). */
  monthsAhead?: number;
};

const startOfDay = (d: Date): Date => {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
};

const generateCalendarDays = (year: number, month: number): (number | null)[] => {
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startingDayOfWeek = firstDay.getDay();
  const adjustedStartingDay = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;
  const days: (number | null)[] = [];
  for (let i = 0; i < adjustedStartingDay; i++) days.push(null);
  for (let day = 1; day <= daysInMonth; day++) days.push(day);
  return days;
};

export const DatePicker: React.FC<Props> = ({ value, onChange, minDate, monthsAhead = 13 }) => {
  const today = useMemo(() => startOfDay(minDate || new Date()), [minDate]);
  const initialMonth = useMemo(() => {
    const base = value && startOfDay(value) >= today ? value : today;
    return new Date(base.getFullYear(), base.getMonth(), 1);
  }, [value, today]);
  const [month, setMonth] = useState<Date>(initialMonth);

  const firstMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastMonth = new Date(today.getFullYear(), today.getMonth() + monthsAhead - 1, 1);
  const canPrev = month > firstMonth;
  const canNext = month < lastMonth;

  const days = generateCalendarDays(month.getFullYear(), month.getMonth());

  const isPast = (day: number) => startOfDay(new Date(month.getFullYear(), month.getMonth(), day)) < today;
  const isSelected = (day: number) =>
    !!value &&
    value.getDate() === day &&
    value.getMonth() === month.getMonth() &&
    value.getFullYear() === month.getFullYear();
  const isToday = (day: number) =>
    today.getDate() === day && today.getMonth() === month.getMonth() && today.getFullYear() === month.getFullYear();

  return (
    <div className="date-picker">
      <div className="date-picker__head">
        <button
          type="button"
          className="date-picker__nav"
          onClick={() => setMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
          disabled={!canPrev}
          aria-label="Предыдущий месяц">
          <Icon name="chevronLeft" size={20} />
        </button>
        <div className="date-picker__title">
          {MONTH_NAMES[month.getMonth()]} {month.getFullYear()}
        </div>
        <button
          type="button"
          className="date-picker__nav"
          onClick={() => setMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
          disabled={!canNext}
          aria-label="Следующий месяц">
          <Icon name="chevronLeft" size={20} style={{ transform: 'rotate(180deg)' }} />
        </button>
      </div>
      <div className="date-picker__grid">
        {WEEKDAYS.map(w => (
          <div key={w} className="date-picker__weekday">
            {w}
          </div>
        ))}
        {days.map((day, index) => {
          if (day === null) return <div key={`empty-${index}`} className="date-picker__cell" />;
          const past = isPast(day);
          const selected = isSelected(day);
          return (
            <button
              type="button"
              key={`day-${day}`}
              className={
                'date-picker__cell date-picker__day' +
                (selected ? ' date-picker__day--selected' : '') +
                (past ? ' date-picker__day--disabled' : '') +
                (isToday(day) ? ' date-picker__day--today' : '')
              }
              disabled={past}
              onClick={() => {
                const selectedDate = new Date(month.getFullYear(), month.getMonth(), day);
                selectedDate.setHours(0, 0, 0, 0);
                if (selectedDate < today) return;
                onChange(selectedDate);
              }}>
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DatePicker;
