import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@shared/modules/store';
import { useOrders } from '@shared/modules/hooks/useOrders';
import type { Order } from '@shared/types/orders';
import { useAppNavigation } from '../../app/navigation';
import { PageHeader } from '../../shell/PageHeader';
import { OrderListItem } from './OrderListItem';
import { OrderListItemSkeleton } from './OrderListItemSkeleton';
import './orders.css';

// Порт screens/orders/orders.tsx (+ hooks/useOrders): «Заказы» — сетка карточек в 3 колонки, кнопка обновления
// (RefreshControl), «Войдите, чтобы видеть заказы» для гостя, «Заказов пока нет».

const RefreshIcon: React.FC<{ size?: number }> = ({ size = 22 }) => (
  <svg viewBox="0 0 24 24" fill="none" width={size} height={size} style={{ display: 'block' }} aria-hidden="true">
    <path
      d="M20 12a8 8 0 1 1-2.34-5.66M20 4v5h-5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const OrdersScreen: React.FC = () => {
  const nav = useAppNavigation();
  const auth = useSelector((state: RootState) => state.auth);
  const accessToken = auth.accessToken;
  const user = auth.user as { id?: string | number } | null;
  const userId = user?.id != null ? Number(user.id) : auth.userId != null ? Number(auth.userId) : null;

  const { orders, loading, refreshing, error, fetchOrders, handleRefresh } = useOrders(accessToken ? userId : null);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  if (!accessToken) {
    return (
      <>
        <PageHeader title="Заказы" />
        <div className="page-body">
          <div className="empty orders-empty">
            <div className="empty__title">Войдите, чтобы видеть заказы</div>
            <button
              type="button"
              className="link"
              onClick={() =>
                nav.navigate('tab', {
                  screen: 'AccountStackScreen',
                  params: { screen: 'login' },
                })
              }>
              Войти
            </button>
          </div>
        </div>
      </>
    );
  }

  const showSkeleton = loading && !refreshing;

  return (
    <>
      <PageHeader
        title="Заказы"
        right={
          <button
            type="button"
            className={'orders-refresh' + (refreshing ? ' orders-refresh--spinning' : '')}
            onClick={() => void handleRefresh()}
            disabled={refreshing || loading}
            aria-label="Обновить">
            <RefreshIcon />
          </button>
        }
      />
      <div className="page-body">
        {showSkeleton ? (
          <div className="grid grid--3 orders-grid">
            {Array.from({ length: 6 }).map((_, index) => (
              <OrderListItemSkeleton key={`skeleton-${index}`} />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="empty orders-empty">
            <div className="orders-empty__text">Заказов пока нет</div>
          </div>
        ) : (
          <div className="grid grid--3 orders-grid">
            {orders.map((item: Order, index: number) => (
              <OrderListItem key={String((item as any)?.id ?? index)} order={item} />
            ))}
          </div>
        )}
        {error ? <div className="orders-error error-text">{error}</div> : null}
      </div>
    </>
  );
};

export default OrdersScreen;
