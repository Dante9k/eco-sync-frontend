import { Button } from '../common/Button';
import { Icon } from '../common/Icon';
import { LoadingSpinner } from '../feedback/LoadingSpinner';
import styles from './Toolbar.module.css';
export function Toolbar({ autoRefresh, onToggleAutoRefresh, onRefresh, loading }: { autoRefresh: boolean; onToggleAutoRefresh: () => void; onRefresh: () => void; loading: boolean }) {
  return <div className={styles.toolbar}>
    <label className={styles.auto} title="只刷新页面上的结果，不会发起新的同步"><input type="checkbox" role="switch" checked={autoRefresh} onChange={onToggleAutoRefresh} aria-label="自动更新页面"/><span className={styles.indicator} aria-hidden="true"/><span>自动更新页面</span></label>
    <Button onClick={onRefresh} disabled={loading} aria-label="刷新页面" title="读取最新进展，不会重新同步数据">{loading ? <LoadingSpinner/> : <Icon name="sync" size={15}/>}刷新</Button>
  </div>;
}
