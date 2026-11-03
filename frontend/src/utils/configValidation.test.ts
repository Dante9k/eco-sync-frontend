import { describe, expect, it } from 'vitest';
import type { BusinessConfig, WarningInterval, ScheduleConfig } from '../api/types';
import { validateConfigDraft } from './configValidation';
import { isSchedule } from './guards';
import { formatWarningRange, changeScheduleKind, formatSchedule } from './schedule';

const config = (): BusinessConfig => ({
  schemaVersion: 2, version: 1, updatedAt: '2026-01-01T00:00:00Z',
  schedule: { enabled: false, kind:'daily', time:'09:00', timezone:'Asia/Shanghai' }, warnings: { intervals: [] },
  notifications: { enabled: false }, logging: { level: 'INFO' },
  integrations: { mode: 'simulation', sourceUrl: '', workflowUrl: '', tableId: 'demo', uniqueKey: 'id', managedFields: ['title'] },
});
function warnings(intervals: WarningInterval[]) { const value = config(); value.warnings.intervals = intervals; return validateConfigDraft(value, 'warnings'); }
describe('warning range boundaries', () => {
  it('allows adjacent half-open ranges and a single-day range at the excluded endpoint', () => {
    expect(warnings([])).toBeNull();
    expect(warnings([{minDays:7,maxDays:14},{minDays:0,maxDays:7}])).toBeNull();
    expect(warnings([{minDays:0,maxDays:7},{minDays:7,maxDays:7},{minDays:8,maxDays:14}])).toBeNull();
  });
  it('rejects overlapping single-day ranges, duplicates and containment', () => {
    for (const intervals of [
      [{minDays:0,maxDays:8},{minDays:7,maxDays:7}],
      [{minDays:7,maxDays:7},{minDays:7,maxDays:14}],
      [{minDays:7,maxDays:7},{minDays:7,maxDays:7}],
      [{minDays:0,maxDays:20},{minDays:4,maxDays:6}],
    ]) expect(warnings(intervals)).toContain('相同天数');
  });
  it('explains inverted ranges and incomplete numeric input', () => {
    expect(warnings([{minDays:8,maxDays:3}])).toContain('结束天数');
    expect(warnings([{minDays:NaN,maxDays:7}])).toContain('整数天数');
  });
  it('uses backend limits and permits single-day rules at the maximum', () => {
    expect(warnings([{minDays:0,maxDays:0},{minDays:365000,maxDays:365000}])).toBeNull();
    for (const value of [-1, 1.5, Infinity, 365001]) expect(warnings([{minDays:0,maxDays:value}])).not.toBeNull();
  });
  it('limits the number of rules and makes the meaning visible', () => {
    expect(warnings(Array.from({length:51},(_,i)=>({minDays:i,maxDays:i})))).toContain('50');
    expect(formatWarningRange({minDays:0,maxDays:7})).toContain('不含 7');
    expect(formatWarningRange({minDays:7,maxDays:7})).toBe('仅第 7 天');
  });
});
describe('calendar schedule contract', () => {
  it('accepts the four day-based modes and rejects minute configuration', () => {
    for (const kind of ['daily','weekly','monthly','interval'] as const) expect(isSchedule(changeScheduleKind(config().schedule, kind, '2026-11-03'))).toBe(true);
    expect(isSchedule({enabled:true,intervalMinutes:60})).toBe(false);
    expect(isSchedule({...config().schedule, intervalMinutes:60})).toBe(false);
  });
  it('validates real calendar dates, integral days and fixed timezone', () => {
    const base: ScheduleConfig = { ...config().schedule, kind:'interval', intervalDays:3, startDate:'2028-02-29' };
    expect(isSchedule(base)).toBe(true);
    for (const value of [{...base,startDate:'2026-02-29'},{...base,intervalDays:0},{...base,intervalDays:1.5},{...base,intervalDays:366},{...base,time:'24:00'},{...base,timezone:'UTC'}]) expect(isSchedule(value)).toBe(false);
    expect(isSchedule({...config().schedule,kind:'weekly',weekday:8})).toBe(false);
    expect(isSchedule({...config().schedule,kind:'monthly',monthDay:31})).toBe(true);
  });
  it('switches modes without retaining irrelevant fields and describes schedule', () => {
    const weekly = changeScheduleKind(config().schedule, 'weekly', '2026-11-03');
    const daily = changeScheduleKind(weekly, 'daily', '2026-11-03');
    expect('weekday' in daily).toBe(false);
    expect(formatSchedule(weekly)).toBe('每周一 09:00');
    const value = config(); value.schedule = {...daily, kind:'interval', intervalDays:NaN, startDate:'2026-11-03'};
    expect(validateConfigDraft(value, 'schedule')).toContain('整数天数');
  });
});
