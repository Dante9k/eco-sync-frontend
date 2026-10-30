import type { SyncState } from '../../api/types';
import { Badge } from '../common/Badge';
import styles from './SyncStateBadge.module.css';
const labels = { idle: '等待同步', syncing: '同步进行中', success: '同步成功', error: '同步失败' };
const tones = { idle: 'neutral', syncing: 'info', success: 'success', error: 'danger' } as const;
export function SyncStateBadge({ state }: { state: SyncState }) {
  return <Badge tone={tones[state]}><span className={`${styles.dot} ${state === 'syncing' ? styles.pulse : ''}`}/>{labels[state]}</Badge>;
}
