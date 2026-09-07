import React from 'react';

// Порт checkout/CheckoutSkeleton.tsx: карточки секций + карточка «Всего за тур».

const SECTIONS: Array<{ withHeader?: boolean; rows: number }> = [
  { withHeader: true, rows: 4 },
  { rows: 2 },
  { rows: 3 },
  { rows: 2 },
  { rows: 2 },
];

const Box: React.FC<{ w?: number | string; h: number; r?: number }> = ({ w = '100%', h, r = 8 }) => (
  <div className="skeleton" style={{ width: w, height: h, borderRadius: r, flex: 'none' }} />
);

export const CheckoutSkeleton: React.FC = () => (
  <div className="checkout">
    <div className="checkout__main">
      <div className="checkout-sections">
        {SECTIONS.map((section, sectionIndex) => (
          <section key={`section-${sectionIndex}`} className="card checkout-section">
            {section.withHeader ? (
              <div className="checkout-section__header">
                <Box w={168} h={20} />
              </div>
            ) : null}
            <div className="checkout-section__title">
              <Box w={132} h={18} />
            </div>
            <div className="checkout-items">
              {Array.from({ length: section.rows }).map((_, rowIndex) => (
                <div key={`row-${sectionIndex}-${rowIndex}`} className="checkout-item">
                  <div className="checkout-item__content">
                    <Box w="55%" h={20} />
                    <Box w="80%" h={18} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
    <aside className="checkout__side">
      <div className="card card--shadow checkout-total">
        <div className="checkout-total__content">
          <Box w={88} h={14} />
          <Box w={140} h={24} />
        </div>
        <Box h={52} r={14} />
      </div>
    </aside>
  </div>
);

export default CheckoutSkeleton;
