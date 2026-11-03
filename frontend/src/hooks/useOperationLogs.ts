import { useCallback, useEffect, useState } from 'react';
import { getLogs } from '../api/exo';
import type { LogPage, LogQuery } from '../api/types';
import { toUserMessage } from '../utils/format';
import { useLatestRequest } from './useLatestRequest';
import { useInterval } from './useInterval';
import { usePageVisibility } from './usePageVisibility';

export function useOperationLogs(autoRefresh: boolean) {
  const [query, setQuery] = useState<LogQuery>({ page: 1, pageSize: 10, level: '', category: '' });
  const [page, setPage] = useState<LogPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { run, cancel, pending } = useLatestRequest();
  const visible = usePageVisibility();
  const refresh = useCallback(() => {
    setLoading(true);
    return run(signal => getLogs(query, signal), result => { setPage(result); setError(null); setLoading(false); }, failure => { setError(toUserMessage(failure)); setLoading(false); });
  }, [query, run]);
  useEffect(() => { void refresh(); return cancel; }, [refresh, cancel]);
  useInterval(() => { if (!pending.current) void refresh(); }, autoRefresh && visible ? 10_000 : null);
  return { page, query, error, loading, refresh, changeQuery: (change: Partial<LogQuery>) => { cancel(); setPage(null); setQuery(previous => ({ ...previous, ...change, page: change.page ?? 1 })); } };
}
