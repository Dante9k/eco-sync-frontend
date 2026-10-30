import { Button } from '../common/Button';
import { Icon } from '../common/Icon';
import { LoadingSpinner } from '../feedback/LoadingSpinner';
import styles from './Toolbar.module.css';
export function Toolbar({ onTrigger, disabled, autoRefresh, onToggleAutoRefresh, onRefresh, loading, triggering }: { onTrigger: () => void; disabled: boolean; autoRefresh: boolean; onToggleAutoRefresh: () => void; onRefresh: () => void; loading: boolean; triggering: boolean }) {
  return <div className={styles.toolbar}>
    <label className={styles.auto}><span>自动刷新 <small>10s</small></span><input type="checkbox" role="switch" checked={autoRefresh} onChange={onToggleAutoRefresh} aria-label="自动刷新"/><span className={styles.switch} aria-hidden="true"/></label>
    <span className={styles.divider}/>
    <Button onClick={onRefresh} disabled={loading} aria-label="刷新数据">{loading ? <LoadingSpinner/> : <Icon name="sync" size={15}/>}<span>刷新</span></Button>
    <Button variant="primary" onClick={onTrigger} disabled={disabled}>{triggering ? <LoadingSpinner/> : <Icon name="sync" size={16}/>}立即同步</Button>
  </div>;
}
