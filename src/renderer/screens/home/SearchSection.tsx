import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '@shared/modules/store';
import { runFullSearchFlow, setHeaderName, clearSearch } from '@shared/modules/store/slices/search';
import { fetchDepartures } from '@shared/modules/store/slices/departures';
import { fetchDestinations } from '@shared/modules/store/slices/destinations';
import type { DestinationResult } from '@shared/types/destinations';
import type { Departure } from '@shared/types/departures';
import type { SearchParams } from '@shared/types/search';
import {
  getCurrentDate,
  getDefaultOrigin,
  getDefaultDestination,
  convertDateToISO,
  convertISOToDisplay,
  formatTouristsText,
} from '@shared/component/home/searchSection/utils/searchHelpers';
import { buildApiSearchParams, withSearchTypeFilters } from '@shared/utils/searchParamsUtils';
import { useAppNavigation } from '../../app/navigation';
import { Icon } from '../../icons';
import { Popover } from '../../components/Popover';
import { ArrowDownIcon, CalendarIcon, PlaneIcon } from '../../components/uiIcons';
import { DestinationPopover } from './popovers/DestinationPopover';
import { DeparturePopover } from './popovers/DeparturePopover';
import { DatePopover } from './popovers/DatePopover';
import { NightsPopover } from './popovers/NightsPopover';
import { TouristsPopover } from './popovers/TouristsPopover';

// Порт home/searchSection/Search.tsx (+ поля Destination/Origin/Date/Nights/Tourists):
// та же логика состояния, дефолтов и handleSearch; поля — в один ряд, модалки — поповеры.

type Props = { title: string };

const parseDisplayDateToDate = (value: string): Date => {
  const parts = value.split('.');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = 2000 + parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  return new Date();
};

const formatDateToDisplay = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear().toString().slice(-2);
  return `${day}.${month}.${year}`;
};

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

type OpenField = 'destination' | 'origin' | 'date' | 'return' | 'nights' | 'tourists' | null;

/** Поле карточки поиска: подпись, значение, иконка справа (порт *Field.tsx). */
const Field: React.FC<{ label: string; value: string; icon: React.ReactNode; onClick: () => void; active?: boolean }> = ({
  label,
  value,
  icon,
  onClick,
  active,
}) => (
  <button type="button" className={'home-field' + (active ? ' home-field--active' : '')} onClick={onClick}>
    <span className="home-field__label">{label}</span>
    <span className="home-field__row">
      <span className="home-field__value">{value}</span>
      <span className="home-field__icon">{icon}</span>
    </span>
  </button>
);

