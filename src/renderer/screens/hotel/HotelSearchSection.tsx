import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@shared/modules/store';
import { startSearch } from '@shared/modules/api/levelTravelApi';
import {
  getCurrentDate,
  convertDateToISO,
  convertISOToDisplay,
  formatDateForAPI,
  formatTouristsText,
} from '@shared/component/home/searchSection/utils/searchHelpers';
import type { SearchParams } from '@shared/types/search';
import type { ApiHotelData, HotelSearchSnapshot } from '@shared/types/hotel';
import { buildApiSearchParams } from '@shared/utils/searchParamsUtils';
import { Icon } from '../../icons';
import { Popover } from '../../components/Popover';
import { CalendarIcon } from '../../components/uiIcons';
import { DatePopover } from '../home/popovers/DatePopover';
import { NightsPopover } from '../home/popovers/NightsPopover';
import { TouristsPopover } from '../home/popovers/TouristsPopover';
// Поповеры полей (home-pop*, home-field*) стилизуются в home.css — подключаем, чтобы отель работал и по прямой ссылке.
import '../home/home.css';

// Порт hotel/HotelSearchSection.tsx (+ modules/hooks/useSearchParamsSync): та же логика buildSearchParams /
// handleSearch / debounce / автозапуск по mountSearchSignature; поля — поповеры вместо модалок RN.

type SearchParamsState = {
  departureDate: string; // Display format: "DD.MM.YY"
  nights: number;
  adults: number;
  kids: number;
  kidsAges: number[];
};

type Props = {
  hotelId: string | null;
  apiHotelData?: ApiHotelData | null;
  onSearchComplete?: (requestId: string) => void;
  onSearchingChange?: (searching: boolean) => void;
  onSearchSettled?: () => void;
  onParamsChange?: (snapshot: HotelSearchSnapshot) => void;
  initialSearchParams?: SearchParams | null;
  /** Уникален для hotelId + параметров навигации; один запуск того же запроса, что по «Найти», после появления блока формы. */
  mountSearchSignature: string;
  /** Уже есть request_id листинга (Redux/local) для этого перехода — не дублировать автозапуск. */
  skipAutoMountSearch?: boolean;
};

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

