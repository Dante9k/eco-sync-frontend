import { useCallback, useEffect, useRef, useState } from 'react';
import { triggerSync } from '../api/eco';
import { ApiError } from '../api/client';
import { useEco } from '../state/EcoContext';
import { selectCanTrigger } from '../state/selectors';
import { toUserMessage } from '../utils/format';
import { useLatestRequest } from './useLatestRequest';

export function useTriggerSync(onRefresh: () => void) {
  const { state, dispatch } = useEco();
  const { run } = useLatestRequest();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const locked = useRef(false);
  useEffect(() => () => {
    if (locked.current) {
      locked.current = false;
      dispatch({ type: 'TRIGGER_ERR', payload: '已停止等待同步响应，请刷新状态确认任务是否已提交。' });
    }
  }, [dispatch]);
  const canTrigger = selectCanTrigger(state);
  const trigger = useCallback(async () => {
    if (locked.current || !canTrigger) return;
    locked.current = true;
    setConfirmOpen(false);
    dispatch({ type: 'TRIGGER_START' });
    await run(triggerSync,
      payload => { dispatch({ type: 'TRIGGER_OK', payload }); onRefresh(); },
      error => {
        let message = toUserMessage(error);
        if (error instanceof ApiError && error.code === 'SYNC_IN_PROGRESS') message = '已有同步任务正在进行，已为你刷新最新状态。';
        if (error instanceof ApiError && ['TIMEOUT', 'NETWORK_ERROR'].includes(error.code)) message += ' 同步可能已提交，请先刷新状态再重试。';
        dispatch({ type: 'TRIGGER_ERR', payload: message });
        onRefresh();
      });
    locked.current = false;
  }, [canTrigger, dispatch, run, onRefresh]);
  return { confirmOpen, request: () => { if (canTrigger) setConfirmOpen(true); }, close: () => setConfirmOpen(false), trigger, canTrigger };
}
