import React, { useCallback, useEffect, useRef, useState } from 'react';
import { checkPay, createPay } from '@shared/modules/api/levelTravelApi';
import {
  getPayErrorMessage,
  getStoredSbpQrcId,
  isSbpPaymentPaid,
  parseSbpPayResponse,
  SBP_PENDING_EXPIRE_MINUTES,
  storeSbpQrcId,
} from '@shared/utils/sbpPayment';
import { useAppNavigation, useRouteParams } from '../../app/navigation';
import { openExternal } from '../../lib/desktop';
import './checkout.css';

// Порт component/checkout/PendingPayment.tsx (Figma «Desktop / Pending payment»): центрированная карточка 480
// со статусами pending / paid / expired / error. Опрос checkPay каждые 3 с и при фокусе окна (AppState 'active').

type PendingPaymentParams = {
  order_id: number | string;
  qrcId?: string;
  payUrl?: string;
  amount?: number;
  expireAt?: number;
};

type PaymentUiStatus = 'pending' | 'paid' | 'expired' | 'error';

export const PendingPaymentScreen: React.FC = () => {
  const nav = useAppNavigation();
  const params = useRouteParams<PendingPaymentParams>();

  const orderId = params?.order_id;
  const [status, setStatus] = useState<PaymentUiStatus>('pending');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const qrcIdRef = useRef<string | null>(params?.qrcId || null);
  const paidRef = useRef(false);

  const expireAtRef = useRef(params?.expireAt || Date.now() + SBP_PENDING_EXPIRE_MINUTES * 60 * 1000);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (qrcIdRef.current || !orderId) return;
      const stored = await getStoredSbpQrcId(orderId);
      if (!cancelled && stored) qrcIdRef.current = stored;
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const confirmPayment = useCallback(async () => {
    if (!orderId || paidRef.current) return false;
    try {
      const result = await checkPay({
        orderId: `ORDER${orderId}`,
        qrcId: qrcIdRef.current || undefined,
      });
      if (isSbpPaymentPaid(result)) {
        paidRef.current = true;
        setStatus('paid');
        return true;
      }
    } catch (e) {
      console.warn('checkPay failed', e);
    }
    return false;
  }, [orderId]);

  useEffect(() => {
    const tick = () => {
      const left = Math.max(0, Math.floor((expireAtRef.current - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left <= 0 && status === 'pending') {
        setStatus('expired');
      }
    };
    tick();
    const clock = setInterval(tick, 1000);
    return () => clearInterval(clock);
  }, [status]);

  useEffect(() => {
    if (status !== 'pending' || !orderId) return;

    confirmPayment();
    const poll = setInterval(() => {
      confirmPayment();
    }, 3000);

    return () => clearInterval(poll);
  }, [status, orderId, confirmPayment]);

  // AppState 'active' → фокус окна
  useEffect(() => {
    const onFocus = () => {
      if (status === 'pending') {
        confirmPayment();
      }
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [status, confirmPayment]);

  useEffect(() => {
    if (status !== 'paid') return;
    const t = setTimeout(() => {
      nav.navigate('OrdersStackScreen', { screen: 'orders' });
    }, 1200);
    return () => clearTimeout(t);
  }, [status, nav]);

  const openPayUrl = useCallback(async (url: string) => {
    try {
      openExternal(url);
    } catch (e: any) {
      setErrorMessage('Не удалось открыть ссылку оплаты в браузере.');
      setStatus('error');
      console.warn('Failed to open SBP URL', e);
    }
  }, []);

  const handleRetry = useCallback(async () => {
    if (!orderId || retrying) return;
    setRetrying(true);
    setErrorMessage(null);
    try {
      const amount = params?.amount;
      if (!amount || amount <= 0) {
        setErrorMessage('Не удалось определить сумму к оплате. Вернитесь к заказу и попробуйте снова.');
        setStatus('error');
        return;
      }

      const expireDate = new Date(Date.now() + SBP_PENDING_EXPIRE_MINUTES * 60 * 1000);
      const payInfo = await createPay({
        orderId: `ORDER${orderId}`,
        orderName: `Заказ №${orderId}`,
        expire: expireDate,
        amount: {
          value: amount,
          code: 'RUB',
        },
        returnUrl: `https://totus.club/pay?orderId=${orderId}`,
      });

      const parsed = payInfo?.isAxiosError ? { payload: null, qrcId: null } : parseSbpPayResponse(payInfo);

      if (parsed.qrcId) {
        qrcIdRef.current = parsed.qrcId;
        await storeSbpQrcId(orderId, parsed.qrcId);
      }

      if (!parsed.payload) {
        setErrorMessage(getPayErrorMessage(payInfo));
        setStatus('error');
        return;
      }

      expireAtRef.current = Date.now() + SBP_PENDING_EXPIRE_MINUTES * 60 * 1000;
      paidRef.current = false;
      setStatus('pending');
      await openPayUrl(parsed.payload);
    } catch (e: any) {
      console.warn('retry createPay failed', e);
      setErrorMessage(getPayErrorMessage(e));
      setStatus('error');
    } finally {
      setRetrying(false);
    }
  }, [orderId, retrying, params?.amount, openPayUrl]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timerLabel = `${minutes}:${String(seconds).padStart(2, '0')}`;

  const closeScreen = useCallback(() => {
    if (window.history.length > 1) {
      nav.goBack();
      return;
    }
    nav.navigate('OrdersStackScreen', { screen: 'orders' });
  }, [nav]);

  const goToOrder = () => nav.navigate('checkout', { order_id: orderId });

  return (
    <div className="pending">
      <div className="card card--shadow pending__card" role="dialog" aria-live="polite">
        {status === 'pending' ? (
          <>
            <span className="pending__spinner" aria-hidden="true" />
            <div className="pending__title">Ожидание оплаты</div>
            <div className="pending__subtitle">Оплатите заказ в банковском приложении. Мы автоматически проверим статус оплаты.</div>
            <div className="pending__timer">Осталось {timerLabel}</div>
            <button
              type="button"
              className="btn btn--outline btn--block"
              onClick={() => (params?.payUrl ? openPayUrl(String(params.payUrl)) : handleRetry())}>
              Открыть оплату снова
            </button>
            <button type="button" className="btn btn--ghost btn--block" onClick={closeScreen}>
              Закрыть
            </button>
          </>
        ) : null}

        {status === 'paid' ? (
          <>
            <div className="pending__title">Оплата прошла</div>
            <div className="pending__subtitle">Заказ успешно оплачен. Переходим к заказам…</div>
          </>
        ) : null}

        {status === 'expired' ? (
          <>
            <div className="pending__title">Время оплаты истекло</div>
            <div className="pending__subtitle">Создайте новый платёж или вернитесь к заказу.</div>
            <button type="button" className="btn btn--block" onClick={handleRetry} disabled={retrying}>
              {retrying ? 'Создаём…' : 'Создать новый платёж'}
            </button>
            <button type="button" className="btn btn--outline btn--block" onClick={goToOrder}>
              К заказу
            </button>
          </>
        ) : null}

        {status === 'error' ? (
          <>
            <div className="pending__title">Оплата не создана</div>
            <div className="pending__subtitle">{errorMessage || 'Попробуйте ещё раз или вернитесь к заказу.'}</div>
            <button type="button" className="btn btn--block" onClick={handleRetry} disabled={retrying}>
              {retrying ? 'Создаём…' : 'Повторить'}
            </button>
            <button type="button" className="btn btn--outline btn--block" onClick={goToOrder}>
              К заказу
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default PendingPaymentScreen;
