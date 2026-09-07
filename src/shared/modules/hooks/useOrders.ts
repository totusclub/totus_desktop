import { useCallback, useState } from 'react';
import { getOrdersUsers } from '../api/levelTravelApi';
import type { Order } from '../../types/orders';
import { sortOrdersNewestFirst } from '../../utils/ordersUtils';

export const useOrders = (userId: number | null) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!userId) {
      setOrders([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getOrdersUsers(Number(userId));
      setOrders(Array.isArray(data) ? sortOrdersNewestFirst(data) : []);
    } catch (err) {
      console.log('[Orders] fetch error', err);
      setError('Не удалось загрузить заказы');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const handleRefresh = useCallback(async () => {
    if (!userId) return;
    try {
      setRefreshing(true);
      const data = await getOrdersUsers(Number(userId));
      setOrders(Array.isArray(data) ? sortOrdersNewestFirst(data) : []);
    } catch (err) {
      console.log('[Orders] refresh error', err);
    } finally {
      setRefreshing(false);
    }
  }, [userId]);

  return {
    orders,
    loading,
    refreshing,
    error,
    fetchOrders,
    handleRefresh,
  };
};

