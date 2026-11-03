import type { useConfiguration } from '../../hooks/useConfiguration';
import type { ExoStatus } from '../../api/types';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Icon } from '../common/Icon';
import { ErrorBanner } from '../feedback/ErrorBanner';
import { SkeletonBlock } from '../feedback/SkeletonBlock';
import { formatDate } from '../../utils/format';
import { formatSchedule, formatWarningRange } from '../../utils/schedule';
import styles from './ConfigurationPanels.module.css';

type Configuration = ReturnType<typeof useConfiguration>;
export function ConfigurationPanels({ controller: c, status }: { controller: Configuration; status: ExoStatus | null }) {
  const config = c.config;
  if (!config) return c.error ? <ErrorBanner message={c.error} onRetry={c.refresh}/> : <SkeletonBlock rows={2}/>;
  return <section className={styles.section} aria-labelledby="daily-settings-title">
    {c.error && <ErrorBanner message={c.error} onRetry={c.refresh}/>}
    {c.saveError && !c.editor && <ErrorBanner message={c.saveError}/>}
    {c.notice && <p role="status" className={styles.notice}><Icon name="check" size={16}/>{c.notice}</p>}
    <div className={styles.sectionHeading}><h2 id="daily-settings-title">日常设置</h2><span>按你的工作节奏，安排同步与提醒</span></div>
    <div className={styles.grid}>
      <section className={styles.card} aria-labelledby="schedule-title"><div className={styles.heading}><span className={styles.settingIcon}><Icon name="clock" size={19}/></span><h3 id="schedule-title">自动同步</h3><Badge tone={config.schedule.enabled ? 'success' : 'neutral'}>{config.schedule.enabled ? '已开启' : '未开启'}</Badge></div>
        <p className={styles.primaryText}>{config.schedule.enabled ? formatSchedule(config.schedule) + ' 自动执行' : '按需手动更新，也很简单'}</p>
        <p className={styles.description}>{config.schedule.enabled ? '按北京时间执行，自动同步今年的数据。' : '开启后，系统会按设定的频率自动同步今年的数据。'}</p>
        {status?.scheduleInfo?.message && <p role="status" className={styles.scheduleNotice}>{status.scheduleInfo.message}</p>}
        <div className={styles.cardBottom}><span>{config.schedule.enabled && status?.nextScheduledAt ? '下次 ' + formatDate(status.nextScheduledAt, true, 'Asia/Shanghai')  : config.schedule.enabled ? '正在获取下次执行时间' : '同步频率由你决定'}</span><Button variant="ghost" onClick={() => c.open('schedule')} disabled={c.saving}>{config.schedule.enabled ? '调整频率' : '设置自动同步'}<Icon name="chevronRight" size={13}/></Button></div>
      </section>
      <section className={styles.card} aria-labelledby="warning-title"><div className={styles.heading}><span className={styles.settingIcon + ' ' + styles.amber}><Icon name="bell" size={19}/></span><h3 id="warning-title">预警规则</h3><span className={styles.count}>{config.warnings.intervals.length} 个区间</span></div>
        <div className={styles.intervals}>{config.warnings.intervals.length ? <>{config.warnings.intervals.slice(0, 2).map(interval => <Badge tone="warning" key={interval.minDays + ':' + interval.maxDays}>{formatWarningRange(interval)}</Badge>)}{config.warnings.intervals.length > 2 && <span>另有 {config.warnings.intervals.length - 2} 个</span>}</> : <p className={styles.primaryText}>先设置，才能发现需要关注的记录</p>}</div>
        <p className={styles.description}>包含起始天数，不含结束天数；两值相同则只提醒当天。</p>
        <div className={styles.cardBottom}><span>区间可以随时调整</span><Button variant="ghost" onClick={() => c.open('warnings')} disabled={c.saving}>设置提醒范围<Icon name="chevronRight" size={13}/></Button></div>
      </section>
      <section className={styles.card} aria-labelledby="notification-title"><div className={styles.heading}><span className={styles.settingIcon}><Icon name="notification" size={19}/></span><h3 id="notification-title">飞书提醒</h3><button type="button" className={styles.toggle} role="switch" aria-label="飞书提醒" aria-checked={config.notifications.enabled} disabled={c.saving} onClick={c.toggleNotifications}><span/></button></div>
        <p className={styles.primaryText}>{config.notifications.enabled ? '有预警时，及时通知你' : '当前不会发送飞书消息'}</p>
        <p className={styles.description}>开启后，有预警的同步结果会发送到已配置的飞书接收方。</p>
        <div className={styles.cardBottom}><span>关闭提醒不影响数据同步</span><span className={config.notifications.enabled ? styles.enabled : styles.muted}>{c.saving ? '保存中…' : config.notifications.enabled ? '已开启' : '已关闭'}</span></div>
      </section>
    </div>
  </section>;
}
export function AdvancedSettings({ controller: c, ready }: { controller: Configuration; ready: boolean }) {
  if (!c.config) return null;
  const config = c.config;
  return <details className={styles.advanced} id="advanced-settings"><summary><span className={styles.advancedIcon}><Icon name="settings" size={19}/></span><span><strong>系统连接与高级设置</strong><small>由管理员维护，日常使用无需调整</small></span><Icon name="chevronRight" size={17}/></summary><div className={styles.advancedBody}>
    <div><h3>数据来源与目标表格</h3><p>{config.integrations.mode === 'simulation' ? '目前是演示环境，所有操作仅用于体验，不会修改真实业务数据。' : ready ? '连接配置已就绪，实际执行结果请以同步记录为准。' : '尚未完成真实系统连接，请联系管理员处理。'}</p><Button onClick={() => c.open('integrations')}>管理系统连接</Button></div>
    <div><h3>问题排查</h3><p>{config.logging.level === 'DEBUG' ? '已开启详细记录，便于管理员定位问题。' : '当前只记录日常操作和执行结果。'}</p><Button onClick={() => c.open('logging')}>设置记录详细程度</Button></div>
  </div></details>;
}
