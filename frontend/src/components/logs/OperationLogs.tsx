import type { LogQuery } from '../../api/types';
import type { useOperationLogs } from '../../hooks/useOperationLogs';
import { formatDate, stageLabels, formatNumber } from '../../utils/format';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Icon } from '../common/Icon';
import { Pagination } from '../common/Pagination';
import { ErrorBanner } from '../feedback/ErrorBanner';
import { EmptyState } from '../feedback/EmptyState';
import { SkeletonBlock } from '../feedback/SkeletonBlock';
import styles from './OperationLogs.module.css';
const sectionLabels = { schedule: '自动同步', warnings: '提醒范围', notifications: '飞书提醒', integrations: '系统连接', logging: '记录详细程度' };
const messages: Record<string,string> = {'sync.started':'已开始一次同步','sync.resumed':'正在继续处理未完成的数据','sync.completed':'数据已更新并完成核对','sync.failed':'这次同步尚未完成，请查看结果','sync.interrupted':'同步意外中断，可继续处理未完成的部分','sync.checkpoint':'已保存当前更新进度','notification.sent':'已完成本次提醒发送','notification.failed':'提醒未送达，可以重新发送','notification.skipped':'本次无需发送提醒，或提醒已关闭','schedule.skipped':'已有同步正在进行，本次自动同步已跳过'};
export function OperationLogs({ controller: c, onSelectRun }: { controller: ReturnType<typeof useOperationLogs>; onSelectRun: (runId: string) => void }) {
  return <details className={styles.card}>
    <summary className={styles.heading}><span className={styles.headingIcon}><Icon name="history" size={19}/></span><span><strong>操作记录</strong><small>回看设置修改、同步过程和提醒结果</small></span>{c.error && <Badge tone="danger">读取失败</Badge>}<Icon name="chevronRight" size={17}/></summary>
    <div aria-busy={c.loading}><div className={styles.filters}><label>结果<select value={c.query.level} onChange={event => c.changeQuery({ level: event.target.value as LogQuery['level'] })}><option value="">全部结果</option><option value="INFO">日常记录</option><option value="ERROR">需要处理</option><option value="DEBUG">详细过程</option></select></label><label>操作<select value={c.query.category} onChange={event => c.changeQuery({ category: event.target.value as LogQuery['category'] })}><option value="">全部操作</option><option value="config">修改设置</option><option value="sync">数据同步</option><option value="notification">飞书提醒</option><option value="schedule">自动同步</option></select></label><Button variant="ghost" onClick={c.refresh} disabled={c.loading}>刷新记录</Button></div>
    {c.error ? <div className={styles.feedback}><ErrorBanner message={c.error} onRetry={c.refresh}/></div> : !c.page && c.loading ? <SkeletonBlock rows={3}/> : c.page?.items.length ? <ol className={styles.list}>{c.page.items.map(item => <li key={item.id}><span className={styles.dot + (item.level === 'ERROR' ? ' ' + styles.errorDot : '')}/><div className={styles.message}><p>{item.event === 'config.updated' ? '已保存' + (item.context?.section ? '「' + sectionLabels[item.context.section] + '」' : '') + '设置' : item.event === 'sync.stage' ? '正在' + (stageLabels[item.context?.stage ?? ''] ?? '处理数据') : messages[item.event] ?? item.message}{item.level === 'ERROR' && <Badge tone="danger">需要处理</Badge>}</p><time dateTime={item.at}>{formatDate(item.at)}</time>{item.context?.counters && <span>读取 {formatNumber(item.context.counters.fetched)} 条 · 更新 {formatNumber(item.context.counters.written)} 条 · 未完成 {formatNumber(item.context.counters.failed)} 条</span>}</div>{item.runId && <Button variant="ghost" onClick={() => onSelectRun(item.runId!)}>查看明细<Icon name="chevronRight" size={13}/></Button>}</li>)}</ol> : <EmptyState title="还没有操作记录" description="保存设置或执行同步后，记录会自动出现在这里。" icon="history"/>}
    {c.page && <Pagination page={c.page.page} pageSize={c.page.pageSize} total={c.page.total} onChange={page => c.changeQuery({ page })} disabled={c.loading}/>}</div>
  </details>;
}
