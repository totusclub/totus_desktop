import React from 'react';
import { useAppNavigation } from '../../app/navigation';
import { EmptyCityIcon } from '../../components/uiIcons';

// Порт tickets/TicketsEmptyState.tsx: «Перелёты не найдены» + «Сбросить фильтры / Обновить» + «Вернуться назад».

type Props = {
  /** True when user has active ticket filters that can be cleared. */
  hasActiveFilters?: boolean;
  onResetFilters?: () => void;
  onRetry?: () => void;
};

/**
 * Zero-result screen for the tickets list. Failures are presented as
 * "no variants found" instead of a technical error, matching kedam-WEB copy tone.
 */
export const TicketsEmptyState: React.FC<Props> = ({ hasActiveFilters = false, onResetFilters, onRetry }) => {
  const nav = useAppNavigation();

  const body = hasActiveFilters
    ? 'По выбранным фильтрам нет подходящих перелётов. Попробуйте изменить параметры или сбросить фильтры.'
    : 'На эти даты пока нет доступных вариантов перелёта. Попробуйте обновить результаты или выбрать другой тур.';

  const primaryTitle = hasActiveFilters ? 'Сбросить фильтры' : 'Обновить';

  const handlePrimary = () => {
    if (hasActiveFilters && onResetFilters) {
      onResetFilters();
      return;
    }
    onRetry?.();
  };

  return (
    <div className="tickets-empty">
      <div className="tickets-empty__content">
        <div className="tickets-empty__icon">
          <EmptyCityIcon size={72} />
        </div>
        <div className="tickets-empty__title">Перелёты не найдены</div>
        <div className="tickets-empty__text">{body}</div>
        <button type="button" className="btn btn--block" onClick={handlePrimary}>
          {primaryTitle}
        </button>
        <div className="tickets-empty__secondary">
          <button
            type="button"
            className="btn btn--outline btn--block"
            onClick={() => (hasActiveFilters ? onRetry?.() : nav.goBack())}>
            {hasActiveFilters ? 'Обновить' : 'Вернуться назад'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TicketsEmptyState;
