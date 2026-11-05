import { apiGet } from './client';
import { endpoints } from './endpoints';
import type { BoardQuery, BoardTaskQuery } from './types';
import { isBoardDirectory, isBoardRecordPage, isBoardTaskPage } from '../utils/boardGuards';

export const getBoardPeople = (signal?: AbortSignal) => apiGet(endpoints.boardPeople, signal, isBoardDirectory);
export const getBoardRecords = (query: BoardQuery, signal?: AbortSignal) => {
  const params = new URLSearchParams({ page: String(query.page), pageSize: String(query.pageSize), status: query.status });
  if (query.personId) params.set('personId', query.personId);
  if (query.search.trim()) params.set('search', query.search.trim());
  return apiGet(`${endpoints.boardRecords}?${params}`, signal, isBoardRecordPage);
};
export const getBoardTasks = (recordId: string, query: BoardTaskQuery, signal?: AbortSignal) => {
  const params = new URLSearchParams({ page: String(query.page), pageSize: String(query.pageSize), scope: query.scope });
  if (query.personId) params.set('personId', query.personId);
  return apiGet(`${endpoints.boardRecords}/${encodeURIComponent(recordId)}/tasks?${params}`, signal,
    (value): value is import('./types').BoardTaskPage => isBoardTaskPage(value) && value.recordId === recordId);
};
