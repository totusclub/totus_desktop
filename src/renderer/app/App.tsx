import React from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { store, persistor } from '@shared/modules/store';
import { ThemeProvider } from '../theme/ThemeContext';
import { AppShell } from '../shell/AppShell';
import { AiRoot } from '../ai/AiRoot';
import { AiScreen } from '../ai/AiScreen';
import { isOnboardingCompleted } from '../lib/onboarding';
import { HomeScreen } from '../screens/home/HomeScreen';
import { SearchResultsScreen } from '../screens/search/SearchResultsScreen';
import { HotelScreen } from '../screens/hotel/HotelScreen';
import { TicketsScreen } from '../screens/tickets/TicketsScreen';
import { TicketDetailsScreen } from '../screens/tickets/TicketDetailsScreen';
import { BookingScreen } from '../screens/booking/BookingScreen';
import { CheckoutScreen } from '../screens/checkout/CheckoutScreen';
import { PendingPaymentScreen } from '../screens/checkout/PendingPaymentScreen';
import { OrdersScreen } from '../screens/orders/OrdersScreen';
import { OrderDetailsScreen } from '../screens/orders/OrderDetailsScreen';
import { FavoritesScreen } from '../screens/favorites/FavoritesScreen';
import { AccountScreen } from '../screens/account/AccountScreen';
import { SupportChatScreen } from '../screens/support/SupportChatScreen';
import { NotificationsScreen } from '../screens/notifications/NotificationsScreen';
import { NotificationSettingsScreen } from '../screens/notifications/NotificationSettingsScreen';
import { PrivacyPolicyScreen } from '../screens/account/PrivacyPolicyScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { SignupScreen } from '../screens/auth/SignupScreen';
import { VerificationScreen } from '../screens/auth/VerificationScreen';
import { OnboardingScreen } from '../screens/onboarding/OnboardingScreen';
import { YandexAuthBridge } from './YandexAuthBridge';
import { RequireBookingAuth } from './RequireBookingAuth';

// Маршруты = экраны totus_APP (navigation/authStack.tsx); имена см. app/navigation.ts.
const RootRedirect: React.FC = () => (isOnboardingCompleted() ? <HomeScreen /> : <Navigate to="/onboarding" replace />);

export const App: React.FC = () => (
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <ThemeProvider>
        <HashRouter>
          <AiRoot>
            <Routes>
              <Route element={<AppShell />}>
                <Route index element={<RootRedirect />} />
                <Route path="/onboarding" element={<OnboardingScreen />} />
                <Route path="/search" element={<SearchResultsScreen />} />
                <Route path="/hotel" element={<HotelScreen />} />
                <Route path="/tickets" element={<TicketsScreen />} />
                <Route path="/ticket-details" element={<TicketDetailsScreen />} />
                {/* Бронирование и оплата — только для вошедших; гость уходит на /login с возвратом к туру */}
                <Route path="/booking" element={<RequireBookingAuth route="booking"><BookingScreen /></RequireBookingAuth>} />
                <Route path="/checkout" element={<RequireBookingAuth route="checkout"><CheckoutScreen /></RequireBookingAuth>} />
                <Route path="/pending-payment" element={<PendingPaymentScreen />} />
                <Route path="/orders" element={<OrdersScreen />} />
                <Route path="/orders/details" element={<OrderDetailsScreen />} />
                <Route path="/favorites" element={<FavoritesScreen />} />
                <Route path="/account" element={<AccountScreen />} />
                <Route path="/support-chat" element={<SupportChatScreen />} />
                <Route path="/account/notifications" element={<NotificationsScreen />} />
                <Route path="/account/notifications/settings" element={<NotificationSettingsScreen />} />
                <Route path="/privacy" element={<PrivacyPolicyScreen />} />
                <Route path="/login" element={<LoginScreen />} />
                <Route path="/signup" element={<SignupScreen />} />
                <Route path="/verification" element={<VerificationScreen />} />
                <Route path="/ai" element={<AiScreen />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
            {/* Возврат из браузера после входа через Яндекс ID (deep link totus://auth/yandex) */}
            <YandexAuthBridge />
          </AiRoot>
        </HashRouter>
      </ThemeProvider>
    </PersistGate>
  </Provider>
);
