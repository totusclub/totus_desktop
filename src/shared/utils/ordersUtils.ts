import { formatPrice } from './ticketsUtils/flightTransformers';
import type { Order } from '../types/orders';

const API_BASE_URL = 'https://api.totus.club';

export type OrderDocument = { name: string; url: string };

export type OrderDocumentApiItem = {
  title?: string;
  public_url?: string;
  source_url?: string;
  url?: string;
};

/** Level Travel CDN links — hide; prefer Totus-hosted copies on api.totus.club. */
function isLevelTravelDocumentUrl(url: string): boolean {
  return /level\.travel/i.test(url) && !url.includes('/uploads/');
}

/** Relative or absolute Totus-hosted document (api.totus.club /uploads/...). */
function isTotusHostedDocumentUrl(url: string): boolean {
  const value = String(url || '').trim();
  if (!value) return false;
  if (isLevelTravelDocumentUrl(value)) return false;
  const lower = value.toLowerCase();
  if (lower.startsWith('/uploads/')) return true;
  // Avoid `new URL()` — safer across RN runtimes.
  if (/^https?:\/\/api\.totus\.club(\/|$)/i.test(value)) return true;
  if (lower.includes('api.totus.club/uploads/')) return true;
  return false;
}

/**
 * Percent-encode path segments so non-ASCII names (e.g. «Договор_оферты.pdf»)
 * are fetchable by RNFS / WebView. Already-encoded segments are left alone.
 */
function encodeDocumentPath(url: string): string {
  const value = String(url).trim();
  const schemeMatch = value.match(/^(https?:\/\/[^/]+)(\/.*)?$/i);
  const origin = schemeMatch ? schemeMatch[1] : '';
  const rest = schemeMatch ? schemeMatch[2] || '' : value;

  const [pathPart, queryPart] = (() => {
    const idx = rest.indexOf('?');
    return idx === -1 ? [rest, ''] : [rest.slice(0, idx), rest.slice(idx)];
  })();

  const encodedPath = pathPart
    .split('/')
    .map(segment => {
      if (!segment) return segment;
      // Skip segments that already look encoded.
      if (/%[0-9A-Fa-f]{2}/.test(segment)) return segment;
      try {
        return encodeURIComponent(segment);
      } catch {
        return segment;
      }
    })
    .join('/');

  return `${origin}${encodedPath}${queryPart}`;
}

/** Dedupe key: path without query/hash (host-agnostic for /uploads/). */
function documentDedupeKey(url: string): string {
  const value = String(url).trim();
  const withoutHash = value.split('#')[0];
  const withoutQuery = withoutHash.split('?')[0];
  try {
    const match = withoutQuery.match(/^https?:\/\/[^/]+(\/.*)?$/i);
    if (match) {
      const path = (match[1] || '/').replace(/\/+$/, '') || '/';
      return path.toLowerCase();
    }
  } catch {
    // fall through
  }
  return withoutQuery.replace(/\/+$/, '').toLowerCase();
}

function documentKindKey(name: string, url: string): string | null {
  const n = name.toLowerCase();
  const u = url.toLowerCase();
  if (n.includes('оферт') || u.includes('agreement.pdf')) return 'agreement';
  if (n.includes('лиценз') || u.includes('license_agreement')) return 'license';
  if (n.includes('ваучер') || u.includes('voucher')) return 'voucher';
  if (n.includes('авиабилет') || n.includes('билет') || /(?:^|\/)ticket/i.test(u)) {
    return 'ticket';
  }
  return null;
}

/**
 * Extract package data from order (handles nested package.package structure)
 */
export const getPackageData = (order?: Order) => {
  if (!order) return null;
  // API sometimes nests package info under package.package as on the web
  return (order as any)?.package?.package || (order as any)?.package || null;
};

export const getLtOrderPackage = (order?: Order) => {
  if (!order) return null;
  return (order as any)?.package ?? order;
};

export const getOrderIdForPay = (order?: Order) =>
  (order as any)?.order_id ?? order?.id ?? null;

