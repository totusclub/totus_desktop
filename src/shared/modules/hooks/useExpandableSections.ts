import type { ExpandableSection, ApiHotelData } from '../../types/hotel';

// Generate sections directly from backend data
export const generateSectionsFromData = (apiHotelData?: ApiHotelData): ExpandableSection[] => {
  if (!apiHotelData) {
    return [];
  }

  const sections: ExpandableSection[] = [];

  // Show "На территории" if territory exists
    if (apiHotelData.facts && apiHotelData.facts.length > 0) {
        sections.push({
            id: 'main',
            title: 'Главное об отеле',
            subtitle: 'Основная информация',
        });
    }

  if (apiHotelData.territory && apiHotelData.territory.length > 0) {
    sections.push({
      id: 'onSite',
      title: 'На территории',
      subtitle: 'Удобства и услуги',
    });
  }

  // Show "Для детей" if kids_facilities exists
  if (apiHotelData.kids_facilities && apiHotelData.kids_facilities.length > 0) {
    sections.push({
      id: 'forChildren',
      title: 'Для детей',
      subtitle: 'Детские услуги',
    });
  }

  // Show "Развлечения" if attractions exists
  if (apiHotelData.attractions && apiHotelData.attractions.length > 0) {
    sections.push({
      id: 'entertainment',
      title: 'Развлечения',
      subtitle: 'Спорт и досуг',
    });
  }

  // Show "Главное об отеле" if facts exists


  return sections;
};

// Transform API data to section format for modal content
export const transformApiDataToSections = (
  sectionId: string,
  apiHotelData?: ApiHotelData,
): { title: string; items: { title: string; icon_path?: string }[]; }[] => {
  if (!apiHotelData) {
    return [];
  }

  switch (sectionId) {
    case 'main': {
      // Use facts for main section
      if (apiHotelData.facts && apiHotelData.facts.length > 0) {
        return [
          {
            title: 'Главное об отеле',
            items: apiHotelData.facts.map(fact => {return {title: fact.title, icon_path: fact.icon_path}}),
          },
        ];
      }
      return [];
    }
    case 'entertainment': {
      // Use attractions for entertainment
      if (apiHotelData.attractions && apiHotelData.attractions.length > 0) {
        return [
          {
            title: 'Развлечения',
            items: apiHotelData.attractions.map(attraction => {return {title: attraction, icon_path: undefined}}),
          },
        ];
      }
      return [];
    }
    case 'onSite': {
      // Use territory for onSite
      if (apiHotelData.territory && apiHotelData.territory.length > 0) {
        return [
          {
            title: 'На территории',
            items: apiHotelData.territory.map(territory => {return {title: territory, icon_path: undefined}}),
          },
        ];
      }
      return [];
    }
    case 'forChildren': {
      // Use kids_facilities for children
      if (apiHotelData.kids_facilities && apiHotelData.kids_facilities.length > 0) {
        return [
          {
            title: 'Для детей',
            items: apiHotelData.kids_facilities.map(facility => {return {title: facility, icon_path: undefined}}),
          },
        ];
      }
      return [];
    }
    default:
      return [];
  }
};

