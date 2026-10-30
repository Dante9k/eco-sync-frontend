import { useCallback } from 'react';
import { useEco } from '../state/EcoContext';
import { actions, type ActiveTab } from '../state/actions';
import { useEcoStatus } from './useEcoStatus';
import { useEcoHistory } from './useEcoHistory';
import { useEcoDiff } from './useEcoDiff';
import { useTriggerSync } from './useTriggerSync';

export function useDashboard() {
  const { state, dispatch } = useEco();
  const status = useEcoStatus();
  const history = useEcoHistory();
  const diff = useEcoDiff();
  const refresh = useCallback(() => {
    void status.refresh();
    void history.refresh();
    void diff.refresh();
  }, [status.refresh, history.refresh, diff.refresh]);
  const trigger = useTriggerSync(refresh);
  return { state, status, history, diff, trigger, refresh,
    setTab: (tab: ActiveTab) => dispatch(actions.setTab(tab)),
    toggleAutoRefresh: () => dispatch({ type: 'TOGGLE_AUTO_REFRESH' }),
  };
}
