import React, { useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '@shared/modules/store';
import { searchFilters, setAllMyHotels } from '@shared/modules/store/slices/search';
import { withSearchTypeFilters } from '@shared/utils/searchParamsUtils';
import { type FilterChip, buildFilterChips, pickAppliedListFilters, removeChipFromParams } from '@shared/component/searchResult/filterChips';
import { CloseCircleIcon } from '../../components/uiIcons';

/**
 * Порт searchResult/SelectedFiltersRow: чипы применённых фильтров (Figma «List / Tours»).
 * Клик по чипу снимает один фильтр и перезапрашивает список. Ничего не рендерит без фильтров.
 */
export const SelectedFiltersRow: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const hotels = useSelector((state: RootState) => state.search.hotels);
  const requestId = useSelector((state: RootState) => state.search.requestId);
  const loading = useSelector((state: RootState) => state.search.loading);
  const searchType = useSelector((state: RootState) => state.search.searchParams?.search_type);

  const chips = useMemo(() => buildFilterChips(hotels), [hotels]);

  const handleRemove = (chip: FilterChip) => {
    // Same request shape as ResultList.handleSortSelect / handleResetFilters.
    const operators = hotels?.readyOperators || [];
    if (!requestId || !operators || operators.length === 0) {
      console.warn('Missing requestId or operators for removing filter');
      return;
    }
    const filterParams: Record<string, unknown> = {
      request_id: requestId,
      readyOperators: operators,
      page_number: 1,
      page_limit: 20,
      sort_by: hotels?.sort_by || 'relevance',
      ...removeChipFromParams(pickAppliedListFilters(hotels), chip, hotels),
    };
    dispatch(setAllMyHotels([]));
    dispatch(searchFilters(withSearchTypeFilters(searchType || hotels?.search_type, filterParams) as any));
  };

  if (!hotels || chips.length === 0) return null;

  return (
    <div className="search-chips">
      {chips.map(chip => (
        <button
          type="button"
          key={`${chip.key}:${chip.value ?? ''}`}
          disabled={loading}
          onClick={() => handleRemove(chip)}
          className="chip chip--brand search-chips__chip">
          <CloseCircleIcon size={20} color="#FFFFFF" />
          <span className="search-chips__label">{chip.label}</span>
        </button>
      ))}
    </div>
  );
};

export default SelectedFiltersRow;
