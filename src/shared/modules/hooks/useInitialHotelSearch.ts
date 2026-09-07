import { useEffect } from 'react';
import { startSearch } from '../api/levelTravelApi';
import type { SearchParams } from '../../types/search';

export const useInitialHotelSearch = (
  searchParams?: SearchParams,
  localRequestId?: string | null,
  setLocalRequestId?: (requestId: string) => void,
) => {
  useEffect(() => {
    if (localRequestId || !searchParams || !setLocalRequestId) {
      return;
    }

    let isMounted = true;

    const runInitialSearch = async () => {

      try {

        const response = await startSearch(searchParams);
          // console.log('runInitialSearch', response);
        if (isMounted && response?.request_id) {
          setLocalRequestId(response.request_id);
        }
      } catch (error) {
        console.error('Failed to start hotel search from params', error);
      }
    };

    runInitialSearch();

    return () => {
      isMounted = false;
    };
  }, [searchParams, localRequestId, setLocalRequestId]);
};

