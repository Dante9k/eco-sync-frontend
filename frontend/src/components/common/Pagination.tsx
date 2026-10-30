import { Button } from './Button';
import { Icon } from './Icon';
import { formatNumber } from '../../utils/format';
import styles from './Pagination.module.css';
export function Pagination({ page, pageSize, total, onChange, disabled = false }: { page: number; pageSize: number; total: number; onChange: (page: number) => void; disabled?: boolean }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return <nav className={styles.pagination} aria-label="分页">
    <span>共 <strong>{formatNumber(total)}</strong> 条记录<span className={styles.range}> · {total ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, total)}</span></span>
    <div className={styles.controls}><span className={styles.size}>{pageSize} 条 / 页</span><Button onClick={() => onChange(page - 1)} disabled={disabled || page <= 1} aria-label="上一页"><Icon name="chevronLeft" size={14}/></Button><span className={styles.current} aria-current="page">{page} <span>/ {pages}</span></span><Button onClick={() => onChange(page + 1)} disabled={disabled || page >= pages} aria-label="下一页"><Icon name="chevronRight" size={14}/></Button></div>
  </nav>;
}
