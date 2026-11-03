import type { DiffRecord, DiffKind } from '../../api/types';
import { sanitizeText } from '../../utils/sanitize';
import { useExpandableText } from '../../hooks/useExpandableText';
import { Badge } from '../common/Badge';
import { Icon } from '../common/Icon';
import styles from './DiffRecordList.module.css';
function DisplayValue({ value }: { value: string | null }) {
  const { expanded, long, text, toggle } = useExpandableText(sanitizeText(value ?? ''));
  if (value === null) return <span className={styles.missing}>未填写</span>;
  return <span>{text || <span className={styles.missing}>空白内容</span>}{long && <button className={styles.expand} onClick={toggle} aria-expanded={expanded}>{expanded ? '收起' : '展开全部'}</button>}</span>;
}
const labels: Record<DiffKind, string> = { added: '新增', updated: '更新', removed: '删除' };
const tones = { added: 'success', updated: 'warning', removed: 'danger' } as const;
const demoFieldLabels: Record<string, string> = { title: '记录名称', status: '处理状态', ageDays: '预警天数' };
export function DiffRecordList({ records, demo = false }: { records: DiffRecord[]; demo?: boolean }) {
  return <div className={styles.list}>{(['added', 'updated', 'removed'] as const).map(kind => {
    const group = records.filter(record => record.kind === kind);
    if (!group.length) return null;
    return <section key={kind} className={styles.group} aria-label={labels[kind] + '记录'}><h3><Badge tone={tones[kind]}>{labels[kind]}</Badge><span>本页 {group.length} 条 · 点击记录查看内容</span></h3>{group.map((record, index) => <details className={styles.record + ' ' + styles[kind]} key={record.key + ':' + index} open={index === 0}><summary><code>{sanitizeText(record.key)}</code><span>{record.fields?.length ?? 0} 项内容<Icon name="chevronRight" size={14}/></span></summary>{record.fields?.length ? <div className={styles.fields + (kind !== 'updated' ? ' ' + styles.single : '')}><div className={styles.columnLabels}><span>内容</span>{kind !== 'added' && <span>{kind === 'removed' ? '删除的内容' : '更新前'}</span>}{kind !== 'removed' && <span>{kind === 'added' ? '新增的内容' : '更新后'}</span>}</div>{record.fields.map((field, fieldIndex) => <div className={styles.field} key={field.name + ':' + fieldIndex}><span className={styles.name}>{sanitizeText(demo ? demoFieldLabels[field.name] ?? field.name : field.name)}</span>{kind !== 'added' && <div className={styles.before}><span className={styles.mobileLabel}>{kind === 'removed' ? '删除的内容' : '更新前'}</span><DisplayValue value={field.before}/></div>}{kind !== 'removed' && <div className={styles.after}><span className={styles.mobileLabel}>{kind === 'added' ? '新增的内容' : '更新后'}</span><DisplayValue value={field.after}/></div>}</div>)}</div> : <p className={styles.noFields}>这条记录没有可展示的内容。</p>}</details>)}</section>;
  })}</div>;
}
