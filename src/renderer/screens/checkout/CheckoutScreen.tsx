import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPay, getOrder } from '@shared/modules/api/levelTravelApi';
import type { Order } from '@shared/types/orders';
import { getOrderPayAmount, getOrderPaymentPurpose } from '@shared/utils/orderPayment';
import { getPayErrorMessage, parseSbpPayResponse, SBP_PENDING_EXPIRE_MINUTES, storeSbpQrcId } from '@shared/utils/sbpPayment';
import { useAppNavigation, useRouteParams } from '../../app/navigation';
import { openExternal } from '../../lib/desktop';
import { PageHeader } from '../../shell/PageHeader';
import { Modal } from '../../components/Modal';
import { CheckoutItems } from './CheckoutItems';
import { CheckoutCard } from './CheckoutCard';
import { CheckoutSkeleton } from './CheckoutSkeleton';
import './checkout.css';

// Порт component/checkout/Checkout.tsx. handlePay: createPay → openExternal(payload) → navigate('pendingPayment').
// Alert.alert('Ошибка оплаты', …) → диалог Modal с тем же текстом.

type CheckoutRouteParams = {
  order_id: number | string;
  email?: string;
  phone?: string;
  searchType?: 'package' | 'hotel';
};

// A freshly created order is not always readable right away
const ORDER_FETCH_ATTEMPTS = 3;
const ORDER_FETCH_RETRY_DELAY_MS = 1200;

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const isOrderNotFound = (error: any) => error?.response?.status === 404;

export const CheckoutScreen: React.FC = () => {
  const nav = useAppNavigation();
  const params = useRouteParams<CheckoutRouteParams>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [payAlert, setPayAlert] = useState<string | null>(null);

  const orderId = params?.order_id;

  const refreshOrder = useCallback(async () => {
    if (!orderId) return null;
    const numericId = typeof orderId === 'string' ? parseInt(orderId, 10) : orderId;

    let lastError: unknown = null;
    for (let attempt = 0; attempt < ORDER_FETCH_ATTEMPTS; attempt += 1) {
      try {
        const response = await getOrder(numericId);
        const orderData = (response as any)?.order || response;
        setOrder(orderData as Order);
        setLoadError(null);
        return orderData as Order;
      } catch (error) {
        lastError = error;
        if (!isOrderNotFound(error) || attempt === ORDER_FETCH_ATTEMPTS - 1) {
          break;
        }
        await wait(ORDER_FETCH_RETRY_DELAY_MS * (attempt + 1));
      }
    }
    throw lastError;
  }, [orderId]);

  const loadOrder = useCallback(() => {
    if (!orderId) {
      setLoading(false);
      setLoadError('Не удалось определить номер заказа.');
      return;
    }
    setLoading(true);
    refreshOrder()
      .catch(error => {
        console.warn('Error fetching order:', error?.message || error);
        setLoadError(
          isOrderNotFound(error)
            ? 'Заказ ещё обрабатывается. Попробуйте обновить через несколько секунд или найдите его в разделе «Мои заказы».'
            : 'Не удалось загрузить заказ. Проверьте соединение и попробуйте снова.',
        );
      })
      .finally(() => setLoading(false));
  }, [orderId, refreshOrder]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const payAmount = useMemo(() => getOrderPayAmount(order), [order]);

  const handlePay = async () => {
    if (!orderId || paying) return;
    setPaying(true);
    try {
      const expireDate = new Date(Date.now() + SBP_PENDING_EXPIRE_MINUTES * 60 * 1000);
      const returnUrl = `https://totus.club/pay?orderId=${orderId}`;
      const amountValue = payAmount || getOrderPayAmount(order);

      if (!amountValue || amountValue <= 0) {
        setPayAlert('Не удалось определить сумму к оплате. Обновите заказ и попробуйте снова.');
        return;
      }

      const payInfo = await createPay({
        orderId: `ORDER${orderId}`,
        orderName: `Заказ №${orderId}`,
        paymentPurpose: getOrderPaymentPurpose(order),
        expire: expireDate,
        amount: {
          value: amountValue,
          code: 'RUB',
        },
        returnUrl,
      });

      if (payInfo?.isAxiosError) {
        setPayAlert(getPayErrorMessage(payInfo));
        return;
      }

      const parsed = parseSbpPayResponse(payInfo);
      await storeSbpQrcId(orderId, parsed.qrcId);

      if (!parsed.payload) {
        setPayAlert(getPayErrorMessage(payInfo));
        return;
      }

      try {
        openExternal(parsed.payload);
      } catch (e: any) {
        setPayAlert(e?.message || 'Не удалось открыть ссылку оплаты в браузере.');
        return;
      }

      nav.navigate('pendingPayment', {
        order_id: orderId,
        qrcId: parsed.qrcId || undefined,
        payUrl: parsed.payload,
        amount: amountValue,
        expireAt: expireDate.getTime(),
      });
    } catch (e: any) {
      setPayAlert(e?.message || 'Не удалось создать платёж.');
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <>
        <PageHeader title="Бронирование" back />
        <div className="page-body">
          <CheckoutSkeleton />
        </div>
      </>
    );
  }

  if (!order) {
    return (
      <>
        <PageHeader title="Бронирование" back />
        <div className="page-body">
          <div className="checkout-error">
            <div className="checkout-error__text">{loadError || 'Заказ не найден.'}</div>
            <button type="button" className="btn btn--block" onClick={loadOrder}>
              Обновить
            </button>
            <button
              type="button"
              className="btn btn--outline btn--block"
              onClick={() => nav.navigate('OrdersStackScreen', { screen: 'orders' })}>
              Мои заказы
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Бронирование" back />
      <div className="page-body">
        <div className="checkout">
          <div className="checkout__main">
            <CheckoutItems order={order} />
          </div>
          <aside className="checkout__side">
            <CheckoutCard order={order} onPay={handlePay} loading={loading || paying} />
          </aside>
        </div>
      </div>

      <Modal open={payAlert !== null} onClose={() => setPayAlert(null)} width={440}>
        <div className="dialog__title">Ошибка оплаты</div>
        <div className="dialog__text">{payAlert}</div>
        <button type="button" className="btn btn--block" onClick={() => setPayAlert(null)}>
          OK
        </button>
      </Modal>
    </>
  );
};

export default CheckoutScreen;
