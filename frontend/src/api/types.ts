export type ApiOk<T> = { ok: true; data: T };
export type ApiErr = { ok: false; error: { code: string; message: string; detail?: string } };
export type ApiResult<T> = ApiOk<T> | ApiErr;
export type SyncState = 'idle' | 'syncing' | 'success' | 'error';

export interface EcoStatus {
  state: SyncState;
  lastSyncAt: string | null;
  lastSuccessAt: string | null;
  lastError: { message: string; at: string } | null;
  progress: number | null;
  nextScheduledAt: string | null;
  counts: { source: number; target: number; pending: number };
}
export interface SyncRunSummary {
  runId: string;
  startedAt: string;
  finishedAt: string | null;
  state: SyncState;
  stats: { added: number; updated: number; removed: number; unchanged: number };
  errorMessage: string | null;
}
export interface SyncRunPage {
  items: SyncRunSummary[];
  page: number;
  pageSize: number;
  total: number;
}
export type DiffKind = 'added' | 'updated' | 'removed';
export interface DiffRecord {
  kind: DiffKind;
  key: string;
  fields?: Array<{ name: string; before: string | null; after: string | null }>;
}
export interface SyncRunDiff {
  runId: string;
  summary: { added: number; updated: number; removed: number };
  records: DiffRecord[];
}
export interface PageQuery { page: number; pageSize: number }
export interface HistoryQuery extends PageQuery { state: SyncState | 'all' }
export interface TriggerResult { runId: string }
