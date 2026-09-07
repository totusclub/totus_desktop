import { useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// Имена маршрутов совпадают с экранами totus_APP (navigation/authStack.tsx),
// чтобы shared-код (navigateAfterPackageCreate, aiAssistantOpenHotel) работал без изменений.
export const ROUTES: Record<string, string> = {
  home: '/',
  searchResult: '/search',
  hotel: '/hotel',
  hotelFromAi: '/hotel',
  tickets: '/tickets',
  ticketDetails: '/ticket-details',
  booking: '/booking',
  checkout: '/checkout',
  pendingPayment: '/pending-payment',
  orders: '/orders',
  orderDetails: '/orders/details',
  favorites: '/favorites',
  account: '/account',
  login: '/login',
  signup: '/signup',
  verification: '/verification',
  privacyPolicy: '/privacy',
  aiTextScreen: '/ai',
  onboarding: '/onboarding',
  // алиасы табов из RN
  HomeStackScreen: '/',
  OrdersStackScreen: '/orders',
  FavoritesStackScreen: '/favorites',
  AccountStackScreen: '/account',
  VoiceAssistantStackScreen: '/ai',
};

export type AppNavigation = {
  navigate: (route: string, params?: Record<string, unknown>) => void;
  replace: (route: string, params?: Record<string, unknown>) => void;
  goBack: () => void;
  reset: (route: string, params?: Record<string, unknown>) => void;
};

/** Экспортируется для тестов. */
export function resolve(route: string, params?: Record<string, unknown>): { path: string; state: unknown } {
  // navigate('OrdersStackScreen', { screen: 'orders', params: {...} }) — вложенная форма RN
  if (params && typeof params.screen === 'string' && ROUTES[params.screen as string]) {
    return resolve(params.screen as string, (params.params as Record<string, unknown>) || undefined);
  }
  const path = ROUTES[route] || (route.startsWith('/') ? route : '/');
  return { path, state: params ?? null };
}

export function useAppNavigation(): AppNavigation {
  const nav = useNavigate();
  const navigate = useCallback(
    (route: string, params?: Record<string, unknown>) => {
      const { path, state } = resolve(route, params);
      nav(path, { state });
    },
    [nav],
  );
  const replace = useCallback(
    (route: string, params?: Record<string, unknown>) => {
      const { path, state } = resolve(route, params);
      nav(path, { state, replace: true });
    },
    [nav],
  );
  const goBack = useCallback(() => {
    if (window.history.length > 1) nav(-1);
    else nav('/');
  }, [nav]);
  const reset = useCallback(
    (route: string, params?: Record<string, unknown>) => {
      const { path, state } = resolve(route, params);
      nav(path, { state, replace: true });
    },
    [nav],
  );
  return useMemo(() => ({ navigate, replace, goBack, reset }), [navigate, replace, goBack, reset]);
}

/** Параметры экрана (аналог route.params в RN) — приходят через location.state. */
export function useRouteParams<T extends object = Record<string, unknown>>(): T {
  const location = useLocation();
  return ((location.state as T) || ({} as T)) as T;
}