function getOrderSortValue(order: Order): number {
  const source = order as any;
  const dateValue =
    source?.created_at ??
    source?.createdAt ??
    source?.updated_at ??
    source?.updatedAt ??
    source?.order_date ??
    source?.package?.created_at;

  if (dateValue != null) {
    if (typeof dateValue === 'number') {
      return dateValue < 10_000_000_000 ? dateValue * 1000 : dateValue;
    }
    const parsed = new Date(dateValue).getTime();
    if (Number.isFinite(parsed)) return parsed;
  }

  const id = Number(source?.order_id ?? source?.id ?? 0);
  return Number.isFinite(id) ? id : 0;
}

/** Returns a copy with the most recently created order first. */
export function sortOrdersNewestFirst(orders: Order[]): Order[] {
  return [...orders].sort(
    (first, second) => getOrderSortValue(second) - getOrderSortValue(first),
  );
}

export const getOrderPayAmount = (order?: Order): number => {
  const lt = getLtOrderPackage(order);
  const value = lt?.full_price ?? lt?.remaining_amount ?? lt?.price ?? 0;
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : 0;
};

export const canPayWithSbp = (order?: Order): boolean => {
  const lt = getLtOrderPackage(order);
  const methods = lt?.payment_methods;
  if (!Array.isArray(methods)) return true;
  const sbp = methods.find((m: { type?: string }) => m?.type === 'sbp');
  return sbp ? sbp.enable !== false : true;
};

export const isOrderCancelled = (order?: Order, pkg?: any): boolean => {
  if (!order) return false;
  const packageData = pkg ?? getPackageData(order);
  const lt = getLtOrderPackage(order);
  const state = String(
    packageData?.state ??
      lt?.state ??
      (order as any)?.order_state ??
      (order as any)?.state ??
      '',
  ).toLowerCase();
  const clientStatus = String(
    lt?.status_for_client ?? (order as any)?.package?.status_for_client ?? '',
  ).toLowerCase();

  return (
    state.includes('cancel') ||
    clientStatus.includes('отмен')
  );
};

export const isOrderAwaitingPayment = (order?: Order): boolean => {
  if (!order) return false;
  if (isOrderCancelled(order)) return false;
  const payStatus = String((order as any).pay_status ?? '').toUpperCase();
  if (payStatus === 'RECONCILED') return false;

  const lt = getLtOrderPackage(order);
  if (lt?.is_paid === true) return false;
  if (lt?.is_paid === false) return true;
  if (payStatus === 'CREATED') return true;

  const status = String(lt?.status_for_client ?? '').toLowerCase();
  if (status.includes('ожидает оплат')) return true;

  return lt?.is_paid !== true && payStatus !== 'RECONCILED';
};

export const getPaymentMethodLabel = (order?: Order): string => {
  if (isOrderCancelled(order)) return '';
  if (isOrderAwaitingPayment(order) && canPayWithSbp(order)) {
    return 'СБП';
  }
  return 'Банковская карта';
};

/**
 * Format order date from timestamp or date string
 */
export const formatOrderDate = (value?: number | string) => {
  if (!value) return '—';

  const date = typeof value === 'number' ? new Date(value * 1000) : new Date(value);
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
  }).format(date);
};

/**
 * Format travel period: "17 мая, сб – 24 мая, сб"
 */
export const formatPeriod = (pkg: any) => {
  const start = pkg?.dates_info?.start_date;
  const end = pkg?.dates_info?.end_date;
  if (!start || !end) return '';

  const formatter = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
  });
  const weekdayFormatter = new Intl.DateTimeFormat('ru-RU', {
    weekday: 'short',
  });

  const startDate = new Date(start);
  const endDate = new Date(end);
  return `${formatter.format(startDate)}, ${weekdayFormatter.format(
    startDate,
  )} – ${formatter.format(endDate)}, ${weekdayFormatter.format(endDate)}`;
};

/**
 * Format departure info: "Вылет: Москва, 17 мая"
 */
export const formatDeparture = (pkg: any) => {
  const departureDate = pkg?.dates_info?.start_date;
  if (!departureDate && !pkg?.departure) return '';

  const city =
    pkg?.departure?.name_ru ||
    pkg?.departure?.name_en ||
    pkg?.departure?.name ||
    '';

  const formatter = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
  });

  return `Вылет: ${city || '—'}, ${departureDate ? formatter.format(new Date(departureDate)) : ''}`;
};

/**
 * Collect tourists names from order/package
 */
