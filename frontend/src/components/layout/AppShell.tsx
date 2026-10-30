import type { PropsWithChildren, ReactNode } from 'react';
import type { SyncState } from '../../api/types';
import { Header } from './Header';
import { Icon } from '../common/Icon';
import styles from './AppShell.module.css';
export function AppShell({ children, toolbar, state, unavailable, lastFetched }: PropsWithChildren<{ toolbar?: ReactNode; state?: SyncState; unavailable?: boolean; lastFetched?: string }>) {
  return <div className={styles.shell}><a href="#main-content" className={styles.skip}>跳至主要内容</a><Header state={state} unavailable={unavailable}/>
    <main id="main-content" className={styles.main}>
      <div className={styles.breadcrumb}><Icon name="layers" size={14}/><span>工作空间</span><span>/</span><span>ECO 数据同步</span></div>
      <div className={styles.titleRow}><div><div className={styles.eyebrow}>SYNC OPERATIONS</div><h1>数据同步<span className={styles.label}>ECO</span></h1><p>连接每一次变更，让数据始终保持一致。</p></div>{toolbar}</div>
      {children}
      <footer className={styles.footer}><span><Icon name="layers" size={13}/>ECO Sync <span className={styles.footerDivider}>/</span> 数据同步系统</span><span>{lastFetched ? `数据更新于 ${lastFetched}` : '等待服务连接'}<span className={styles.footerDivider}>·</span>仅展示脱敏字段</span></footer>
    </main>
  </div>;
}
