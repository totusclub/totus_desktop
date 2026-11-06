import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';
import type { RootState } from '@shared/modules/store';
import { ROUTES } from './navigation';

/**
 * Бронирование только для вошедших (06.11.2026, как в totus_APP navigation/bookingAuthGate.tsx):
 * /booking и /checkout. Гость переводится на /login с returnTo = имя экрана и returnParams =
 * параметры тура (location.state); после подтверждения кода VerificationScreen делает
 * nav.navigate(returnTo, returnParams) — пользователь возвращается к выбранному туру.
 */
export const RequireBookingAuth: React.FC<{ route: 'booking' | 'checkout'; children: React.ReactElement }> = ({ route, children }) => {
  const { accessToken, fullAuth } = useSelector((state: RootState) => state.auth);
  const location = useLocation();
  if (!(accessToken && fullAuth)) {
    return (
      <Navigate
        to={ROUTES.login}
        replace
        state={{ returnTo: route, returnParams: (location.state as Record<string, unknown>) || {} }}
      />
    );
  }
  return children;
};
