import { useCallback, useEffect, useRef } from 'react';
import { isAbortError } from '../api/client';

// Abort saves work; the generation check also protects against transports that finish after cancellation.
export function useLatestRequest() {
  const controller = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const pending = useRef(false);
  const cancel = useCallback(() => {
    generation.current += 1;
    controller.current?.abort();
    pending.current = false;
  }, []);
  useEffect(() => cancel, [cancel]);
  const run = useCallback(async <T,>(load: (signal: AbortSignal) => Promise<T>, ok: (data: T) => void, fail: (error: unknown) => void) => {
    cancel();
    const requestId = generation.current;
    const current = new AbortController();
    controller.current = current;
    pending.current = true;
    try {
      const data = await load(current.signal);
      if (generation.current === requestId && !current.signal.aborted) ok(data);
    } catch (error) {
      if (generation.current === requestId && !current.signal.aborted && !isAbortError(error)) fail(error);
    } finally {
      if (generation.current === requestId) pending.current = false;
    }
  }, [cancel]);
  return { run, cancel, pending };
}