/** Hook to sync local search params state with source params (порт useSearchParamsSync). */
const useSearchParamsSync = (
  sourceParams: SearchParams | null | undefined,
  setParams: React.Dispatch<React.SetStateAction<SearchParamsState>>,
) => {
  useEffect(() => {
    if (!sourceParams) return;

    const displayDate = sourceParams.start_date ? convertISOToDisplay(sourceParams.start_date) : null;
    const nightsValue = sourceParams.nights
      ? parseInt(String(sourceParams.nights).replace(/[^0-9]/g, ''), 10) || 7
      : null;
    const adultsValue = sourceParams.adults ? parseInt(sourceParams.adults, 10) : null;
    const kidsValue = sourceParams.kids ? parseInt(sourceParams.kids, 10) : null;
    const kidsAgesValue = sourceParams.kids_ages || null;

    setParams(prev => {
      const updates: Partial<SearchParamsState> = {};
      let hasChanges = false;

      if (displayDate && prev.departureDate !== displayDate) {
        updates.departureDate = displayDate;
        hasChanges = true;
      }
      if (nightsValue !== null && prev.nights !== nightsValue) {
        updates.nights = nightsValue;
        hasChanges = true;
      }
      if (adultsValue !== null && prev.adults !== adultsValue) {
        updates.adults = adultsValue;
        hasChanges = true;
      }
      if (kidsValue !== null && prev.kids !== kidsValue) {
        updates.kids = kidsValue;
        hasChanges = true;
      }
      if (kidsAgesValue !== null && JSON.stringify(prev.kidsAges) !== JSON.stringify(kidsAgesValue)) {
        updates.kidsAges = kidsAgesValue;
        hasChanges = true;
      }

      return hasChanges ? { ...prev, ...updates } : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceParams?.start_date, sourceParams?.nights, sourceParams?.adults, sourceParams?.kids, sourceParams?.kids_ages, setParams]);
};

type OpenField = 'date' | 'nights' | 'tourists' | null;

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

export const HotelSearchSection: React.FC<Props> = ({
  hotelId,
  apiHotelData,
  onSearchComplete,
  onSearchingChange,
  onSearchSettled,
  onParamsChange,
  initialSearchParams,
  mountSearchSignature,
  skipAutoMountSearch = false,
}) => {
  const { searchParams: currentSearchParams } = useSelector((state: RootState) => state.search);

  const [isSearching, setIsSearching] = useState(false);
  const [openField, setOpenField] = useState<OpenField>(null);
  const closeField = useCallback(() => setOpenField(null), []);

  useEffect(() => {
    onSearchingChange?.(isSearching);
  }, [isSearching, onSearchingChange]);

  // Prefer initialSearchParams (from route/AI chat) over Redux
  const sourceParams = initialSearchParams || currentSearchParams;

  // Initialize state from initialSearchParams (route), Redux searchParams, or defaults
  const [params, setParams] = useState<SearchParamsState>(() => {
    const nightsValue = sourceParams?.nights ? parseInt(String(sourceParams.nights).replace(/[^0-9]/g, ''), 10) || 7 : 7;
    return {
      departureDate: sourceParams?.start_date ? convertISOToDisplay(sourceParams.start_date) : getCurrentDate(),
      nights: nightsValue,
      adults: parseInt(sourceParams?.adults || '2', 10),
      kids: parseInt(sourceParams?.kids || '0', 10),
      kidsAges: sourceParams?.kids_ages || [],
    };
  });

  // Sync params with sourceParams when they change externally
  useSearchParamsSync(sourceParams, setParams);

  const nightsDisplay = useMemo(() => `${params.nights} ночей`, [params.nights]);
  const touristsText = useMemo(
    () => formatTouristsText(params.adults.toString(), params.kids.toString()),
    [params.adults, params.kids],
  );

  const updateParams = (updates: Partial<SearchParamsState>) => {
    setParams(prev => ({ ...prev, ...updates }));
  };

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  /** Дата / ночи / туристы задаются осознанно — после изменения ставим новый поиск с debounce. */
  const scheduleNewSearchRef = useRef<() => void>(() => {});
  const handleSearchLatestRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, []);

  const handleNightsChange = (nightsString: string) => {
    // Handle ranges like "7..10" or "7-8", extract first number
    const cleaned = nightsString.includes('..') ? nightsString.split('..')[0].replace(/\D/g, '') : nightsString.replace(/\D/g, '');
    const nightsValue = cleaned ? parseInt(cleaned, 10) : 7;
    updateParams({ nights: nightsValue });
    scheduleNewSearchRef.current();
  };

  const handleTouristsDetailsChange = (adultsCount: number, childrenCount: number, kidsAgesArray: number[]) => {
    updateParams({ adults: adultsCount, kids: childrenCount, kidsAges: kidsAgesArray });
    scheduleNewSearchRef.current();
  };

  const buildSearchParams = (): SearchParams | null => {
    // Validate required parameters before building
    if (!params.departureDate || params.nights <= 0 || params.adults < 1) return null;

    const parsedHotelId = hotelId ? parseInt(hotelId, 10) : null;
    if (!parsedHotelId || isNaN(parsedHotelId)) return null;

    // Convert departureDate (display format) to ISO format
    const startDateISO = convertDateToISO(params.departureDate);
    const startDateObj = new Date(startDateISO);

    // Calculate end date
    const endDateObj = new Date(startDateObj);
    endDateObj.setDate(endDateObj.getDate() + params.nights);

    // Safely access hotel country and city from API data
    const hotelCountry = apiHotelData?.country;
    const hotelCity = apiHotelData?.city;
    // Prefer hotel API destination when opening a specific hotel (home recommendations).
    // Hardcoded listing to_city/to_country must not override the real hotel location.
    const targetingThisHotel = Boolean(parsedHotelId);
    const resolvedToCountry = targetingThisHotel
      ? hotelCountry?.iso2 || (hotelCountry as { country_iso2?: string } | undefined)?.country_iso2 || sourceParams?.to_country || ''
      : sourceParams?.to_country || hotelCountry?.iso2 || (hotelCountry as { country_iso2?: string } | undefined)?.country_iso2 || '';

    const rawSearchParams: SearchParams = {
      from_city: sourceParams?.from_city || 'Moscow',
      from_country: sourceParams?.from_country || 'RU',
      to_country: resolvedToCountry,
      to_city: targetingThisHotel
        ? hotelCity?.name_en || hotelCity?.name_ru || sourceParams?.to_city || undefined
        : sourceParams?.to_city || hotelCity?.name_en || hotelCity?.name_ru || undefined,
      search_type: sourceParams?.search_type || 'package',
      // Match kedam-WEB hotel details: fixed departure date (no ±2 flex).
      flex_dates: 0,
      start_date: startDateISO,
      start_date_from: startDateISO,
      end_date_till: formatDateForAPI(endDateObj),
      nights: params.nights.toString(),
      adults: params.adults.toString(),
      kids: params.kids > 0 ? params.kids.toString() : '0',
      kids_ages: params.kidsAges.length > 0 ? params.kidsAges : undefined,
      hotel_ids: [parsedHotelId],
      page_number: 1,
      page_limit: 20,
      sort_by: 'relevance',
    };

    if (sourceParams?.filter_meals) rawSearchParams.filter_meals = sourceParams.filter_meals;
    if (sourceParams?.filter_price_max) rawSearchParams.filter_price_max = sourceParams.filter_price_max;

    const searchParams = buildApiSearchParams(rawSearchParams);

    const targetingHotel = Array.isArray(searchParams.hotel_ids) && searchParams.hotel_ids.length > 0;
    const isHotelOnly = searchParams.search_type === 'hotel';

    if (
      (!isHotelOnly && !rawSearchParams.from_city) ||
      (!isHotelOnly && !rawSearchParams.from_country) ||
      (!searchParams.to_country && !targetingHotel) ||
      !searchParams.start_date ||
      !searchParams.nights ||
      !searchParams.adults ||
      !searchParams.search_type
    ) {
      return null;
    }

    return searchParams;
  };

  useEffect(() => {
    const startDateISO = convertDateToISO(params.departureDate);
    onParamsChange?.({
      startDateISO,
      nights: params.nights,
      adults: params.adults,
      kids: params.kids,
      kidsAges: params.kidsAges,
    });
  }, [params, onParamsChange]);

  const handleSearch = async () => {
    const searchParams = buildSearchParams();
    if (!searchParams) {
      // Invalid params — still mark settled so rooms section does not spin forever.
      onSearchSettled?.();
      return;
    }

    try {
      setIsSearching(true);
      const response = await startSearch(searchParams);

      // Match kedam-WEB: hand off request_id immediately. Rooms hook polls
      // /search-status and loads rooms progressively as operators finish.
      if (response.request_id && onSearchComplete) {
        onSearchComplete(response.request_id);
      }
    } catch (error) {
      console.error('Error starting local search:', error);
    } finally {
      setIsSearching(false);
      onSearchSettled?.();
    }
  };

  handleSearchLatestRef.current = handleSearch;

  scheduleNewSearchRef.current = () => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      void handleSearchLatestRef.current();
    }, 400);
  };

  const autoMountRanForSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    if (skipAutoMountSearch || !hotelId || !mountSearchSignature) return;
    if (autoMountRanForSignatureRef.current === mountSearchSignature) return;
    autoMountRanForSignatureRef.current = mountSearchSignature;
    scheduleNewSearchRef.current();
  }, [skipAutoMountSearch, hotelId, mountSearchSignature]);

  return (
    <form
      className="hotel-search"
      onSubmit={e => {
        e.preventDefault();
        void handleSearch();
      }}>
      <div className="hotel-search__card">
        {/* Date and Nights Row */}
        <div className="hotel-search__row">
          <Popover
            open={openField === 'date'}
            onClose={closeField}
            width={340}
            className="hotel-search__cell hotel-search__cell--date"
            anchor={
              <Field
                label="Дата вылета"
                value={params.departureDate}
                icon={<CalendarIcon size={24} color="var(--text-tertiary)" />}
                active={openField === 'date'}
                onClick={() => setOpenField(openField === 'date' ? null : 'date')}
              />
            }>
            <DatePopover
              open={openField === 'date'}
              onClose={closeField}
              onSelect={date => {
                updateParams({ departureDate: formatDateToDisplay(date) });
                scheduleNewSearchRef.current();
              }}
              title="Выберите дату"
              initialDate={parseDisplayDateToDate(params.departureDate)}
            />
          </Popover>
          <Popover
            open={openField === 'nights'}
            onClose={closeField}
            width={340}
            align="right"
            className="hotel-search__cell hotel-search__cell--nights"
            anchor={
              <Field
                label="Количество ночей"
                value={nightsDisplay}
                icon={<Icon name="moon" size={24} color="var(--text-tertiary)" />}
                active={openField === 'nights'}
                onClick={() => setOpenField(openField === 'nights' ? null : 'nights')}
              />
            }>
            <NightsPopover
              open={openField === 'nights'}
              onClose={closeField}
              onSelect={nights => handleNightsChange(String(nights))}
              initialNights={params.nights}
            />
          </Popover>
        </div>

        {/* Tourists Field */}
        <Popover
          open={openField === 'tourists'}
          onClose={closeField}
          width={380}
          className="hotel-search__cell--tourists"
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
            initialAdults={params.adults}
            initialChildren={params.kids}
            initialKidsAges={params.kidsAges}
          />
        </Popover>
      </div>

      {/* Search Button */}
      <button type="submit" className="btn btn--block" disabled={isSearching}>
        {isSearching ? <span className="hotel-spinner hotel-spinner--sm" style={{ borderTopColor: '#fff' }} /> : <Icon name="search" size={20} />}
        Найти
      </button>
    </form>
  );
};

export default HotelSearchSection;
