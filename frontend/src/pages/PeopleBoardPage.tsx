import { useState } from 'react';
import type { BoardRecord } from '../api/types';
import { usePeopleBoard } from '../hooks/usePeopleBoard';
import { formatDate } from '../utils/format';
import { AppShell } from '../components/layout/AppShell';
import { Button } from '../components/common/Button';
import { Icon } from '../components/common/Icon';
import { PeopleDirectory } from '../components/board/PeopleDirectory';
import { BusinessTable } from '../components/board/BusinessTable';
import { RecordDetails } from '../components/board/RecordDetails';
import styles from '../components/board/Board.module.css';

export function PeopleBoardPage() {
  const board = usePeopleBoard();
  const [detail, setDetail] = useState<BoardRecord | null>(null);
  return <div className={styles.page}><AppShell compact title="人员协作看板" mode={board.directory?.mode ?? board.data?.mode} unavailable={!!board.peopleError || !!board.error}
    toolbar={<div className={styles.pageActions}><span className={styles.updatedAt}>{board.fetchedAt ? `更新于 ${formatDate(board.fetchedAt, true)}` : '正在读取数据'}</span><Button onClick={board.refresh} disabled={board.loading || board.peopleLoading}><Icon name="sync" size={14}/>刷新</Button></div>}>
    <div className={styles.board}>
      <BusinessTable data={board.data} query={board.query} selected={board.selectedPerson} loading={board.loading} error={board.error} onQuery={board.changeQuery} onClear={board.clearFilters} onRetry={board.refreshRecords} onDetails={setDetail}
        people={<PeopleDirectory directory={board.directory} selected={board.selectedPerson} loading={board.peopleLoading} error={board.peopleError} onSelect={board.selectPerson} onRetry={board.refreshPeople}/>}/>
      <RecordDetails record={detail} selectedId={board.query.personId} onClose={() => setDetail(null)}/>
    </div>
  </AppShell></div>;
}
