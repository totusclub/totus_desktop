import React, { useState, useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@shared/modules/store';
import { useBooking } from '@shared/modules/hooks/useBooking';
import { useTourists } from '@shared/modules/hooks/useTourists';
import { mapLevelTravelTouristValidateErrors, validateBookingForm } from '@shared/utils/validation/touristValidation';
import type { BookingRouteParams, BookingFormData, Tourist } from '@shared/types/booking';
import {
  createOrder,
  validateTourist,
  prebuildOrder,
  prebookPackage,
  PackagesActualize,
  PackagesActualizeFlight,
  getOrdersUsers,
} from '@shared/modules/api/levelTravelApi';
import { isHotelOnlySearch } from '@shared/utils/bookingFlowUtils';
import { useAppNavigation, useRouteParams } from '../../app/navigation';
import { PageHeader } from '../../shell/PageHeader';
import { ContactSection } from './ContactSection';
import { TouristsSection } from './TouristsSection';
import { BookingFooter, BookingOrderSummary, BookingLegalInfo } from './BookingFooter';
import { BookingSkeleton } from './BookingSkeleton';
import './booking.css';

// Порт component/booking/Booking.tsx. Логика создания заказа (actualize → validateTourist → prebuild →
// prebook → createOrder → checkout) — 1:1 с приложением; изменена только разметка (Figma «Desktop / Booking»).

function extractOrderIdFromResponse(orderResult: any): number | string | null {
  if (!orderResult) return null;
  return orderResult?.order?.id ?? orderResult?.order?.order_id ?? orderResult?.id ?? orderResult?.order_id ?? null;
}

function pickLatestOrderId(orders: any[]): number | string | null {
  if (!Array.isArray(orders) || orders.length === 0) return null;
  const sorted = [...orders].sort((a, b) => {
    const da = new Date(a?.created_at || a?.updated_at || 0).getTime();
    const db = new Date(b?.created_at || b?.updated_at || 0).getTime();
    return db - da;
  });
  return sorted[0]?.id ?? sorted[0]?.order_id ?? null;
}

function canSkipPrebook(errorText: string, result?: any): boolean {
  return result?.skippable === true || /incorrect api version|api version|not supported|недоступ/i.test(errorText);
}

export const BookingScreen: React.FC = () => {
  const nav = useAppNavigation();
  const routeParams = useRouteParams<BookingRouteParams>();
  const { user } = useSelector((state: RootState) => state.auth);

  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [packageOverride, setPackageOverride] = useState<any>(null);

  const {
    packageData: loadedPackage,
    packageId,
    flightPairId,
    dataLoading,
    tourists: initialTourists,
  } = useBooking(routeParams || {});

  const packageData = packageOverride || loadedPackage;
  const searchType = routeParams?.searchType;
  const hotelOnly = isHotelOnlySearch(searchType);

  const { tourists, errors, updateTourist, setTourists, setErrors, clearTouristError, clearFieldError } =
    useTourists(initialTourists);

  useEffect(() => {
    if (initialTourists.length > 0) {
      setTourists(initialTourists);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTourists.length, setTourists]);

  const handleEmailChange = useCallback(
    (value: string) => {
      setEmail(value);
      clearFieldError('email');
    },
    [clearFieldError],
  );

  const handlePhoneChange = useCallback(
    (value: string) => {
      setPhone(value);
      clearFieldError('phone');
    },
    [clearFieldError],
  );

  const handleUpdateTourist = useCallback(
    (index: number, key: keyof Tourist, value: string | boolean | number, additionalUpdates?: Partial<Tourist>) => {
      updateTourist(index, key, value, additionalUpdates);
    },
    [updateTourist],
  );

  const handleClearPatronymicError = useCallback(
    (index: number) => {
      clearTouristError(index, 'patronymic');
    },
    [clearTouristError],
  );

  const handleNoPatronymicToggle = useCallback(
    (index: number, newValue: boolean) => {
      updateTourist(index, 'noPatronymic', newValue, {
        patronymic: newValue ? '' : tourists[index].patronymic,
      });
      if (newValue) {
        clearTouristError(index, 'patronymic');
      }
    },
    [updateTourist, tourists, clearTouristError],
  );

  const handleSubmit = useCallback(async () => {
    if (loading || !packageId) return;

    const formData: BookingFormData = { email, phone, tourists };
    const validationErrors = validateBookingForm(formData);
    if (Object.keys(validationErrors).length > 0 || validationErrors.tourists) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      // 1) Re-actualize for LT freshness
      try {
        const actualizeResult = flightPairId
          ? await PackagesActualizeFlight(packageId, flightPairId)
          : await PackagesActualize(packageId, hotelOnly ? 'hotel' : 'package');

        if ((actualizeResult as any)?.success === false) {
          setErrors({
            general: 'Не удалось актуализировать предложение. Пожалуйста, обновите и попробуйте снова.',
          });
          setLoading(false);
          return;
        }

        const refreshed = (actualizeResult as any)?.package ?? actualizeResult ?? null;
        if (refreshed) {
          setPackageOverride(refreshed);
        }
      } catch {
        setErrors({
          general: 'Не удалось актуализировать предложение. Пожалуйста, попробуйте еще раз.',
        });
        setLoading(false);
        return;
      }

      const touristsData = tourists.map(tourist => {
        const passportNumber = tourist.passport_number.toString().replace(/\D/g, '');
        return {
          surname: tourist.surname.trim(),
          name: tourist.name.trim(),
          patronymic: tourist.noPatronymic ? '' : tourist.patronymic.trim(),
          birthday: tourist.birthday.trim(),
          gender: tourist.gender,
          nationality_id: tourist.nationality_id,
          doc_type: tourist.doc_type,
          document_number: passportNumber,
          document_expires_on: tourist.passport_expires_on.trim(),
          passport_number: passportNumber,
          passport_expires_on: tourist.passport_expires_on.trim(),
          child: tourist.child || false,
          child_age: tourist.child_age,
        };
      });

      const firstAdult = tourists.find(t => !t.child) || tourists[0];
      const client = {
        name: (firstAdult?.name || '').trim(),
        surname: (firstAdult?.surname || '').trim(),
        email: email.trim(),
        phone: phone.toString().replace(/\D/g, ''),
        bonus_score: 0,
      };

      // 2) Validate tourists
      const res = await validateTourist({
        package_id: packageId,
        tourists: touristsData,
      });

      const ltErrorPayload =
        res?.response?.data ?? (res?.success === false || res?.valid === false || res?.error ? res : null);

      const touristValidationFailed =
        res?.valid === false ||
        res?.is_valid === false ||
        res?.success === false ||
        res?.error?.valid === false ||
        res?.isAxiosError === true ||
        Boolean(ltErrorPayload?.error?.errors);

      if (touristValidationFailed) {
        setErrors(mapLevelTravelTouristValidateErrors(res));
        setLoading(false);
        return;
      }

      const orderPayload: Record<string, unknown> = {
        package_id: packageId,
        client,
        tourists: touristsData,
        payment_option: 'sbp',
        selected_extras: [],
        bonuses_granted: 0,
        comment: '',
        flight_pair_id: flightPairId || null,
      };

      // 3) Prebuild
      try {
        const prebuildResult = await prebuildOrder(orderPayload);
        if (prebuildResult?.success === false || prebuildResult?.order_valid === false) {
          const prebuildError =
            (typeof prebuildResult?.order_errors === 'object' &&
              prebuildResult.order_errors &&
              Object.values(prebuildResult.order_errors).flat().join('; ')) ||
            prebuildResult?.error?.message ||
            prebuildResult?.message ||
            'Не удалось проверить заказ. Проверьте данные и попробуйте снова.';
          setErrors({ general: String(prebuildError) });
          setLoading(false);
          return;
        }

        if (prebuildResult?.order?.package) {
          setPackageOverride((prev: any) => ({
            ...(prev || packageData || {}),
            ...prebuildResult.order.package,
            price:
              Number(prebuildResult.order.package.price) ||
              Number(prev?.price) ||
              Number(packageData?.price) ||
              0,
            fuel_charge:
              Number(prebuildResult.order.package.fuel_charge) ||
              Number(prev?.fuel_charge) ||
              Number(packageData?.fuel_charge) ||
              0,
            full_price:
              Number(prebuildResult.order.full_price) || Number(prebuildResult.order.remaining_amount) || undefined,
          }));
        }
      } catch (prebuildError: any) {
        const message =
          prebuildError?.response?.data?.error?.message ||
          prebuildError?.response?.data?.message ||
          prebuildError?.message ||
          'Не удалось выполнить предпросмотр заказа.';
        setErrors({ general: String(message) });
        setLoading(false);
        return;
      }

      // 4) Prebook when flight selected
      if (flightPairId) {
        try {
          const misc = (packageData as any)?.misc_data || {};
          const prebookResult = await prebookPackage({
            package_id: packageId,
            flight_pair_id: flightPairId,
            client,
            tourists: touristsData,
            prebook_data: {
              ...(misc.book_hash ? { book_hash: misc.book_hash } : {}),
              ...(misc.bundle_id ? { bundle_id: misc.bundle_id } : {}),
              ...(misc.route_component_id ? { route_component_id: misc.route_component_id } : {}),
              ...(misc.acm_component_id ? { acm_component_id: misc.acm_component_id } : {}),
              ...(misc.operator_organization_id
                ? { operator_organization_id: String(misc.operator_organization_id) }
                : {}),
              ...(misc.supplier_id != null ? { supplier_id: misc.supplier_id } : {}),
            },
          });

          const prebookErrorText = String(
            typeof prebookResult?.error === 'string'
              ? prebookResult.error
              : prebookResult?.error?.message || prebookResult?.message || '',
          );

          if (prebookResult?.success === false || prebookResult?.isAxiosError) {
            if (!canSkipPrebook(prebookErrorText, prebookResult)) {
              setErrors({
                general:
                  prebookErrorText || 'Не удалось забронировать перелёт у туроператора. Попробуйте другой рейс.',
              });
              setLoading(false);
              return;
            }
          }

          if (prebookResult?.booking_id) {
            orderPayload.booking_id = prebookResult.booking_id;
          }
        } catch (prebookError: any) {
          const message =
            prebookError?.response?.data?.error?.message ||
            prebookError?.response?.data?.error ||
            prebookError?.response?.data?.message ||
            prebookError?.message ||
            '';
          if (!canSkipPrebook(String(message), prebookError?.response?.data)) {
            setErrors({
              general: String(message || 'Не удалось выполнить пребук перелёта.'),
            });
            setLoading(false);
            return;
          }
        }
      }

      // 5) Create order
      const dataOrderCreate: Record<string, unknown> = {
        package_id: packageId,
        tourists: touristsData,
        client,
        email: client.email,
        phone: client.phone,
        user_id: (user as any)?.id,
        payment_option: 'sbp',
      };
      if (flightPairId) {
        dataOrderCreate.flight_pair_id = flightPairId;
      }
      if (orderPayload.booking_id) {
        dataOrderCreate.booking_id = orderPayload.booking_id;
      }

      const orderResult = await createOrder(dataOrderCreate as any);

      if (orderResult?.success === false || orderResult?.isAxiosError) {
        const createMessage =
          orderResult?.error?.message ||
          orderResult?.response?.data?.message ||
          orderResult?.message ||
          'Не удалось создать заказ. Пожалуйста, попробуйте еще раз.';
        setErrors({ general: String(createMessage) });
        setLoading(false);
        return;
      }

      let orderId = extractOrderIdFromResponse(orderResult);

      // 6) Fallback: latest order of the user
      if (!orderId && (user as any)?.id) {
        try {
          const userOrders = await getOrdersUsers((user as any).id);
          orderId = pickLatestOrderId((userOrders as any) || []);
        } catch {
          /* ignore */
        }
      }

      if (!orderId) {
        setErrors({
          general: 'Заказ создан, но не удалось получить номер заказа. Проверьте заказы в профиле.',
        });
        setLoading(false);
        return;
      }

      // 7) Checkout
      nav.navigate('checkout', {
        order_id: orderId,
        email: client.email,
        phone: client.phone,
        searchType: hotelOnly ? 'hotel' : 'package',
      });
    } catch (error: any) {
      setErrors({
        general: error?.message || 'Произошла ошибка при отправке заказа. Пожалуйста, попробуйте еще раз.',
      });
    } finally {
      setLoading(false);
    }
  }, [loading, email, phone, tourists, packageId, flightPairId, hotelOnly, user, nav, setErrors, packageData]);

  const onFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void handleSubmit();
  };

  if (dataLoading || !packageData) {
    return (
      <>
        <PageHeader title="Бронирование" back />
        <div className="page-body">
          <BookingSkeleton />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Бронирование" back />
      <form className="page-body" onSubmit={onFormSubmit} noValidate>
        <div className="booking">
          <div className="booking__main">
            <ContactSection
              email={email}
              phone={phone}
              errors={errors}
              onEmailChange={handleEmailChange}
              onPhoneChange={handlePhoneChange}
            />

            <TouristsSection
              tourists={tourists}
              errors={errors}
              onUpdateTourist={handleUpdateTourist}
              onClearPatronymicError={handleClearPatronymicError}
              onNoPatronymicToggle={handleNoPatronymicToggle}
            />

            {errors.general ? <div className="error-text booking-general-error">{errors.general}</div> : null}
          </div>

          <aside className="booking__side">
            <div className="card booking-side-card">
              <BookingOrderSummary packageData={packageData} selectedFlight={routeParams?.flightData} />
              <BookingLegalInfo />
              <BookingFooter disabled={loading || !email || !phone} loading={loading} />
            </div>
          </aside>
        </div>
      </form>
    </>
  );
};

export default BookingScreen;
