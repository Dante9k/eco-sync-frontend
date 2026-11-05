import { useCallback, useEffect, useState } from 'react';
import { getBoardPeople, getBoardRecords } from '../api/board';
import type { BoardDirectory, BoardQuery, BoardRecordPage } from '../api/types';
import { toUserMessage } from '../utils/format';
import { useLatestRequest } from './useLatestRequest';

export function usePeopleBoard() {
  const [directory, setDirectory] = useState<BoardDirectory | null>(null);
  const [peopleLoading, setPeopleLoading] = useState(true);
  const [peopleError, setPeopleError] = useState<string | null>(null);
  const [query, setQuery] = useState<BoardQuery>({ personId: '', search: '', status: 'all', page: 1, pageSize: 10 });
  const [result, setResult] = useState<{ key: string; data: BoardRecordPage | null; error: string | null; loading: boolean }>({ key: '', data: null, error: null, loading: true });
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const { run: readPeople } = useLatestRequest();
  const { run: readRecords, cancel: cancelRecords } = useLatestRequest();
  const key = JSON.stringify(query);
  const refreshPeople = useCallback(() => {
    setPeopleLoading(true);
    return readPeople(getBoardPeople, data => { setDirectory(data); setPeopleError(null); setPeopleLoading(false); },
      error => { setPeopleError(toUserMessage(error)); setPeopleLoading(false); });
  }, [readPeople]);
  const refreshRecords = useCallback(() => {
    setResult(previous => ({ key, data: previous.key === key ? previous.data : null, error: null, loading: true }));
    return readRecords(signal => getBoardRecords(query, signal),
      data => { setResult({ key, data, error: null, loading: false }); setFetchedAt(new Date().toISOString()); },
      error => setResult({ key, data: null, error: toUserMessage(error), loading: false }));
  }, [key, query, readRecords]);
  useEffect(() => { void refreshPeople(); }, [refreshPeople]);
  useEffect(() => {
    const timer = setTimeout(() => { void refreshRecords(); }, query.search ? 300 : 0);
    return () => { clearTimeout(timer); cancelRecords(); };
  }, [refreshRecords, query.search, cancelRecords]);
  const selectPerson = (personId: string) => setQuery(previous => ({ ...previous, personId, page: 1 }));
  const clearFilters = () => setQuery(previous => ({ ...previous, personId: '', search: '', status: 'all', page: 1 }));
  const changeQuery = (patch: Partial<BoardQuery>) => setQuery(previous => ({ ...previous, ...patch, page: patch.page ?? 1 }));
  return {
    directory, peopleLoading, peopleError, query, selectPerson, changeQuery, clearFilters, fetchedAt,
    data: result.key === key ? result.data : null,
    loading: result.key !== key || result.loading, error: result.key === key ? result.error : null,
    selectedPerson: directory?.items.find(person => person.id === query.personId) ?? null,
    refreshPeople, refreshRecords, refresh: () => { void refreshPeople(); void refreshRecords(); },
  };
}
