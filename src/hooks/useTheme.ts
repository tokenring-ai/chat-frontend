import { useState, useEffect, useRef } from 'react';

export function useTheme() {
  // Use ref to track initialization and prevent multiple localStorage reads
  const initializedRef = useRef(false);
  
  const [theme, setThemeState] = useState<'light' | 'dark'>(() => {
    // Only read from localStorage once during initialization
    const stored = typeof window !== 'undefined' ? localStorage.getItem('theme') : null;
    if (stored === 'light' || stored === 'dark') {
      document.documentElement.setAttribute('data-color-mode', stored);
      return stored;
    }
    return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });

  useEffect(() => {
    // Skip the first render since we already set the initial theme
    if (initializedRef.current) {
      if (theme === 'light') {
        document.documentElement.setAttribute('data-color-mode', 'light')
      } else {
        document.documentElement.setAttribute('data-color-mode', 'dark')
      }
      localStorage.setItem('theme', theme);
    }
    initializedRef.current = true;
  }, [theme]);

  return [theme, setThemeState] as const;
}
