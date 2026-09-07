import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '@shared/modules/store';
import { fetchDepartures } from '@shared/modules/store/slices/departures';
import type { Departure } from '@shared/types/departures';
import { Icon } from '../../../icons';
import { CloseIcon } from '../../../components/uiIcons';
import { highlightAllMatches } from '../highlightText';

// Порт home/searchSection/modals/DepartureSelectionModal.

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (departure: Departure) => void;
  title: string;
};

export const DeparturePopover: React.FC<Props> = ({ open, onClose, onSelect, title }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { data, loading, error } = useSelector((state: RootState) => state.departures);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (open) {
      // Как в приложении: при открытии всегда обновляем список
      dispatch(fetchDepartures());
      setSearchQuery('');
    }
  }, [open, dispatch]);

  const filteredDepartures = useMemo<Departure[]>(() => {
    const allDepartures: Departure[] = Array.isArray(data) ? (data as Departure[]) : (data as any)?.departures || [];
    if (!searchQuery.trim()) return allDepartures;
    const query = searchQuery.toLowerCase();
    return allDepartures.filter((departure: any) => {
      const nameRu = String(departure.name_ru || departure.name || '').toLowerCase();
      const nameEn = String(departure.name_en || '').toLowerCase();
      const iata = String(departure.iata || '').toLowerCase();
      return nameRu.includes(query) || nameEn.includes(query) || iata.includes(query);
    });
  }, [data, searchQuery]);

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
          placeholder="Город вылета"
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
        {loading && filteredDepartures.length === 0 ? (
          <div className="home-pop__state">
            <div className="skeleton" style={{ height: 18, width: '70%' }} />
            <div className="skeleton" style={{ height: 18, width: '55%' }} />
            <div className="skeleton" style={{ height: 18, width: '65%' }} />
          </div>
        ) : filteredDepartures.length > 0 ? (
          filteredDepartures.map((item: any, index) => (
            <button
              type="button"
              key={String(item.id ?? item.iata ?? item.name_en ?? item.name ?? index)}
              className="home-pop__item home-pop__item--divider"
              onClick={() => {
                onSelect(item);
                onClose();
              }}>
              <span className="home-pop__item-text">
                <span className="home-pop__item-name">{highlightAllMatches(String(item.name_ru || item.name || ''), searchQuery)}</span>
                {item.name_en && item.name_en !== item.name_ru ? <span className="home-pop__item-sub">{item.name_en}</span> : null}
              </span>
            </button>
          ))
        ) : error ? (
          <div className="home-pop__state">
            <div className="error-text">Ошибка загрузки: {error || 'Неизвестная ошибка'}</div>
          </div>
        ) : searchQuery.trim().length > 0 ? (
          <div className="home-pop__state home-pop__state--empty">
            <div className="home-pop__empty-text">По вашему запросу ничего не найдено</div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default DeparturePopover;
