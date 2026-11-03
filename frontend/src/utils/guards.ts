import type { BusinessConfig, DiffRecord, ExoStatus, LogPage, SyncRunDiff, SyncRunPage, SyncRunSummary, SyncState, TriggerResult, ScheduleConfig } from '../api/types';

import { scheduleValidation } from './schedule';

const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === 'string';
const nullableText = (value: unknown) => value === null || text(value);
const count = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const date = (value: unknown) => text(value) && /^\d{4}-\d{2}-\d{2}T.*Z$/.test(value) && Number.isFinite(Date.parse(value));
const nullableDate = (value: unknown) => value === null || date(value);
export const isSyncState = (value: unknown): value is SyncState => ['idle', 'syncing', 'success', 'error'].includes(String(value));
const stats = (value: unknown) => object(value) && count(value.added) && count(value.updated) && count(value.removed);

export function isExoStatus(value: unknown): value is ExoStatus {
  return object(value) && isSyncState(value.state) && nullableDate(value.lastSyncAt) && nullableDate(value.lastSuccessAt)
    && nullableDate(value.nextScheduledAt) && (value.lastError === null || (object(value.lastError) && text(value.lastError.message) && date(value.lastError.at)))
    && (value.progress === null || (typeof value.progress === 'number' && Number.isFinite(value.progress) && value.progress >= 0 && value.progress <= 100))
    && object(value.counts) && count(value.counts.source) && count(value.counts.target) && count(value.counts.pending)
    && ['unconfigured', 'simulation', 'custom'].includes(String(value.mode)) && typeof value.ready === 'boolean'
    && (value.latestRun === null || isRun(value.latestRun))
    && (value.scheduleInfo === undefined || (object(value.scheduleInfo) && [null, 'started', 'skipped', 'failed'].includes(value.scheduleInfo.lastOutcome as string | null) && nullableDate(value.scheduleInfo.lastAttemptAt) && nullableText(value.scheduleInfo.message)));
}
function isRun(value: unknown): value is SyncRunSummary {
  return object(value) && text(value.runId) && !!value.runId && date(value.startedAt) && nullableDate(value.finishedAt)
    && (value.mode === undefined || ['unconfigured', 'simulation', 'custom'].includes(String(value.mode)))
    && isSyncState(value.state) && stats(value.stats) && object(value.stats) && count(value.stats.unchanged) && nullableText(value.errorMessage)
    && ['manual', 'scheduled'].includes(String(value.source)) && count(value.year) && count(value.configVersion) && text(value.stage)
    && object(value.counters) && ['fetched', 'valid', 'written', 'failed'].every(key => count((value.counters as Record<string, unknown>)[key]))
    && ['running', 'complete', 'failed', 'partial', 'interrupted'].includes(String(value.outcome)) && typeof value.recoverable === 'boolean'
    && ['pending', 'sending', 'sent', 'failed', 'disabled', 'none'].includes(String(value.notificationState)) && nullableText(value.notificationError)
    && count(value.warningCount) && object(value.timeRange) && count(value.timeRange.year) && date(value.timeRange.startInclusive)
    && date(value.timeRange.endExclusive) && text(value.timeRange.timezone);
}
export function isRunPage(value: unknown): value is SyncRunPage {
  return object(value) && Array.isArray(value.items) && value.items.every(isRun) && count(value.page) && value.page > 0
    && count(value.pageSize) && value.pageSize > 0 && value.pageSize <= 100 && count(value.total) && value.items.length <= value.pageSize;
}
function isRecord(value: unknown): value is DiffRecord {
  return object(value) && ['added', 'updated', 'removed'].includes(String(value.kind)) && text(value.key)
    && (value.fields === undefined || (Array.isArray(value.fields) && value.fields.every(field => object(field) && text(field.name) && nullableText(field.before) && nullableText(field.after))));
}
export function isRunDiff(value: unknown): value is SyncRunDiff {
  return object(value) && text(value.runId) && stats(value.summary) && Array.isArray(value.records) && value.records.every(isRecord);
}
export const isTriggerResult = (value: unknown): value is TriggerResult => object(value) && text(value.runId) && !!value.runId;

export function isSchedule(value: unknown): value is ScheduleConfig {
  if (!object(value) || typeof value.enabled !== 'boolean' || !text(value.time) || value.timezone !== 'Asia/Shanghai' || !['daily', 'weekly', 'monthly', 'interval'].includes(String(value.kind))) return false;
  const extras: Record<string, string[]> = { daily: [], weekly: ['weekday'], monthly: ['monthDay'], interval: ['intervalDays', 'startDate'] };
  const keys = ['enabled', 'kind', 'time', 'timezone', ...extras[String(value.kind)]];
  return Object.keys(value).length === keys.length && keys.every(key => key in value) && scheduleValidation(value as ScheduleConfig) === null;
}
export function isBusinessConfig(value: unknown): value is BusinessConfig {
  return object(value) && value.schemaVersion === 2 && count(value.version) && value.version > 0 && date(value.updatedAt)
    && isSchedule(value.schedule)
    && object(value.warnings) && Array.isArray(value.warnings.intervals) && value.warnings.intervals.every(interval => object(interval) && count(interval.minDays) && count(interval.maxDays) && interval.maxDays >= interval.minDays)
    && object(value.notifications) && typeof value.notifications.enabled === 'boolean'
    && object(value.integrations) && ['unconfigured', 'simulation', 'custom'].includes(String(value.integrations.mode))
    && ['sourceUrl', 'workflowUrl', 'tableId', 'uniqueKey'].every(key => text((value.integrations as Record<string, unknown>)[key]))
    && Array.isArray(value.integrations.managedFields) && value.integrations.managedFields.every(text)
    && object(value.logging) && ['INFO', 'DEBUG'].includes(String(value.logging.level));
}
export function isLogPage(value: unknown): value is LogPage {
  return object(value) && count(value.page) && value.page > 0 && count(value.pageSize) && value.pageSize > 0 && value.pageSize <= 100 && count(value.total)
    && Array.isArray(value.items) && value.items.length <= value.pageSize && value.items.every(item => object(item) && count(item.id) && date(item.at)
      && ['INFO', 'DEBUG', 'ERROR'].includes(String(item.level)) && text(item.event) && text(item.message) && nullableText(item.runId) && (item.configVersion === null || count(item.configVersion))
      && (item.context === undefined || (object(item.context) && (item.context.stage === undefined || text(item.context.stage))
        && (item.context.section === undefined || ['schedule', 'warnings', 'notifications', 'integrations', 'logging'].includes(String(item.context.section)))
        && (item.context.counters === undefined || (object(item.context.counters) && ['fetched', 'valid', 'written', 'failed'].every(key => count((item.context as {counters: Record<string, unknown>}).counters[key])))))));
}
