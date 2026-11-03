import type { ScheduleConfig, WarningInterval } from '../api/types';
export const weekdays = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'];
export const shanghaiToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
export function changeScheduleKind(schedule: ScheduleConfig, kind: ScheduleConfig['kind'], today: string): ScheduleConfig {
  const base = { enabled: schedule.enabled, time: schedule.time, timezone: 'Asia/Shanghai' as const };
  if (kind === 'weekly') return { ...base, kind, weekday: 1 };
  if (kind === 'monthly') return { ...base, kind, monthDay: 1 };
  if (kind === 'interval') return { ...base, kind, intervalDays: 3, startDate: today };
  return { ...base, kind: 'daily' };
}
export function formatSchedule(schedule: ScheduleConfig) {
  const frequency = schedule.kind === 'daily' ? '每天' : schedule.kind === 'weekly' ? '每周' + weekdays[schedule.weekday - 1]?.slice(2) : schedule.kind === 'monthly' ? '每月 ' + schedule.monthDay + ' 日' : '每隔 ' + schedule.intervalDays + ' 天';
  return frequency + ' ' + schedule.time;
}
export const intervalEnd = (range: WarningInterval) => range.maxDays === range.minDays ? range.minDays + 1 : range.maxDays;
export const formatWarningRange = (range: WarningInterval) => range.minDays === range.maxDays ? '仅第 ' + range.minDays + ' 天' : range.minDays + '–' + range.maxDays + ' 天（不含 ' + range.maxDays + '）';
export function isCalendarDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '1970-01-01' || value > '9998-12-31') return false;
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function scheduleValidation(schedule: ScheduleConfig): string | null {
  if (schedule.timezone !== 'Asia/Shanghai' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(schedule.time)) return '请选择有效的执行时间，按北京时间执行。';
  if (schedule.kind === 'weekly' && (!Number.isInteger(schedule.weekday) || schedule.weekday < 1 || schedule.weekday > 7)) return '请选择每周执行的星期。';
  if (schedule.kind === 'monthly' && (!Number.isInteger(schedule.monthDay) || schedule.monthDay < 1 || schedule.monthDay > 31)) return '请选择每月的 1 至 31 日。';
  if (schedule.kind === 'interval') {
    if (!Number.isInteger(schedule.intervalDays) || schedule.intervalDays < 1 || schedule.intervalDays > 365) return '请填写 1 至 365 之间的整数天数。';
    if (!isCalendarDate(schedule.startDate)) return '请选择有效的首次执行日期。';
  }
  return null;
}
