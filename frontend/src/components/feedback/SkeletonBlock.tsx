import styles from './SkeletonBlock.module.css';
export function SkeletonBlock({ rows = 3 }: { rows?: number }) {
  return <div className={styles.skeleton} role="status" aria-label="正在加载数据">{Array.from({ length: rows }, (_, index) => <div key={index}/>)}</div>;
}
