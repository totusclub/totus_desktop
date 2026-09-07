import { useState, useEffect } from 'react';
import { get } from '../axios';
import { HotelInfo } from '../../component/UI';
import type { ApiHotelData } from '../../types/hotel';
import { transformApiHotelToHotelInfo } from './useHotelTransformers';

type HotelDetailsResponse = {
  success: boolean;
  hotels: Array<{
    id: number;
    name: string;
    stars?: number;
    rating?: number;
    address?: string;
    images?: Array<any>;
    features?: any;
    price?: number;
    [key: string]: any;
  }>;
};

export const useHotelDetails = (
  hotelId: string | null,
  searchType: 'package' | 'hotel' = 'package',
) => {
  const [apiHotelData, setApiHotelData] = useState<ApiHotelData | null>(null);
  const [hotel, setHotel] = useState<HotelInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHotelData = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!hotelId) {
          console.warn('Invalid hotel ID');
          setLoading(false);
          return;
        }

        const parsedHotelId = parseInt(hotelId, 10);
        if (isNaN(parsedHotelId)) {
          console.warn('Invalid hotel ID');
          setLoading(false);
          return;
        }

        const params = {
          hotel_ids: parsedHotelId,
          search_type: searchType,
        };

        const response = await get<HotelDetailsResponse>('/references/hotels', params);

        if (response.data.success && response.data.hotels && response.data.hotels.length > 0) {
          const apiHotel = response.data.hotels[0];
          setApiHotelData(apiHotel);
          const transformedHotel = transformApiHotelToHotelInfo(apiHotel);
          setHotel(transformedHotel);
        } else {
          setError('Hotel not found');
        }
      } catch (err: any) {
        console.error('Error fetching hotel data:', err);
        setError(err.message || 'Failed to fetch hotel data');
      } finally {
        setLoading(false);
      }
    };

    fetchHotelData();
  }, [hotelId, searchType]);

  return {
    hotel,
    apiHotelData,
    loading,
    error,
  };
};

