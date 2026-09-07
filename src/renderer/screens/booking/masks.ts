// Маски полей формы бронирования — аналог react-native-masked-text в приложении:
// телефон '+7 999 999-99-99' (AppPhoneInput), дата '99.99.9999' (DateInput).

/** '+7 999 999-99-99' — как в AppPhoneInput приложения (итоговая длина 16 символов). */
export function formatPhoneMask(input: string): string {
  let digits = input.replace(/\D/g, '');
  if (input.trim().startsWith('+7')) {
    digits = digits.slice(1);
  } else if ((digits.startsWith('7') || digits.startsWith('8')) && digits.length > 10) {
    digits = digits.slice(1);
  }
  digits = digits.slice(0, 10);
  if (!digits) return '';
  let out = `+7 ${digits.slice(0, 3)}`;
  if (digits.length > 3) out += ` ${digits.slice(3, 6)}`;
  if (digits.length > 6) out += `-${digits.slice(6, 8)}`;
  if (digits.length > 8) out += `-${digits.slice(8, 10)}`;
  return out;
}

/** '99.99.9999' → DD.MM.YYYY (максимум 10 символов, как handleTextChange в DateInput). */
export function formatDateMask(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 8);
  if (!digits) return '';
  let out = digits.slice(0, 2);
  if (digits.length > 2) out += `.${digits.slice(2, 4)}`;
  if (digits.length > 4) out += `.${digits.slice(4, 8)}`;
  return out;
}

/** Парсинг "DD.MM.YYYY" → Date (порт parseDate из DateInput). */
export function parseMaskedDate(dateString: string): Date | null {
  if (!dateString || dateString.length !== 10) return null;
  const parts = dateString.split('.');
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year = parseInt(parts[2], 10);
  if (isNaN(month) || isNaN(day) || isNaN(year)) return null;
  if (month < 0 || month > 11) return null;
  if (day < 1 || day > 31) return null;
  if (year < 1900 || year > 2100) return null;
  return new Date(year, month, day);
}

export function formatDateToMask(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear().toString();
  return `${day}.${month}.${year}`;
}
