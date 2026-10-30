import type { ReactNode } from 'react';
import { Icon, type IconName } from '../common/Icon';
import styles from './EmptyState.module.css';
export function EmptyState({ title, description, icon = 'layers', action }: { title: string; description: string; icon?: IconName; action?: ReactNode }) {
  return <div className={styles.empty}><span className={styles.icon}><Icon name={icon} size={25}/></span><h3>{title}</h3><p>{description}</p>{action}</div>;
}
