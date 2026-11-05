import type { BoardRecord } from '../../api/types';
import { boardColumns } from '../../utils/board';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { BoardCell } from './BoardCell';
import styles from './Board.module.css';
export function RecordDetails({ record, selectedId, onClose }: { record: BoardRecord | null; selectedId: string; onClose: () => void }) {
  return <Modal open={!!record} title={record ? record.number + ' · 记录详情' : '记录详情'} onClose={onClose} footer={<Button onClick={onClose}>关闭详情</Button>}>
    {record && <div className={styles.details}>
      <p className={styles.detailsIntro}>共 15 项公共字段 · {record.taskSummary.total} 个关联任务，在列表中展开查看 · 时间按北京时间显示</p>
      {([['记录信息', 0, 10], ['创建信息', 10, 12], ['相关文件', 12, 15]] as const).map(([title, start, end]) => <section key={title}><h3>{title}</h3><dl>{boardColumns.slice(start, end).map(([field, label]) => <div key={field}><dt>{label}</dt><dd><BoardCell record={record} field={field} selectedId={selectedId}/></dd></div>)}</dl></section>)}
    </div>}
  </Modal>;
}
