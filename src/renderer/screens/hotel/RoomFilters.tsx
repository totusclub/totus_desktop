import React, { useEffect, useState } from 'react';
import { formatPrice } from '@shared/utils/ticketsUtils/flightTransformers';
import {
  clearRoomFilters,
  cloneRoomFilters,
  getConfirmabilityLabel,
  selectConfirmabilityFilter,
  toggleFreeCancelFilter,
  toggleMealFilter,
  toggleOperatorFilter,
  type HotelRoomFilters,
  type RoomFilterOption,
} from '@shared/utils/hotelUtils/roomFilters';
import { Icon } from '../../icons';
import { Popover } from '../../components/Popover';
import { CheckmarkIcon } from '../../components/uiIcons';

// Порт hotel/components/RoomFilters.tsx: кнопка «Фильтры» + «Сбросить»; модалка RN → поповер с черновиком фильтров.

type Props = {
  filters: HotelRoomFilters | null;
  hasActiveFilters?: boolean;
  loading?: boolean;
  onChange: (filters: HotelRoomFilters | ((current: HotelRoomFilters) => HotelRoomFilters)) => void;
  onClear?: () => void;
};

function getFreeCancelLabel(option: RoomFilterOption): string {
  return option.id === true ? 'Бесплатная отмена' : 'Любые условия отмены';
}

function formatOfferCount(count: number | undefined): string {
  if (count == null) return '';
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} предложение`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${count} предложения`;
  return `${count} предложений`;
}

const FilterOptionRow: React.FC<{
  option: RoomFilterOption;
  label: string;
  selected: boolean;
  disabled?: boolean;
  mode?: 'checkbox' | 'radio';
  onToggle: () => void;
}> = ({ option, label, selected, disabled, mode = 'checkbox', onToggle }) => {
  const meta =
    option.count != null
      ? `${formatOfferCount(option.count)}${option.min_price != null && option.count > 0 ? ` от ${formatPrice(option.min_price)}` : ''}`
      : '';
  return (
    <button
      type="button"
      className={'hotel-filters__option' + (selected ? ' hotel-filters__option--selected' : '')}
      disabled={disabled}
      onClick={disabled ? undefined : onToggle}>
      {mode === 'radio' ? (
        <span className={'hotel-radio' + (selected ? ' hotel-radio--on' : '')} aria-hidden="true">
          {selected ? <span className="hotel-radio__dot" /> : null}
        </span>
      ) : (
        <span className={'checkbox' + (selected ? ' checkbox--on' : '')} aria-hidden="true">
          {selected ? <CheckmarkIcon size={14} /> : null}
        </span>
      )}
      <span className="hotel-filters__option-text">
        <span className="hotel-filters__option-label">{label}</span>
        {meta ? <div className="hotel-filters__option-meta">{meta}</div> : null}
      </span>
    </button>
  );
};

const FilterSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="hotel-filters__section">
    <div className="hotel-filters__section-title">{title}</div>
    {children}
  </div>
);

export const RoomFilters: React.FC<Props> = ({ filters, hasActiveFilters = false, loading = false, onChange, onClear }) => {
  const [open, setOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState<HotelRoomFilters | null>(null);

  useEffect(() => {
    if (open && filters) setDraftFilters(cloneRoomFilters(filters));
  }, [open, filters]);

  if (!filters) return null;

  const hasMeals = (filters.meals ?? []).length > 0;
  const hasFreeCancel = (filters.free_cancel ?? []).length > 0;
  const hasConfirmability = (filters.confirmability ?? []).length > 0;
  const hasOperators = (filters.operators ?? []).length > 0;

  if (!hasMeals && !hasFreeCancel && !hasConfirmability && !hasOperators) return null;

  const handleClose = () => setOpen(false);

  const handleApply = () => {
    if (draftFilters) onChange(draftFilters);
    setOpen(false);
  };

  const handleDraftClear = () => {
    if (!draftFilters) return;
    setDraftFilters(clearRoomFilters(draftFilters));
  };

  return (
    <div className="hotel-filters">
      {loading ? <span className="hotel-filters__loading">Обновляем варианты...</span> : null}

      <Popover
        open={open}
        onClose={handleClose}
        width={420}
        align="right"
        anchor={
          <button
            type="button"
            className={'hotel-filters__btn' + (hasActiveFilters ? ' hotel-filters__btn--active' : '')}
            onClick={() => setOpen(v => !v)}>
            <Icon name="filters" size={14} />
            Фильтры
          </button>
        }>
        <div className="hotel-filters__panel">
          <div className="hotel-filters__head">
            <div className="hotel-filters__title">Фильтры номеров</div>
            <button type="button" className="hotel-filters__reset" onClick={handleDraftClear}>
              Сбросить
            </button>
          </div>

          <div className="hotel-filters__scroll">
            {hasMeals && draftFilters?.meals ? (
              <FilterSection title="Питание">
                {draftFilters.meals.map(meal => (
                  <FilterOptionRow
                    key={String(meal.id)}
                    option={meal}
                    label={meal.name || String(meal.id)}
                    selected={Boolean(meal.selected)}
                    disabled={meal.disabled}
                    onToggle={() => setDraftFilters(current => (current ? toggleMealFilter(current, String(meal.id)) : current))}
                  />
                ))}
              </FilterSection>
            ) : null}

            {hasFreeCancel && draftFilters?.free_cancel ? (
              <FilterSection title="Отмена">
                {draftFilters.free_cancel.map(item => (
                  <FilterOptionRow
                    key={String(item.id)}
                    option={item}
                    label={getFreeCancelLabel(item)}
                    selected={Boolean(item.selected)}
                    disabled={item.disabled}
                    onToggle={() => setDraftFilters(current => (current ? toggleFreeCancelFilter(current, Boolean(item.id)) : current))}
                  />
                ))}
              </FilterSection>
            ) : null}

            {hasConfirmability && draftFilters?.confirmability ? (
              <FilterSection title="Подтверждение">
                {draftFilters.confirmability.map(item => (
                  <FilterOptionRow
                    key={String(item.id)}
                    option={item}
                    label={getConfirmabilityLabel(item)}
                    selected={Boolean(item.selected)}
                    disabled={item.disabled}
                    mode="radio"
                    onToggle={() =>
                      setDraftFilters(current => (current ? selectConfirmabilityFilter(current, Number(item.id)) : current))
                    }
                  />
                ))}
              </FilterSection>
            ) : null}

            {hasOperators && draftFilters?.operators ? (
              <FilterSection title="Туроператор">
                {draftFilters.operators.map(operator => (
                  <FilterOptionRow
                    key={String(operator.id)}
                    option={operator}
                    label={operator.name || String(operator.id)}
                    selected={Boolean(operator.selected)}
                    disabled={operator.disabled}
                    onToggle={() =>
                      setDraftFilters(current => (current ? toggleOperatorFilter(current, Number(operator.id)) : current))
                    }
                  />
                ))}
              </FilterSection>
            ) : null}
          </div>

          <div className="hotel-filters__footer">
            <button type="button" className="btn btn--block" onClick={handleApply}>
              Применить
            </button>
          </div>
        </div>
      </Popover>

      {hasActiveFilters && onClear ? (
        <button type="button" className="hotel-filters__clear" onClick={onClear}>
          Сбросить
        </button>
      ) : null}
    </div>
  );
};

export default RoomFilters;
