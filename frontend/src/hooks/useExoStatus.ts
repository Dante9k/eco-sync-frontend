import { useCallback, useEffect, useRef } from 'react';
import { getStatus } from '../api/exo';
import { useExo } from '../state/ExoContext';
import { toUserMessage } from '../utils/format';
import { useInterval } from './useInterval';
import { useLatestRequest } from './useLatestRequest';
import { usePageVisibility } from './usePageVisibility';

export function useExoStatus() {
  const { state, dispatch } = useExo();
  const { run, pending } = useLatestRequest();
  const visible = usePageVisibility();
  const wasVisible = useRef(visible);
  const refresh = useCallback(() => {
    dispatch({ type: 'STATUS_LOADING' });
    return run(getStatus,
      payload => dispatch({ type: 'STATUS_OK', payload, fetchedAt: Date.now() }),
      error => dispatch({ type: 'STATUS_ERR', payload: toUserMessage(error) }));
  }, [dispatch, run]);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    if (visible && !wasVisible.current && state.autoRefresh && !pending.current) void refresh();
    wasVisible.current = visible;
  }, [visible, state.autoRefresh, pending, refresh]);
  useInterval(() => { if (!pending.current) void refresh(); }, state.autoRefresh && visible ? 10_000 : null);
  return { status: state.status, loading: state.statusLoading, error: state.statusError, refresh };
}
