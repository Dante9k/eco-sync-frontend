import { Icon } from '../common/Icon';
import styles from './UsageGuide.module.css';
export function UsageGuide() {
  return <section id="usage-guide" className={styles.guide} aria-labelledby="usage-title">
    <div className={styles.heading}><span><Icon name="help" size={19}/></span><div><h2 id="usage-title">第一次使用？从这里开始</h2><p>只需三步，了解数据是否已更新。</p></div></div>
    <ol className={styles.steps}><li><span>01</span><div><h3>选择年份，开始同步</h3><p>点击上方「立即同步」，选好年份并确认。今年查到今天，往年查整年。</p></div></li><li><span>02</span><div><h3>等系统完成，查看结果</h3><p>上方会显示处理进展。完成后，在「同步记录」里查看新增和更新了哪些内容。</p></div></li><li><span>03</span><div><h3>设置规则，及时获得提醒</h3><p>设置需要关注的天数范围，再开启飞书提醒。也可以开启自动同步，减少重复操作。</p></div></li></ol>
    <details className={styles.faq}><summary>刷新页面、立即同步、自动同步，有什么区别？<Icon name="chevronRight" size={15}/></summary><p><strong>刷新页面</strong>只更新你看到的结果；<strong>立即同步</strong>会读取数据并更新表格；<strong>自动同步</strong>让系统按设置的频率在后台执行。关闭页面不会取消已提交的任务。</p></details>
  </section>;
}
