import { useState, useEffect } from 'react';

export function useTheme() {
  const [theme, setThemeState] = useState<'light' | 'dark'>(() => {
    const stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.setAttribute('data-color-mode', 'light')
    } else {
      document.documentElement.setAttribute('data-color-mode', 'dark')
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  return [theme, setThemeState] as const;
}
