import { useDashboard } from '../hooks/useDashboard';
import { DIFF_PAGE_SIZE } from '../hooks/useEcoDiff';
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
import { formatDate } from '../utils/format';

export function DashboardPage() {
  const { state, status, history, diff, trigger, refresh, setTab, toggleAutoRefresh } = useDashboard();
  const announcement = state.status?.state === 'syncing' ? '数据同步进行中。' : state.status?.state === 'success' ? '数据同步已完成。' : state.status?.state === 'error' ? '同步失败，请查看错误信息。' : '';
  return <AppShell state={state.status?.state} unavailable={!!state.statusError} lastFetched={state.lastFetchedAt ? formatDate(new Date(state.lastFetchedAt).toISOString(), true) : undefined} toolbar={<Toolbar onTrigger={trigger.request} disabled={!trigger.canTrigger} autoRefresh={state.autoRefresh} onToggleAutoRefresh={toggleAutoRefresh} onRefresh={refresh} loading={state.statusLoading || state.historyLoading || state.diffLoading} triggering={state.triggering}/> }>
    <div className="srOnly" role="status" aria-live="polite" aria-atomic="true">{announcement}</div>
    {state.triggerError && <ErrorBanner message={state.triggerError}/>}
    <StatusCard onRetry={status.refresh}/>
    <Tabs active={state.activeTab} onChange={setTab} total={state.history?.total}>
      {state.activeTab === 'history' ? <HistoryTable page={state.history} query={state.historyQuery} loading={state.historyLoading} error={state.historyError} onSelectRun={diff.selectRun} onQueryChange={history.changeQuery} onRetry={history.refresh}/> : <DiffViewer runId={state.selectedRunId} diff={state.diff} loading={state.diffLoading} error={state.diffError} onRetry={() => { void diff.refresh(); }} onBack={() => setTab('history')} page={state.diffPage} pageSize={DIFF_PAGE_SIZE} onPageChange={diff.changePage}/>}
    </Tabs>
    <Modal open={trigger.confirmOpen} title="开始一次新的同步？" onClose={trigger.close} footer={<><Button onClick={trigger.close} data-initial-focus>取消</Button><Button variant="primary" onClick={() => { void trigger.trigger(); }} disabled={!trigger.canTrigger}><Icon name="sync" size={15}/>确认同步</Button></>}>
      将读取源端的最新 ECO 数据，并将新增、修改和删除同步到目标端。你可以在同步历史中查看结果。
    </Modal>
  </AppShell>;
}
