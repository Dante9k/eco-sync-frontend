import type { BusinessConfig } from '../../api/types';
import type { useConfiguration } from '../../hooks/useConfiguration';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { Icon } from '../common/Icon';
import { ScheduleFields } from './ScheduleFields';
import { intervalEnd, formatWarningRange } from '../../utils/schedule';
import { ErrorBanner } from '../feedback/ErrorBanner';
import styles from './ConfigurationModal.module.css';

const titles = { schedule: '设置自动同步', warnings: '设置提醒范围', integrations: '管理系统连接', logging: '设置记录详细程度', notifications: '设置飞书提醒' };
const numberValue = (value: number) => Number.isFinite(value) ? value : '';
export function ConfigurationModal({ controller: c }: { controller: ReturnType<typeof useConfiguration> }) {
  const d = c.draft;
  const setIntegration = (value: Partial<BusinessConfig['integrations']>) => { if (d) c.change('integrations', { ...d.integrations, ...value }); };
  return <Modal open={!!c.editor} title={c.editor ? titles[c.editor] : '设置'} onClose={c.close} busy={c.saving} footer={<><span className={styles.footerHint}>取消不会保存修改</span><Button onClick={c.close} disabled={c.saving}>取消</Button><Button variant="primary" onClick={c.save} disabled={c.saving || !!c.validationError}>{c.saving ? '正在保存…' : '保存设置'}</Button></>}>
    <div className={styles.form}>
      {c.saveError && <ErrorBanner message={c.saveError}/>}
      {d && c.editor === 'schedule' && <ScheduleFields value={d.schedule} onChange={value => c.change('schedule', value)} disabled={c.saving}/>}
      {d && c.editor === 'warnings' && <>
        <p className={styles.intro}>哪些记录需要提醒你？设置一个或多个天数范围。</p>
        <p className={styles.help}>包含起始天数，不包含结束天数。例如 0–7 表示第 0 至第 6 天；填写 7–7 则只提醒第 7 天。</p>
        {!d.warnings.intervals.length && <div className={styles.empty}><Icon name="bell" size={23}/><strong>还没有提醒范围</strong><p>点击「新增区间」，添加你的第一条规则。保存为空时，将不再按天数产生预警。</p></div>}
        {d.warnings.intervals.map((interval, index) => <div className={styles.interval} key={index}>
          <span className={styles.intervalTitle}>区间 {index + 1}</span><div className={styles.intervalInputs}><span>从</span>
          <input aria-label={`区间 ${index + 1} 起始天数`} aria-describedby="config-validation" type="number" min={0} max={365000} step={1} value={numberValue(interval.minDays)} disabled={c.saving} onChange={event => c.change('warnings', { intervals: d.warnings.intervals.map((item, i) => i === index ? { ...item, minDays: event.target.valueAsNumber } : item) })}/>
          <span>到</span><input aria-label={`区间 ${index + 1} 结束天数`} aria-describedby="config-validation" type="number" min={0} max={365000} step={1} value={numberValue(interval.maxDays)} disabled={c.saving} onChange={event => c.change('warnings', { intervals: d.warnings.intervals.map((item, i) => i === index ? { ...item, maxDays: event.target.valueAsNumber } : item) })}/><span>天</span></div>
          <Button variant="ghost" aria-label={`删除区间 ${index + 1}`} disabled={c.saving} onClick={() => c.change('warnings', { intervals: d.warnings.intervals.filter((_, i) => i !== index) })}>删除</Button><small className={styles.intervalHint}>{Number.isInteger(interval.minDays) && Number.isInteger(interval.maxDays) && interval.minDays <= interval.maxDays ? formatWarningRange(interval) : '请填写有效天数'}</small>
        </div>)}
        <Button data-initial-focus disabled={c.saving || d.warnings.intervals.length >= 50} onClick={() => { const start = d.warnings.intervals.reduce((maximum, interval) => Math.max(maximum, Number.isFinite(interval.maxDays) ? intervalEnd(interval) : 0), 0); c.change('warnings', { intervals: [...d.warnings.intervals, { minDays: start, maxDays: start + 7 }] }); }}><Icon name="plus" size={16}/>新增区间</Button>
        <p className={styles.help}>可以设置首尾相接的区间，如 0–7、7–14；同一天不能重复归入多个区间。保存后用于后续同步。</p>
      </>}
      <p id="config-validation" role={c.validationError ? 'alert' : undefined} className={c.validationError ? styles.validation : styles.hidden}>{c.validationError}</p>
      {d && c.editor === 'integrations' && <>
        <p className={styles.intro}>管理员设置</p><p className={styles.help}>这里决定数据从哪里读取、写入哪个表格。如不清楚这些信息，请联系系统管理员。</p>
        <label className={styles.field}>运行环境<select data-initial-focus value={d.integrations.mode} disabled={c.saving} onChange={event => setIntegration({ mode: event.target.value as BusinessConfig['integrations']['mode'] })}><option value="unconfigured">尚未连接</option><option value="simulation">演示环境 · 仅体验功能</option><option value="custom">真实业务环境 · 需完成后端对接</option></select></label>
        <p className={styles.help}>连接地址保存后，管理员还需在后端接入对应接口和工作流。认证凭据由后端管理。</p>
        <label className={styles.field}>外部系统地址<input type="url" placeholder="https://example.com/api" value={d.integrations.sourceUrl} onChange={event => setIntegration({ sourceUrl: event.target.value })} disabled={c.saving}/></label>
        <label className={styles.field}>已有工作流地址<input type="url" placeholder="https://example.com/workflow" value={d.integrations.workflowUrl} onChange={event => setIntegration({ workflowUrl: event.target.value })} disabled={c.saving}/></label>
        <label className={styles.field}>目标表格标识<input value={d.integrations.tableId} onChange={event => setIntegration({ tableId: event.target.value })} disabled={c.saving}/><small>指定接收同步数据的多维表格。</small></label>
        <label className={styles.field}>记录的唯一标识字段<input value={d.integrations.uniqueKey} onChange={event => setIntegration({ uniqueKey: event.target.value })} disabled={c.saving}/><small>用于识别同一条记录，避免重复新增。</small></label>
        <label className={styles.field}>允许同步更新的字段<textarea rows={4} placeholder="每行填写一个字段名" value={d.integrations.managedFields.join('\n')} onChange={event => setIntegration({ managedFields: event.target.value.split('\n') })} disabled={c.saving}/><small>每行一个字段名。人工维护的字段不要填在这里。</small></label>
        <p className={styles.help}>演示环境使用唯一标识 id，支持 title、status、ageDays。真实业务字段由已接入的后端接口定义。</p>
      </>}
      {d && c.editor === 'logging' && <><p className={styles.intro}>通常保持「日常记录」即可。</p><label className={styles.field}>记录详细程度<select data-initial-focus value={d.logging.level} onChange={event => c.change('logging', { level: event.target.value as 'INFO' | 'DEBUG' })} disabled={c.saving}><option value="INFO">日常记录 · 记录操作和结果</option><option value="DEBUG">详细记录 · 供管理员排查问题</option></select></label><p className={styles.help}>详细记录会增加处理阶段和写入检查记录，不会记录认证凭据或完整的原始数据。</p></>}
    </div>
  </Modal>;
}
