import { useEffect, useState } from 'react';
import { getHomeData } from '../api/levelTravelApi';

export type HomeData = {
  recomendHotels?: any[];
  popularDestinations?: any[];
  [key: string]: unknown;
};

export function useLoadHomeData() {
  const [homeData, setHomeData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await getHomeData();
        if (!cancelled) {
          setHomeData((data as HomeData) || null);
          setError(null);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || 'Failed to load home data');
          setHomeData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { homeData, loading, error };
}

export default useLoadHomeData;