export const collectTourists = (order: Order, pkg: any) => {
  const tourists =
    pkg?.tourists ||
    order?.tourists ||
    ((order as any)?.package?.tourists ?? []);

  if (!Array.isArray(tourists) || !tourists.length) return '';

  return tourists
    .map(t => `${t?.surname || ''} ${t?.name || ''}`.trim())
    .filter(Boolean)
    .join(', ');
};

export const ORDER_STATUS_COLORS = {
  cancelled: '#9E9E9E',
  confirmed: '#288556',
  pending: '#FE732E',
} as const;

export const resolveStatusKey = (
  pkg: any,
  order: Order,
): 'pending' | 'approved' | 'cancel' => {
  if (isOrderCancelled(order, pkg)) return 'cancel';
  if (isOrderAwaitingPayment(order)) return 'pending';

  const lastEvent = (order as any)?.last_lt_event;
  const lt = getLtOrderPackage(order);
  const clientStatus = String(
    lastEvent?.status ??
      lt?.status_for_client ??
      (order as any)?.package?.status_for_client ??
      '',
  ).toLowerCase();

  if (clientStatus.includes('отмен') || clientStatus.includes('аннул')) {
    return 'cancel';
  }
  if (clientStatus.includes('ожидает оплат')) return 'pending';

  const state = String(
    lastEvent?.state ??
      lastEvent?.event ??
      pkg?.state ??
      lt?.state ??
      (order as any)?.order_state ??
      (order as any)?.state ??
      '',
  ).toLowerCase();

  if (
    state.includes('cancel') ||
    state.includes('annul') ||
    state === 'cancelation'
  ) {
    return 'cancel';
  }
  if (
    state.includes('approve') ||
    state.includes('confirm') ||
    state === 'documents_sent' ||
    state === 'completed' ||
    state === 'paid'
  ) {
    return 'approved';
  }

  if (clientStatus.includes('подтверж') || clientStatus.includes('confirm')) {
    return 'approved';
  }

  return 'pending';
};

/**
 * Determine status badge background color.
 */
export const getStatusColor = (pkg: any, order: Order) => {
  const key = resolveStatusKey(pkg, order);
  if (key === 'cancel') return ORDER_STATUS_COLORS.cancelled;
  if (key === 'approved') return ORDER_STATUS_COLORS.confirmed;
  return ORDER_STATUS_COLORS.pending;
};

export const getStatusLabel = (order: Order, pkg?: any): string => {
  const lastEventStatus = (order as any)?.last_lt_event?.status;
  if (typeof lastEventStatus === 'string' && lastEventStatus.trim()) {
    return lastEventStatus.trim();
  }

  const packageData = pkg ?? getPackageData(order);
  const lt = getLtOrderPackage(order);
  const fromApi =
    lt?.status_for_client ?? (order as any)?.package?.status_for_client;
  if (fromApi) return String(fromApi);

  const key = resolveStatusKey(packageData, order);
  if (key === 'cancel') return 'Отменено';
  if (key === 'approved') return 'Подтверждено';
  if (isOrderAwaitingPayment(order)) return 'Ожидает оплаты';
  return 'В обработке';
};

/**
 * Get readable document name from URL
 */
export const getDocumentName = (url: string, providedName?: string): string => {
  if (providedName?.trim()) return providedName.trim();

  try {
    const urlParts = url.split('/');
    const rawFileName = urlParts[urlParts.length - 1].split('?')[0];
    const fileName = (() => {
      try {
        return decodeURIComponent(rawFileName);
      } catch {
        return rawFileName;
      }
    })();

    if (fileName.includes('agreement.pdf') || url.includes('agreement.pdf')) {
      return 'Договор оферты.pdf';
    }
    if (fileName.includes('license_agreement') || url.includes('license_agreement')) {
      return 'Лицензионный договор.pdf';
    }
    if (/voucher|ваучер/i.test(url) || /voucher/i.test(fileName)) {
      const orderMatch = url.match(/orders\/(\d+)/);
      const orderNum = orderMatch ? orderMatch[1] : '';
      return orderNum ? `Ваучер на отель_#${orderNum}.pdf` : 'Ваучер на отель.pdf';
    }
    if (/ticket|билет/i.test(url) || /ticket/i.test(fileName)) {
      const orderMatch = url.match(/orders\/(\d+)/);
      const orderNum = orderMatch ? orderMatch[1] : '';
      return orderNum ? `Авиабилет_#${orderNum}.pdf` : 'Авиабилет.pdf';
    }

    return fileName || 'Документ.pdf';
  } catch {
    return 'Документ.pdf';
  }
};

