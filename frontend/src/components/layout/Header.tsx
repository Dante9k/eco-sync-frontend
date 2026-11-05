import { Link, NavLink } from 'react-router-dom';
import { Icon } from '../common/Icon';
import { BrandMark } from '../common/BrandMark';
import { Badge } from '../common/Badge';
import type { IntegrationMode, SyncState } from '../../api/types';
import { useTheme } from '../../hooks/useTheme';
import { useHelp } from '../../hooks/useHelp';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { UsageGuide } from './UsageGuide';
import styles from './Header.module.css';

export function Header({ unavailable = false, mode, compact = false }: { state?: SyncState; unavailable?: boolean; mode?: IntegrationMode; compact?: boolean }) {
  const theme = useTheme();
  const help = useHelp();
  return <>
    <header className={`${styles.header} ${compact ? styles.compact : ''}`}><div className={styles.inner}>
      <Link className={styles.brand} to="/" aria-label="EXO Sync 同步工作台首页"><span className={styles.logo}><BrandMark/></span><span className={styles.brandName}>EXO<span className={styles.syncName}> Sync</span><span className={styles.brandLight}> 同步工作台</span></span></Link>
      <nav aria-label="主导航" className={styles.nav}><NavLink to="/board"><Icon name="users" size={18}/>人员看板</NavLink><NavLink to="/" end><Icon name="sync" size={18}/>同步管理</NavLink></nav>
      <div className={styles.right} role="group" aria-label="辅助功能">
        <button type="button" className={styles.helpButton} onClick={help.show} aria-haspopup="dialog" aria-label="使用帮助" title="使用帮助"><Icon name="help" size={18}/><span>使用帮助</span></button>
        {mode === 'simulation' && <Badge tone="warning">演示环境</Badge>}
        <span className={styles.connection}><span className={unavailable ? styles.offline : styles.online}/>{unavailable ? '暂时离线' : '工作空间'}</span>
        <Button variant="ghost" className={styles.theme} onClick={theme.toggle} aria-label={'切换' + (theme.theme === 'dark' ? '日间' : '夜间') + '模式'} title={'切换' + (theme.theme === 'dark' ? '日间' : '夜间') + '模式'}><Icon name={theme.theme === 'dark' ? 'sun' : 'moon'} size={18}/></Button>
      </div>
    </div></header>
    <Modal open={help.open} title="使用帮助" onClose={help.close} footer={<Button onClick={help.close}>知道了</Button>}><UsageGuide/></Modal>
  </>;
}
