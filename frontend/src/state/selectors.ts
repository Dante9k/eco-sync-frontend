import type { EcoState } from './ecoReducer';
export const selectIsSyncing = (state: EcoState) => state.status?.state === 'syncing' || !!state.activeRunId;
export const selectHasError = (state: EcoState) => Boolean(state.statusError || state.triggerError || state.historyError || state.diffError);
export const selectCanTrigger = (state: EcoState) => !!state.status && !state.statusError && !state.triggering && !selectIsSyncing(state);