export function resolveDocumentUrl(url: string | undefined | null): string {
  if (!url) return '';
  const value = String(url).trim();
  if (!value) return '';

  if (isLevelTravelDocumentUrl(value)) return '';

  if (/^https?:\/\//i.test(value)) {
    // Local-dev absolute uploads → production API host.
    const localUpload = value.match(
      /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(\/uploads\/.*)$/i,
    );
    if (localUpload) {
      return encodeDocumentPath(`${API_BASE_URL}${localUpload[1]}`);
    }
    return encodeDocumentPath(value);
  }

  if (value.startsWith('//')) {
    const protocolRelative = `https:${value}`;
    return isLevelTravelDocumentUrl(protocolRelative)
      ? ''
      : encodeDocumentPath(protocolRelative);
  }

  // API stores public_url as `/uploads/orders/...`
  const path = value.startsWith('/') ? value : `/${value}`;
  return encodeDocumentPath(`${API_BASE_URL}${path}`);
}

function pushDocument(
  docs: OrderDocument[],
  seen: Set<string>,
  seenKinds: Set<string>,
  url: string | undefined | null,
  name?: string,
) {
  if (!url) return;
  if (isLevelTravelDocumentUrl(String(url))) return;

  const resolved = resolveDocumentUrl(url);
  if (!resolved || !isTotusHostedDocumentUrl(resolved)) return;

  const displayName = getDocumentName(resolved, name);
  const key = documentDedupeKey(resolved);
  if (seen.has(key)) return;

  const kind = documentKindKey(displayName, resolved);
  if (kind && seenKinds.has(kind)) return;

  seen.add(key);
  if (kind) seenKinds.add(kind);
  docs.push({ name: displayName, url: resolved });
}

/**
 * Collect unique order documents hosted on api.totus.club.
 * Prefers `/orders/documents` public_url (never Level Travel source_url).
 */
export function collectOrderDocuments(
  order?: Order | null,
  apiDocuments: OrderDocumentApiItem[] = [],
): OrderDocument[] {
  const docs: OrderDocument[] = [];
  const seen = new Set<string>();
  const seenKinds = new Set<string>();

  // 1) Dedicated documents API — Totus-hosted public_url only.
  for (const item of apiDocuments) {
    const totusUrl = item?.public_url || item?.url;
    if (!totusUrl || isLevelTravelDocumentUrl(String(totusUrl))) continue;
    pushDocument(docs, seen, seenKinds, totusUrl, item?.title);
  }

  if (!order) return docs;

  const lt = getLtOrderPackage(order);
  const orderAny = order as any;
  const packageData = orderAny?.package ?? {};
  const nestedPackage = packageData?.package ?? {};

  const sources = [orderAny, packageData, nestedPackage, lt].filter(Boolean);

  for (const src of sources) {
    pushDocument(docs, seen, seenKinds, src?.agreement_doc, 'Договор оферты.pdf');
    pushDocument(docs, seen, seenKinds, src?.agreement_license, 'Лицензионный договор.pdf');
    pushDocument(docs, seen, seenKinds, src?.voucher, 'Ваучер на отель.pdf');
    pushDocument(docs, seen, seenKinds, src?.ticket, 'Авиабилет.pdf');
  }

  const attachmentLists = [
    packageData?.attachments,
    nestedPackage?.attachments,
    lt?.attachments,
    packageData?.saved_documents,
    lt?.saved_documents,
  ];

  for (const list of attachmentLists) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      pushDocument(
        docs,
        seen,
        seenKinds,
        item?.public_url ?? item?.url,
        item?.title,
      );
    }
  }

  return docs;
}

export function formatDocumentsDescription(count: number): string {
  if (count <= 0) {
    return 'Документы по заказу появятся здесь после подтверждения тура';
  }
  const word =
    count === 1 ? 'документ' : count < 5 ? 'документа' : 'документов';
  return `${count} ${word} доступно для скачивания`;
}

// Re-export formatPrice for convenience
export { formatPrice };

