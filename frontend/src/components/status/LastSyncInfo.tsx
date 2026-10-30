import type { EcoStatus } from '../../api/types';
import { formatDate, formatRelative } from '../../utils/format';
import { Icon } from '../common/Icon';
import styles from './LastSyncInfo.module.css';
export function LastSyncInfo({ status }: { status: EcoStatus }) {
  return <div className={styles.info}>
    <div><span><Icon name="history" size={13}/>最近同步</span><time dateTime={status.lastSyncAt ?? undefined}>{formatDate(status.lastSyncAt)}</time><small>{formatRelative(status.lastSyncAt)}</small></div>
    <div><span><Icon name="check" size={13}/>最近成功</span><time dateTime={status.lastSuccessAt ?? undefined}>{formatDate(status.lastSuccessAt)}</time></div>
    <div><span><Icon name="clock" size={13}/>下次计划</span><time dateTime={status.nextScheduledAt ?? undefined}>{status.nextScheduledAt ? formatDate(status.nextScheduledAt) : '未设置计划'}</time></div>
  </div>;
}
