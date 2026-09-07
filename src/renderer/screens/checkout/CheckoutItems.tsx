import React, { useMemo, useState } from 'react';
import type { Order } from '@shared/types/orders';
import { getPackageData, formatPeriod } from '@shared/utils/ordersUtils';
import { Icon } from '../../icons';
import { ChevronRightIcon } from '../../components/uiIcons';
import { FlightDetailsModal } from './FlightDetailsModal';

// Порт checkout/components/CheckoutItems.tsx: секции «Отдыхаем N ночей / Самое важное», «Кто летит»,
// «Где живем», «А что еще», «Контакты покупателя» — карточками в 2 колонки (Figma «Desktop / Checkout»).

interface CheckoutItemsProps {
  order: Order | null;
}

type RowProps = {
  label?: string;
  value: string;
  right?: React.ReactNode;
  arrow?: boolean;
  onClick?: () => void;
};

const InfoItem: React.FC<RowProps> = ({ label, value, right, arrow, onClick }) => {
  const content = (
    <>
      <div className="checkout-item__content">
        {label ? <div className="checkout-item__label">{label}</div> : null}
        <div className="checkout-item__value">{value}</div>
      </div>
      {right}
      {arrow ? <ChevronRightIcon size={24} className="checkout-item__arrow" /> : null}
    </>
  );
  if (onClick) {
    return (
      <button type="button" className="checkout-item checkout-item--btn" onClick={onClick}>
        {content}
      </button>
    );
  }
  return <div className="checkout-item">{content}</div>;
};

export const CheckoutItems: React.FC<CheckoutItemsProps> = ({ order }) => {
  const [flightModalVisible, setFlightModalVisible] = useState(false);

  const pkg = useMemo(() => getPackageData(order || undefined), [order]);
  const formatDate = useMemo(() => formatPeriod(pkg), [pkg]);

  if (!order) return null;

  return (
    <div className="checkout-sections">
      {/* Самое важное */}
      <section className="card checkout-section">
        <div className="checkout-section__header">Отдыхаем {pkg?.nights_count || 0} ночей</div>
        <div className="checkout-section__title checkout-section__title--strong">Самое важное</div>
        <div className="checkout-items">
          <InfoItem label="Даты перелёта" value={formatDate} onClick={() => setFlightModalVisible(true)} />
          <InfoItem
            label="Курорт"
            value={`${pkg?.hotel?.city || ''}, ${pkg?.hotel?.country || ''}`}
            right={pkg?.hotel?.visa?.needed ? <span className="checkout-item__visa">Требуется виза</span> : null}
          />
          <InfoItem label="Скорость бронирования" value="Быстрое подтверждение" />
          <InfoItem label="Туроператор" value={pkg?.operator?.name || ''} />
        </div>
      </section>

      {/* Кто летит */}
      <section className="card checkout-section">
        <div className="checkout-section__title">Кто летит</div>
        <div className="checkout-items">
          {order.package.tourists?.map((tourist: any, index: number) => (
            <InfoItem
              key={tourist.id || index}
              label={`${tourist.name} ${tourist.surname}`}
              value={`${tourist.birthday}, загран. паспорт ${tourist.passport || ''}`}
            />
          ))}
        </div>
      </section>

      {/* Где живем */}
      <section className="card checkout-section">
        <div className="checkout-section__title">Где живем</div>
        <div className="checkout-items">
          <InfoItem label="Отель" value={pkg?.hotel?.name || ''} />
          <InfoItem label="Номер" value={pkg?.room_info?.name_ru || ''} arrow />
          <InfoItem label="Питание" value={pkg?.pansion_description || ''} />
        </div>
      </section>

      {/* А что еще */}
      <section className="card checkout-section">
        <div className="checkout-section__title">А что еще</div>
        <div className="checkout-items">
          <InfoItem label="Страховка" value="Включена в стоимость" />
          <InfoItem label="Трансфер" value="Не включен в стоимость" />
        </div>
      </section>

      {/* Контакты покупателя */}
      <section className="card checkout-section">
        <div className="checkout-section__title">Контакты покупателя</div>
        <div className="checkout-items">
          {order.package.client?.phone ? <InfoItem value={order.package.client.phone} /> : null}
          {order.package.client?.email ? <InfoItem value={order.package.client.email} /> : null}
        </div>

        {order.package.client?.email ? (
          <div className="checkout-banner checkout-banner--compact">
            <Icon name="warning" size={24} color="var(--brand)" />
            <span className="checkout-banner__text">
              Отправим документы на <span className="checkout-banner__email">{order.package.client.email}</span>
            </span>
          </div>
        ) : null}
      </section>

      <FlightDetailsModal
        visible={flightModalVisible}
        onClose={() => setFlightModalVisible(false)}
        flightData={order.package.flights?.[0]}
      />
    </div>
  );
};

export default CheckoutItems;
