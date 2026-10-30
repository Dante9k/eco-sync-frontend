import type { SyncRunSummary } from '../../api/types';
import { formatDate, formatDuration, formatNumber } from '../../utils/format';
import { SyncStateBadge } from '../status/SyncStateBadge';
import { Icon } from '../common/Icon';
import { Button } from '../common/Button';
import styles from './HistoryRow.module.css';
export function HistoryRow({ run, onSelectRun }: { run: SyncRunSummary; onSelectRun: (runId: string) => void }) {
  return <tr className={styles.row} onClick={() => onSelectRun(run.runId)}>
    <td><div className={styles.time}><span className={styles.historyIcon}><Icon name="history" size={15}/></span><div><time dateTime={run.startedAt}>{formatDate(run.startedAt)}</time><span className={styles.id} title={run.runId}>{run.runId}</span></div></div></td>
    <td className={styles.duration}>{formatDuration(run.startedAt, run.finishedAt)}</td>
    <td><SyncStateBadge state={run.state}/>{run.errorMessage && <span className={styles.error} title={run.errorMessage}>{run.errorMessage}</span>}</td>
    <td><div className={styles.changes}><span className={styles.added} title="新增" aria-label={`新增 ${run.stats.added} 条`}>+{formatNumber(run.stats.added)}</span><span className={styles.updated} title="修改" aria-label={`修改 ${run.stats.updated} 条`}>~{formatNumber(run.stats.updated)}</span><span className={styles.removed} title="删除" aria-label={`删除 ${run.stats.removed} 条`}>−{formatNumber(run.stats.removed)}</span></div></td>
    <td className={styles.action}><Button variant="ghost" onClick={event => { event.stopPropagation(); onSelectRun(run.runId); }} aria-label={`查看 ${formatDate(run.startedAt)} 的差异`}>查看差异<Icon name="chevronRight" size={13}/></Button></td>
  </tr>;
}
