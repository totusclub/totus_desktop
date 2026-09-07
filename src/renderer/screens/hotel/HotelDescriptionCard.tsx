import React, { useMemo } from 'react';
import type { HotelInfo } from '@shared/types/hotel/hotelCard';
import type { ExpandableSection, ApiHotelData } from '@shared/types/hotel';
import { generateSectionsFromData } from '@shared/modules/hooks/useExpandableSections';
import { ChevronRightIcon } from '../../components/uiIcons';

// Порт hotel/HotelDescriptionCard.tsx + hotel/ExpandableSectionsList.tsx.

/** Порт ExpandableSectionsList: строки «Главное об отеле», «На территории», «Для детей», «Развлечения». */
const ExpandableSectionsList: React.FC<{ onSectionPress: (section: ExpandableSection) => void; apiHotelData?: ApiHotelData }> = ({
  onSectionPress,
  apiHotelData,
}) => {
  // Generate sections directly from backend data
  const sections = useMemo(() => generateSectionsFromData(apiHotelData), [apiHotelData]);

  // Don't render if no sections have data
  if (sections.length === 0) return null;

  return (
    <div>
      {sections.map((section, index) => (
        <button
          type="button"
          key={section.id}
          className={'hotel-section-row' + (index < sections.length - 1 ? ' hotel-section-row--border' : '')}
          onClick={() => onSectionPress(section)}>
          <span className="hotel-section-row__left">
            <span className="hotel-section-row__icon">
              <span className="hotel-section-row__circle" />
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <div className="hotel-section-row__title">{section.title}</div>
              <div className="hotel-section-row__sub">{section.subtitle}</div>
            </span>
          </span>
          <ChevronRightIcon size={20} className="hotel-section-row__arrow" />
        </button>
      ))}
    </div>
  );
};

type Props = {
  hotel: HotelInfo;
  onSectionPress: (section: ExpandableSection) => void;
  apiHotelData?: ApiHotelData;
};

export const HotelDescriptionCard: React.FC<Props> = ({ onSectionPress, apiHotelData }) => {
  // Get description from API data
  const getDescription = (): string | null => {
    if (apiHotelData?.short_info) return apiHotelData.short_info;
    if (apiHotelData?.hotel_info) {
      // Use first paragraph of hotel_info if short_info is not available
      const firstParagraph = apiHotelData.hotel_info.split('\n')[0];
      return firstParagraph || apiHotelData.hotel_info.substring(0, 200) + '...';
    }
    return null;
  };
  const description = getDescription();

  return (
    <section className="hotel-desc">
      <div className="hotel-desc__head">
        <h2 className="hotel-desc__title">Описание</h2>
      </div>
      {description ? <p className="hotel-desc__text">{description}</p> : null}
      <div className="hotel-desc__sections">
        <ExpandableSectionsList onSectionPress={onSectionPress} apiHotelData={apiHotelData} />
      </div>
    </section>
  );
};

export default HotelDescriptionCard;
