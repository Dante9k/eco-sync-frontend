import { useCallback, useEffect, useMemo, useState } from 'react';
import { getBoardTasks } from '../api/board';
import type { BoardRecordPage, BoardTaskPage, BoardTaskQuery } from '../api/types';
import { toUserMessage } from '../utils/format';
import { useLatestRequest } from './useLatestRequest';

export type LoadTaskPage = (recordId: string, query: BoardTaskQuery, signal: AbortSignal) => Promise<BoardTaskPage>;

// Cache belongs to the current parent-page response. Refreshing the board replaces it.
export function useTaskPages(revision: BoardRecordPage | null): LoadTaskPage {
  const cache = useMemo(() => new Map<string, { at: number; data: BoardTaskPage }>(), [revision]);
  return useCallback(async (recordId, query, signal) => {
    const key = JSON.stringify([recordId, query]);
    const cached = cache.get(key);
    if (cached && Date.now() - cached.at < 60_000) return cached.data;
    const data = await getBoardTasks(recordId, query, signal);
    if (!signal.aborted) {
      if (cache.size >= 20) cache.delete(cache.keys().next().value!);
      cache.set(key, { at: Date.now(), data });
    }
    return data;
  }, [cache]);
}

export function useBoardTasks(recordId: string, personId: string, load: LoadTaskPage) {
  const [query, setQuery] = useState<BoardTaskQuery>({ personId, scope: 'related', page: 1, pageSize: 5 });
  const [result, setResult] = useState<{ key: string; data: BoardTaskPage | null; error: string | null; loading: boolean }>({ key: '', data: null, error: null, loading: true });
  const { run, cancel } = useLatestRequest();
  const key = JSON.stringify([recordId, query]);
  const refresh = useCallback(() => {
    setResult({ key, data: null, error: null, loading: true });
    return run(signal => load(recordId, query, signal), data => setResult({ key, data, error: null, loading: false }),
      error => setResult({ key, data: null, error: toUserMessage(error), loading: false }));
  }, [recordId, query, key, run, load]);
  useEffect(() => { void refresh(); return cancel; }, [refresh, cancel]);
  return {
    query, data: result.key === key ? result.data : null, loading: result.key !== key || result.loading,
    error: result.key === key ? result.error : null, refresh,
    setPage: (page: number) => setQuery(previous => ({ ...previous, page })),
    setScope: (scope: BoardTaskQuery['scope']) => setQuery(previous => ({ ...previous, scope, page: 1 })),
  };
}
