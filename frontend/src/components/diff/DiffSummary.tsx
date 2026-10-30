import type { SyncRunDiff } from '../../api/types';
import { formatNumber } from '../../utils/format';
import { Icon } from '../common/Icon';
import styles from './DiffSummary.module.css';
export function DiffSummary({ summary }: { summary: SyncRunDiff['summary'] }) {
  return <div className={styles.summary}><div className={styles.added}><Icon name="plus"/><span>新增记录</span><strong>{formatNumber(summary.added)}</strong></div><div className={styles.updated}><Icon name="edit"/><span>修改记录</span><strong>{formatNumber(summary.updated)}</strong></div><div className={styles.removed}><Icon name="minus"/><span>删除记录</span><strong>{formatNumber(summary.removed)}</strong></div></div>;
}
