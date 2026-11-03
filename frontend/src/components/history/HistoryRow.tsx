import type { SyncRunSummary } from '../../api/types';
import { formatDate, formatDuration, formatNumber, stageLabels } from '../../utils/format';
import { SyncStateBadge } from '../status/SyncStateBadge';
import { Icon } from '../common/Icon';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import styles from './HistoryRow.module.css';
import type { useRunActions } from '../../hooks/useRunActions';
export function HistoryRow({ run, onSelectRun, runActions }: { run: SyncRunSummary; onSelectRun: (runId: string) => void; runActions: ReturnType<typeof useRunActions> }) {
  return <tr className={styles.row}>
    <td><div className={styles.time}><span className={styles.historyIcon}><Icon name={run.source === 'scheduled' ? 'clock' : 'history'} size={16}/></span><div><time dateTime={run.startedAt}>{formatDate(run.startedAt)}</time><span className={styles.secondary}>{run.source === 'scheduled' ? '自动同步' : '手动同步'} · {formatDuration(run.startedAt, run.finishedAt)}{run.mode === 'simulation' ? ' · 演示' : ''}</span></div></div></td>
    <td className={styles.year}>{run.year}<span> 年</span></td>
    <td><SyncStateBadge state={run.state}/>{run.outcome === 'partial' || run.outcome === 'interrupted' ? <span className={styles.secondary}>{run.outcome === 'partial' ? '部分完成，可继续处理' : '意外中断，可继续处理'}</span> : run.state === 'syncing' && <span className={styles.secondary}>{stageLabels[run.stage] ?? '正在处理'}</span>}{run.notificationState === 'failed' && <span className={styles.error}>飞书提醒未送达</span>}{run.errorMessage && <span className={styles.error}>{run.errorMessage}</span>}</td>
    <td><div className={styles.changes}><Badge tone="success">新增 {formatNumber(run.stats.added)}</Badge><Badge tone="warning">更新 {formatNumber(run.stats.updated)}</Badge>{run.stats.removed > 0 && <Badge tone="danger">删除 {formatNumber(run.stats.removed)}</Badge>}</div><span className={styles.secondary}>读取 {formatNumber(run.counters.fetched)} 条{run.counters.failed > 0 ? ' · 未完成 ' + formatNumber(run.counters.failed) + ' 条' : run.stats.unchanged > 0 ? ' · 无变化 ' + formatNumber(run.stats.unchanged) + ' 条' : ' · 已更新 ' + formatNumber(run.counters.written) + ' 条'}</span></td>
    <td className={styles.action}><Button variant="ghost" onClick={() => onSelectRun(run.runId)} aria-label={`查看 ${formatDate(run.startedAt)} 的变更明细`}>查看明细<Icon name="chevronRight" size={13}/></Button>{run.recoverable && <Button variant="ghost" disabled={runActions.busy} onClick={() => runActions.resume(run.runId)}>继续同步</Button>}{run.state === 'success' && run.notificationState === 'failed' && <Button variant="ghost" disabled={runActions.busy} onClick={() => runActions.retryNotification(run.runId)}>重新发送提醒</Button>}</td>
  </tr>;
}
