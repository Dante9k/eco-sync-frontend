import type { PropsWithChildren, ReactNode } from 'react';
import type { IntegrationMode, SyncState } from '../../api/types';
import { Header } from './Header';
import { Icon } from '../common/Icon';
import styles from './AppShell.module.css';
export function AppShell({ children, toolbar, state, unavailable, lastFetched, mode }: PropsWithChildren<{ toolbar?: ReactNode; state?: SyncState; unavailable?: boolean; lastFetched?: string; lastSync?: string; mode?: IntegrationMode }>) {
  return <div className={styles.shell}><a href="#main-content" className={styles.skip}>跳至主要内容</a><Header state={state} unavailable={unavailable} mode={mode}/>
    <main id="main-content" className={styles.main}>
      <div className={styles.titleRow}><div><div className={styles.eyebrow}><span/>你的数据，井然有序</div><h1>同步工作台</h1><p>同步进展、预警提醒与每一次变化，都在这里。</p></div>{toolbar}</div>
      <div className={styles.content}>{children}</div>
      <footer className={styles.footer}><span><Icon name="layers" size={14}/><strong>EXO Sync</strong><span>让数据流转，让工作简单。</span></span><span>{lastFetched ? '页面更新于 ' + lastFetched : '正在连接工作空间'}<span className={styles.footerDivider}>·</span>同步结果自动保存</span></footer>
    </main>
  </div>;
}
