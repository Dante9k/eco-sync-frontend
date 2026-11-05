import type { PropsWithChildren, ReactNode } from 'react';
import type { IntegrationMode, SyncState } from '../../api/types';
import { Header } from './Header';
import { BrandMark } from '../common/BrandMark';
import styles from './AppShell.module.css';
export function AppShell({ children, toolbar, state, unavailable, lastFetched, mode, compact = false, title = '同步工作台', subtitle = '同步进展、预警提醒与每一次变化，都在这里。', eyebrow = '你的数据，井然有序', footerNote = '同步结果自动保存' }: PropsWithChildren<{ compact?: boolean; title?: string; subtitle?: string; eyebrow?: string; footerNote?: string; toolbar?: ReactNode; state?: SyncState; unavailable?: boolean; lastFetched?: string; lastSync?: string; mode?: IntegrationMode }>) {
  return <div className={`${styles.shell} ${compact ? styles.compact : ''}`}><a href="#main-content" className={styles.skip}>跳至主要内容</a><Header state={state} unavailable={unavailable} mode={mode} compact={compact}/>
    <main id="main-content" className={styles.main}>
      <div className={styles.titleRow}><div>{!compact && <div className={styles.eyebrow}><span/>{eyebrow}</div>}<h1>{title}</h1>{!compact && <p>{subtitle}</p>}</div>{toolbar}</div>
      <div className={styles.content}>{children}</div>
      {!compact && <footer className={styles.footer}><span><BrandMark size={16}/><strong>EXO Sync</strong><span>让数据流转，让工作简单。</span></span><span>{lastFetched ? '页面更新于 ' + lastFetched : '正在连接工作空间'}<span className={styles.footerDivider}>·</span>{footerNote}</span></footer>}
    </main>
  </div>;
}