export const SearchSection: React.FC<Props> = ({ title }) => {
  const nav = useAppNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const { headerName, searchParams: currentSearchParams } = useSelector((state: RootState) => state.search);
  const { data: departuresData } = useSelector((state: RootState) => state.departures);
  const { data: destinationsData } = useSelector((state: RootState) => state.destinations);

  const [origin, setOrigin] = useState<Departure | null>(null);
  const [destination, setDestination] = useState<DestinationResult | null>(null);
  const [destinationType, setDestinationType] = useState<string>('');
  const [departureDate, setDepartureDate] = useState(() =>
    currentSearchParams?.start_date ? convertISOToDisplay(currentSearchParams.start_date) : getCurrentDate(),
  );
  const [nights, setNights] = useState(() => {
    if (currentSearchParams?.nights) {
      const match = currentSearchParams.nights.match(/\d+/);
      return match ? parseInt(match[0], 10) : 7;
    }
    return 7;
  });
  const [returnDate, setReturnDate] = useState(() => {
    const start = parseDisplayDateToDate(
      currentSearchParams?.start_date ? convertISOToDisplay(currentSearchParams.start_date) : getCurrentDate(),
    );
    return formatDateToDisplay(addDays(start, 7));
  });
  const [adults, setAdults] = useState(() => parseInt(currentSearchParams?.adults || '2', 10));
  const [kids, setKids] = useState(() => parseInt(currentSearchParams?.kids || '0', 10));
  const [kidsAges, setKidsAges] = useState<number[]>(() => currentSearchParams?.kids_ages || []);
  const [searchMode, setSearchMode] = useState<'package' | 'hotel'>(() =>
    currentSearchParams?.search_type === 'hotel' ? 'hotel' : 'package',
  );
  const [openField, setOpenField] = useState<OpenField>(null);
  const closeField = useCallback(() => setOpenField(null), []);

  // Sync departureDate with currentSearchParams when returning to search page
  useEffect(() => {
    if (currentSearchParams?.start_date) {
      const displayDate = convertISOToDisplay(currentSearchParams.start_date);
      if (displayDate !== departureDate) setDepartureDate(displayDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSearchParams?.start_date]);

  // Keep nights in sync with selected date range
  useEffect(() => {
    const start = parseDisplayDateToDate(departureDate);
    const end = parseDisplayDateToDate(returnDate);
    const diffMs = end.getTime() - start.getTime();
    const diffDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
    if (diffDays !== nights) setNights(diffDays);
  }, [departureDate, returnDate, nights]);

  const nightsDisplay = useMemo(() => `${nights} ночей`, [nights]);
  const touristsText = useMemo(() => formatTouristsText(adults.toString(), kids.toString()), [adults, kids]);

  // Load departures and destinations on mount
  useEffect(() => {
    dispatch(clearSearch());
    if (!departuresData) dispatch(fetchDepartures());
  }, [dispatch, departuresData]);

  useEffect(() => {
    if (!destinationsData || destinationsData.length === 0) {
      dispatch(fetchDestinations({ query: '', from_city: 'Moscow', search_type: searchMode }));
    }
  }, [dispatch, destinationsData, searchMode]);

  // Default origin (Москва) when departures are loaded
  useEffect(() => {
    if (departuresData && !origin) {
      const defaultOrigin = getDefaultOrigin(departuresData as Departure[]);
      if (defaultOrigin) setOrigin(defaultOrigin);
    }
  }, [departuresData, origin]);

  // Default destination (Египет) when destinations are loaded
  useEffect(() => {
    if (destinationsData && destinationsData.length > 0 && !destination) {
      const defaultDest = getDefaultDestination(destinationsData as any);
      if (defaultDest) {
        setDestination(defaultDest);
        setDestinationType((defaultDest as any).type || (defaultDest as any).group_name || 'countries');
        if (defaultDest.name) dispatch(setHeaderName(defaultDest.name));
      }
    }
  }, [destinationsData, destination, dispatch]);

  const handleDestinationChange = useCallback(
    (item: DestinationResult, type: string) => {
      setDestination(item);
      setDestinationType(type);
      if (item.name) dispatch(setHeaderName(item.name));
    },
    [dispatch],
  );

  const handleTouristsDetailsChange = useCallback((adultsCount: number, childrenCount: number, kidsAgesArray: number[]) => {
    setAdults(adultsCount);
    setKids(childrenCount);
    setKidsAges(kidsAgesArray);
  }, []);

  const handleNightsChange = useCallback(
    (nightsValue: number) => {
      setNights(nightsValue);
      const start = parseDisplayDateToDate(departureDate);
      setReturnDate(formatDateToDisplay(addDays(start, nightsValue)));
    },
    [departureDate],
  );

  const handleDepartureDateChange = useCallback(
    (dateStr: string) => {
      setDepartureDate(dateStr);
      const start = parseDisplayDateToDate(dateStr);
      setReturnDate(formatDateToDisplay(addDays(start, nights)));
    },
    [nights],
  );

  const handleSearch = useCallback(() => {
    // Fallbacks match the placeholder labels shown in the fields
    const effectiveOrigin =
      origin || ({ name: 'Москва', name_ru: 'Москва', name_en: 'Moscow', iso2: 'RU' } as Departure);
    const effectiveDestination = destination || ({ name: 'Египет', name_en: 'Egypt', iso2: 'EG' } as DestinationResult);
    const effectiveDestinationType = destinationType || (destination ? destinationType : 'countries') || 'countries';

    if (searchMode === 'package' && !effectiveOrigin) return;

    const startDateISO = convertDateToISO(departureDate);
    const endDateISO = convertDateToISO(returnDate);
    const nightsValue = nights.toString();

    const isHotelDestination = effectiveDestinationType === 'hotels' && !!(effectiveDestination as any).id;
    const isHotelOnly = searchMode === 'hotel';

    const rawSearchParams: SearchParams = {
      from_city: (effectiveOrigin as any)?.name_en || (effectiveOrigin as any)?.name_ru || effectiveOrigin?.name || 'Moscow',
      from_country: (effectiveOrigin as any)?.iso2 || 'RU',
      to_country: (effectiveDestination as any).iso2 || '',
      to_city: effectiveDestinationType === 'countries' ? undefined : (effectiveDestination as any).name_en || effectiveDestination.name,
      adults: adults.toString(),
      kids: kids > 0 ? kids.toString() : '0',
      kids_ages: kidsAges.length > 0 ? kidsAges : undefined,
      start_date: startDateISO,
      start_date_from: startDateISO,
      end_date_till: endDateISO,
      nights: nightsValue,
      search_type: searchMode,
      // Exact departure date (no ±2) — same as kedam_WEB search form.
      flex_dates: 0,
      hotel_ids: isHotelDestination ? [Number((effectiveDestination as any).id)] : undefined,
      page_number: 1,
      page_limit: 20,
      sort_by: 'relevance',
    };

    const searchParams = buildApiSearchParams(rawSearchParams);

    // Match kedam-WEB: package defaults are stars only — never invent AI meal filter.
    const filterParams = withSearchTypeFilters(searchParams.search_type, {
      filter_instant_confirm: false,
      page_number: 1,
      page_limit: 20,
      sort_by: 'relevance',
      ...(isHotelDestination || isHotelOnly ? {} : { filter_stars: '3,4,5' }),
    });

    if (!headerName && effectiveDestination.name) dispatch(setHeaderName(effectiveDestination.name));

    if (isHotelDestination) {
      nav.navigate('hotel', {
        hotelId: String((effectiveDestination as any).id),
        searchParams,
        searchSnapshot: { startDateISO, nights, adults, kids, kidsAges },
      });
      return;
    }

    console.log('[Search] handleSearch', { searchMode, searchParams, filterParams });

    dispatch(runFullSearchFlow({ searchParams, filterParams }));

    // Navigate immediately so the button never feels stuck behind loading
    nav.navigate('searchResult');
  }, [origin, destination, destinationType, departureDate, returnDate, nights, adults, kids, kidsAges, dispatch, nav, searchMode, headerName]);

  const originLabel = (origin as any)?.name_ru || origin?.name || origin?.name_en || 'Москва';

  return (
    <section className="home-hero">
      <div className="home-hero__inner">
        <h1 className="home-hero__title">{title}</h1>

        <form
          className="home-search card"
          onSubmit={e => {
            e.preventDefault();
            handleSearch();
          }}>
          <div className="home-search__tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={searchMode === 'package'}
              className={'home-search__tab' + (searchMode === 'package' ? ' home-search__tab--active' : '')}
              onClick={() => setSearchMode('package')}>
              <span className="home-search__tab-title">Тур</span>
              <span className="home-search__tab-hint">С перелётом</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={searchMode === 'hotel'}
              className={'home-search__tab' + (searchMode === 'hotel' ? ' home-search__tab--active' : '')}
              onClick={() => setSearchMode('hotel')}>
              <span className="home-search__tab-title">Отель</span>
              <span className="home-search__tab-hint">Без перелёта</span>
            </button>
          </div>

          <div className="home-search__row">
            <Popover
              open={openField === 'destination'}
              onClose={closeField}
              width={420}
              className="home-search__cell home-search__cell--wide"
              anchor={
                <Field
                  label="Страна, город, регион или отель"
                  value={destination?.name || 'Египет'}
                  icon={<ArrowDownIcon size={24} color="var(--text-tertiary)" />}
                  active={openField === 'destination'}
                  onClick={() => setOpenField(openField === 'destination' ? null : 'destination')}
                />
              }>
              <DestinationPopover
                open={openField === 'destination'}
                onClose={closeField}
                onSelect={handleDestinationChange}
                title="Страна, город, регион или отель"
                fromCity={origin?.name_en || (origin as any)?.name_ru || 'Moscow'}
                searchType={searchMode}
              />
            </Popover>

            {searchMode === 'package' ? (
              <Popover
                open={openField === 'origin'}
                onClose={closeField}
                width={360}
                className="home-search__cell"
                anchor={
                  <Field
                    label="Откуда?"
                    value={originLabel}
                    icon={<PlaneIcon size={24} color="var(--text-tertiary)" />}
                    active={openField === 'origin'}
                    onClick={() => {
                      if (!departuresData) dispatch(fetchDepartures());
                      setOpenField(openField === 'origin' ? null : 'origin');
                    }}
                  />
                }>
                <DeparturePopover open={openField === 'origin'} onClose={closeField} onSelect={setOrigin} title="Город вылета" />
              </Popover>
            ) : null}

            <Popover
              open={openField === 'date'}
              onClose={closeField}
              width={340}
              className="home-search__cell"
              anchor={
                <Field
                  label={searchMode === 'hotel' ? 'Дата заезда' : 'Дата вылета'}
                  value={departureDate}
                  icon={<CalendarIcon size={24} color="var(--text-tertiary)" />}
                  active={openField === 'date'}
                  onClick={() => setOpenField(openField === 'date' ? null : 'date')}
                />
              }>
              <DatePopover
                open={openField === 'date'}
                onClose={closeField}
                onSelect={date => handleDepartureDateChange(formatDateToDisplay(date))}
                title="Выберите дату"
                initialDate={parseDisplayDateToDate(departureDate)}
              />
            </Popover>

            <Popover
              open={openField === 'return'}
              onClose={closeField}
              width={340}
              className="home-search__cell"
              anchor={
                <Field
                  label="Дата возвращения"
                  value={returnDate}
                  icon={<CalendarIcon size={24} color="var(--text-tertiary)" />}
                  active={openField === 'return'}
                  onClick={() => setOpenField(openField === 'return' ? null : 'return')}
                />
              }>
              <DatePopover
                open={openField === 'return'}
                onClose={closeField}
                onSelect={date => setReturnDate(formatDateToDisplay(date))}
                title="Выберите дату"
                initialDate={parseDisplayDateToDate(returnDate)}
              />
            </Popover>

            <Popover
              open={openField === 'nights'}
              onClose={closeField}
              width={340}
              className="home-search__cell"
              anchor={
                <Field
                  label="Количество ночей"
                  value={nightsDisplay}
                  icon={<Icon name="moon" size={24} color="var(--text-tertiary)" />}
                  active={openField === 'nights'}
                  onClick={() => setOpenField(openField === 'nights' ? null : 'nights')}
                />
              }>
              <NightsPopover open={openField === 'nights'} onClose={closeField} onSelect={handleNightsChange} initialNights={nights} />
            </Popover>

            <Popover
              open={openField === 'tourists'}
              onClose={closeField}
              width={380}
              align="right"
              className="home-search__cell home-search__cell--last"
              anchor={
                <Field
                  label="Туристы"
                  value={touristsText}
                  icon={<Icon name="orders" size={24} color="var(--text-tertiary)" />}
                  active={openField === 'tourists'}
                  onClick={() => setOpenField(openField === 'tourists' ? null : 'tourists')}
                />
              }>
              <TouristsPopover
                open={openField === 'tourists'}
                onClose={closeField}
                onSelect={handleTouristsDetailsChange}
                initialAdults={adults}
                initialChildren={kids}
                initialKidsAges={kidsAges}
              />
            </Popover>

            <div className="home-search__submit">
              <button type="submit" className="btn">
                <Icon name="search" size={20} />
                Найти
              </button>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
};

export default SearchSection;
