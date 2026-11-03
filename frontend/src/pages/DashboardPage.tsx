import { useDashboard } from '../hooks/useDashboard';
import { DIFF_PAGE_SIZE } from '../hooks/useExoDiff';
import { AppShell } from '../components/layout/AppShell';
import { Toolbar } from '../components/layout/Toolbar';
import { StatusCard } from '../components/status/StatusCard';
import { HistoryTable } from '../components/history/HistoryTable';
import { DiffViewer } from '../components/diff/DiffViewer';
import { ErrorBanner } from '../components/feedback/ErrorBanner';
import { Tabs } from '../components/common/Tabs';
import { Modal } from '../components/common/Modal';
import { Button } from '../components/common/Button';
import { Icon } from '../components/common/Icon';
import { formatDate, formatToday } from '../utils/format';
import { ConfigurationPanels, AdvancedSettings } from '../components/config/ConfigurationPanels';
import { ConfigurationModal } from '../components/config/ConfigurationModal';
import { OperationLogs } from '../components/logs/OperationLogs';
import { UsageGuide } from '../components/layout/UsageGuide';
import formStyles from '../components/config/ConfigurationModal.module.css';

export function DashboardPage() {
  const { state, status, history, diff, trigger, config, logs, runActions, refresh, setTab, toggleAutoRefresh } = useDashboard();
  const announcement = state.status?.state === 'syncing' ? '数据同步进行中。' : state.status?.state === 'success' ? '数据同步已完成。' : state.status?.state === 'error' ? '同步尚未完成，请查看提示。' : '';
  const viewRun = (id: string) => { diff.selectRun(id); document.getElementById('sync-records')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  const selectedRun = state.history?.items.find(run => run.runId === state.selectedRunId) ?? (state.status?.latestRun?.runId === state.selectedRunId ? state.status.latestRun : undefined);
  return <AppShell state={state.status?.state} mode={state.status?.mode} unavailable={!!state.statusError} lastFetched={state.lastFetchedAt ? formatDate(new Date(state.lastFetchedAt).toISOString(), true) : undefined} toolbar={<Toolbar autoRefresh={state.autoRefresh} onToggleAutoRefresh={toggleAutoRefresh} onRefresh={refresh} loading={state.statusLoading || state.historyLoading || state.diffLoading || config.loading}/>}>
    <div className="srOnly" role="status" aria-live="polite" aria-atomic="true">{announcement}</div>
    {state.triggerError && <ErrorBanner message={state.triggerError}/>}
    {runActions.error && <ErrorBanner message={runActions.error}/>}
    <StatusCard onRetry={status.refresh} onTrigger={trigger.request} canTrigger={trigger.canTrigger} triggering={state.triggering} onSelectRun={viewRun} onConfigure={() => config.open('integrations')} onWarnings={() => config.open('warnings')} onResume={runActions.resume} onRetryNotice={runActions.retryNotification} actionBusy={runActions.busy}/>
    <ConfigurationPanels controller={config} status={state.status}/>
    <Tabs active={state.activeTab} onChange={setTab} total={state.history?.total}>
      {state.activeTab === 'history' ? <HistoryTable page={state.history} query={state.historyQuery} loading={state.historyLoading} error={state.historyError} onSelectRun={viewRun} onQueryChange={history.changeQuery} onRetry={history.refresh} runActions={runActions}/> : <DiffViewer runId={state.selectedRunId} run={selectedRun} diff={state.diff} loading={state.diffLoading} error={state.diffError} onRetry={() => { void diff.refresh(); }} onBack={() => setTab('history')} page={state.diffPage} pageSize={DIFF_PAGE_SIZE} onPageChange={diff.changePage}/>}
    </Tabs>
    <UsageGuide/>
    <OperationLogs controller={logs} onSelectRun={viewRun}/>
    <AdvancedSettings controller={config} ready={!!state.status?.ready}/>
    <ConfigurationModal controller={config}/>
    <Modal open={trigger.confirmOpen} title="立即同步" onClose={trigger.close} footer={<><Button onClick={trigger.close}>取消</Button><Button variant="primary" onClick={() => { void trigger.trigger(); }} disabled={!trigger.canTrigger || !trigger.validYear}>确认并开始同步<Icon name="arrow" size={16}/></Button></>}>
      <div className={formStyles.form}>
        <p className={formStyles.intro}>选择年份，剩下的交给系统。</p>
        <label className={formStyles.field}>同步哪一年的数据？<input data-initial-focus type="number" min={1970} max={trigger.currentYear} step={1} value={trigger.yearInput} aria-invalid={!trigger.validYear} aria-describedby="sync-year-help" onChange={event => trigger.setYearInput(event.target.value)}/></label>
        <div className={formStyles.presets}>{[trigger.currentYear, trigger.currentYear - 1].map((year, index) => <button key={year} type="button" aria-pressed={Number(trigger.yearInput) === year} onClick={() => trigger.setYearInput(String(year))}>{index ? '去年' : '今年'} · {year}</button>)}</div>
        <div id="sync-year-help" className={trigger.validYear ? formStyles.rangePreview : formStyles.validation} role={trigger.validYear ? undefined : 'alert'}>{trigger.validYear ? <><Icon name="calendar" size={19}/><div><strong>本次同步范围</strong><p>{trigger.yearInput}年1月1日 — {Number(trigger.yearInput) === trigger.currentYear ? formatToday() + '（今天）' : trigger.yearInput + '年12月31日'}</p><small>包含起止当天，按北京时间计算。</small></div></> : '请输入 1970 至 ' + trigger.currentYear + ' 之间的完整年份。'}</div>
        <div className={formStyles.explanation}><Icon name="shield" size={18}/><p>系统会读取并检查数据，再更新表格。人工填写的内容会保留，也不会因为来源中少了记录就自动删除表格内容。</p></div>
        {state.status?.mode === 'simulation' && <p className={formStyles.demoNote}>当前为演示环境，可以放心体验。不会修改真实业务数据，也不会发送真实飞书消息。</p>}
      </div>
    </Modal>
  </AppShell>;
}
