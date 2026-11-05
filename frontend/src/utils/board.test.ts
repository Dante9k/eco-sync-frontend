import { afterEach, describe, expect, it, vi } from 'vitest';
import type { BoardRecord, BoardTask } from '../api/types';
import { getBoardPeople, getBoardRecords, getBoardTasks } from '../api/board';
import { isBoardDirectory, isBoardRecordPage, isBoardTaskPage } from './boardGuards';
import { boardColumns, taskColumns, uniquePeople, personColor } from './board';

const person = { id: 'person/a', name: '同名人员' };
const record: BoardRecord = {
  recordId: 'row/1', number: 'EXO-001', type: '设计变更', reason: '测试', content: '<script>test</script>',
  startedAt: null, durationDays: null, closedAt: null, status: '待确认', impacts: [], regions: [],
  creator: person, creatorDepartment: '工程部', relatedFileNumbers: [], relatedFileStartedAt: null, relatedFileClosedAt: null,
  taskSummary: { total: 3, completed: 1, matched: 2, latestUpdatedAt: null }, matchedRoles: ['creator', 'primary'],
};
const task: BoardTask = { taskId: 'task/1', taskNumber: 'TASK-1', taskPrimaryOwner: person,
  taskSecondaryOwners: [{ id: 'person/b', name: '同名人员' }], taskStatus: '未开始', taskStartedAt: null, taskUpdatedAt: null };
const page = { items: [record], total: 1, page: 1, pageSize: 10, stats: { total: 1, open: 1, closed: 0 }, mode: 'simulation', updatedAt: '2026-11-05T02:00:00Z' };
const tasks = { items: [task], recordId: record.recordId, total: 1, page: 1, pageSize: 5, mode: 'simulation', updatedAt: page.updatedAt };
const json = (data: unknown) => new Response(JSON.stringify({ ok: true, data }), { headers: { 'Content-Type': 'application/json' } });
afterEach(() => vi.unstubAllGlobals());

describe('grouped people board contract', () => {
  it('preserves the 21 business fields across records and tasks without copying task lists into records', () => {
    expect(boardColumns).toHaveLength(15);
    expect(taskColumns).toHaveLength(6);
    expect(new Set([...boardColumns, ...taskColumns].map(([field]) => field)).size).toBe(21);
    expect(boardColumns.map(([field]) => field)).not.toContain('taskNumber');
  });
  it('deduplicates people by identity without merging people with the same name', () => {
    expect(uniquePeople([person, { ...person }, task.taskSecondaryOwners[0]])).toHaveLength(2);
  });
  it('keeps person colors stable regardless of roster order', () => {
    const ids = ['member-01', 'member-02', 'member-03', 'member-04', 'member-05', 'member-06', 'member-07', 'member-08'];
    const initial = Object.fromEntries(ids.map(id => [id, personColor(id)]));
    expect(new Set(Object.values(initial)).size).toBe(8);
    ids.reverse().forEach(id => expect(personColor(id)).toBe(initial[id]));
  });
  it('accepts missing dates but rejects inconsistent summaries and duplicate parent numbers', () => {
    expect(isBoardRecordPage(page)).toBe(true);
    expect(isBoardRecordPage({ ...page, items: [{ ...record, creator: null }] })).toBe(true);
    expect(isBoardRecordPage({ ...page, items: [{ ...record, taskSummary: { ...record.taskSummary, completed: 4 } }] })).toBe(false);
    expect(isBoardRecordPage({ ...page, items: [{ ...record, startedAt: 'invalid' }] })).toBe(false);
    expect(isBoardRecordPage({ ...page, items: [record, { ...record, recordId: 'another' }] })).toBe(false);
  });
  it('validates paged tasks independently, including unassigned owners and duplicate IDs', () => {
    expect(isBoardTaskPage(tasks)).toBe(true);
    expect(isBoardTaskPage({ ...tasks, items: [{ ...task, taskPrimaryOwner: null }] })).toBe(true);
    expect(isBoardTaskPage({ ...tasks, items: [task, task] })).toBe(false);
    expect(isBoardTaskPage({ ...tasks, items: [{ ...task, taskSecondaryOwners: 'name' }] })).toBe(false);
  });
  it('rejects ambiguous directory IDs', () => {
    const member = { ...person, department: '工程部', recordCount: 1 };
    expect(isBoardDirectory({ items: [member], mode: 'simulation', updatedAt: page.updatedAt })).toBe(true);
    expect(isBoardDirectory({ items: [member, member], mode: 'simulation', updatedAt: page.updatedAt })).toBe(false);
  });
  it('requests the directory from its own backend endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ items: [], mode: 'simulation', updatedAt: page.updatedAt }));
    vi.stubGlobal('fetch', fetchMock);
    await getBoardPeople();
    expect(fetchMock.mock.calls[0][0]).toBe('/api/exo/board/people');
  });
  it('sends parent filters to the backend before pagination', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(page)); vi.stubGlobal('fetch', fetchMock);
    await getBoardRecords({ personId: 'person/?#', search: '装配 & 文件', status: 'open', page: 2, pageSize: 10 });
    const url = new URL(fetchMock.mock.calls[0][0], 'http://localhost');
    expect(Object.fromEntries(url.searchParams)).toEqual({ personId: 'person/?#', search: '装配 & 文件', status: 'open', page: '2', pageSize: '10' });
  });
  it('loads tasks separately using an opaque parent ID and its own pagination and scope', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(tasks)); vi.stubGlobal('fetch', fetchMock);
    await getBoardTasks('row/1', { personId: 'person/a', page: 2, pageSize: 5, scope: 'related' });
    const url = new URL(fetchMock.mock.calls[0][0], 'http://localhost');
    expect(url.pathname).toBe('/api/exo/board/records/row%2F1/tasks');
    expect(Object.fromEntries(url.searchParams)).toEqual({ personId: 'person/a', page: '2', pageSize: '5', scope: 'related' });
  });
  it('rejects task results belonging to another parent', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ ...tasks, recordId: 'wrong-parent' })));
    await expect(getBoardTasks(record.recordId, { personId: '', page: 1, pageSize: 5, scope: 'all' })).rejects.toThrow();
  });
});
