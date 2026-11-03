import { useCallback } from 'react';
import { useExo } from '../state/ExoContext';
import { actions, type ActiveTab } from '../state/actions';
import { useExoStatus } from './useExoStatus';
import { useExoHistory } from './useExoHistory';
import { useExoDiff } from './useExoDiff';
import { useTriggerSync } from './useTriggerSync';
import { useConfiguration } from './useConfiguration';
import { useOperationLogs } from './useOperationLogs';
import { useRunActions } from './useRunActions';

export function useDashboard() {
  const { state, dispatch } = useExo();
  const status = useExoStatus();
  const history = useExoHistory();
  const diff = useExoDiff();
  const logs = useOperationLogs(state.autoRefresh);
  const refresh = useCallback(() => {
    void status.refresh();
    void history.refresh();
    void diff.refresh();
    void logs.refresh();
  }, [status.refresh, history.refresh, diff.refresh, logs.refresh]);
  const trigger = useTriggerSync(refresh);
  const config = useConfiguration(refresh);
  const runActions = useRunActions(refresh);
  const refreshAll = () => { refresh(); void config.refresh(); };
  return { state, status, history, diff, trigger, config, logs, runActions, refresh: refreshAll,
    setTab: (tab: ActiveTab) => dispatch(actions.setTab(tab)),
    toggleAutoRefresh: () => dispatch({ type: 'TOGGLE_AUTO_REFRESH' }),
  };
}
