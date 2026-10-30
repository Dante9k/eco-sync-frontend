import type { DiffRecord, EcoStatus, SyncRunDiff, SyncRunPage, SyncRunSummary, SyncState, TriggerResult } from '../api/types';

const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === 'string';
const nullableText = (value: unknown) => value === null || text(value);
const count = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const date = (value: unknown) => text(value) && /^\d{4}-\d{2}-\d{2}T.*Z$/.test(value) && Number.isFinite(Date.parse(value));
const nullableDate = (value: unknown) => value === null || date(value);
export const isSyncState = (value: unknown): value is SyncState => ['idle', 'syncing', 'success', 'error'].includes(String(value));
const stats = (value: unknown) => object(value) && count(value.added) && count(value.updated) && count(value.removed);

export function isEcoStatus(value: unknown): value is EcoStatus {
  return object(value) && isSyncState(value.state) && nullableDate(value.lastSyncAt) && nullableDate(value.lastSuccessAt)
    && nullableDate(value.nextScheduledAt) && (value.lastError === null || (object(value.lastError) && text(value.lastError.message) && date(value.lastError.at)))
    && (value.progress === null || (typeof value.progress === 'number' && Number.isFinite(value.progress) && value.progress >= 0 && value.progress <= 100))
    && object(value.counts) && count(value.counts.source) && count(value.counts.target) && count(value.counts.pending);
}
function isRun(value: unknown): value is SyncRunSummary {
  return object(value) && text(value.runId) && !!value.runId && date(value.startedAt) && nullableDate(value.finishedAt)
    && isSyncState(value.state) && stats(value.stats) && object(value.stats) && count(value.stats.unchanged) && nullableText(value.errorMessage);
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
