export type ApiOk<T> = { ok: true; data: T };
export type ApiErr = { ok: false; error: { code: string; message: string; detail?: string } };
export type ApiResult<T> = ApiOk<T> | ApiErr;
export type SyncState = 'idle' | 'syncing' | 'success' | 'error';

export interface ExoStatus {
  state: SyncState;
  lastSyncAt: string | null;
  lastSuccessAt: string | null;
  lastError: { message: string; at: string } | null;
  progress: number | null;
  nextScheduledAt: string | null;
  scheduleInfo?: { lastOutcome: 'started' | 'skipped' | 'failed' | null; lastAttemptAt: string | null; message: string | null };
  counts: { source: number; target: number; pending: number };
  mode: IntegrationMode;
  ready: boolean;
  latestRun: SyncRunSummary | null;
}
export interface SyncRunSummary {
  mode?: IntegrationMode;
  runId: string;
  startedAt: string;
  finishedAt: string | null;
  state: SyncState;
  stats: { added: number; updated: number; removed: number; unchanged: number };
  errorMessage: string | null;
  source: 'manual' | 'scheduled';
  year: number;
  configVersion: number;
  stage: string;
  counters: { fetched: number; valid: number; written: number; failed: number };
  outcome: 'running' | 'complete' | 'failed' | 'partial' | 'interrupted';
  recoverable: boolean;
  notificationState: 'pending' | 'sending' | 'sent' | 'failed' | 'disabled' | 'none';
  notificationError: string | null;
  warningCount: number;
  timeRange: { year: number; startInclusive: string; endExclusive: string; timezone: string };
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

export type IntegrationMode = 'unconfigured' | 'simulation' | 'custom';
export interface WarningInterval { minDays: number; maxDays: number }
export type ScheduleConfig = { enabled: boolean; time: string; timezone: 'Asia/Shanghai' } & (
  | { kind: 'daily' }
  | { kind: 'weekly'; weekday: number }
  | { kind: 'monthly'; monthDay: number }
  | { kind: 'interval'; intervalDays: number; startDate: string }
);
export interface BusinessConfig {
  schemaVersion: 2;
  version: number;
  updatedAt: string;
  schedule: ScheduleConfig;
  warnings: { intervals: WarningInterval[] };
  notifications: { enabled: boolean };
  integrations: {
    mode: IntegrationMode; sourceUrl: string; workflowUrl: string; tableId: string;
    uniqueKey: string; managedFields: string[];
  };
  logging: { level: 'INFO' | 'DEBUG' };
}
export type ConfigSection = 'schedule' | 'warnings' | 'notifications' | 'integrations' | 'logging';
export interface OperationLog {
  id: number; at: string; level: 'INFO' | 'DEBUG' | 'ERROR'; event: string; message: string;
  runId: string | null; configVersion: number | null;
  context?: { stage?: string; source?: 'manual' | 'scheduled'; outcome?: string; section?: ConfigSection; counters?: SyncRunSummary['counters'] };
}
export interface LogPage { items: OperationLog[]; page: number; pageSize: number; total: number }
export interface LogQuery extends PageQuery { level: '' | 'INFO' | 'DEBUG' | 'ERROR'; category: '' | 'config' | 'sync' | 'notification' | 'schedule' }

export interface PersonRef { id: string; name: string }
export interface BoardPerson extends PersonRef { department: string; recordCount: number }
export interface BoardDirectory { items: BoardPerson[]; mode: IntegrationMode; updatedAt: string }
export interface BoardRecord {
  recordId: string; number: string; type: string; reason: string; content: string;
  startedAt: string | null; durationDays: number | null; closedAt: string | null; status: string;
  impacts: string[]; regions: string[]; creator: PersonRef | null; creatorDepartment: string;
  relatedFileNumbers: string[];
  taskSummary: { total: number; completed: number; matched: number; latestUpdatedAt: string | null };
  matchedRoles: Array<'creator' | 'primary' | 'secondary'>;
  relatedFileStartedAt: string | null; relatedFileClosedAt: string | null;
}
export interface BoardQuery extends PageQuery { personId: string; search: string; status: 'all' | 'open' | 'closed' }
export interface BoardRecordPage {
  items: BoardRecord[]; page: number; pageSize: number; total: number;
  stats: { total: number; open: number; closed: number }; mode: IntegrationMode; updatedAt: string;
}

export interface BoardTask {
  taskId: string; taskNumber: string; taskPrimaryOwner: PersonRef | null; taskSecondaryOwners: PersonRef[];
  taskStatus: string; taskStartedAt: string | null; taskUpdatedAt: string | null;
}
export interface BoardTaskQuery extends PageQuery { personId: string; scope: 'related' | 'all' }
export interface BoardTaskPage {
  recordId: string; items: BoardTask[]; total: number; page: number; pageSize: number;
  mode: IntegrationMode; updatedAt: string;
}
