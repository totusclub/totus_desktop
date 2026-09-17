import React, { useMemo, useState } from 'react';
import type { Order } from '@shared/types/orders';
import {
  collectOrderDocuments,
  formatDocumentsDescription,
  formatPeriod,
  getDocumentName,
  type OrderDocumentApiItem,
} from '@shared/utils/ordersUtils';
import { formatTotusMoney, formatTotusStayPeriod, type TotusBooking } from '@shared/utils/totusBooking';
import { Icon } from '../../icons';
import { ChevronRightIcon } from '../../components/uiIcons';
import { openExternal } from '../../lib/desktop';
import { FlightDetailsModal } from '../checkout/FlightDetailsModal';

// Порт component/orders/order/OrderDetailsSections.tsx (+ InfoRow, DocumentsModal): правая колонка деталей заказа —
// «Документы» (список; клик → openExternal), «Самое важное», «Отель и номер».
// Внутренний заказ (totusBooking): ваучер из totus_booking.voucher добавляется к документам /orders/documents,
// «Туроператор» — из totus_booking.operator (Arlekino), без перелёта (модалка рейса не открывается).

type Props = {
  pkg: any;
  hotelName: string;
  destination: string;
  order: Order | null;
  apiDocuments?: OrderDocumentApiItem[];
  totusBooking?: TotusBooking | null;
};

/** Описание блока «Документы» для внутреннего заказа (макет: «Чек об оплате · ваучер появится после подтверждения»). */
function getTotusDocumentsDescription(booking: TotusBooking, count: number): string {
  if (booking.status === 'confirmed') {
    if (count > 0) return formatDocumentsDescription(count);
    return 'Ваучер пришлём на e-mail и добавим сюда';
  }
  if (booking.status === 'rejected' || booking.status === 'cancelled') {
    const refund = formatTotusMoney(booking.refund?.amount ?? booking.paidAmount ?? booking.finalPrice);
    const refundLine = refund
      ? booking.refund?.status === 'done'
        ? `Возврат ${refund} выполнен`
        : `Возврат ${refund} выполним вручную в течение 1–3 дней`
      : '';
    return [count > 0 ? formatDocumentsDescription(count) : '', refundLine].filter(Boolean).join(' · ') || 'Документов нет';
  }
  return count > 0
    ? `${formatDocumentsDescription(count)} · ваучер появится после подтверждения`
    : 'Ваучер появится после подтверждения бронирования';
}

type InfoRowProps = {
  label: string;
  value: string;
  rightValue?: string;
  showArrow?: boolean;
  onPress?: () => void;
};

const InfoRow: React.FC<InfoRowProps> = ({ label, value, rightValue, showArrow, onPress }) => {
  const content = (
    <>
      <div className="order-info__left">
        <div className="order-info__label">{label}</div>
        <div className="order-info__values">
          <span className="order-info__value">{value}</span>
          {rightValue ? <span className="order-info__right">{rightValue}</span> : null}
        </div>
      </div>
      {showArrow ? <ChevronRightIcon size={20} className="order-info__arrow" /> : null}
    </>
  );
  if (onPress) {
    return (
      <button type="button" className="order-info order-info--btn" onClick={onPress}>
        {content}
      </button>
    );
  }
  return <div className="order-info">{content}</div>;
};

export const OrderDetailsSections: React.FC<Props> = ({
  pkg,
  hotelName,
  destination,
  order,
  apiDocuments = [],
  totusBooking = null,
}) => {
  const [flightModalVisible, setFlightModalVisible] = useState(false);

  const documents = useMemo(
    () =>
      collectOrderDocuments(
        order,
        totusBooking?.voucher?.url
          ? [...apiDocuments, { title: totusBooking.voucher.title || 'Ваучер', url: totusBooking.voucher.url }]
          : apiDocuments,
      ),
    [order, apiDocuments, totusBooking],
  );
  const documentsDescription = useMemo(
    () =>
      totusBooking
        ? getTotusDocumentsDescription(totusBooking, documents.length)
        : formatDocumentsDescription(documents.length),
    [documents.length, totusBooking],
  );

  const periodValue = (totusBooking ? formatTotusStayPeriod(totusBooking) : '') || formatPeriod(pkg) || '—';
  const operatorValue = totusBooking ? totusBooking.operator : 'Level.Travel';
  const roomValue = (totusBooking ? totusBooking.room : '') || pkg?.room_type || '—';
  const mealValue = totusBooking
    ? [totusBooking.mealName, totusBooking.meal ? `(${totusBooking.meal})` : ''].filter(Boolean).join(' ') ||
      pkg?.pansion_description
    : pkg?.pansion_description;

  return (
    <>
      <div className="card card--shadow order-details__card">
        {/* Документы */}
        <div className="order-docs">
          <div className="order-docs__head">
            <Icon name="document" size={24} />
            <span className="order-docs__title">Документы</span>
          </div>
          <div className="order-docs__description">{documentsDescription}</div>
          {documents.length > 0 ? (
            <div className="order-docs__list">
              {documents.map((doc, index) => (
                <button
                  type="button"
                  key={`${doc.url}-${index}`}
                  className="order-docs__row"
                  onClick={() => openExternal(doc.url)}
                  title={doc.name || getDocumentName(doc.url)}>
                  <Icon name="document" size={20} />
                  <span className="order-docs__name">{doc.name || getDocumentName(doc.url)}</span>
                  <ChevronRightIcon size={18} className="order-info__arrow" />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {/* Самое важное */}
        <div className="order-section">
          <div className="order-section__header">Самое важное</div>
          <div className="order-info-panel">
            {totusBooking ? (
              <InfoRow label="Отель" value={periodValue} />
            ) : (
              <InfoRow label="Отель" value={periodValue} showArrow onPress={() => setFlightModalVisible(true)} />
            )}
            <div className="divider" />
            <InfoRow label="Курорт" value={destination || '—'} rightValue={pkg?.hotel?.country ? 'Виза не нужна' : undefined} />
            <div className="divider" />
            <InfoRow label="Туроператор" value={operatorValue} />
          </div>
        </div>

        {/* Отель и номер */}
        <div className="order-section">
          <div className="order-section__header">Отель и номер</div>
          <div className="order-info-panel">
            <InfoRow label="Отель" value={hotelName || '—'} showArrow />
            <div className="divider" />
            <InfoRow label="Номер" value={roomValue} showArrow />
            <div className="divider" />
            <InfoRow label="Питание" value={mealValue} />
          </div>
        </div>
      </div>

      <FlightDetailsModal
        visible={flightModalVisible}
        onClose={() => setFlightModalVisible(false)}
        flightData={order?.package?.flights?.[0] || pkg?.flights?.[0]}
      />
    </>
  );
};

export default OrderDetailsSections;
