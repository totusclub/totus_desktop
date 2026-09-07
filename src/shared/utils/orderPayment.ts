/**
 * Order payment amount helpers — aligned with kedam_WEB/src/utils/orderPayment.ts
 */

function toMoney(value: unknown): number {
  if (value == null || value === '') return 0;
  const n = typeof value === 'number' ? value : Number(String(value).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

export function getLtOrderPackage(order: any) {
  if (!order) return null;
  const root = order.package ?? order;
  if (root?.package?.hotel || root?.package?.dates_info) {
    return root;
  }
  if (root?.hotel || root?.dates_info || root?.payment_methods) {
    return root;
  }
  return root;
}

export function getOrderPaymentPurpose(order: any): string | undefined {
  const lt = getLtOrderPackage(order);
  const value =
    lt?.description_for_client ??
    order?.description_for_client ??
    order?.package?.description_for_client;
  if (value == null) return undefined;
  const text = String(value).trim();
  return text || undefined;
}

/**
 * Amount for SBP QR / checkout.
 * Prefers remaining_amount, then full_price, then price + fuel_charge.
 */
export function getOrderPayAmount(order: any): number {
  if (!order) return 0;

  const lt = getLtOrderPackage(order);
  const nested =
    lt?.package && (lt.package.price != null || lt.package.hotel)
      ? lt.package
      : lt;

  const remaining = toMoney(lt?.remaining_amount ?? order?.remaining_amount);
  if (remaining > 0) return remaining;

  const full = toMoney(
    lt?.full_price ??
      order?.full_price ??
      order?.package?.full_price ??
      nested?.full_price,
  );

  const price =
    toMoney(nested?.price) || toMoney(lt?.price) || toMoney(order?.price);
  const fuel =
    toMoney(nested?.fuel_charge) ||
    toMoney(lt?.fuel_charge) ||
    toMoney(order?.fuel_charge) ||
    toMoney(nested?.predicted_surcharge);
  const withFees = price + fuel;

  if (full > 0 && withFees > 0) return Math.max(full, withFees);
  if (withFees > 0) return withFees;
  if (full > 0) return full;

  return toMoney(
    lt?.price ?? nested?.price ?? order?.package?.price ?? order?.price,
  );
}

export function isOrderPaidStatus(status: unknown): boolean {
  const s = String(status || '').toUpperCase();
  return (
    s === 'RECONCILED' ||
    s === 'PAID' ||
    s === 'SUCCESS' ||
    s === 'COMPLETED' ||
    s === 'CONFIRMED'
  );
}
