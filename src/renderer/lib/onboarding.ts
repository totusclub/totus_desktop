// Аналог utils/onboarding.ts приложения: флаг первого запуска.
const KEY = '@onboarding_completed';
export function isOnboardingCompleted(): boolean {
  try {
    return window.localStorage.getItem(KEY) === 'true';
  } catch {
    return true;
  }
}
export function setOnboardingCompleted(): void {
  try {
    window.localStorage.setItem(KEY, 'true');
  } catch {
    /* ignore */
  }
}
