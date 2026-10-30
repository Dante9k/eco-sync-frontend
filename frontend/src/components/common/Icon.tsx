import type { CSSProperties } from 'react';
export type IconName = 'sync' | 'database' | 'target' | 'clock' | 'arrow' | 'chevronLeft' | 'chevronRight' | 'check' | 'alert' | 'close' | 'history' | 'diff' | 'plus' | 'minus' | 'edit' | 'layers' | 'activity' | 'external' | 'pause';
const paths: Record<IconName, React.ReactNode> = {
  sync: <><path d="M20 7h-9M17 4l3 3-3 3M4 17h9M7 14l-3 3 3 3"/><path d="M5 10a7 7 0 0 1 11-5M19 14a7 7 0 0 1-11 5"/></>,
  database: <><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0"/></>,
  target: <><rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 8h8M8 12h8M8 16h4"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  arrow: <path d="M4 12h16m-5-5 5 5-5 5"/>,
  chevronLeft: <path d="m14 6-6 6 6 6"/>,
  chevronRight: <path d="m10 6 6 6-6 6"/>,
  check: <path d="m5 12 4 4L19 6"/>,
  alert: <><path d="M10.3 4.5 2 19a1 1 0 0 0 1 1.5h18a1 1 0 0 0 1-1.5L13.7 4.5a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></>,
  close: <path d="m6 6 12 12M18 6 6 18"/>,
  history: <><path d="M3 11a9 9 0 1 1 2 7M3 5v6h6M12 7v5l4 2"/></>,
  diff: <><rect x="3" y="4" width="7" height="16" rx="1"/><rect x="14" y="4" width="7" height="16" rx="1"/><path d="M5 9h3M16 9h3M17.5 7.5v3"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  minus: <path d="M5 12h14"/>,
  edit: <><path d="m15 4 5 5-11 11H4v-5ZM13 6l5 5"/></>,
  layers: <><path d="m12 3 10 5-10 5L2 8ZM2 12l10 5 10-5M2 16l10 5 10-5"/></>,
  activity: <path d="M2 12h4l3-8 6 16 3-8h4"/>,
  external: <><path d="M14 3h7v7M21 3 10 14M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5"/></>,
  pause: <><path d="M8 5v14M16 5v14"/></>,
};
export function Icon({ name, size = 18, className, style }: { name: IconName; size?: number; className?: string; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} style={style}>{paths[name]}</svg>;
}
