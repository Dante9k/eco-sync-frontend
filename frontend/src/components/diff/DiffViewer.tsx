import type { SyncRunDiff, SyncRunSummary } from '../../api/types';
import { formatDate } from '../../utils/format';
import { DiffSummary } from './DiffSummary';
import { DiffRecordList } from './DiffRecordList';
import { EmptyState } from '../feedback/EmptyState';
import { ErrorBanner } from '../feedback/ErrorBanner';
import { SkeletonBlock } from '../feedback/SkeletonBlock';
import { Button } from '../common/Button';
import { Icon } from '../common/Icon';
import { Pagination } from '../common/Pagination';
import styles from './DiffViewer.module.css';
export function DiffViewer({ runId, run, diff, loading, error, page, pageSize, onPageChange, onRetry, onBack }: { runId: string | null; run?: SyncRunSummary; diff: SyncRunDiff | null; loading: boolean; error: string | null; page: number; pageSize: number; onPageChange: (page: number) => void; onRetry: () => void; onBack: () => void }) {
  if (!runId) return <div className={styles.container}><EmptyState title="想知道更新了什么？" description="先在「同步记录」中选择一次同步，点击「查看明细」，就能逐条查看变化。" icon="diff" action={<Button onClick={onBack}>选择一条同步记录<Icon name="arrow" size={14}/></Button>}/></div>;
  const total = diff ? diff.summary.added + diff.summary.updated + diff.summary.removed : 0;
  return <div><div className={styles.heading}><div><h2>{run ? run.year + ' 年数据的变更明细' : '本次同步的变更明细'}</h2><p>{run ? formatDate(run.startedAt) + ' · ' + (run.source === 'scheduled' ? '自动同步' : '手动同步') : '展示已经确认写入表格的变化。'}{run?.mode === 'simulation' ? ' · 演示结果' : ''}</p></div><Button variant="ghost" onClick={onBack}><Icon name="chevronLeft" size={14}/>返回记录</Button></div>
    {error ? <div className={styles.feedback}><ErrorBanner message={error} onRetry={onRetry}/></div> : loading ? <div className={styles.container}><SkeletonBlock rows={4}/></div> : diff ? <><div className={styles.summary}><DiffSummary summary={diff.summary}/></div><div className={styles.container}>{!diff.records.length ? <EmptyState title={total ? '这一页还没有变更内容' : '本次没有需要展示的变化'} description={run?.state === 'success' ? '数据已经核对，没有变化的内容不会重复更新。' : '尚未记录到已确认的变更，请结合同步结果查看。'} icon="check"/> : <DiffRecordList key={runId + ':' + page} records={diff.records} demo={run?.mode === 'simulation'}/>}<Pagination page={page} pageSize={pageSize} total={total} onChange={onPageChange} disabled={loading}/></div></> : null}
  </div>;
}
