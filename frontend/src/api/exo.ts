import { apiGet, apiPost, ApiError } from './client';
import { endpoints } from './endpoints';
import type { BusinessConfig, ConfigSection, HistoryQuery, LogQuery, PageQuery } from './types';
import { isBusinessConfig, isExoStatus, isLogPage, isRunDiff, isRunPage, isTriggerResult } from '../utils/guards';

function pageParams(p: PageQuery) {
  if (!Number.isInteger(p.page) || p.page < 1 || !Number.isInteger(p.pageSize) || p.pageSize < 1 || p.pageSize > 100) {
    throw new ApiError('INVALID_QUERY', '分页参数无效。', 400);
  }
  return new URLSearchParams({ page: String(p.page), pageSize: String(p.pageSize) });
}
export const getStatus = (signal?: AbortSignal) => apiGet(endpoints.status, signal, isExoStatus);
export const triggerSync = (year: number, signal?: AbortSignal) => apiPost(endpoints.sync, { year }, signal, isTriggerResult);
export const getHistory = (p: HistoryQuery, signal?: AbortSignal) => {
  const query = pageParams(p);
  if (p.state !== 'all') query.set('state', p.state);
  return apiGet(`${endpoints.history}?${query}`, signal, isRunPage);
};
export const getConfig = (signal?: AbortSignal) => apiGet(endpoints.config, signal, isBusinessConfig);
export const saveConfig = <S extends ConfigSection>(section: S, value: BusinessConfig[S], version: number, signal?: AbortSignal) =>
  apiPost(`${endpoints.config}/${section}`, { version, value }, signal, isBusinessConfig);
export const getLogs = (query: LogQuery, signal?: AbortSignal) => {
  const params = pageParams(query);
  if (query.level) params.set('level', query.level);
  if (query.category) params.set('category', query.category);
  return apiGet(`${endpoints.logs}?${params}`, signal, isLogPage);
};
export const resumeRun = (runId: string, signal?: AbortSignal) => apiPost(`${endpoints.run(runId)}/resume`, {}, signal, isTriggerResult);
export const retryNotification = (runId: string, signal?: AbortSignal) => apiPost(`${endpoints.run(runId)}/notifications/retry`, {}, signal, isTriggerResult);
export const getDiff = async (runId: string, p: PageQuery, signal?: AbortSignal) => {
  const result = await apiGet(`${endpoints.diff(runId)}?${pageParams(p)}`, signal, isRunDiff);
  if (result.runId !== runId) throw new ApiError('INVALID_RESPONSE', '差异记录与所选同步不匹配，请重试。', 200);
  return result;
};
