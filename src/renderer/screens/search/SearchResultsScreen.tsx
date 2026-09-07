import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@shared/modules/store';
import { formatTouristsText } from '@shared/component/home/searchSection/utils/searchHelpers';
import { PageHeader } from '../../shell/PageHeader';
import { FiltersPanel, FiltersPanelSkeleton } from './FiltersPanel';
import { SelectedFiltersRow } from './SelectedFiltersRow';
import { ResultList } from './ResultList';
import './search.css';

// Порт searchResult/SearchResults (вариант с постоянной панелью фильтров) + UI/header/SearchResultHeader.
// Figma «Desktop / List / Tours»: шапка «назад + направление + дата, ночи, туристы»,
// слева панель фильтров 280, справа чипы, сортировка и карточки в 2 колонки.

// Format date from YYYY-MM-DD to "17 мая" format
const formatDateToRussian = (dateStr: string | undefined): string => {
  if (!dateStr) return '';
  const russianMonths = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  try {
    const [, month, day] = dateStr.split('-');
    const monthName = russianMonths[parseInt(month, 10) - 1];
    return `${parseInt(day, 10)} ${monthName}`;
  } catch {
    return dateStr;
  }
};

// Parse nights (handle "7..9" format or single number)
const parseNights = (nights: string | number | undefined): string => {
  if (!nights && nights !== 0) return '';
  const str = String(nights);
  if (str.includes('..')) return str.split('..')[0];
  return str.replace(/[^0-9]/g, '');
};

export const SearchResultsScreen: React.FC = () => {
  const { headerName, searchParams } = useSelector((state: RootState) => state.search);
  const hasFacets = useSelector((state: RootState) => Boolean(state.search.hotels?.filters));
  const loading = useSelector((state: RootState) => state.search.loading);
  const hotelsCount = useSelector((state: RootState) => state.search.hotels?.hotels_count);

  const dateText = useMemo(() => {
    if (!searchParams) return '';
    const parts: string[] = [];
    if (searchParams.start_date) {
      const formattedDate = formatDateToRussian(searchParams.start_date);
      if (formattedDate) parts.push(formattedDate);
    }
    if (searchParams.nights) {
      const nightsValue = parseNights(searchParams.nights);
      if (nightsValue) parts.push(`${nightsValue} ночей`);
    }
    const adults = parseInt(searchParams.adults || '0', 10);
    const kids = parseInt(searchParams.kids || '0', 10);
    const touristsLabel = formatTouristsText(String(adults), String(kids));
    if (adults + kids > 0) parts.push(touristsLabel);
    return parts.join(', ');
  }, [searchParams]);

  const destinationName = useMemo(() => {
    if (headerName) return headerName;
    if (searchParams?.to_city) return searchParams.to_city;
    if (searchParams?.to_country) return searchParams.to_country;
    return '';
  }, [headerName, searchParams]);

  return (
    <div className="search">
      <PageHeader back title={destinationName || 'Выберите направление'} subtitle={dateText || undefined} />
      <div className="page-body search__body">
        <aside className="search__aside">
          <div className="card search__filters-card">
            {hasFacets && !loading ? <FiltersPanel resultCount={hotelsCount} /> : <FiltersPanelSkeleton />}
          </div>
        </aside>
        <div className="search__main">
          <SelectedFiltersRow />
          <ResultList />
        </div>
      </div>
    </div>
  );
};

export default SearchResultsScreen;
