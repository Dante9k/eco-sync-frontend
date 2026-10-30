import type { HistoryQuery } from '../../api/types';
import { isSyncState } from '../../utils/guards';
import styles from './HistoryFilters.module.css';
export function HistoryFilters({ query, onChange }: { query: HistoryQuery; onChange: (query: Partial<HistoryQuery>) => void }) {
  return <div className={styles.filters}><div><h2>同步记录</h2><p>查看同步结果与每次数据变更</p></div><label><span>状态</span><select value={query.state} onChange={event => { const state = event.target.value; if (state === 'all' || isSyncState(state)) onChange({ state }); }} aria-label="筛选同步状态"><option value="all">全部状态</option><option value="success">同步成功</option><option value="syncing">同步进行中</option><option value="error">同步失败</option><option value="idle">等待同步</option></select></label></div>;
}
