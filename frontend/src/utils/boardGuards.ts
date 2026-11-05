import type { BoardDirectory, BoardRecord, BoardRecordPage, BoardTask, BoardTaskPage, PersonRef } from '../api/types';
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === 'string';
const count = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const texts = (value: unknown) => Array.isArray(value) && value.every(text);
const date = (value: unknown) => text(value) && /^\d{4}-\d{2}-\d{2}T.*Z$/.test(value) && Number.isFinite(Date.parse(value));
const optionalDate = (value: unknown) => value === null || date(value);
const person = (value: unknown): value is PersonRef => object(value) && text(value.id) && !!value.id && text(value.name) && !!value.name;
const optionalPerson = (value: unknown) => value === null || person(value);
const base = (value: Record<string, unknown>) => ['simulation', 'custom'].includes(String(value.mode)) && date(value.updatedAt);
const page = (value: Record<string, unknown>) => base(value) && count(value.page) && value.page > 0
  && count(value.pageSize) && value.pageSize > 0 && value.pageSize <= 100 && count(value.total);
export function isBoardDirectory(value: unknown): value is BoardDirectory {
  return object(value) && base(value) && Array.isArray(value.items) && value.items.every(item =>
    person(item) && object(item) && text(item.department) && count(item.recordCount))
    && new Set(value.items.map(item => item.id)).size === value.items.length;
}
export function isBoardRecord(value: unknown): value is BoardRecord {
  if (!object(value)) return false;
  const summary = value.taskSummary;
  return ['recordId', 'number', 'type', 'reason', 'content', 'status', 'creatorDepartment'].every(key => text(value[key]))
    && !!value.recordId && !!value.number
    && ['startedAt', 'closedAt', 'relatedFileStartedAt', 'relatedFileClosedAt'].every(key => optionalDate(value[key]))
    && (value.durationDays === null || count(value.durationDays))
    && ['impacts', 'regions', 'relatedFileNumbers'].every(key => texts(value[key])) && optionalPerson(value.creator)
    && Array.isArray(value.matchedRoles) && value.matchedRoles.every(role => ['creator', 'primary', 'secondary'].includes(role))
    && new Set(value.matchedRoles).size === value.matchedRoles.length
    && object(summary) && count(summary.total) && count(summary.completed) && count(summary.matched)
    && summary.completed <= summary.total && summary.matched <= summary.total && optionalDate(summary.latestUpdatedAt);
}
export function isBoardRecordPage(value: unknown): value is BoardRecordPage {
  return object(value) && page(value) && Array.isArray(value.items) && value.items.every(isBoardRecord) && value.items.length <= Number(value.pageSize)
    && new Set(value.items.map(item => item.recordId)).size === value.items.length
    && new Set(value.items.map(item => item.number)).size === value.items.length
    && object(value.stats) && ['total', 'open', 'closed'].every(key => count((value.stats as Record<string, unknown>)[key]))
    && value.stats.total === Number(value.stats.open) + Number(value.stats.closed);
}
export function isBoardTask(value: unknown): value is BoardTask {
  return object(value) && text(value.taskId) && !!value.taskId && text(value.taskNumber) && !!value.taskNumber && text(value.taskStatus)
    && optionalPerson(value.taskPrimaryOwner) && Array.isArray(value.taskSecondaryOwners) && value.taskSecondaryOwners.every(person)
    && optionalDate(value.taskStartedAt) && optionalDate(value.taskUpdatedAt);
}
export function isBoardTaskPage(value: unknown): value is BoardTaskPage {
  return object(value) && page(value) && text(value.recordId) && !!value.recordId && Array.isArray(value.items)
    && value.items.every(isBoardTask) && value.items.length <= Number(value.pageSize)
    && new Set(value.items.map(item => item.taskId)).size === value.items.length;
}
