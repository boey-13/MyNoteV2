import React, { createContext, useContext, useMemo, useState } from 'react';
import { StatusBar } from 'react-native';
import { theme as lightTheme, AppTheme } from './theme';

type Ctx = {
  theme: AppTheme;
  isDark: boolean;
  toggleTheme: () => void;   // kept for future Settings page
  fontScale: number;         // 1.0 = default
  setFontScale: (v: number) => void;
};

const ThemeContext = createContext<Ctx | null>(null);

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);
  const [fontScale, setFontScale] = useState(1);

  // For now we only provide a light palette; dark can be added later.
  const value = useMemo<Ctx>(() => ({
    theme: lightTheme,
    isDark,
    toggleTheme: () => setIsDark((v) => !v),
    fontScale,
    setFontScale,
  }), [isDark, fontScale]);

  return (
    <ThemeContext.Provider value={value}>
      <StatusBar barStyle="dark-content" backgroundColor={lightTheme.colors.background} />
      {children}
    </ThemeContext.Provider>
  );
}

export const useAppTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useAppTheme must be used inside ThemeProvider');
  return ctx;
};
