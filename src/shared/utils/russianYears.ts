/**
 * Склонение слова «год» для возраста в годах: 1 год, 2–4 года, 5+ лет;
 * исключения 11–14 → всегда «лет» (11 лет, 12 лет, …).
 */
export function ruYearsWord(age: number): 'год' | 'года' | 'лет' {
  const n = Math.abs(Math.trunc(Number.isFinite(age) ? age : 0));
  const mod100 = n % 100;
  const mod10 = n % 10;
  if (mod100 >= 11 && mod100 <= 14) {
    return 'лет';
  }
  if (mod10 === 1) {
    return 'год';
  }
  if (mod10 >= 2 && mod10 <= 4) {
    return 'года';
  }
  return 'лет';
}
