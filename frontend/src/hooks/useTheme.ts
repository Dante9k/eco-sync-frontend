import { useEffect, useState } from 'react';
export function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try { return localStorage.getItem('exo-theme') === 'dark' ? 'dark' : 'light'; } catch { return 'light'; }
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('exo-theme', theme); } catch { /* Preferences may be unavailable in private browsing. */ }
  }, [theme]);
  return { theme, toggle: () => setTheme(value => value === 'dark' ? 'light' : 'dark') };
}
