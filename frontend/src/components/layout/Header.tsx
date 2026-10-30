import { Link } from 'react-router-dom';
import { Icon } from '../common/Icon';
import { Badge } from '../common/Badge';
import { SyncStateBadge } from '../status/SyncStateBadge';
import type { SyncState } from '../../api/types';
import styles from './Header.module.css';
export function Header({ state, unavailable = false }: { state?: SyncState; unavailable?: boolean }) {
  return <header className={styles.header}><div className={styles.inner}>
    <Link className={styles.brand} to="/" aria-label="ECO Sync 首页"><span className={styles.logo}><Icon name="sync" size={22}/></span><span>ECO<span className={styles.brandLight}> Sync</span></span></Link>
    <span className={styles.divider}/><span className={styles.product}>数据管理平台</span>
    <nav aria-label="主导航" className={styles.nav}><Link to="/" aria-current="page"><Icon name="activity" size={15}/>同步控制台</Link></nav>
    <div className={styles.right}>{import.meta.env.VITE_DEMO_MODE === 'true' && <Badge tone="warning">演示数据</Badge>}{unavailable ? <Badge tone="danger">连接异常</Badge> : state ? <SyncStateBadge state={state}/> : <Badge>连接中</Badge>}<span className={styles.avatar} title="ECO 数据工作区">E</span></div>
  </div></header>;
}
