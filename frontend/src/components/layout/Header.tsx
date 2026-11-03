import { Link } from 'react-router-dom';
import { Icon } from '../common/Icon';
import { Badge } from '../common/Badge';
import type { IntegrationMode, SyncState } from '../../api/types';
import { useTheme } from '../../hooks/useTheme';
import { Button } from '../common/Button';
import styles from './Header.module.css';
export function Header({ unavailable = false, mode }: { state?: SyncState; unavailable?: boolean; mode?: IntegrationMode }) {
  const theme = useTheme();
  return <header className={styles.header}><div className={styles.inner}>
    <Link className={styles.brand} to="/" aria-label="EXO Sync 同步工作台首页"><span className={styles.logo}><Icon name="layers" size={23}/></span><span>EXO Sync<span className={styles.brandLight}> 同步工作台</span></span></Link>
    <nav aria-label="主导航" className={styles.nav}><a href="#main-content" aria-current="page">工作台</a><a href="#sync-records">同步记录</a><a href="#usage-guide">使用帮助</a></nav>
    <div className={styles.right}>{mode === 'simulation' && <Badge tone="warning">演示环境</Badge>}<span className={styles.connection}><span className={unavailable ? styles.offline : styles.online}/>{unavailable ? '暂时离线' : '工作空间'}</span><Button variant="ghost" className={styles.theme} onClick={theme.toggle} aria-label={'切换' + (theme.theme === 'dark' ? '日间' : '夜间') + '模式'} title={'切换' + (theme.theme === 'dark' ? '日间' : '夜间') + '模式'}><Icon name={theme.theme === 'dark' ? 'sun' : 'moon'} size={18}/></Button></div>
  </div></header>;
}
