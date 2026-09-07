import React from 'react';
import type { ApiHotelData } from '@shared/types/hotel';
import { transformApiDataToSections } from '@shared/modules/hooks/useExpandableSections';
import { Modal } from '../../../components/Modal';
import { CheckmarkIcon, CloseIcon } from '../../../components/uiIcons';

// Порт hotel/modals/ExpandableSectionModal(+Content).tsx: центрированный диалог вместо шторки.

type Props = {
  visible: boolean;
  onClose: () => void;
  sectionId: string;
  sectionTitle: string;
  apiHotelData?: ApiHotelData;
};

const ICON_BASE_URL = 'https://img.cdn.level.travel/';

export const ExpandableSectionModal: React.FC<Props> = ({ visible, onClose, sectionId, sectionTitle, apiHotelData }) => {
  const sections = transformApiDataToSections(sectionId, apiHotelData);

  return (
    <Modal open={visible} onClose={onClose} width={640}>
      <div className="hotel-modal">
        <div className="hotel-modal__head">
          <div className="hotel-modal__titles">
            <div className="hotel-modal__title">{sectionTitle}</div>
          </div>
          <button type="button" className="hotel-modal__close" onClick={onClose} aria-label="Закрыть">
            <CloseIcon size={20} />
          </button>
        </div>

        {sections.length === 0 ? (
          <div className="hotel-modal__empty">Нет данных</div>
        ) : (
          <div className="hotel-modal__scroll">
            {sections.map((section, index) => (
              <div key={`section-${index}`} className="hotel-section-items">
                {section.items.map((item, itemIndex) => (
                  <div key={`item-${itemIndex}`} className="hotel-section-item">
                    {item.icon_path ? (
                      <img className="hotel-section-item__icon" src={`${ICON_BASE_URL}${item.icon_path}`} alt="" />
                    ) : (
                      <CheckmarkIcon size={20} />
                    )}
                    <span className="hotel-section-item__text">{item.title}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ExpandableSectionModal;
