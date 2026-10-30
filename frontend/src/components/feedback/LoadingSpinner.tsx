import styles from './LoadingSpinner.module.css';
export function LoadingSpinner({ label = '正在加载' }: { label?: string }) {
  return <span className={styles.spinner} role="status" aria-label={label} />;
}
