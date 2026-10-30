import { apiGet, apiPost, ApiError } from './client';
import { endpoints } from './endpoints';
import type { HistoryQuery, PageQuery } from './types';
import { isEcoStatus, isRunDiff, isRunPage, isTriggerResult } from '../utils/guards';

function pageParams(p: PageQuery) {
  if (!Number.isInteger(p.page) || p.page < 1 || !Number.isInteger(p.pageSize) || p.pageSize < 1 || p.pageSize > 100) {
    throw new ApiError('INVALID_QUERY', '分页参数无效。', 400);
  }
  return new URLSearchParams({ page: String(p.page), pageSize: String(p.pageSize) });
}
export const getStatus = (signal?: AbortSignal) => apiGet(endpoints.status, signal, isEcoStatus);
export const triggerSync = (signal?: AbortSignal) => apiPost(endpoints.sync, {}, signal, isTriggerResult);
export const getHistory = (p: HistoryQuery, signal?: AbortSignal) => {
  const query = pageParams(p);
  if (p.state !== 'all') query.set('state', p.state);
  return apiGet(`${endpoints.history}?${query}`, signal, isRunPage);
};
export const getDiff = async (runId: string, p: PageQuery, signal?: AbortSignal) => {
  const result = await apiGet(`${endpoints.diff(runId)}?${pageParams(p)}`, signal, isRunDiff);
  if (result.runId !== runId) throw new ApiError('INVALID_RESPONSE', '差异记录与所选同步不匹配，请重试。', 200);
  return result;
};
