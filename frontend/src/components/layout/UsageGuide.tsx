import { Icon } from '../common/Icon';
import styles from './UsageGuide.module.css';

export function UsageGuide() {
  return <div id="usage-guide" className={styles.guide}>
    <p className={styles.intro}>人员看板用于查记录，同步管理用于更新数据。关闭帮助后可继续刚才的操作。</p>
    <section aria-labelledby="board-help-title">
      <h3 id="board-help-title"><Icon name="users" size={17}/>人员看板：找到你关心的记录</h3>
      <ol className={styles.steps}>
        <li><span>01</span><div><h4>点姓名，查看相关记录</h4><p>会同时查找此人作为创建者、主负责人或次负责人参与的记录。同一条记录只显示一次，姓名会用相同颜色标记。</p></div></li>
        <li><span>02</span><div><h4>按状态或关键词缩小范围</h4><p>选择「未关闭」「已关闭」，或搜索编号、内容、文件号。换人时会保留这些条件；点击「清除筛选」恢复全部记录。</p></div></li>
        <li><span>03</span><div><h4>需要更多信息时查看详情</h4><p>每个编号只显示一行。点「展开」查看多个任务的负责人、状态和时间；「记录明细」或「详情」查看公共字段。筛选人员后，创建的业务显示全部任务，其他业务默认显示此人参与的任务。</p></div></li>
      </ol>
    </section>
    <section aria-labelledby="sync-help-title">
      <h3 id="sync-help-title"><Icon name="sync" size={17}/>同步管理：更新数据与提醒</h3>
      <ol className={styles.steps}>
        <li><span>01</span><div><h4>选择年份，确认同步</h4><p>点击「立即同步」后选择年份并确认。今年查询到今天，往年查询全年。</p></div></li>
        <li><span>02</span><div><h4>等待完成，查看结果</h4><p>页面会显示处理进展。完成后，在同步记录中查看结果、处理数量以及新增和更新的内容。</p></div></li>
        <li><span>03</span><div><h4>按需要设置自动同步和提醒</h4><p>自动同步可按每天、每周、每月或每几天执行。配置提醒区间后，可用飞书提醒开关控制是否发送消息。</p></div></li>
      </ol>
    </section>
    <details className={styles.faq}><summary>「刷新」和「立即同步」有什么区别？<Icon name="chevronRight" size={15}/></summary><p><strong>刷新</strong>只更新页面显示的结果；<strong>立即同步</strong>会读取来源数据并更新表格。关闭页面不会取消已提交的同步任务。</p></details>
    <details className={styles.faq}><summary>提醒区间如何计算？<Icon name="chevronRight" size={15}/></summary><p>包含左边的天数，不包含右边的天数。例如 0–14 天包含第 0 至第 13 天；两端相同时只取当天，例如 7–7 天只提醒第 7 天。飞书开关只控制消息发送。</p></details>
  </div>;
}
