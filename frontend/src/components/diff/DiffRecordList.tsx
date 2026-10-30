import type { DiffRecord, DiffKind } from '../../api/types';
import { sanitizeText } from '../../utils/sanitize';
import { useExpandableText } from '../../hooks/useExpandableText';
import { Badge } from '../common/Badge';
import styles from './DiffRecordList.module.css';
function DisplayValue({ value }: { value: string | null }) {
  const { expanded, long, text, toggle } = useExpandableText(sanitizeText(value ?? ''));
  if (value === null) return <span className={styles.missing}>空值</span>;
  return <span>{text || <span className={styles.missing}>空字符串</span>}{long && <button className={styles.expand} onClick={toggle} aria-expanded={expanded}>{expanded ? '收起' : '展开全部'}</button>}</span>;
}
const labels: Record<DiffKind, string> = { added: '新增', updated: '修改', removed: '删除' };
const tones = { added: 'success', updated: 'warning', removed: 'danger' } as const;
export function DiffRecordList({ records }: { records: DiffRecord[] }) {
  return <div className={styles.list}>{(['added', 'updated', 'removed'] as const).map(kind => {
    const group = records.filter(record => record.kind === kind);
    if (!group.length) return null;
    return <section key={kind} className={styles.group} aria-label={`${labels[kind]}记录`}><h3><Badge tone={tones[kind]}>{labels[kind]}</Badge><span>本页 {group.length} 条记录</span></h3>{group.map((record, index) => <article className={`${styles.record} ${styles[kind]}`} key={`${record.key}:${index}`}><header><code>{sanitizeText(record.key)}</code><span>{record.fields?.length ?? 0} 个展示字段</span></header>{record.fields?.length ? <div className={styles.fields}><div className={styles.columnLabels}><span>字段</span><span>变更前</span><span>变更后</span></div>{record.fields.map((field, fieldIndex) => <div className={styles.field} key={`${field.name}:${fieldIndex}`}><span className={styles.name}>{sanitizeText(field.name)}</span><div className={styles.before}><span className={styles.mobileLabel}>变更前</span><DisplayValue value={field.before}/></div><div className={styles.after}><span className={styles.mobileLabel}>变更后</span><DisplayValue value={field.after}/></div></div>)}</div> : <p className={styles.noFields}>此记录没有可展示的字段明细。</p>}</article>)}</section>;
  })}</div>;
}
