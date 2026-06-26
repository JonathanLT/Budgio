'use client';

import { useState, useEffect } from 'react';
import { ThemeContext, applyTheme, THEMES, type Theme } from '@/hooks/useTheme';

function getStoredTheme(): Theme {
  try {
    const t = localStorage.getItem('budgio_theme') as Theme | null;
    if (t && t in THEMES) return t;
  } catch {}
  return 'clair';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('clair');

  useEffect(() => {
    const stored = getStoredTheme();
    setThemeState(stored);
    applyTheme(stored);
  }, []);

  function setTheme(next: Theme) {
    setThemeState(next);
    applyTheme(next);
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
