import type { ExoState } from './exoReducer';
export const selectIsSyncing = (state: ExoState) => state.status?.state === 'syncing' || !!state.activeRunId;
export const selectHasError = (state: ExoState) => Boolean(state.statusError || state.triggerError || state.historyError || state.diffError);
export const selectCanTrigger = (state: ExoState) => !!state.status && !state.statusError && !state.triggering && !selectIsSyncing(state);
