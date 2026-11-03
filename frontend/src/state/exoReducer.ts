import type { ExoStatus, HistoryQuery, SyncRunDiff, SyncRunPage } from '../api/types';
import type { ActiveTab, ExoAction } from './actions';

export interface ExoState {
  status: ExoStatus | null;
  statusLoading: boolean;
  statusError: string | null;
  triggering: boolean;
  triggerError: string | null;
  activeRunId: string | null;
  history: SyncRunPage | null;
  historyLoading: boolean;
  historyError: string | null;
  historyQuery: HistoryQuery;
  selectedRunId: string | null;
  diff: SyncRunDiff | null;
  diffLoading: boolean;
  diffError: string | null;
  diffPage: number;
  activeTab: ActiveTab;
  autoRefresh: boolean;
  lastFetchedAt: number | null;
}
export const initialState: ExoState = {
  status: null, statusLoading: true, statusError: null,
  triggering: false, triggerError: null, activeRunId: null,
  history: null, historyLoading: true, historyError: null,
  historyQuery: { page: 1, pageSize: 20, state: 'all' },
  selectedRunId: null, diff: null, diffLoading: false, diffError: null, diffPage: 1,
  activeTab: 'history', autoRefresh: true, lastFetchedAt: null,
};
export function exoReducer(state: ExoState, action: ExoAction): ExoState {
  switch (action.type) {
    case 'STATUS_LOADING': return { ...state, statusLoading: true, statusError: null };
    case 'STATUS_OK': return { ...state, status: action.payload, statusLoading: false, statusError: null, lastFetchedAt: action.fetchedAt, activeRunId: action.payload.state === 'syncing' ? state.activeRunId : null, triggerError: state.status?.state === 'syncing' && action.payload.state !== 'syncing' ? null : state.triggerError };
    case 'STATUS_ERR': return { ...state, statusLoading: false, statusError: action.payload };
    case 'TRIGGER_START': return { ...state, triggering: true, triggerError: null };
    case 'TRIGGER_OK': return { ...state, triggering: false, activeRunId: action.payload.runId, status: state.status ? { ...state.status, state: 'syncing', progress: 0 } : null };
    case 'TRIGGER_ERR': return { ...state, triggering: false, triggerError: action.payload };
    case 'HISTORY_QUERY': return { ...state, historyQuery: { ...state.historyQuery, ...action.payload, page: action.payload.state !== undefined ? 1 : action.payload.page ?? state.historyQuery.page }, history: null, historyLoading: true, historyError: null };
    case 'HISTORY_LOADING': return { ...state, historyLoading: true, historyError: null };
    case 'HISTORY_OK': return { ...state, history: action.payload, historyLoading: false, historyError: null };
    case 'HISTORY_ERR': return { ...state, historyLoading: false, historyError: action.payload };
    case 'SELECT_RUN': return { ...state, selectedRunId: action.payload, diff: null, diffPage: 1, diffError: null, diffLoading: !!action.payload, activeTab: action.payload ? 'diff' : 'history' };
    case 'DIFF_PAGE': return { ...state, diffPage: action.payload, diff: null, diffLoading: true, diffError: null };
    case 'DIFF_LOADING': return { ...state, diffLoading: true, diffError: null };
    case 'DIFF_OK': return action.payload.runId !== state.selectedRunId ? state : { ...state, diff: action.payload, diffLoading: false, diffError: null };
    case 'DIFF_ERR': return { ...state, diffLoading: false, diffError: action.payload };
    case 'SET_TAB': return { ...state, activeTab: action.payload, diffLoading: action.payload === 'history' ? false : state.diffLoading };
    case 'TOGGLE_AUTO_REFRESH': return { ...state, autoRefresh: !state.autoRefresh };
  }
}
