import type { ScheduleConfig } from '../../api/types';
import { changeScheduleKind, weekdays, shanghaiToday, formatSchedule, scheduleValidation } from '../../utils/schedule';
import { Icon } from '../common/Icon';
import styles from './ConfigurationModal.module.css';

export function ScheduleFields({ value, onChange, disabled }: { value: ScheduleConfig; onChange: (value: ScheduleConfig) => void; disabled: boolean }) {
  return <>
    <p className={styles.intro}>按天安排同步，到点自动更新今年的数据。</p>
    <label className={styles.switchRow}><span><strong>开启自动同步</strong><small>{value.enabled ? '按下面的日期与时间执行' : '当前关闭，保存后也不会自动执行'}</small></span><input role="switch" type="checkbox" checked={value.enabled} onChange={event => onChange({ ...value, enabled: event.target.checked })} disabled={disabled} data-initial-focus/></label>
    <div className={styles.field}><span>多久同步一次？</span><div className={styles.presets}>{([{kind:'daily',label:'每天'},{kind:'weekly',label:'每周'},{kind:'monthly',label:'每月'},{kind:'interval',label:'每隔几天'}] as const).map(option => <button type="button" key={option.kind} disabled={disabled} aria-pressed={value.kind === option.kind} onClick={() => onChange(changeScheduleKind(value, option.kind, shanghaiToday()))}>{option.label}</button>)}</div></div>
    {value.kind === 'weekly' && <label className={styles.field}>每周哪一天？<select aria-label="每周执行日" value={value.weekday} disabled={disabled} onChange={event => onChange({...value, weekday:Number(event.target.value)})}>{weekdays.map((day,index) => <option key={day} value={index+1}>{day}</option>)}</select></label>}
    {value.kind === 'monthly' && <><label className={styles.field}>每月几号？<select aria-label="每月执行日期" value={value.monthDay} disabled={disabled} onChange={event => onChange({...value, monthDay:Number(event.target.value)})}>{Array.from({length:31},(_,i)=><option key={i+1} value={i+1}>{i+1} 日</option>)}</select></label><p className={styles.help}>如果当月没有这一天，就在当月最后一天执行。例如选 31 日，2 月会在 28 日或 29 日执行。</p></>}
    {value.kind === 'interval' && <><label className={styles.field}>间隔多少天？<div className={styles.inputUnit}><span>每隔</span><input aria-label="间隔天数" aria-describedby="config-validation" type="number" min={1} max={365} step={1} value={Number.isFinite(value.intervalDays) ? value.intervalDays : ''} disabled={disabled} onChange={event => onChange({...value, intervalDays:event.target.valueAsNumber})}/><span>天</span></div></label><label className={styles.field}>首次执行日期<input aria-label="首次执行日期" type="date" min="1970-01-01" max="9998-12-31" value={value.startDate} disabled={disabled} onChange={event => onChange({...value, startDate:event.target.value})}/><small>从这一天起，按固定天数循环。若该日期已过去，会从下一个符合规则的日期开始。</small></label></>}
    <label className={styles.field}>几点执行？<input aria-label="执行时间" type="time" step={60} value={value.time} disabled={disabled} onChange={event => onChange({...value,time:event.target.value})}/><small>北京时间（UTC+8），不受电脑显示时区影响。</small></label>
    <div className={styles.rangePreview}><Icon name="calendar" size={18}/><div><strong>{value.enabled ? '保存后的执行安排' : '已关闭，可先保存安排'}</strong><p>{scheduleValidation(value) ? '请先填写有效的执行安排' : formatSchedule(value) + '（北京时间）'}</p><small>保存成功后，首页会显示下次执行时间。</small></div></div>
    <div className={styles.explanation}><Icon name="clock" size={18}/><p>每次同步今年 1 月 1 日至当天的数据。关闭网页仍会执行，但后端服务需要保持运行。停机错过多次安排时，恢复后最多补执行一次。</p></div>
  </>;
}
