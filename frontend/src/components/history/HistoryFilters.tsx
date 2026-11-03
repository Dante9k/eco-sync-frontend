import type { HistoryQuery } from '../../api/types';
import { isSyncState } from '../../utils/guards';
import styles from './HistoryFilters.module.css';
export function HistoryFilters({ query, onChange }: { query: HistoryQuery; onChange: (query: Partial<HistoryQuery>) => void }) {
  return <div className={styles.filters}><p>从最近的一次开始，查看同步结果与数据变化。</p><label><span>查看</span><select value={query.state} onChange={event => { const state = event.target.value; if (state === 'all' || isSyncState(state)) onChange({ state }); }} aria-label="筛选同步状态"><option value="all">全部状态</option><option value="success">已完成</option><option value="syncing">正在同步</option><option value="error">未完成</option><option value="idle">等待开始</option></select></label></div>;
}
