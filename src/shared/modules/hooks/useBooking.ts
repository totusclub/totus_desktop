import { useState, useEffect, useMemo } from 'react';
import { extractPackageId } from '../../utils/hotelUtils/packageHelpers';
import type { Tourist, BookingRouteParams } from '../../types/booking';
import { PackagesActualize, PackagesActualizeFlight } from '../api/levelTravelApi';
import { isHotelOnlySearch } from '../../utils/bookingFlowUtils';

interface UseBookingReturn {
  packageData: any;
  packageId: number | null;
  flightPairId: number | null | undefined;
  dataLoading: boolean;
  tourists: Tourist[];
  setTourists: (tourists: Tourist[]) => void;
}

export const useBooking = (routeParams: BookingRouteParams): UseBookingReturn => {
  const { flightData, packageInfo, searchContext, searchType } = routeParams || {};

  const [packageData, setPackageData] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState<boolean>(true);
  const [tourists, setTourists] = useState<Tourist[]>([]);

  // Extract package_id and flight_pair_id
  const packageId = useMemo(() => {
    return extractPackageId(packageInfo);
  }, [packageInfo]);

  const flightPairId = useMemo(() => {
    return flightData?.flight_pair_id || flightData?.id;
  }, [flightData]);

  const hotelOnly = isHotelOnlySearch(searchType);

  // Fetch package data
  useEffect(() => {
    if (!packageId) {
      setDataLoading(false);
      return;
    }

    if (flightPairId) {
      setDataLoading(true);
      PackagesActualizeFlight(packageId, flightPairId)
        .then((pkg) => {
          setPackageData((pkg as any)?.package ?? pkg);
          setDataLoading(false);
        })
        .catch(() => {
          setDataLoading(false);
        });
      return;
    }

    if (hotelOnly) {
      setDataLoading(true);
      PackagesActualize(packageId, 'hotel')
        .then((pkg) => {
          setPackageData((pkg as any)?.package ?? pkg);
          setDataLoading(false);
        })
        .catch(() => {
          setDataLoading(false);
        });
      return;
    }

    setPackageData((packageInfo as any)?.package ?? packageInfo ?? null);
    setDataLoading(false);
  }, [packageId, flightPairId, hotelOnly, packageInfo]);

  // Initialize tourists based on package data
  useEffect(() => {
    if (packageData) {
      const allTourists: Tourist[] = [];
      const adultsCount = packageData.adults_count || searchContext?.adults || 0;
      const kidsCount = packageData.kids_count || searchContext?.kids || 0;
      const kidsAges = packageData.kids_ages || searchContext?.kidsAges || [];

      // Add adults
      for (let i = 0; i < adultsCount; i++) {
        allTourists.push({
          gender: 'F',
          name: '',
          surname: '',
          patronymic: '',
          birthday: '',
          passport_number: '',
          passport_expires_on: '',
          nationality_id: 225,
          child: false,
          doc_type: 'international_passport',
          noPatronymic: false,
        });
      }

      // Add kids
      for (let i = 0; i < kidsCount; i++) {
        allTourists.push({
          gender: 'F',
          name: '',
          surname: '',
          patronymic: '',
          birthday: '',
          passport_number: '',
          passport_expires_on: '',
          nationality_id: 225,
          child: true,
          child_age: kidsAges[i],
          doc_type: 'international_passport',
          noPatronymic: false,
        });
      }

      setTourists(allTourists);
    }
  }, [packageData, searchContext]);

  return {
    packageData,
    packageId,
    flightPairId,
    dataLoading,
    tourists,
    setTourists,
  };
};

