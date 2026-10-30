export const TIMEOUT_MS = 15_000;

export class ApiError extends Error {
  constructor(public code: string, message: string, public status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}
export type Validator<T> = (value: unknown) => value is T;

async function request<T>(path: string, method: 'GET' | 'POST', payload: unknown, signal?: AbortSignal, validate?: Validator<T>): Promise<T> {
  if (signal?.aborted) throw new DOMException('Request cancelled', 'AbortError');
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort, { once: true });
  try {
    const response = await fetch(path, {
      method,
      headers: {
        Accept: 'application/json',
        ...(method === 'POST' ? { 'Content-Type': 'application/json', 'X-Requested-With': 'fetch' } : {}),
      },
      credentials: 'same-origin',
      signal: controller.signal,
      ...(method === 'POST' ? { body: JSON.stringify(payload) } : {}),
    });
    if (!response.headers.get('content-type')?.toLowerCase().includes('application/json')) {
      throw new ApiError('INVALID_RESPONSE', '服务返回了无法识别的响应，请稍后重试。', response.status);
    }
    let body: unknown;
    try { body = await response.json(); }
    catch (error) {
      if (controller.signal.aborted) throw error;
      throw new ApiError('INVALID_RESPONSE', '服务响应格式异常，请稍后重试。', response.status);
    }
    if (!body || typeof body !== 'object' || !('ok' in body)) {
      throw new ApiError('INVALID_RESPONSE', '服务响应格式异常，请稍后重试。', response.status);
    }
    if (body.ok === false && 'error' in body && body.error && typeof body.error === 'object') {
      const error = body.error;
      if ('code' in error && typeof error.code === 'string' && 'message' in error && typeof error.message === 'string') {
        // Only the public message is exposed; diagnostic detail is never rendered.
        throw new ApiError(error.code, error.message, response.status);
      }
    }
    if (!response.ok) throw new ApiError('HTTP_ERROR', '服务暂时不可用，请稍后重试。', response.status);
    if (body.ok !== true || !('data' in body) || (validate && !validate(body.data))) {
      throw new ApiError('INVALID_RESPONSE', '服务数据不符合约定，请稍后重试。', response.status);
    }
    if (controller.signal.aborted) throw new DOMException('Request cancelled', 'AbortError');
    return body.data as T;
  } catch (error) {
    if (signal?.aborted) throw new DOMException('Request cancelled', 'AbortError');
    if (timedOut) throw new ApiError('TIMEOUT', '请求超时，请检查网络后重试。', 0);
    if (isAbortError(error) || error instanceof ApiError) throw error;
    throw new ApiError('NETWORK_ERROR', '无法连接服务，请检查网络后重试。', 0);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}
export const apiGet = <T>(path: string, signal?: AbortSignal, validate?: Validator<T>) => request<T>(path, 'GET', undefined, signal, validate);
export const apiPost = <T>(path: string, payload: unknown, signal?: AbortSignal, validate?: Validator<T>) => request<T>(path, 'POST', payload, signal, validate);
