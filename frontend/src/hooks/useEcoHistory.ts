import { useCallback, useEffect, useRef } from 'react';
import { getHistory } from '../api/eco';
import type { HistoryQuery } from '../api/types';
import { useEco } from '../state/EcoContext';
import { actions } from '../state/actions';
import { toUserMessage } from '../utils/format';
import { useLatestRequest } from './useLatestRequest';

export function useEcoHistory() {
  const { state, dispatch } = useEco();
  const { run, cancel } = useLatestRequest();
  const query = state.historyQuery;
  const refresh = useCallback(() => {
    dispatch({ type: 'HISTORY_LOADING' });
    return run(signal => getHistory(query, signal),
      payload => dispatch({ type: 'HISTORY_OK', payload }),
      error => dispatch({ type: 'HISTORY_ERR', payload: toUserMessage(error) }));
  }, [query, dispatch, run]);
  useEffect(() => { void refresh(); return cancel; }, [refresh, cancel]);
  const statusKey = state.status ? `${state.status.state}:${state.status.lastSyncAt}` : null;
  const previous = useRef<string | null>(null);
  useEffect(() => {
    if (previous.current !== null && statusKey !== previous.current) void refresh();
    previous.current = statusKey;
  }, [statusKey, refresh]);
  const changeQuery = useCallback((payload: Partial<HistoryQuery>) => {
    cancel();
    dispatch(actions.historyQuery(payload));
  }, [dispatch, cancel]);
  return { refresh, changeQuery };
}
