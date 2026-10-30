import type { ReactNode } from 'react';
import type { ActiveTab } from '../../state/actions';
import { Icon } from './Icon';
import styles from './Tabs.module.css';
export function Tabs({ active, onChange, total, children }: { active: ActiveTab; onChange: (tab: ActiveTab) => void; total?: number; children: ReactNode }) {
  const tabs: Array<{ id: ActiveTab; label: string; icon: 'history' | 'diff' }> = [{ id: 'history', label: '同步历史', icon: 'history' }, { id: 'diff', label: '差异详情', icon: 'diff' }];
  return <section className={styles.section}>
    <div role="tablist" aria-label="同步记录" className={styles.tabs}>
      {tabs.map((tab, index) => <button key={tab.id} role="tab" id={`tab-${tab.id}`} aria-controls={`panel-${tab.id}`} aria-selected={active === tab.id} tabIndex={active === tab.id ? 0 : -1} className={active === tab.id ? styles.active : ''} onClick={() => onChange(tab.id)} onKeyDown={event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : 1 - index;
        onChange(tabs[next].id);
        document.getElementById(`tab-${tabs[next].id}`)?.focus();
      }}><Icon name={tab.icon} size={16} />{tab.label}{tab.id === 'history' && total !== undefined && <span className={styles.count}>{total}</span>}</button>)}
      <span className={styles.caption}>每一次变化，都有迹可循</span>
    </div>
    <div role="tabpanel" id={`panel-${active}`} aria-labelledby={`tab-${active}`} tabIndex={0}>{children}</div>
  </section>;
}
