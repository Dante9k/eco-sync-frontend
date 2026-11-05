import { createContext, useContext, useEffect, useLayoutEffect, useState, type PropsWithChildren } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

type Theme = 'light' | 'dark';
const ThemeContext = createContext<{ theme: Theme; toggle: () => void } | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const location = useLocation();
  const navigate = useNavigate();
  const [theme, setTheme] = useState<Theme>(() => {
    try { return localStorage.getItem('exo-theme') === 'dark' ? 'dark' : 'light'; } catch { return 'light'; }
  });
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    delete document.documentElement.dataset.design;
    try { localStorage.setItem('exo-theme', theme); localStorage.removeItem('exo-design'); } catch { /* Theme preferences can be unavailable in private browsing. */ }
  }, [theme]);
  useEffect(() => {
    // Old appearance links remain usable, with the retired switches removed.
    const params = new URLSearchParams(location.search);
    if (!params.has('design') && !params.has('compare')) return;
    params.delete('design');
    params.delete('compare');
    navigate({ pathname: location.pathname, search: params.toString(), hash: location.hash }, { replace: true, state: location.state });
  }, [location, navigate]);
  return <ThemeContext.Provider value={{ theme, toggle: () => setTheme(value => value === 'dark' ? 'light' : 'dark') }}>{children}</ThemeContext.Provider>;
}
export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useThemeContext must be used within ThemeProvider');
  return context;
}
