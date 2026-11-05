import { useState } from 'react';
import type { BoardDirectory, BoardPerson } from '../../api/types';
import { personColor } from '../../utils/board';
import { Icon } from '../common/Icon';
import { ErrorBanner } from '../feedback/ErrorBanner';
import styles from './Board.module.css';

export function PeopleDirectory({ directory, selected, loading, error, onSelect, onRetry }: {
  directory: BoardDirectory | null; selected: BoardPerson | null; loading: boolean; error: string | null;
  onSelect: (id: string) => void; onRetry: () => void;
}) {
  const [search, setSearch] = useState('');
  const people = directory?.items.filter(person => person.name.includes(search.trim()) || person.department.includes(search.trim())) ?? [];
  return <section className={styles.directory} aria-labelledby="people-heading" aria-busy={loading}>
    <div className={styles.directoryTop}>
      <div className={styles.sectionTitle}><h2 id="people-heading">参与人员 <span>{directory?.items.length ?? '—'} 人</span></h2><p className={styles.peopleHelp}>点姓名，查看他参与的记录</p></div>
      <label className={styles.search}><Icon name="search" size={14}/><input type="search" aria-label="查找人员" placeholder="姓名或部门" maxLength={100} value={search} onChange={event => setSearch(event.target.value)}/></label>
    </div>
    {error ? <div className={styles.directoryFeedback}><ErrorBanner message={error} onRetry={onRetry}/></div> : loading && !directory ? <div className={styles.peopleSkeleton} aria-label="正在读取人员名单">{Array.from({ length: 10 }, (_, i) => <span key={i}/>)}</div> : <div className={styles.peopleGrid} role="group" aria-label="人员筛选" aria-describedby="people-filter-help">
      <button className={`${styles.personButton} ${styles.everyone}`} type="button" aria-label="所有人员" aria-pressed={!selected} onClick={() => onSelect('')}>
        <strong>全部</strong>{!selected && <Icon name="check" size={12}/>}
      </button>
      {people.map(person => <button key={person.id} type="button" className={styles.personButton} data-color={personColor(person.id)} data-person-id={person.id} aria-label={`筛选 ${person.name}，${person.recordCount} 条相关记录`} aria-pressed={selected?.id === person.id} title={`${person.name} · ${person.department} · ${person.recordCount} 条相关记录`} onClick={() => onSelect(selected?.id === person.id ? '' : person.id)}>
        <strong>{person.name}</strong><small aria-hidden="true">{person.recordCount}</small>{selected?.id === person.id && <Icon name="check" size={12}/>}
      </button>)}
      {!people.length && <p className={styles.noPeople}>{search ? '没有匹配的姓名或部门。' : '人员名单暂无成员。'}</p>}
    </div>}
    <p id="people-filter-help" className="srOnly">点击姓名，筛选他作为创建者、主负责人或次负责人参与的所有记录，自动去重。再次点击已选姓名或选择所有人员可清除筛选。</p>
  </section>;
}
