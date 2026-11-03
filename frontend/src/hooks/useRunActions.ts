import { useRef, useState } from 'react';
import { resumeRun, retryNotification } from '../api/exo';
import { toUserMessage } from '../utils/format';
import { useLatestRequest } from './useLatestRequest';

export function useRunActions(onRefresh: () => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locked = useRef(false);
  const { run } = useLatestRequest();
  const act = async (id: string, notification: boolean) => {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError(null);
    await run(signal => notification ? retryNotification(id, signal) : resumeRun(id, signal), () => { setBusy(false); onRefresh(); }, failure => { setBusy(false); setError(toUserMessage(failure)); onRefresh(); });
    locked.current = false;
  };
  return { busy, error, resume: (id: string) => { void act(id, false); }, retryNotification: (id: string) => { void act(id, true); } };
}
