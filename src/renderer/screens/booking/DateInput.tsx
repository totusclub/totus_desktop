import React, { useEffect, useMemo, useState } from 'react';
import { Popover } from '../../components/Popover';
import { CalendarIcon } from '../../components/uiIcons';
import { MONTH_NAMES } from '../../components/DatePicker';
import { formatDateMask, formatDateToMask, parseMaskedDate } from './masks';

// Порт UI/dateInput (маска 99.99.9999 + DatePickerModal «день / месяц / год»).
// На десктопе колёса выбора заменены на поповер с тремя select и кнопкой «Выбрать».

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  /** true для даты рождения, false для срока действия документа. */
  allowPastDates?: boolean;
  /** false для даты рождения. */
  allowFutureDates?: boolean;
  disabled?: boolean;
};

const startOfDay = (d: Date): Date => {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
};

export const DateInput: React.FC<Props> = ({
  value,
  onChange,
  placeholder = 'DD.MM.YYYY',
  label,
  error,
  allowPastDates = false,
  allowFutureDates = true,
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const today = useMemo(() => startOfDay(new Date()), []);

  const getValidInitialDate = () => {
    const parsed = parseMaskedDate(value);
    if (!parsed) return today;
    const date = startOfDay(parsed);
    if (!allowPastDates && date < today) return today;
    if (!allowFutureDates && date > today) return today;
    return date;
  };

  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());

  // Reset to initial date when the picker opens (как в DatePickerModal)
  useEffect(() => {
    if (!open) return;
    const date = getValidInitialDate();
    setSelectedDay(date.getDate());
    setSelectedMonth(date.getMonth());
    setSelectedYear(date.getFullYear());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Generate years (current year −100 … +50)
  const years = useMemo(() => {
    const currentYear = today.getFullYear();
    const list: number[] = [];
    const startYear = allowPastDates ? currentYear - 100 : currentYear;
    const endYear = allowFutureDates ? currentYear + 50 : currentYear;
    for (let year = startYear; year <= endYear; year++) list.push(year);
    return list;
  }, [allowPastDates, allowFutureDates, today]);

  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const days = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth]);

  const isDateValid = (day: number, month: number, year: number): boolean => {
    const date = startOfDay(new Date(year, month, day));
    if (!allowPastDates && date < today) return false;
    if (!allowFutureDates && date > today) return false;
    return true;
  };

  const effectiveDay = Math.min(selectedDay, daysInMonth);
  const valid = isDateValid(effectiveDay, selectedMonth, selectedYear);

  const handleConfirm = () => {
    if (valid) {
      onChange(formatDateToMask(new Date(selectedYear, selectedMonth, effectiveDay)));
    }
    setOpen(false);
  };

  const formatSelectedDate = () => `${effectiveDay} ${MONTH_NAMES[selectedMonth]} ${selectedYear}`;

  return (
    <div className="booking-field">
      {label ? <label className="label">{label}</label> : null}
      <Popover
        open={open && !disabled}
        onClose={() => setOpen(false)}
        width={320}
        align="right"
        anchor={
          <div className={'booking-date' + (error ? ' booking-date--error' : '') + (disabled ? ' booking-date--disabled' : '')}>
            <input
              className="booking-date__input"
              type="text"
              inputMode="numeric"
              value={value}
              placeholder={placeholder}
              disabled={disabled}
              maxLength={10}
              onChange={e => onChange(formatDateMask(e.target.value))}
            />
            <button
              type="button"
              className="booking-date__btn"
              disabled={disabled}
              onClick={() => setOpen(o => !o)}
              aria-label={label || 'Выберите дату'}>
              <CalendarIcon size={20} color={disabled ? 'var(--text-disabled)' : 'var(--brand)'} />
            </button>
          </div>
        }>
        <div className="booking-picker">
          <div className="booking-picker__title">{label || 'Выберите дату'}</div>
          <div className="booking-picker__selected">{formatSelectedDate()}</div>
          <div className="booking-picker__row">
            <select className="input booking-picker__select" value={effectiveDay} onChange={e => setSelectedDay(Number(e.target.value))}>
              {days.map(d => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <select className="input booking-picker__select" value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}>
              {MONTH_NAMES.map((m, i) => (
                <option key={m} value={i}>
                  {m}
                </option>
              ))}
            </select>
            <select className="input booking-picker__select" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>
              {years.map(y => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          {!valid ? <div className="error-text">Недоступная дата</div> : null}
          <button type="button" className="btn btn--block" disabled={!valid} onClick={handleConfirm}>
            Выбрать
          </button>
        </div>
      </Popover>
      {error ? <div className="error-text booking-field__error">{error}</div> : null}
    </div>
  );
};

export default DateInput;
