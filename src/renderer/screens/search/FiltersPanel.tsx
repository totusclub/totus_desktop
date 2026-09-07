import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '@shared/modules/store';
import { searchFilters, setAllMyHotels } from '@shared/modules/store/slices/search';
import { withSearchTypeFilters } from '@shared/utils/searchParamsUtils';
import {
  WIFI_LABELS,
  BEACH_SURFACE_LABELS,
  BEACH_TYPE_LABELS,
  CATEGORY_LABELS,
  CONFIRMABILITY_LABELS,
  AMENITY_FILTERS,
  LIST_FILTER_PARAM_KEYS,
  parseCsv,
  selectedFromApi,
  starLabel,
  formatOptionMeta,
  mapFacetOptions,
  hotelsWord,
} from '@shared/component/searchResult/modals/filterConstants';
import { RangeSlider } from '../../components/RangeSlider';
import { CheckmarkIcon } from '../../components/uiIcons';

// Порт searchResult/modals/FiltersModalContent (variant «sidebar») — постоянная панель фильтров слева.

type FilterState = {
  quickConfirmation: boolean;
  priceMin: number;
  priceMax: number;
  accommodationTypes: string[];
  meals: string[];
  stars: string[];
  regions: string[];
  beachLine: string[];
  providers: string[];
  rating: string[];
  wifi: string[];
  beachSurface: string[];
  beachType: string[];
  category: string[];
  confirmability: string[];
  amenities: string[];
};

type Option = { label: string; value: string; meta?: string; count?: number; disabled?: boolean };

type Props = { resultCount?: number };

