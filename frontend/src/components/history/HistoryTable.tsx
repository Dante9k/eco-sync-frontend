import type { HistoryQuery, SyncRunPage } from '../../api/types';
import { HistoryFilters } from './HistoryFilters';
import { HistoryRow } from './HistoryRow';
import { Pagination } from '../common/Pagination';
import { SkeletonBlock } from '../feedback/SkeletonBlock';
import { ErrorBanner } from '../feedback/ErrorBanner';
import { EmptyState } from '../feedback/EmptyState';
import styles from './HistoryTable.module.css';
export function HistoryTable({ page, query, loading, error, onSelectRun, onQueryChange, onRetry }: { page: SyncRunPage | null; query: HistoryQuery; loading: boolean; error: string | null; onSelectRun: (runId: string) => void; onQueryChange: (query: Partial<HistoryQuery>) => void; onRetry: () => void }) {
  return <div><HistoryFilters query={query} onChange={onQueryChange}/><div className={styles.container} aria-busy={loading}>
    {error ? <div className={styles.error}><ErrorBanner message={error} onRetry={onRetry}/></div> : loading && !page ? <SkeletonBlock/> : !page?.items.length ? <><EmptyState title="暂无同步记录" description={query.state === 'all' ? '触发一次同步后，运行结果将显示在这里。' : '当前状态下没有同步记录，试试其他筛选条件。'} icon="history"/>{page && page.page > 1 && <Pagination page={page.page} pageSize={page.pageSize} total={page.total} onChange={next => onQueryChange({ page: next })}/>}</> : <>
      <table className={styles.table}><caption className="srOnly">ECO 同步历史</caption><thead><tr><th scope="col">开始时间</th><th scope="col">耗时</th><th scope="col">同步状态</th><th scope="col">数据变更 <span className={styles.legend}>新增 / 修改 / 删除</span></th><th scope="col" className={styles.last}>操作</th></tr></thead><tbody>{page.items.map(run => <HistoryRow key={run.runId} run={run} onSelectRun={onSelectRun}/>)}</tbody></table>
      <Pagination page={page.page} pageSize={page.pageSize} total={page.total} onChange={next => onQueryChange({ page: next })} disabled={loading}/>
    </>}
  </div></div>;
}
