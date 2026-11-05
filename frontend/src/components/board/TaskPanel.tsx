import type { BoardPerson, BoardRecord, BoardTask } from '../../api/types';
import { useBoardTasks, type LoadTaskPage } from '../../hooks/useBoardTasks';
import { formatDate, formatCalendarDate } from '../../utils/format';
import { taskColumns, uniquePeople } from '../../utils/board';
import { PersonTag } from './PersonTag';
import { Pagination } from '../common/Pagination';
import { ErrorBanner } from '../feedback/ErrorBanner';
import { Icon } from '../common/Icon';
import styles from './Board.module.css';
import layout from './GroupedTable.module.css';

function TaskCell({ task, field, selectedId }: { task: BoardTask; field: typeof taskColumns[number][0]; selectedId: string }) {
  if (field === 'taskPrimaryOwner') return <PersonTag person={task.taskPrimaryOwner} selectedId={selectedId}/>;
  if (field === 'taskSecondaryOwners') return <div className={styles.tagList}>{uniquePeople(task.taskSecondaryOwners).map(person => <PersonTag key={person.id} person={person} selectedId={selectedId}/>)}{!task.taskSecondaryOwners.length && <span className={styles.muted}>未分配</span>}</div>;
  if (field === 'taskStatus') return <span className={styles.status} data-state={task.taskStatus === '已完成' ? 'closed' : task.taskStatus === '待确认' ? 'pending' : 'open'}><i/>{task.taskStatus || '未填写'}</span>;
  if (field === 'taskStartedAt' || field === 'taskUpdatedAt') return <time dateTime={task[field] ?? undefined} title={formatDate(task[field], false, 'Asia/Shanghai')}>{formatCalendarDate(task[field], 'Asia/Shanghai')}</time>;
  return <span className={styles.mono}>{task.taskNumber}</span>;
}
export function TaskPanel({ record, selected, selectedId, load, panelId }: { record: BoardRecord; selected: BoardPerson | null; selectedId: string; load: LoadTaskPage; panelId: string }) {
  const tasks = useBoardTasks(record.recordId, selectedId, load);
  const isCreator = record.matchedRoles.includes('creator');
  const hasScope = !!selectedId && !isCreator && record.taskSummary.matched < record.taskSummary.total;
  return <section id={panelId} className={layout.taskPanel} aria-label={record.number + ' 的关联任务'}>
    <div className={layout.taskPanelHeader}>
      <div className={layout.taskPanelTitle}><Icon name="layers" size={15}/><h3>关联任务</h3><span>{record.number}</span>
        {selected && <span className={layout.scopeHint}><PersonTag person={selected} selectedId={selectedId}/>{isCreator ? '创建的业务 · 展示全部任务' : tasks.query.scope === 'related' ? '参与的任务' : '所在业务的全部任务'}</span>}
      </div>
      {hasScope && <div className={layout.scopeSwitch} role="group" aria-label="任务范围">
        <button type="button" aria-pressed={tasks.query.scope === 'related'} onClick={() => tasks.setScope('related')}>相关 {record.taskSummary.matched}</button>
        <button type="button" aria-pressed={tasks.query.scope === 'all'} onClick={() => tasks.setScope('all')}>全部 {record.taskSummary.total}</button>
      </div>}
    </div>
    {tasks.error ? <div className={layout.taskFeedback}><ErrorBanner message={tasks.error} onRetry={tasks.refresh}/></div> : tasks.loading ? <div className={layout.taskLoading} role="status"><span/>正在读取任务…</div> : !tasks.data?.items.length ? <p className={layout.taskFeedback}>当前范围内没有任务。</p> : <div className={layout.taskScroll}>
      <table className={layout.taskTable}><caption className="srOnly">{record.number} 的任务明细</caption><thead><tr>{taskColumns.map(([field, label]) => <th scope="col" key={field}>{label}</th>)}</tr></thead>
        <tbody>{tasks.data.items.map(task => <tr key={task.taskId}>{taskColumns.map(([field, label]) => <td data-label={label} data-task-field={field} key={field}><TaskCell task={task} field={field} selectedId={selectedId}/></td>)}</tr>)}</tbody>
      </table>
    </div>}
    <div className={layout.taskFooter}><span aria-live="polite">{tasks.loading ? '正在更新任务列表' : `显示 ${tasks.data?.items.length ?? 0} 个 / 共 ${tasks.data?.total ?? 0} 个任务`}</span>
      {(tasks.data?.total ?? 0) > tasks.query.pageSize && <Pagination label="任务分页" unit="个任务" page={tasks.query.page} pageSize={tasks.query.pageSize} total={tasks.data?.total ?? 0} onChange={tasks.setPage} disabled={tasks.loading}/>}
      {!tasks.loading && !tasks.error && (tasks.data?.total ?? 0) <= tasks.query.pageSize && <span>任务状态独立于业务状态</span>}
    </div>
  </section>;
}
