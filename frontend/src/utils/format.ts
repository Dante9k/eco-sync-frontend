import { ApiError } from '../api/client';

export const formatNumber = (value: number) => new Intl.NumberFormat('zh-CN').format(value);
export function formatDate(value: string | null, compact = false, timeZone?: string) {
  if (!value || !Number.isFinite(Date.parse(value))) return '—';
  return new Intl.DateTimeFormat('zh-CN', {
    ...(compact ? {} : { year: 'numeric' as const }), month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone,
  }).format(new Date(value));
}
export function formatRelative(value: string | null, now = Date.now()) {
  if (!value || !Number.isFinite(Date.parse(value))) return '暂无记录';
  const seconds = Math.round((Date.parse(value) - now) / 1000);
  if (Math.abs(seconds) < 60) return seconds <= 0 ? '刚刚' : '即将开始';
  const formatter = new Intl.RelativeTimeFormat('zh-CN', { numeric: 'auto' });
  if (Math.abs(seconds) < 3600) return formatter.format(Math.round(seconds / 60), 'minute');
  if (Math.abs(seconds) < 86400) return formatter.format(Math.round(seconds / 3600), 'hour');
  return formatter.format(Math.round(seconds / 86400), 'day');
}
export function formatDuration(start: string, finish: string | null) {
  if (!finish) return '进行中';
  const seconds = Math.max(0, (Date.parse(finish) - Date.parse(start)) / 1000);
  return seconds < 60 ? `${seconds.toFixed(1)} 秒` : `${Math.floor(seconds / 60)} 分 ${Math.round(seconds % 60)} 秒`;
}
export function formatBytes(value: number) {
  if (value === 0) return '0 B';
  const index = Math.min(3, Math.max(0, Math.floor(Math.log(value) / Math.log(1024))));
  return `${(value / 1024 ** index).toFixed(index ? 1 : 0)} ${['B', 'KB', 'MB', 'GB'][index]}`;
}
export const toUserMessage = (error: unknown) => error instanceof ApiError ? error.message : '操作未完成，请稍后重试。';
export const formatToday = () => new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: 'long', day: 'numeric' }).format(new Date());
export const stageLabels: Record<string, string> = { queued: '等待执行', access: '检查访问权限', fetch: '读取数据', clean: '整理与检查', plan: '准备更新', write: '更新并核对表格', warnings: '检查提醒', notify: '发送提醒', complete: '已完成' };
export const notificationLabels = { pending: '等待处理提醒', sending: '正在发送提醒', sent: '飞书提醒已送达', failed: '飞书提醒未送达', disabled: '本次未开启飞书提醒', none: '无需发送提醒' };

export function formatCalendarDate(value: string | null, timeZone?: string) {
  if (!value || !Number.isFinite(Date.parse(value))) return '—';
  return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone }).format(new Date(value));
}
