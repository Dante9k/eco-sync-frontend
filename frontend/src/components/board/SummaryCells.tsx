import type { BoardPerson, BoardRecord } from '../../api/types';
import { formatCalendarDate, formatDate } from '../../utils/format';
import { roleLabels } from '../../utils/board';
import { BoardCell } from './BoardCell';
import { PersonTag } from './PersonTag';
import { Icon } from '../common/Icon';
import styles from './Board.module.css';
import layout from './GroupedTable.module.css';

function DateLine({ label, value }: { label: string; value: string | null }) {
  return <div className={styles.metaLine}><span>{label}</span><time dateTime={value ?? undefined} title={formatDate(value, false, 'Asia/Shanghai')}>{formatCalendarDate(value, 'Asia/Shanghai')}</time></div>;
}
export function TaskSummary({ record, selectedId, expanded, onToggle, panelId }: { record: BoardRecord; selectedId: string; expanded: boolean; onToggle: () => void; panelId: string }) {
  const summary = record.taskSummary;
  if (!summary.total) return <span className={styles.muted}>暂无关联任务</span>;
  return <button type="button" className={layout.taskToggle} aria-label={`${expanded ? '收起' : '展开'} ${record.number} 的 ${summary.total} 个任务`} aria-expanded={expanded} aria-controls={expanded ? panelId : undefined} onClick={onToggle}>
    <span className={layout.taskHeadline}><strong>{summary.total} 个任务</strong><span>{expanded ? '收起' : '展开'}<Icon name="chevronRight" size={12}/></span></span>
    <span className={layout.taskProgress}><progress value={summary.completed} max={summary.total} aria-label="任务完成进度"/><span>已完成 {summary.completed}/{summary.total}</span></span>
    {selectedId && !record.matchedRoles.includes('creator') ? <span className={layout.relatedCount}>其中 {summary.matched} 个与所选人员相关</span> : <span className={layout.lastTaskUpdate}>更新 {formatCalendarDate(summary.latestUpdatedAt, 'Asia/Shanghai')}</span>}
  </button>;
}
export function SummaryCells({ record, selected, selectedId, expanded, onToggle, panelId }: { record: BoardRecord; selected: BoardPerson | null; selectedId: string; expanded: boolean; onToggle: () => void; panelId: string }) {
  const cell = (field: Parameters<typeof BoardCell>[0]['field']) => <BoardCell record={record} field={field} selectedId={selectedId}/>;
  return <>
    <td data-group="record"><div className={styles.recordIdentity}>{cell('number')}<span className={styles.textTag}>{record.type || '未分类'}</span></div><div className={styles.recordContent}>{record.content || '未填写内容'}</div><div className={styles.recordReason}><span>原因</span>{record.reason || '未填写'}</div></td>
    <td data-group="progress"><div className={styles.progressCell}>{cell('status')}<span className={styles.durationLabel}>持续 {cell('durationDays')}</span></div></td>
    <td data-group="people"><div className={styles.participants}><div><span className={styles.roleLabel}>创建者</span>{cell('creator')}</div><small className={layout.department}>{record.creatorDepartment || '未填写部门'}</small>
      {selected && !record.matchedRoles.includes('creator') && <div className={layout.matchedPerson}><PersonTag person={selected} selectedId={selectedId}/><small>{record.matchedRoles.map(role => roleLabels[role]).join(' / ')}</small></div>}
    </div></td>
    <td data-group="task"><TaskSummary record={record} selectedId={selectedId} expanded={expanded} onToggle={onToggle} panelId={panelId}/></td>
    <td data-group="timeline"><DateLine label="开始" value={record.startedAt}/><DateLine label="关闭" value={record.closedAt}/></td>
    <td data-group="references"><div className={styles.referenceLine}><span>地区</span>{cell('regions')}</div><div className={styles.referenceLine}><span>影响</span>{cell('impacts')}</div><div className={styles.referenceLine}><span>文件</span>{cell('relatedFileNumbers')}</div></td>
  </>;
}
