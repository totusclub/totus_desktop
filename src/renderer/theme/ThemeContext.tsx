import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { desktop, type ThemeName } from '../lib/desktop';

// Аналог context/ThemeContext.tsx из totus_APP: режим light | dark | system, хранится в localStorage.
export type ThemeMode = 'light' | 'dark' | 'system';
const STORAGE_KEY = '@app_theme_mode';

type ThemeContextValue = {
  mode: ThemeMode;
  resolved: ThemeName;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredMode(): ThemeMode {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    /* ignore */
  }
  return 'system';
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<ThemeMode>(readStoredMode);
  const [system, setSystem] = useState<ThemeName>('light');

  useEffect(() => {
    let alive = true;
    desktop.getSystemTheme().then(t => alive && setSystem(t)).catch(() => undefined);
    const off = desktop.onSystemThemeChanged(t => setSystem(t));
    return () => {
      alive = false;
      off();
    };
  }, []);

  const resolved: ThemeName = mode === 'system' ? system : mode;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolved);
    void desktop.setTitleBarTheme(resolved);
  }, [resolved]);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    try {
      window.localStorage.setItem(STORAGE_KEY, m);
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(() => setMode(resolved === 'dark' ? 'light' : 'dark'), [resolved, setMode]);

  const value = useMemo(
    () => ({ mode, resolved, isDark: resolved === 'dark', setMode, toggle }),
    [mode, resolved, setMode, toggle],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
