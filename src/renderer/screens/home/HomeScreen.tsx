import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '@shared/modules/store';
import { useLoadHomeData } from '@shared/modules/hooks/loadHomeData';
import { runFullSearchFlow, setHeaderName } from '@shared/modules/store/slices/search';
import { getDefaultStartDate } from '@shared/component/home/searchSection/utils/searchHelpers';
import { buildRecommendedHotelRouteParams } from '@shared/utils/hotelUtils/recommendedHotelNavigation';
import { useAppNavigation } from '../../app/navigation';
import { SearchSection } from './SearchSection';
import { RecommendTripCard, PopularDestinationCard } from './HomeCards';
import { PasscodeModal } from './PasscodeModal';
import './home.css';

// Порт component/home/Home.tsx (+ PlaningTrip, PopularDestinationsList) — Figma «Desktop / Home».

const CardSkeleton: React.FC<{ tall?: boolean }> = ({ tall }) => (
  <div className="home-card-skeleton" aria-hidden="true">
    <div className="skeleton" style={{ height: tall ? 200 : 160, borderRadius: 16 }} />
    {tall ? (
      <>
        <div className="skeleton" style={{ height: 18, width: '70%' }} />
        <div className="skeleton" style={{ height: 14, width: '40%' }} />
      </>
    ) : null}
  </div>
);

/** planingTrip/PlaningTrip — «Начните планирование путешествия здесь», сетка 4 колонки. */
const PlaningTrip: React.FC<{ recommendHotels?: any[] | null; loading: boolean }> = ({ recommendHotels, loading }) => {
  const nav = useAppNavigation();
  const handlePressHotel = useCallback(
    (hotelId: string | number) => {
      if (hotelId == null || hotelId === '') return;
      // Same as kedam_WEB HotDealsSlide → buildHotelDetailsDeepLinkQuery
      const routeParams = buildRecommendedHotelRouteParams(hotelId);
      nav.navigate('hotel', routeParams as unknown as Record<string, unknown>);
    },
    [nav],
  );
  if (!loading && (!recommendHotels || recommendHotels.length === 0)) return null;
  return (
    <section className="home-section">
      <h2 className="section-title">Начните планирование путешествия здесь</h2>
      <div className="grid grid--4">
        {loading && !recommendHotels
          ? [1, 2, 3, 4].map(i => <CardSkeleton key={i} tall />)
          : (recommendHotels || []).map((hotel, index) => (
              <RecommendTripCard key={hotel?.id ?? index} hotel={hotel} onPress={() => handlePressHotel(hotel?.id)} />
            ))}
      </div>
    </section>
  );
};

/** PopularDestinations/PopularDestinationsList — «Популярные направления», сетка 4 колонки. */
const PopularDestinationsList: React.FC<{ popularDestinations?: any[] | null; loading: boolean }> = ({
  popularDestinations,
  loading,
}) => {
  const nav = useAppNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const date = useMemo(() => getDefaultStartDate(), []);

  const handlePressHotel = (item: any) => {
    const searchParams = {
      from_city: 'Moscow',
      from_country: 'RU',
      to_country: item?.to_country,
      to_city: undefined,
      adults: '2',
      start_date: date,
      nights: '7',
      search_type: 'package',
      flex_dates: 0,
      page_number: 1,
      page_limit: 20,
      sort_by: 'relevance',
    };
    // Match kedam-WEB popular destinations: stars only — do not default meal filter to AI.
    const filterParams = {
      filter_instant_confirm: false,
      page_number: 1,
      page_limit: 20,
      sort_by: 'relevance',
      filter_stars: '3,4,5',
    };
    dispatch(setHeaderName(item?.name));
    dispatch(runFullSearchFlow({ searchParams, filterParams }));
    setTimeout(() => {
      nav.navigate('searchResult');
    }, 500);
  };

  if (!loading && (!popularDestinations || popularDestinations.length === 0)) return null;
  return (
    <section className="home-section">
      <h2 className="section-title">Популярные направления</h2>
      <div className="grid grid--4">
        {loading && !popularDestinations
          ? [1, 2, 3, 4].map(i => <CardSkeleton key={i} />)
          : (popularDestinations || []).map((destination, index) => (
              <PopularDestinationCard key={index} destination={destination} handlePressHotel={handlePressHotel} />
            ))}
      </div>
    </section>
  );
};

export const HomeScreen: React.FC = () => {
  const { homeData, loading } = useLoadHomeData();
  const [isPasscodeVerified, setIsPasscodeVerified] = useState(false);
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);

  useEffect(() => {
    let pinCode: string | null = null;
    try {
      pinCode = localStorage.getItem('pinCode');
    } catch {
      pinCode = null;
    }
    if (pinCode !== 'YES') setShowPasscodeModal(true);
    if (pinCode === 'YES') setIsPasscodeVerified(true);
  }, []);

  const handlePasscodeVerified = () => {
    setIsPasscodeVerified(true);
    setShowPasscodeModal(false);
    try {
      localStorage.setItem('pinCode', 'YES');
    } catch {
      // ignore
    }
  };

  return (
    <>
      <PasscodeModal visible={showPasscodeModal} onVerified={handlePasscodeVerified} />
      {isPasscodeVerified ? (
        <div className="home">
          <SearchSection title="Путешествия начинаются здесь" />
          <div className="page-body home__body">
            <PlaningTrip recommendHotels={homeData?.recomendHotels} loading={loading} />
            <PopularDestinationsList popularDestinations={homeData?.popularDestinations} loading={loading} />
          </div>
        </div>
      ) : (
        <div className="home" />
      )}
    </>
  );
};

export default HomeScreen;