export const FiltersPanel: React.FC<Props> = ({ resultCount }) => {
  const dispatch = useDispatch<AppDispatch>();
  const hotels = useSelector((state: RootState) => state.search.hotels);
  const searchType = useSelector((state: RootState) => state.search.searchParams?.search_type);
  const apiFilters = hotels?.filters;
  const requestId = hotels?.request_id;

  const priceBounds = useMemo(() => {
    const min = Number(apiFilters?.prices?.min ?? hotels?.statistics?.shown_min_price ?? 0);
    const max = Number(apiFilters?.prices?.max ?? hotels?.statistics?.shown_max_price ?? min);
    return { min, max: max >= min ? max : min };
  }, [apiFilters?.prices?.min, apiFilters?.prices?.max, hotels?.statistics]);

  const buildInitialFilters = useCallback((): FilterState => {
    const pick = (applied: string | number | boolean | undefined | null, fromSelected: string[]): string[] => {
      if (applied !== undefined && applied !== null) return parseCsv(applied);
      return fromSelected;
    };
    const priceMin =
      hotels?.filter_price_min !== undefined && hotels?.filter_price_min !== null ? Number(hotels.filter_price_min) : priceBounds.min;
    const priceMax =
      hotels?.filter_price_max !== undefined && hotels?.filter_price_max !== null ? Number(hotels.filter_price_max) : priceBounds.max;
    const amenities: string[] = [];
    for (const a of AMENITY_FILTERS) {
      const applied = hotels?.[a.apiKey];
      if (applied === true || applied === 'true') {
        amenities.push(a.key);
        continue;
      }
      const facet = apiFilters?.[a.key];
      const trueOpt = Array.isArray(facet) ? facet.find((x: any) => x?.id === true || x?.id === 'true') : null;
      if (trueOpt?.selected) amenities.push(a.key);
    }
    return {
      quickConfirmation: Boolean(hotels?.filter_instant_confirm),
      priceMin: Number.isFinite(priceMin) ? priceMin : priceBounds.min,
      priceMax: Number.isFinite(priceMax) ? priceMax : priceBounds.max,
      accommodationTypes: pick(hotels?.filter_hotel_type, selectedFromApi(apiFilters?.hotel_type)),
      meals: pick(hotels?.filter_meals, selectedFromApi(apiFilters?.meals)),
      stars: pick(hotels?.filter_stars, selectedFromApi(apiFilters?.stars)).filter(id => id !== '0'),
      regions: pick(hotels?.filter_regions, selectedFromApi(apiFilters?.regions)),
      beachLine: pick(hotels?.filter_line, selectedFromApi(apiFilters?.line)),
      providers: pick(hotels?.filter_operators, selectedFromApi(apiFilters?.operators)),
      rating: pick(hotels?.filter_rating, selectedFromApi(apiFilters?.rating)),
      wifi: pick(hotels?.filter_wifi, selectedFromApi(apiFilters?.wifi)),
      beachSurface: pick(hotels?.filter_beach_surface, selectedFromApi(apiFilters?.beach_surface)),
      beachType: pick(hotels?.filter_beach_type, selectedFromApi(apiFilters?.beach_type)),
      category: pick(hotels?.filter_category, selectedFromApi(apiFilters?.category)),
      confirmability: pick(hotels?.filter_confirmability, selectedFromApi(apiFilters?.confirmability)),
      amenities,
    };
  }, [hotels, apiFilters, priceBounds.min, priceBounds.max]);

  const [filters, setFilters] = useState<FilterState>(buildInitialFilters);

  const appliedFiltersKey = useMemo(() => {
    if (!hotels) return '';
    return LIST_FILTER_PARAM_KEYS.map(key => `${key}:${String((hotels as any)[key] ?? '')}`).join('|');
  }, [hotels]);
  const syncedFiltersKeyRef = useRef<string | null>(null);

  // Sync draft only when applied list filters / request change.
  useEffect(() => {
    const key = `${requestId ?? ''}|${appliedFiltersKey}`;
    if (syncedFiltersKeyRef.current === key) return;
    syncedFiltersKeyRef.current = key;
    setFilters(buildInitialFilters());
  }, [requestId, appliedFiltersKey, buildInitialFilters]);

  const accommodationOptions = useMemo(() => mapFacetOptions(apiFilters?.hotel_type, (h: any) => h.name || String(h.id)), [apiFilters?.hotel_type]);
  const mealsOptions = useMemo(() => mapFacetOptions(apiFilters?.meals, (m: any) => m.name || String(m.id)), [apiFilters?.meals]);
  const starOptions = useMemo(
    () => mapFacetOptions((apiFilters?.stars || []).filter((s: any) => String(s.id) !== '0'), (s: any) => starLabel(s.id)),
    [apiFilters?.stars],
  );
  const regionsOptions = useMemo(() => mapFacetOptions(apiFilters?.regions, (r: any) => r.name || String(r.id)), [apiFilters?.regions]);
  const beachLineOptions = useMemo(() => mapFacetOptions(apiFilters?.line, (l: any) => `${l.id}-я линия`), [apiFilters?.line]);
  const providerOptions = useMemo(() => mapFacetOptions(apiFilters?.operators, (o: any) => o.name || String(o.id)), [apiFilters?.operators]);
  const ratingOptions = useMemo(() => mapFacetOptions(apiFilters?.rating, (r: any) => `от ${r.id}`), [apiFilters?.rating]);
  const wifiOptions = useMemo(
    () => mapFacetOptions(apiFilters?.wifi, (w: any) => WIFI_LABELS[String(w.id)] || w.name || String(w.id)),
    [apiFilters?.wifi],
  );
  const beachSurfaceOptions = useMemo(
    () => mapFacetOptions(apiFilters?.beach_surface, (b: any) => BEACH_SURFACE_LABELS[String(b.id)] || b.name || String(b.id)),
    [apiFilters?.beach_surface],
  );
  const beachTypeOptions = useMemo(
    () => mapFacetOptions(apiFilters?.beach_type, (b: any) => BEACH_TYPE_LABELS[String(b.id)] || b.name || String(b.id)),
    [apiFilters?.beach_type],
  );
  const categoryOptions = useMemo(
    () => mapFacetOptions(apiFilters?.category, (c: any) => CATEGORY_LABELS[String(c.id)] || c.name || String(c.id)),
    [apiFilters?.category],
  );
  const confirmabilityOptions = useMemo(
    () => mapFacetOptions(apiFilters?.confirmability, (c: any) => CONFIRMABILITY_LABELS[String(c.id)] || c.name || String(c.id)),
    [apiFilters?.confirmability],
  );
  const amenityOptions = useMemo<Option[]>(() => {
    return AMENITY_FILTERS.filter(a => {
      const facet = apiFilters?.[a.key];
      if (!Array.isArray(facet) || facet.length === 0) return false;
      const trueOpt = facet.find((x: any) => x?.id === true || String(x?.id) === 'true');
      return trueOpt && !trueOpt.disabled;
    }).map(a => {
      const facet = apiFilters?.[a.key] || [];
      const trueOpt = facet.find((x: any) => x?.id === true || String(x?.id) === 'true');
      const meta = formatOptionMeta(trueOpt || {});
      return {
        label: a.label,
        meta,
        count: trueOpt?.hotel_count != null ? Number(trueOpt.hotel_count) : undefined,
        value: a.key,
        disabled: false,
      };
    });
  }, [apiFilters]);

  const hasPriceFilter = !!apiFilters?.prices && priceBounds.max >= priceBounds.min;

  const toggleInList = (key: keyof FilterState, value: string) => {
    setFilters(prev => {
      const list = prev[key];
      if (!Array.isArray(list)) return prev;
      const next = list.includes(value) ? list.filter(item => item !== value) : [...list, value];
      return { ...prev, [key]: next };
    });
  };

  const handleResetLocal = () => {
    const availableStars = (apiFilters?.stars || []).map((s: any) => String(s.id)).filter((id: string) => id && id !== '0');
    setFilters({
      quickConfirmation: false,
      priceMin: priceBounds.min,
      priceMax: priceBounds.max,
      accommodationTypes: [],
      meals: [],
      stars: availableStars,
      regions: [],
      beachLine: [],
      providers: [],
      rating: [],
      wifi: [],
      beachSurface: [],
      beachType: [],
      category: [],
      confirmability: [],
      amenities: [],
    });
  };

  const handleApply = () => {
    if (!hotels?.request_id || !hotels?.readyOperators) return;
    const filterParams: Record<string, unknown> = {
      request_id: hotels.request_id,
      readyOperators: hotels.readyOperators,
      page_number: 1,
      page_limit: 20,
      sort_by: hotels.sort_by || 'relevance',
      filter_instant_confirm: filters.quickConfirmation,
      filter_price_min: filters.priceMin,
      filter_price_max: filters.priceMax,
      filter_hotel_type: filters.accommodationTypes.join(','),
      filter_meals: filters.meals.join(','),
      filter_stars: filters.stars.join(','),
      filter_regions: filters.regions.join(','),
      filter_line: filters.beachLine.join(','),
      filter_operators: filters.providers.join(','),
      filter_rating: filters.rating.join(','),
      filter_wifi: filters.wifi.join(','),
      filter_beach_surface: filters.beachSurface.join(','),
      filter_beach_type: filters.beachType.join(','),
      filter_category: filters.category.join(','),
      filter_confirmability: filters.confirmability.join(','),
    };
    for (const a of AMENITY_FILTERS) {
      filterParams[a.apiKey] = filters.amenities.includes(a.key) ? true : '';
    }
    dispatch(setAllMyHotels([]));
    dispatch(searchFilters(withSearchTypeFilters(searchType || hotels?.search_type, filterParams) as any));
  };

  /** Строка-чекбокс с количеством отелей справа (Figma). */
  const renderCheckRows = (options: Option[], selected: string[], stateKey: keyof FilterState) => (
    <div className="search-filters__rows">
      {options.map(option => {
        const isSelected = selected.includes(option.value);
        return (
          <button
            type="button"
            key={option.value}
            disabled={option.disabled}
            onClick={() => toggleInList(stateKey, option.value)}
            className={'search-filters__row' + (option.disabled ? ' search-filters__row--disabled' : '')}
            aria-pressed={isSelected}>
            <span className={'checkbox' + (isSelected ? ' checkbox--on' : '')}>{isSelected ? <CheckmarkIcon size={14} /> : null}</span>
            <span className="search-filters__row-label">{option.label}</span>
            {option.count != null ? <span className="search-filters__row-count">{option.count}</span> : null}
          </button>
        );
      })}
    </div>
  );

  const renderSection = (title: string, options: Option[], selected: string[], stateKey: keyof FilterState) => {
    if (!options.length) return null;
    return (
      <div className="search-filters__section">
        <div className="search-filters__section-title">{title}</div>
        {renderCheckRows(options, selected, stateKey)}
      </div>
    );
  };

  const count = resultCount ?? hotels?.hotels_count ?? 0;

  return (
    <div className="search-filters">
      <div className="search-filters__head">
        <div className="search-filters__title">Фильтры</div>
        <button type="button" className="link search-filters__reset" onClick={handleResetLocal}>
          Сбросить
        </button>
      </div>
      {hasPriceFilter ? (
        <div className="search-filters__section">
          <RangeSlider
            label="Цена за тур"
            min={filters.priceMin}
            max={filters.priceMax}
            minValue={priceBounds.min}
            maxValue={priceBounds.max}
            onMinChange={value => setFilters(prev => ({ ...prev, priceMin: value }))}
            onMaxChange={value => setFilters(prev => ({ ...prev, priceMax: value }))}
          />
        </div>
      ) : null}
      {renderSection('Звёзды', starOptions, filters.stars, 'stars')}
      {renderSection('Питание', mealsOptions, filters.meals, 'meals')}
      {renderSection('Линия пляжа', beachLineOptions, filters.beachLine, 'beachLine')}
      {renderSection('Удобства', amenityOptions, filters.amenities, 'amenities')}
      {renderSection('Тип размещения', accommodationOptions, filters.accommodationTypes, 'accommodationTypes')}
      {renderSection('Регион', regionsOptions, filters.regions, 'regions')}
      {renderSection('Рейтинг', ratingOptions, filters.rating, 'rating')}
      {renderSection('Туроператор', providerOptions, filters.providers, 'providers')}
      {renderSection('Wi-Fi', wifiOptions, filters.wifi, 'wifi')}
      {renderSection('Покрытие пляжа', beachSurfaceOptions, filters.beachSurface, 'beachSurface')}
      {renderSection('Тип пляжа', beachTypeOptions, filters.beachType, 'beachType')}
      {renderSection('Категория', categoryOptions, filters.category, 'category')}
      {renderSection('Подтверждение', confirmabilityOptions, filters.confirmability, 'confirmability')}
      <div className="search-filters__section">
        <button
          type="button"
          className="search-filters__toggle"
          onClick={() => setFilters(prev => ({ ...prev, quickConfirmation: !prev.quickConfirmation }))}>
          <span className="search-filters__toggle-label">Быстрое подтверждение</span>
          <span className={'toggle' + (filters.quickConfirmation ? ' toggle--on' : '')} aria-hidden="true" />
        </button>
      </div>
      <button type="button" className="btn btn--block" onClick={handleApply}>
        {`Показать ${count} ${hotelsWord(count)}`}
      </button>
    </div>
  );
};

/** Скелетон панели фильтров (FiltersSidebarTablet, пока нет фасетов). */
export const FiltersPanelSkeleton: React.FC = () => (
  <div className="search-filters search-filters--skeleton" aria-hidden="true">
    {[
      [90, 22],
      [120, 16],
      [232, 24],
      [70, 16],
      [200, 18],
      [200, 18],
      [200, 18],
      [80, 16],
      [200, 18],
      [200, 18],
      [232, 48],
    ].map(([w, h], i) => (
      <div key={i} className="skeleton" style={{ width: w, maxWidth: '100%', height: h, borderRadius: h >= 48 ? 24 : 8 }} />
    ))}
  </div>
);

export default FiltersPanel;
