import { useEco } from '../../state/EcoContext';
import { formatNumber } from '../../utils/format';
import { Icon, type IconName } from '../common/Icon';
import { SyncStateBadge } from './SyncStateBadge';
import { LastSyncInfo } from './LastSyncInfo';
import { ErrorBanner } from '../feedback/ErrorBanner';
import { SkeletonBlock } from '../feedback/SkeletonBlock';
import styles from './StatusCard.module.css';
export function StatusCard({ onRetry }: { onRetry: () => void }) {
  const { state: { status, statusLoading, statusError } } = useEco();
  const metrics: Array<{ key: 'source' | 'target' | 'pending'; title: string; subtitle: string; icon: IconName; code: string }> = [
    { key: 'source', title: '源端记录', subtitle: '源系统中的 ECO 记录总数', icon: 'database', code: 'SOURCE' },
    { key: 'target', title: '目标端记录', subtitle: '已写入目标系统的记录总数', icon: 'target', code: 'TARGET' },
    { key: 'pending', title: '待同步记录', subtitle: '等待下一次同步处理', icon: 'layers', code: 'PENDING' },
  ];
  return <section className={styles.card} aria-labelledby="status-title" aria-busy={statusLoading}>
    <div className={styles.heading}><h2 id="status-title"><Icon name="activity" size={17}/>同步概览</h2><span className={styles.pipeline}>源端 <span>→</span> ECO 同步 <span>→</span> 目标端</span>{status && <SyncStateBadge state={status.state}/>}</div>
    {statusError && <div className={styles.error}><ErrorBanner message={statusError} onRetry={onRetry}/>{status && <p>以下为最近一次成功获取的数据。</p>}</div>}
    {!status && statusLoading ? <SkeletonBlock rows={3}/> : status ? <>
      <div className={styles.metrics}>{metrics.map(metric => <div className={`${styles.metric} ${styles[metric.key]}`} key={metric.key}><div className={styles.metricTop}><span>{metric.title}</span><span className={styles.metricIcon}><Icon name={metric.icon} size={17}/></span></div><div className={styles.value}>{formatNumber(status.counts[metric.key])}<span>条</span></div><div className={styles.metricBottom}><span>{metric.subtitle}</span><span className={styles.code}>{metric.code}</span></div></div>)}</div>
      {status.state === 'syncing' && <div className={styles.progress}><span>正在同步数据</span><progress max={100} value={status.progress ?? undefined} aria-label="同步进度"/><span>{status.progress === null ? '处理中' : `${Math.round(status.progress)}%`}</span></div>}
      {status.state === 'error' && status.lastError && <div className={styles.error}><ErrorBanner message={status.lastError.message}/></div>}
      <LastSyncInfo status={status}/>
    </> : null}
  </section>;
}
