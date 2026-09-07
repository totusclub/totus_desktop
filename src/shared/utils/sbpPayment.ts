// Desktop: вместо AsyncStorage — localStorage с тем же async-интерфейсом.
const AsyncStorage = {
  async getItem(key: string): Promise<string | null> {
    try { return window.localStorage.getItem(key); } catch { return null; }
  },
  async setItem(key: string, value: string): Promise<void> {
    try { window.localStorage.setItem(key, value); } catch { /* ignore */ }
  },
  async removeItem(key: string): Promise<void> {
    try { window.localStorage.removeItem(key); } catch { /* ignore */ }
  },
};
import { isOrderPaidStatus } from './orderPayment';

export type SbpPayData = {
  payload: string | null;
  qrcId: string | null;
};

const qrcStorageKey = (orderId: string | number) => `sbp_qrc_${orderId}`;

export function parseSbpPayResponse(payInfo: any): SbpPayData {
  const data = payInfo?.data ?? payInfo;

  const payload =
    data?.payload ||
    payInfo?.payload ||
    payInfo?.payUrl ||
    payInfo?.object?.payUrl ||
    null;

  const qrcId =
    data?.qrcId ||
    payInfo?.qrcId ||
    payInfo?.object?.qrcId ||
    null;

  return {
    payload: payload ? String(payload) : null,
    qrcId: qrcId ? String(qrcId) : null,
  };
}

export function isSbpPaymentPaid(response: any): boolean {
  const status =
    response?.status ||
    response?.payment_status ||
    response?.data?.status ||
    response?.object?.status;

  return response?.paid === true || isOrderPaidStatus(status);
}

export async function storeSbpQrcId(
  orderId: string | number,
  qrcId: string | null,
): Promise<void> {
  if (!qrcId) return;
  try {
    await AsyncStorage.setItem(qrcStorageKey(orderId), qrcId);
  } catch {
    /* ignore storage errors */
  }
}

export async function getStoredSbpQrcId(
  orderId: string | number,
): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(qrcStorageKey(orderId));
  } catch {
    return null;
  }
}

/** Time shown in the app while waiting for SBP payment confirmation. */
export const SBP_PENDING_EXPIRE_MINUTES = 2;

/**
 * The bank gateway occasionally resets the connection, which the API reports as
 * a 500 with "read ECONNRESET". That is retryable and not the user's fault, so
 * it gets a distinct message from real payment errors.
 */
export function getPayErrorMessage(payInfo: any): string {
  const raw = String(
    payInfo?.details || payInfo?.error || payInfo?.message || '',
  );

  if (/ECONNRESET|ETIMEDOUT|socket hang up|Network Error/i.test(raw)) {
    return 'Банк временно недоступен. Пожалуйста, попробуйте оплатить ещё раз через минуту.';
  }

  if (payInfo?.httpStatus >= 500 || /Failed to create VTB order/i.test(raw)) {
    return 'Не удалось создать платёж на стороне банка. Попробуйте снова через минуту.';
  }

  return raw || 'Не удалось создать платёж. Попробуйте снова.';
}
