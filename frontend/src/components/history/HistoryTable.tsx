import type { HistoryQuery, SyncRunPage } from '../../api/types';
import { HistoryFilters } from './HistoryFilters';
import { HistoryRow } from './HistoryRow';
import { Pagination } from '../common/Pagination';
import { SkeletonBlock } from '../feedback/SkeletonBlock';
import { ErrorBanner } from '../feedback/ErrorBanner';
import { EmptyState } from '../feedback/EmptyState';
import styles from './HistoryTable.module.css';
import type { useRunActions } from '../../hooks/useRunActions';
export function HistoryTable({ page, query, loading, error, onSelectRun, onQueryChange, onRetry, runActions }: { page: SyncRunPage | null; query: HistoryQuery; loading: boolean; error: string | null; onSelectRun: (runId: string) => void; onQueryChange: (query: Partial<HistoryQuery>) => void; onRetry: () => void; runActions: ReturnType<typeof useRunActions> }) {
  return <div><HistoryFilters query={query} onChange={onQueryChange}/><div className={styles.container} aria-busy={loading}>
    {error ? <div className={styles.error}><ErrorBanner message={error} onRetry={onRetry}/></div> : loading && !page ? <SkeletonBlock/> : !page?.items.length ? <><EmptyState title="这里会保存每次同步的结果" description={query.state === 'all' ? '点击上方「立即同步」并选择年份，完成后即可在这里回看。' : '没有符合条件的记录，可以切换为「全部状态」看看。'} icon="history"/>{page && page.page > 1 && <Pagination page={page.page} pageSize={page.pageSize} total={page.total} onChange={next => onQueryChange({ page: next })}/>}</> : <>
      <table className={styles.table}><caption className="srOnly">同步记录与执行结果</caption><thead><tr><th scope="col">同步时间</th><th scope="col">数据年份</th><th scope="col">执行结果</th><th scope="col">本次更新</th><th scope="col" className={styles.last}>操作</th></tr></thead><tbody>{page.items.map(run => <HistoryRow key={run.runId} run={run} onSelectRun={onSelectRun} runActions={runActions}/>)}</tbody></table>
      <Pagination page={page.page} pageSize={page.pageSize} total={page.total} onChange={next => onQueryChange({ page: next })} disabled={loading}/>
    </>}
  </div></div>;
}
