import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiGet, apiPost, ApiError, TIMEOUT_MS } from './client';
import { getDiff, triggerSync, saveConfig } from './exo';
import { isExoStatus } from '../utils/guards';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
describe('API boundary', () => {
  it('submits the selected year for emergency synchronization', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ ok: true, data: { runId: 'new-run' } }));
    vi.stubGlobal('fetch', fetchMock);
    await triggerSync(2024);
    expect(fetchMock).toHaveBeenCalledWith('/api/exo/sync', expect.objectContaining({ body: '{"year":2024}' }));
  });
  it('sends a configuration version and preserves a stale-write conflict', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ ok: false, error: { code: 'CONFIG_CONFLICT', message: '配置版本已变化' } }, 409));
    vi.stubGlobal('fetch', fetchMock);
    await expect(saveConfig('warnings', { intervals: [{ minDays: 0, maxDays: 7 }] }, 3)).rejects.toMatchObject({ code: 'CONFIG_CONFLICT' });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ version: 3, value: { intervals: [{ minDays: 0, maxDays: 7 }] } });
  });
  it('sends the same-origin session and required POST header', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ ok: true, data: { runId: 'opaque/id' } }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(apiPost('/api/exo/sync', {})).resolves.toEqual({ runId: 'opaque/id' });
    expect(fetchMock).toHaveBeenCalledWith('/api/exo/sync', expect.objectContaining({ method: 'POST', credentials: 'same-origin', body: '{}', headers: expect.objectContaining({ 'X-Requested-With': 'fetch' }) }));
  });
  it('preserves the 409 machine code and public message without debug detail', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ ok: false, error: { code: 'SYNC_IN_PROGRESS', message: '已有同步任务', detail: 'private diagnostic' } }, 409)));
    await expect(apiPost('/api/exo/sync', {})).rejects.toMatchObject({ code: 'SYNC_IN_PROGRESS', status: 409, message: '已有同步任务' });
  });
  it('rejects ok:true on a failed HTTP response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ ok: true, data: {} }, 500)));
    await expect(apiGet('/api/exo/status')).rejects.toMatchObject({ code: 'HTTP_ERROR', status: 500 });
  });
  it.each([new Response('<html>stack trace</html>', { status: 502 }), new Response('{broken', { headers: { 'Content-Type': 'application/json' } }), json({ ok: true, data: { state: 'not-a-state' } })])('normalizes invalid content without exposing response bodies', async response => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
    await expect(apiGet('/api/exo/status', undefined, isExoStatus)).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });
  it('does not send an already cancelled request', async () => {
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    const controller = new AbortController(); controller.abort();
    await expect(apiGet('/api/exo/status', controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('cancels an in-flight request without converting it to a user error', async () => {
    vi.stubGlobal('fetch', vi.fn((_url, init) => new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))))));
    const controller = new AbortController(); const request = apiGet('/api/exo/status', controller.signal);
    controller.abort();
    await expect(request).rejects.toMatchObject({ name: 'AbortError' });
  });
  it.each(['GET', 'POST'])('times out %s after 15 seconds', async method => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((_url, init) => new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))))));
    const request = method === 'GET' ? apiGet('/api/exo/status') : apiPost('/api/exo/sync', {});
    const expectation = expect(request).rejects.toMatchObject({ code: 'TIMEOUT', status: 0 });
    await vi.advanceTimersByTimeAsync(TIMEOUT_MS); await expectation;
  });
  it('normalizes network errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('private request detail')));
    await expect(apiGet('/api/exo/status')).rejects.toEqual(new ApiError('NETWORK_ERROR', '无法连接服务，请检查网络后重试。', 0));
  });
  it('encodes opaque run IDs and rejects a response for a different run', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ ok: true, data: { runId: 'different', summary: { added: 0, updated: 0, removed: 0 }, records: [] } }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(getDiff('opaque/?#你好', { page: 2, pageSize: 20 })).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
    expect(fetchMock.mock.calls[0][0]).toBe(`/api/exo/diff/${encodeURIComponent('opaque/?#你好')}?page=2&pageSize=20`);
  });
});
