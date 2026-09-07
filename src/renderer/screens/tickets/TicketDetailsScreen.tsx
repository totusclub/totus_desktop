import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@shared/modules/store';
import { transformFlightDetails } from '@shared/utils/ticketsUtils/flightDetailsUtils';
import { extractTourDetails } from '@shared/utils/ticketsUtils/tourDetailsUtils';
import type { FlightDetails, TourDetails } from '@shared/types/tickets';
import { formatMoneyRub, getFlightOfferTotal, getPackageBasePrice, toMoney } from '@shared/utils/packagePrice';
import { useAppNavigation, useRouteParams } from '../../app/navigation';
import { PageHeader } from '../../shell/PageHeader';
import { FlightSegmentView } from './FlightSegmentView';
import { TourSection } from './TourSection';
import './tickets.css';

// Порт component/tickets/ticket/TicketDetails.tsx (iPad-ветка): слева перелёты (туда / пересадка / обратно / инфо),
// справа карточка «Всего за тур» + «Перейти к бронированию» и «Тур».

export type TicketDetailsRouteParams = {
  flightData: any;
  packageInfo: any;
  hotelMeta?: { name?: string; country?: string; city?: string };
  searchContext?: {
    startDate?: string;
    startDateISO?: string;
    nights?: number;
    adults?: number;
    kids?: number;
    kidsAges?: number[];
  };
  totalPrice: number;
  transferDuration?: string;
  searchType?: 'package' | 'hotel';
};

const InfoIcon: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <svg viewBox="0 0 24 24" fill="none" width={size} height={size} style={{ display: 'block', flex: 'none' }} aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
    <path d="M12 11V16.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="12" cy="8" r="1" fill="currentColor" />
  </svg>
);

export const TicketDetailsScreen: React.FC = () => {
  const nav = useAppNavigation();
  const routeParams = useRouteParams<TicketDetailsRouteParams>();
  const { fullAuth, accessToken } = useSelector((state: RootState) => state.auth);
  const { flightData, packageInfo, hotelMeta, searchContext, transferDuration, totalPrice, searchType } = routeParams || {};

  // Transform flight data
  const flightDetails = useMemo<FlightDetails>(() => {
    if (!flightData) return {};
    return transformFlightDetails(flightData);
  }, [flightData]);

  // Extract tour details
  const tourDetails = useMemo<TourDetails | null>(() => {
    if (!packageInfo) return null;
    return extractTourDetails(packageInfo, hotelMeta, {
      startDate: searchContext?.startDate || searchContext?.startDateISO,
      nights: searchContext?.nights,
      adults: searchContext?.adults,
      kids: searchContext?.kids,
      kidsAges: searchContext?.kidsAges,
    });
  }, [packageInfo, hotelMeta, searchContext]);

  const priceBreakdown = useMemo(() => {
    const base = getPackageBasePrice(packageInfo);
    const fees = toMoney(flightData?.fuel_charge);
    const total = toMoney(totalPrice) || getFlightOfferTotal(base, { fuel_charge: fees });
    return {
      total,
      fees,
      totalLabel: formatMoneyRub(total).replace(' ₽', '₽'),
      feesLabel: fees > 0 ? `Доплаты и сборы: +${formatMoneyRub(fees).replace(' ₽', '₽')}` : null,
    };
  }, [packageInfo, flightData, totalPrice]);

  const handleReserve = () => {
    if (!fullAuth || !accessToken) {
      nav.navigate('tab', {
        screen: 'AccountStackScreen',
        params: {
          screen: 'login',
          params: { returnTo: 'ticketDetails', returnParams: routeParams },
        },
      });
      return;
    }
    nav.navigate('booking', {
      flightData,
      packageInfo,
      hotelMeta,
      searchContext: searchContext
        ? {
            startDate: searchContext.startDate || searchContext.startDateISO,
            startDateISO: searchContext.startDateISO || searchContext.startDate,
            nights: searchContext.nights,
            adults: searchContext.adults,
            kids: searchContext.kids,
            kidsAges: searchContext.kidsAges,
          }
        : undefined,
      totalPrice,
      transferDuration,
      searchType: searchType === 'hotel' ? 'hotel' : 'package',
    });
  };

  const showTransfer =
    flightDetails.to && flightDetails.back && flightDetails.to.arrivalAirport.code !== flightDetails.back.departureAirport.code;

  return (
    <>
      <PageHeader title="Детали перелёта и тура" back />
      <div className="page-body">
        <div className="ticket-details">
          <div className="ticket-details__main">
            <div className="ticket-flights">
              {/* Outbound flight */}
              {flightDetails.to ? <FlightSegmentView segment={flightDetails.to} title="Перелёт туда" /> : null}

              {/* Transfer between flights */}
              {showTransfer && flightDetails.to ? (
                <div className="ticket-transfer">
                  <div className="ticket-transfer__head">
                    <span className="ticket-transfer__dot" />
                    <span className="ticket-transfer__title">Пересадка, {flightDetails.to.arrivalAirport.city}</span>
                  </div>
                  {transferDuration ? <span className="ticket-transfer__duration">{transferDuration} обычная пересадка</span> : null}
                </div>
              ) : null}

              {/* Return flight */}
              {flightDetails.back ? <FlightSegmentView segment={flightDetails.back} title="Перелёт обратно" /> : null}

              {/* Info alert */}
              <div className="ticket-info">
                <InfoIcon size={24} />
                <span className="ticket-info__text">Указано местное время, багаж на пассажира</span>
              </div>
            </div>
          </div>

          <aside className="ticket-details__side">
            {/* Порт totalPriceSection: на iPad/десктопе — карточка сверху правой колонки */}
            <div className="ticket-total">
              <div className="ticket-total__row">
                <div className="ticket-total__text">
                  <span className="ticket-total__title">Всего за тур</span>
                  {priceBreakdown.feesLabel ? <span className="ticket-total__fees">{priceBreakdown.feesLabel}</span> : null}
                </div>
                <span className="ticket-total__value">{priceBreakdown.totalLabel}</span>
              </div>
              <button type="button" className="btn btn--block" onClick={handleReserve}>
                Перейти к бронированию
              </button>
            </div>

            {/* Tour section */}
            {tourDetails ? <TourSection tourDetails={tourDetails} /> : null}
          </aside>
        </div>
      </div>
    </>
  );
};

export default TicketDetailsScreen;
