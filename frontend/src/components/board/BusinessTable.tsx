import { Fragment, useId, useState, type ReactNode } from 'react';
import type { BoardPerson, BoardQuery, BoardRecord, BoardRecordPage } from '../../api/types';
import { boardColumns } from '../../utils/board';
import { useTaskPages } from '../../hooks/useBoardTasks';
import { Button } from '../common/Button';
import { Icon } from '../common/Icon';
import { Pagination } from '../common/Pagination';
import { EmptyState } from '../feedback/EmptyState';
import { ErrorBanner } from '../feedback/ErrorBanner';
import { BoardCell } from './BoardCell';
import { SummaryCells, TaskSummary } from './SummaryCells';
import { TaskPanel } from './TaskPanel';
import { PersonTag } from './PersonTag';
import styles from './Board.module.css';
import layout from './GroupedTable.module.css';

export function BusinessTable({ data, query, selected, loading, error, people, onQuery, onClear, onRetry, onDetails }: {
  data: BoardRecordPage | null; query: BoardQuery; selected: BoardPerson | null; loading: boolean; error: string | null; people: ReactNode;
  onQuery: (patch: Partial<BoardQuery>) => void; onClear: () => void; onRetry: () => void; onDetails: (record: BoardRecord) => void;
}) {
  const [allColumns, setAllColumns] = useState(false);
  const [expanded, setExpanded] = useState<{ id: string; queryKey: string } | null>(null);
  const queryKey = JSON.stringify(query);
  const prefix = useId();
  const loadTasks = useTaskPages(data);
  const filtered = !!query.personId || !!query.search || query.status !== 'all';
  return <section className={styles.records} aria-labelledby="records-heading">
    <h2 id="records-heading" className="srOnly">业务记录</h2>
    {people}
    <div className={styles.tableToolbar}>
      <div className={styles.statusFilters} role="group" aria-label="记录状态筛选">{([['all', '全部', 'total'], ['open', '未关闭', 'open'], ['closed', '已关闭', 'closed']] as const).map(([value, label, stat]) => <button type="button" key={value} aria-pressed={query.status === value} onClick={() => onQuery({ status: value })}>{label}<span>{data?.stats[stat] ?? '—'}</span></button>)}</div>
      <label className={styles.search}><Icon name="search" size={15}/><input aria-label="搜索业务记录" type="search" placeholder="搜索编号、任务或文件号" value={query.search} maxLength={100} onChange={event => onQuery({ search: event.target.value })}/></label>
      <div className={styles.columnToggle} role="group" aria-label="表格显示字段"><button type="button" aria-pressed={!allColumns} onClick={() => setAllColumns(false)}>工作概览</button><button type="button" aria-pressed={allColumns} onClick={() => setAllColumns(true)}>记录明细</button></div>
    </div>
    {filtered && <div className={styles.activeFilters}><div><span>当前筛选</span>{selected && <PersonTag person={selected} selectedId={selected.id}/>}<strong>{query.status === 'all' ? '全部状态' : query.status === 'open' ? '未关闭' : '已关闭'}</strong>{query.search && <span className={styles.searchTerm}>“{query.search}”</span>}<button type="button" onClick={onClear}>清除筛选</button></div><span>{data ? `${data.total} 个编号` : loading ? '读取中…' : '读取未完成'}</span></div>}
    <span role="status" className="srOnly" aria-live="polite">{loading ? '正在读取记录…' : error ? '读取未完成' : `共找到 ${data?.total ?? 0} 条记录`}</span>
    {allColumns && <p className={styles.scrollHint}>每个编号一行，任务明细展开查看；左右滑动查看记录字段。</p>}
    {error ? <div className={styles.feedback}><ErrorBanner message={error} onRetry={onRetry}/></div> : loading && !data ? <div className={styles.tableSkeleton} aria-label="正在读取业务记录">{[0, 1, 2, 3].map(i => <div key={i}/>)}</div> : !data?.items.length ? <EmptyState icon="users" title={selected ? `暂时没有${selected.name}的匹配记录` : '没有找到匹配的记录'} description="试试其他人员，或清除搜索内容与状态条件。" action={<Button onClick={onClear}>查看全部记录</Button>}/> : <div className={layout.scroll} role="region" aria-label={allColumns ? '业务记录完整字段，可横向滚动' : '业务记录工作概览'} tabIndex={0} aria-busy={loading}>
      <table className={layout.table} data-view={allColumns ? 'all' : 'summary'}>
        <caption className="srOnly">业务记录：{selected?.name ?? '所有人员'}，按编号汇总，任务可展开查看</caption>
        <thead><tr>{allColumns ? <>{boardColumns.map(([key, label]) => <th key={key} scope="col" data-field={key}>{label}</th>)}<th scope="col" data-group="task">关联任务</th></> : [['record', '业务内容'], ['progress', '业务状态'], ['people', '创建与参与'], ['task', '任务进展'], ['timeline', '业务时间'], ['references', '影响范围与文件']].map(([key, label]) => <th key={key} scope="col" data-group={key}>{label}</th>)}<th scope="col" className={layout.actionColumn}>操作</th></tr></thead>
        <tbody>{data.items.map(record => {
          const open = expanded?.id === record.recordId && expanded.queryKey === queryKey;
          const panelId = prefix + record.recordId;
          const toggle = () => setExpanded(open ? null : { id: record.recordId, queryKey });
          return <Fragment key={record.recordId}><tr className={layout.recordRow} data-expanded={open}>
            {allColumns ? <>{boardColumns.map(([field]) => <td key={field} data-field={field}><BoardCell record={record} field={field} selectedId={query.personId}/></td>)}<td data-group="task"><TaskSummary record={record} selectedId={query.personId} expanded={open} onToggle={toggle} panelId={panelId}/></td></> : <SummaryCells record={record} selected={selected} selectedId={query.personId} expanded={open} onToggle={toggle} panelId={panelId}/>}
            <td className={layout.actionColumn}><button className={styles.detailsButton} type="button" aria-label={`查看 ${record.number} 的记录详情`} onClick={() => onDetails(record)}>详情<Icon name="chevronRight" size={13}/></button></td>
          </tr>{open && <tr className={layout.expandedRow}><td colSpan={allColumns ? boardColumns.length + 2 : 7}><TaskPanel key={queryKey + record.recordId} record={record} selected={selected} selectedId={query.personId} load={loadTasks} panelId={panelId}/></td></tr>}</Fragment>;
        })}</tbody>
      </table>
    </div>}
    <div className={styles.tableFooter}><Pagination page={query.page} pageSize={query.pageSize} total={data?.total ?? 0} disabled={loading || !!error} onChange={page => onQuery({ page })} unit="个编号"/></div>
  </section>;
}
