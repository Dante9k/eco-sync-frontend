import type { SyncRunDiff } from '../../api/types';
import { DiffSummary } from './DiffSummary';
import { DiffRecordList } from './DiffRecordList';
import { EmptyState } from '../feedback/EmptyState';
import { ErrorBanner } from '../feedback/ErrorBanner';
import { SkeletonBlock } from '../feedback/SkeletonBlock';
import { Button } from '../common/Button';
import { Icon } from '../common/Icon';
import { Pagination } from '../common/Pagination';
import styles from './DiffViewer.module.css';
export function DiffViewer({ runId, diff, loading, error, page, pageSize, onPageChange, onRetry, onBack }: { runId: string | null; diff: SyncRunDiff | null; loading: boolean; error: string | null; page: number; pageSize: number; onPageChange: (page: number) => void; onRetry: () => void; onBack: () => void }) {
  if (!runId) return <div className={styles.container}><EmptyState title="选择一次同步，查看数据变化" description="在同步历史中点击「查看差异」，即可追踪新增、修改与删除的记录。" icon="diff" action={<Button onClick={onBack}>查看同步历史<Icon name="arrow" size={14}/></Button>}/></div>;
  const total = diff ? diff.summary.added + diff.summary.updated + diff.summary.removed : 0;
  return <div><div className={styles.heading}><div><h2>变更详情</h2><code title={runId}>{runId}</code></div><Button variant="ghost" onClick={onBack}><Icon name="chevronLeft" size={14}/>返回历史</Button></div>
    {error ? <ErrorBanner message={error} onRetry={onRetry}/> : loading ? <div className={styles.container}><SkeletonBlock rows={4}/></div> : diff ? <><DiffSummary summary={diff.summary}/><div className={styles.container}>{!diff.records.length ? <EmptyState title={total ? '当前页暂无差异记录' : '本次同步无变化'} description={total ? '记录可能仍在生成，稍后刷新查看。' : '该次同步没有可展示的变更记录。'} icon="check"/> : <DiffRecordList key={`${runId}:${page}`} records={diff.records}/>}<Pagination page={page} pageSize={pageSize} total={total} onChange={onPageChange} disabled={loading}/></div></> : null}
  </div>;
}
