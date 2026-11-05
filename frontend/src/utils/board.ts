import type { BoardRecord, BoardTask, PersonRef } from '../api/types';

export const boardColumns = [
  ['number', '编号'], ['type', '类型'], ['reason', '原因'], ['content', '内容'],
  ['startedAt', '开始时间'], ['durationDays', '持续时间'], ['closedAt', '关闭时间'], ['status', '状态'],
  ['impacts', '影响列表'], ['regions', '地区列表'], ['creator', '创建者'], ['creatorDepartment', '创建者部门'],
  ['relatedFileNumbers', '相关文件号列表'], ['relatedFileStartedAt', '相关文件开始时间'], ['relatedFileClosedAt', '相关文件关闭时间'],
] as const satisfies ReadonlyArray<readonly [keyof BoardRecord, string]>;
export const taskColumns = [
  ['taskNumber', '任务编号'], ['taskPrimaryOwner', '主负责人'], ['taskSecondaryOwners', '次负责人'],
  ['taskStatus', '任务状态'], ['taskStartedAt', '开始时间'], ['taskUpdatedAt', '更新时间'],
] as const satisfies ReadonlyArray<readonly [keyof BoardTask, string]>;
export type BoardField = typeof boardColumns[number][0];
export function personColor(id: string): number {
  let hash = 0;
  for (const char of id) hash = (Math.imul(hash, 31) + char.codePointAt(0)!) >>> 0;
  return hash % 8;
}
export const roleLabels = { creator: '创建者', primary: '主负责人', secondary: '次负责人' };
export function uniquePeople(people: PersonRef[]): PersonRef[] {
  const seen = new Set<string>();
  return people.filter(person => { if (seen.has(person.id)) return false; seen.add(person.id); return true; });
}
