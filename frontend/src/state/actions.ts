import type { EcoStatus, HistoryQuery, SyncRunDiff, SyncRunPage, TriggerResult } from '../api/types';
export type ActiveTab = 'history' | 'diff';
export type EcoAction =
  | { type: 'STATUS_LOADING' }
  | { type: 'STATUS_OK'; payload: EcoStatus; fetchedAt: number }
  | { type: 'STATUS_ERR'; payload: string }
  | { type: 'TRIGGER_START' }
  | { type: 'TRIGGER_OK'; payload: TriggerResult }
  | { type: 'TRIGGER_ERR'; payload: string }
  | { type: 'HISTORY_QUERY'; payload: Partial<HistoryQuery> }
  | { type: 'HISTORY_LOADING' }
  | { type: 'HISTORY_OK'; payload: SyncRunPage }
  | { type: 'HISTORY_ERR'; payload: string }
  | { type: 'SELECT_RUN'; payload: string | null }
  | { type: 'DIFF_PAGE'; payload: number }
  | { type: 'DIFF_LOADING' }
  | { type: 'DIFF_OK'; payload: SyncRunDiff }
  | { type: 'DIFF_ERR'; payload: string }
  | { type: 'SET_TAB'; payload: ActiveTab }
  | { type: 'TOGGLE_AUTO_REFRESH' };
export const actions = {
  selectRun: (runId: string | null): EcoAction => ({ type: 'SELECT_RUN', payload: runId }),
  historyQuery: (query: Partial<HistoryQuery>): EcoAction => ({ type: 'HISTORY_QUERY', payload: query }),
  setTab: (tab: ActiveTab): EcoAction => ({ type: 'SET_TAB', payload: tab }),
};
