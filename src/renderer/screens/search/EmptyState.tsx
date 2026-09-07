import React from 'react';
import { useAppNavigation } from '../../app/navigation';
import { EmptyCityIcon } from '../../components/uiIcons';

// Порт searchResult/EmptyState.

type Props = { onResetFilters: () => void; emptyType?: string };

export const EmptyState: React.FC<Props> = ({ onResetFilters, emptyType }) => {
  const nav = useAppNavigation();
  return (
    <div className="empty search-empty">
      <EmptyCityIcon size={80} color="var(--brand)" />
      <div className="empty__title">Ошибка</div>
      <div className="search-empty__message">
        К сожалению, не найдено ни одного тура, соответствующего вашим критериям. Пожалуйста, попробуйте изменить параметры поиска или
        вернитесь позже.
      </div>
      <button type="button" className="btn" onClick={emptyType === 'BACK' ? () => nav.goBack() : onResetFilters}>
        {emptyType === 'BACK' ? 'Вернуться назад' : 'Сбросить фильтры'}
      </button>
    </div>
  );
};

export default EmptyState;
