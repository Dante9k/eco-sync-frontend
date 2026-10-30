import { useCallback, useEffect } from 'react';
import { getDiff } from '../api/eco';
import { useEco } from '../state/EcoContext';
import { actions } from '../state/actions';
import { toUserMessage } from '../utils/format';
import { useLatestRequest } from './useLatestRequest';

export const DIFF_PAGE_SIZE = 20;
export function useEcoDiff() {
  const { state, dispatch } = useEco();
  const { run, cancel } = useLatestRequest();
  const { selectedRunId, diffPage, activeTab } = state;
  const refresh = useCallback(() => {
    if (!selectedRunId || activeTab !== 'diff') return;
    dispatch({ type: 'DIFF_LOADING' });
    return run(signal => getDiff(selectedRunId, { page: diffPage, pageSize: DIFF_PAGE_SIZE }, signal),
      payload => dispatch({ type: 'DIFF_OK', payload }),
      error => dispatch({ type: 'DIFF_ERR', payload: toUserMessage(error) }));
  }, [selectedRunId, diffPage, activeTab, dispatch, run]);
  useEffect(() => { void refresh(); return cancel; }, [refresh, cancel, state.status?.state]);
  const selectRun = useCallback((runId: string) => { cancel(); dispatch(actions.selectRun(runId)); }, [cancel, dispatch]);
  const changePage = useCallback((page: number) => { cancel(); dispatch({ type: 'DIFF_PAGE', payload: page }); }, [cancel, dispatch]);
  return { refresh, selectRun, changePage };
}
