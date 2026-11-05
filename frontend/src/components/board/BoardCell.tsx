import type { BoardRecord } from '../../api/types';
import type { BoardField } from '../../utils/board';
import { formatDate, formatNumber } from '../../utils/format';
import { PersonTag } from './PersonTag';
import styles from './Board.module.css';

export function BoardCell({ record, field, selectedId, compact = false }: { record: BoardRecord; field: BoardField; selectedId: string; compact?: boolean }) {
  if (field === 'creator') return <div className={styles.personCell}><PersonTag person={record.creator} selectedId={selectedId}/>{compact && <small>{record.creatorDepartment || '未填写部门'}</small>}</div>;
  if (field === 'number') return <div className={styles.numberCell}><strong>{record.number}</strong>{compact && <small>{record.type}</small>}</div>;
  if (field === 'content') return <div className={styles.contentCell}><span>{record.content || '未填写'}</span>{compact && <small>{record.reason}</small>}</div>;
  if (field === 'status') return <span className={styles.status} data-state={record.status === '已关闭' ? 'closed' : record.status === '待确认' ? 'pending' : 'open'}><i/>{record.status || '未填写'}</span>;
  if (field === 'durationDays') return record.durationDays === null ? <span className={styles.muted}>—</span> : <span className={styles.duration}><strong>{formatNumber(record.durationDays)}</strong> 天</span>;
  if (['startedAt', 'closedAt', 'relatedFileStartedAt', 'relatedFileClosedAt'].includes(field)) return <span className={styles.date}>{formatDate(record[field] as string | null, false, 'Asia/Shanghai')}</span>;
  if (field === 'impacts' || field === 'regions' || field === 'relatedFileNumbers') return <div className={styles.tagList}>{record[field].map((item, i) => <span className={field === 'relatedFileNumbers' ? styles.fileTag : styles.textTag} key={item + i}>{item}</span>)}{!record[field].length && <span className={styles.muted}>—</span>}</div>;
  return <span className={styles.longText}>{record[field] || '—'}</span>;
}
