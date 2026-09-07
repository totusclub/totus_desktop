import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '@shared/modules/store';
import { fetchDestinations } from '@shared/modules/store/slices/destinations';
import type { DestinationResult } from '@shared/types/destinations';
import { Icon } from '../../../icons';
import { CloseIcon, EmptyCityIcon } from '../../../components/uiIcons';
import { highlightAllMatches } from '../highlightText';

// Порт home/searchSection/modals/DestinationSelectionModal (та же группировка и тексты).

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (item: DestinationResult, type: string) => void;
  title: string;
  fromCity?: string;
  searchType?: 'package' | 'hotel';
};

const ignorName = ['Крым', 'Донецк', 'Луганск', 'Ялта', 'Yalta'];

type Group = { type: string; title: string; items: DestinationResult[] };

export const DestinationPopover: React.FC<Props> = ({ open, onClose, onSelect, title, fromCity = 'Moscow', searchType = 'package' }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { data, loading, error } = useSelector((state: RootState) => state.destinations);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (open) setSearchQuery('');
  }, [open]);

  // Debounced search — 500 мс только при непустом запросе
  useEffect(() => {
    if (!open) return;
    const timeoutId = setTimeout(
      () => {
        dispatch(fetchDestinations({ query: searchQuery || '', from_city: fromCity, search_type: searchType }));
      },
      searchQuery.trim() ? 500 : 0,
    );
    return () => clearTimeout(timeoutId);
  }, [searchQuery, open, dispatch, fromCity, searchType]);

  const groupedResults = useMemo<Group[]>(() => {
    const list = (data || []) as any[];
    if (!list.length) return [];
    const countries = list.filter(item => item?.group_name === 'countries').flatMap(item => item?.results || []);
    const regions = list
      .filter(item => item?.group_name === 'regions')
      .flatMap(item => item?.results?.filter((c: any) => !ignorName.some(name => c.active_regions?.includes(name))) || []);
    const metaregions = list
      .filter(item => item?.group_name === 'metaregions')
      .flatMap(item => item?.results?.filter((m: any) => !ignorName.some(name => m.description?.includes(name))) || []);
    const hotels = list
      .filter(item => item?.group_name === 'hotels')
      .flatMap(
        item =>
          item?.results?.filter(
            (m: any) => !ignorName.some(name => m.city_name?.includes(name)) && !ignorName.some(name => m.name?.includes(name)),
          ) || [],
      );
    return [
      { type: 'countries', title: 'Популярные страны', items: countries },
      { type: 'regions', title: 'Регионы', items: regions },
      { type: 'metaregions', title: 'Мегарегионы', items: metaregions },
      { type: 'hotels', title: 'Отели', items: hotels },
    ].filter(group => group.items.length > 0);
  }, [data]);

  const subtitleFor = (result: DestinationResult, type: string): string | undefined => {
    if (type === 'countries') return result.visa_type || undefined;
    if (type === 'regions') return result.active_regions;
    if (type === 'metaregions') return result.country_name_ru;
    if (type === 'hotels') return result.city_name;
    return undefined;
  };

  const status: 'loading' | 'failed' | 'succeeded' | 'idle' = loading ? 'loading' : error ? 'failed' : data ? 'succeeded' : 'idle';

  return (
    <div className="home-pop">
      <div className="home-pop__head">
        <div className="home-pop__title">{title}</div>
        <button type="button" className="home-pop__close" onClick={onClose} aria-label="Закрыть">
          <CloseIcon size={20} />
        </button>
      </div>
      <div className={'home-pop__search' + (searchQuery.length > 0 ? ' home-pop__search--active' : '')}>
        <Icon name="search" size={20} color="var(--text-tertiary)" />
        <input
          className="home-pop__search-input"
          placeholder="Страна, город, регион или отель"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          autoFocus
        />
        {searchQuery.length > 0 ? (
          <button type="button" className="home-pop__clear" onClick={() => setSearchQuery('')} aria-label="Очистить">
            <CloseIcon size={16} />
          </button>
        ) : null}
      </div>
      <div className="home-pop__list">
        {status === 'loading' ? (
          <div className="home-pop__state">
            <div className="skeleton" style={{ height: 18, width: '70%' }} />
            <div className="skeleton" style={{ height: 18, width: '55%' }} />
            <div className="skeleton" style={{ height: 18, width: '65%' }} />
          </div>
        ) : status === 'failed' ? (
          <div className="home-pop__state">
            <div className="error-text">Ошибка: {error || 'Не удалось загрузить данные'}</div>
          </div>
        ) : groupedResults.length > 0 ? (
          groupedResults.map(group => (
            <div key={group.type} className="home-pop__section">
              <div className="home-pop__section-title">{group.title}</div>
              {group.items.map((result, index) => {
                const name = result.name || (result as any).name_ru || result.name_en || '';
                const subtitle = subtitleFor(result, group.type);
                return (
                  <button
                    type="button"
                    key={`${result.id}-${index}`}
                    className="home-pop__item"
                    onClick={() => {
                      onSelect(result, group.type);
                      onClose();
                    }}>
                    {result.image ? <img className="home-pop__item-img" src={result.image} alt="" /> : null}
                    <span className="home-pop__item-text">
                      <span className="home-pop__item-name">{highlightAllMatches(name, searchQuery)}</span>
                      {subtitle ? <span className="home-pop__item-sub">{subtitle}</span> : null}
                    </span>
                  </button>
                );
              })}
            </div>
          ))
        ) : status === 'succeeded' ? (
          <div className="home-pop__state home-pop__state--empty">
            <EmptyCityIcon size={62} color="var(--brand)" />
            <div className="home-pop__empty-text">
              {searchQuery.trim().length > 0 ? 'По вашему запросу ничего не найдено' : 'Начните вводить название страны или города'}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default DestinationPopover;
