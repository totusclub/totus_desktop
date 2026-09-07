// Document type mapping
export const documentTypeMap: Record<string, string> = {
  'Заграничный паспорт РФ': 'international_passport',
  'Внутренний паспорт РФ': 'internal_passport',
  'Загранпаспорт другого государства': 'international_passport_other',
};

export const documentTypeReverseMap: Record<string, string> = {
  'international_passport': 'Заграничный паспорт РФ',
  'internal_passport': 'Внутренний паспорт РФ',
  'international_passport_other': 'Загранпаспорт другого государства',
};

// Nationality mapping (name to ID)
export const nationalityMap: Record<string, number> = {
  'Россия': 225,
  // 'Украина': 226,
  'Беларусь': 227,
  'Казахстан': 228,
};

export const nationalityReverseMap: Record<number, string> = {
  225: 'Россия',
  // 226: 'Украина',
  227: 'Беларусь',
  228: 'Казахстан',
};

export const DEFAULT_NATIONALITY_ID = nationalityMap['Россия'];

// Booking is available for Russian citizens only
export const citizenshipOptions = ['Россия'];

export const documentTypeOptions = [
  'Заграничный паспорт РФ',
  'Внутренний паспорт РФ',
  'Загранпаспорт другого государства',
];

export const getChildAgeRange = (age?: number): string => {
  if (!age) return '';
  if (age < 2) return 'до 2 лет';
  if (age < 12) return `${age} лет`;
  return `${age} лет`;
};

// Get placeholder text for name fields based on document type
export const getNamePlaceholder = (field: 'name' | 'surname' | 'patronymic', docType: string): string => {
  const isInternationalPassport = docType === 'international_passport' || docType === 'international_passport_other';
  const isInternalPassport = docType === 'internal_passport';

  if (isInternationalPassport) {
    const placeholders = {
      name: 'Имя латиницей',
      surname: 'Фамилия латиницей',
      patronymic: 'Отчество латиницей',
    };
    return placeholders[field];
  } else if (isInternalPassport) {
    const placeholders = {
      name: 'Имя кириллицей',
      surname: 'Фамилия кириллицей',
      patronymic: 'Отчество кириллицей',
    };
    return placeholders[field];
  }
  // Default
  const placeholders = {
    name: 'Имя латиницей',
    surname: 'Фамилия латиницей',
    patronymic: 'Отчество латиницей',
  };
  return placeholders[field];
};

