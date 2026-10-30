import { useEffect, useRef } from 'react';
export function useInterval(callback: () => void, delay: number | null) {
  const latest = useRef(callback);
  useEffect(() => { latest.current = callback; }, [callback]);
  useEffect(() => {
    if (delay === null) return;
    const timer = window.setInterval(() => latest.current(), delay);
    return () => window.clearInterval(timer);
  }, [delay]);
}
