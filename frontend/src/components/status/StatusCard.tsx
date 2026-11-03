import { useExo } from '../../state/ExoContext';
import { formatNumber, formatDate, stageLabels } from '../../utils/format';
import { Icon, type IconName } from '../common/Icon';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { ErrorBanner } from '../feedback/ErrorBanner';
import { SkeletonBlock } from '../feedback/SkeletonBlock';
import styles from './StatusCard.module.css';

export function StatusCard({ onRetry, onTrigger, canTrigger, triggering, onSelectRun, onConfigure, onWarnings, onResume, onRetryNotice, actionBusy }: {
  onRetry: () => void; onTrigger: () => void; canTrigger: boolean; triggering: boolean;
  onSelectRun: (id: string) => void; onConfigure: () => void; onWarnings: () => void;
  onResume: (id: string) => void; onRetryNotice: (id: string) => void; actionBusy: boolean;
}) {
  const { state: { status, statusLoading, statusError } } = useExo();
  const run = status?.latestRun;
  const syncing = status?.state === 'syncing';
  const failed = status?.state === 'error';
  const unready = status && !status.ready;
  const canResume = !!run?.recoverable && failed;
  const warningCount = run?.warningCount ?? 0;
  const warningsReady = !!run && ['notify', 'complete'].includes(run.stage);
  const noticeFailed = run?.notificationState === 'failed';
  const title = statusError ? '暂时无法获取最新进展' : !status ? '正在连接你的工作空间' : unready ? '完成系统连接，就能开始同步' : syncing ? '正在为你更新数据' : failed ? '这次同步还没有完成' : run ? (run.counters.written ? '数据已更新，放心使用' : '数据核对完成，无需重复更新') : '一切就绪，开始第一次同步';
  const description = statusError ? '请稍后刷新页面。下方如有数据，是最近一次获取的结果。' : !status ? '请稍候，正在读取同步结果与设置。' : unready ? '请联系管理员完成连接设置，之后就可以在这里更新数据。' : syncing ? '任务已在后台开始执行，你可以在这里查看进展。' : failed ? (canResume ? '已完成的更新会保留。点击下方按钮，继续处理剩余数据。' : '已完成的更新会保留。请先查看结果和错误提示，处理后再发起同步。') : run ? run.year + ' 年数据已处理完成。' + (run.counters.written ? '本次有 ' + run.counters.written + ' 条新增或更新，已完成核对。' : '已核对 ' + run.counters.valid + ' 条可用数据，没有需要重复写入的内容。') : '选择需要同步的年份，系统会自动读取数据并更新表格。';
  const heroIcon: IconName = statusError || failed ? 'alert' : syncing ? 'sync' : unready ? 'settings' : run ? 'check' : 'layers';
  const metrics: Array<{key:'fetched'|'valid'|'written'|'failed'; title:string; detail:string; icon:IconName}> = [
    { key:'fetched', title:'读取到的数据', detail:'本次从来源系统获取', icon:'database' },
    { key:'valid', title:'可用的数据', detail:'已完成整理与检查', icon:'check' },
    { key:'written', title:'已更新至表格', detail:run ? '新增 ' + run.stats.added + ' 条 · 更新 ' + run.stats.updated + ' 条' : '包含新增和更新的记录', icon:'target' },
    { key:'failed', title:'未完成的数据', detail:failed ? '请查看结果后继续处理' : syncing ? '本次未成功更新的记录' : '本次没有更新失败的记录', icon:'shield' },
  ];
  return <section aria-label="同步概览" aria-busy={statusLoading}>
    <div className={styles.heroGrid}>
      <div className={styles.hero + (failed || statusError ? ' ' + styles.heroError : '')}>
        <div className={styles.heroTop}><span className={styles.eyebrow}>最近一次同步</span>{run?.mode === 'simulation' && <span className={styles.demo}>演示结果</span>}</div>
        <div className={styles.heroBody}><span className={styles.heroIcon}><Icon name={heroIcon} size={28}/></span><div><h2>{title}</h2><p>{description}</p></div></div>
        <div className={styles.heroActions}>
          {statusError ? <Button variant="primary" onClick={onRetry}>重新获取进展<Icon name="sync" size={16}/></Button> : unready ? <Button variant="primary" onClick={onConfigure}>查看连接设置<Icon name="arrow" size={16}/></Button> : canResume && run ? <Button variant="primary" onClick={() => onResume(run.runId)} disabled={actionBusy}>继续未完成的同步<Icon name="arrow" size={16}/></Button> : <Button variant="primary" onClick={onTrigger} disabled={!canTrigger || !status?.ready}>{triggering ? '正在提交…' : syncing ? '同步进行中…' : '立即同步'}{!syncing && <Icon name="arrow" size={16}/>}</Button>}
          {run && <Button variant="ghost" onClick={() => onSelectRun(run.runId)}>查看本次明细<Icon name="chevronRight" size={14}/></Button>}
          {!run && status?.ready && <span className={styles.actionHint}>选择年份后再确认</span>}
        </div>
        {syncing && <div className={styles.progress}><span>{stageLabels[run?.stage ?? 'queued'] ?? '正在处理'}</span><progress max={100} value={status?.progress ?? undefined} aria-label="同步进度"/></div>}
        <div className={styles.heroFooter}><span><Icon name="clock" size={14}/>{run ? (run.finishedAt ? '上次完成：' + formatDate(run.finishedAt, true) : '开始于 ' + formatDate(run.startedAt, true)) : '同步结果会自动保存在下方记录中'}</span><span className={styles.safe}><Icon name="shield" size={14}/>保留人工填写的内容</span></div>
      </div>
      <aside className={styles.attention} aria-labelledby="attention-title">
        <div className={styles.attentionTop}><h2 id="attention-title"><Icon name="bell" size={17}/>需要关注</h2><span>最近一次同步</span></div>
        <div className={styles.warningNumber}><strong>{warningsReady ? formatNumber(warningCount) : '—'}</strong><span>条预警记录</span>{warningsReady && !warningCount && <Badge tone="success">暂无预警</Badge>}</div>
        <p>{!warningsReady ? (syncing ? '正在处理数据，完成提醒检查后会显示数量。' : '完成提醒检查后，这里会显示需要关注的记录数量。') : warningCount ? '这些记录进入了你设置的提醒范围，请及时关注。' : '本次没有记录进入提醒范围。'}</p>
        {noticeFailed ? <><div className={styles.noticeFailed}><Icon name="alert" size={14}/>飞书提醒未送达，表格结果已保留</div><Button variant="ghost" disabled={actionBusy} onClick={() => run && onRetryNotice(run.runId)}>重新发送提醒<Icon name="arrow" size={14}/></Button></> : <><div className={styles.noticeState}><Icon name={run?.notificationState === 'sent' ? 'check' : 'bell'} size={14}/>{run?.notificationState === 'sent' ? (run.mode === 'simulation' ? '已完成演示通知' : '已通过飞书发送提醒') : run?.notificationState === 'disabled' ? '本次未开启飞书提醒' : run?.notificationState === 'sending' ? '正在发送飞书提醒' : '按已保存的规则识别提醒'}</div><Button variant="ghost" onClick={onWarnings}>查看提醒规则<Icon name="chevronRight" size={14}/></Button></>}
      </aside>
    </div>
    {statusError && <ErrorBanner message={statusError} onRetry={onRetry}/>}
    {!status && statusLoading ? <SkeletonBlock rows={1}/> : <div className={styles.metrics} aria-label="本次数据处理结果">{metrics.map(metric => <div className={styles.metric} key={metric.key}><div className={styles.metricTitle}>{metric.title}<Icon name={metric.icon} size={16}/></div><div className={styles.value + (metric.key === 'failed' && run?.counters.failed ? ' ' + styles.failureValue : '')}>{run ? formatNumber(run.counters[metric.key]) : '—'}<span>条</span></div><p>{metric.detail}</p></div>)}</div>}
  </section>;
}
