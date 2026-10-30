// Optional, in-memory demo backend. It never connects to a real ECO system.
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../dist/', import.meta.url)));
const iso = value => new Date(value).toISOString();
const startup = Date.now();
const runs = Array.from({ length: 47 }, (_, index) => {
  const error = index === 4 || index === 17 || index === 35;
  const start = startup - (index + 1) * 3_600_000;
  return {
    runId: `run_${randomUUID()}`, startedAt: iso(start), finishedAt: iso(start + (index % 5 + 8) * 1000 + 400),
    state: error ? 'error' : 'success',
    stats: { added: error ? 0 : index === 0 ? 18 : index % 6 + 3, updated: error ? 0 : index === 0 ? 6 : index % 9 + 2, removed: error ? 0 : index % 3 + 2, unchanged: 24789 },
    errorMessage: error ? '源端响应超时，本次同步未完成。' : null,
  };
});
let active = null;
let counts = { source: 24839, target: 24815, pending: 24 };
let failNext = null;
let delayNext = 0;
let specialDiff = false;
function update() {
  if (active && Date.now() - Date.parse(active.startedAt) >= 12_000) {
    active.state = 'success'; active.finishedAt = iso(Date.now());
    active.stats = { added: 18, updated: 6, removed: 0, unchanged: 24791 };
    counts = { source: 24839, target: 24839, pending: 0 };
    active = null;
  }
}
function recordList(run) {
  const records = [];
  for (const kind of ['added', 'updated', 'removed']) {
    for (let i = 0; i < run.stats[kind]; i++) {
      const value = kind === 'added' ? '结构件设计变更' : kind === 'updated' ? '工艺参数调整' : '旧版本物料';
      records.push({ kind, key: `ECO-${10024 + records.length}`, fields: [
        { name: '变更标题', before: kind === 'added' ? null : value, after: kind === 'removed' ? null : `${value} · Rev.${i + 2}` },
        { name: '审批状态', before: kind === 'added' ? null : '待审核', after: kind === 'removed' ? null : '已批准' },
      ] });
    }
  }
  if (specialDiff && records[0]) records[0].fields.push({ name: '安全展示示例', before: null, after: '<img src=x onerror="alert(1)"> & <script>alert(1)</script> ' + '这是一段需要展开查看的长文本。'.repeat(20) });
  return records;
}
function reply(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(body));
}
const ok = (response, data) => reply(response, 200, { ok: true, data });
const error = (response, status, code, message) => reply(response, status, { ok: false, error: { code, message } });
export function createDemoServer({ serveStatic = false } = {}) {
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? '/', 'http://127.0.0.1');
      const path = url.pathname;
      // Local QA controls are only provided by this optional loopback demo server.
      if (path === '/__demo/control' && request.method === 'POST') {
        let raw = ''; for await (const chunk of request) { raw += chunk; if (raw.length > 4096) break; }
        const control = JSON.parse(raw || '{}');
        if (control.failNext) failNext = control.failNext;
        if (control.delayNext) delayNext = Math.min(20_000, Number(control.delayNext));
        if ('specialDiff' in control) specialDiff = !!control.specialDiff;
        return ok(response, { configured: true });
      }
      if (delayNext && path.startsWith('/api/')) { const ms = delayNext; delayNext = 0; await new Promise(done => setTimeout(done, ms)); }
      if (failNext && path.endsWith(failNext)) { failNext = null; return error(response, 500, 'SERVICE_ERROR', '服务暂时不可用，请稍后重试。'); }
      update();
      if (path === '/api/eco/status' && request.method === 'GET') {
        return ok(response, { state: active ? 'syncing' : runs[0].state, lastSyncAt: runs[0].startedAt, lastSuccessAt: runs.find(run => run.state === 'success')?.finishedAt ?? null, lastError: null, progress: active ? Math.min(99, Math.round((Date.now() - Date.parse(active.startedAt)) / 120)) : null, nextScheduledAt: iso(startup + 3_600_000), counts });
      }
      if (path === '/api/eco/sync' && request.method === 'POST') {
        if (request.headers['x-requested-with'] !== 'fetch') return error(response, 403, 'INVALID_REQUEST', '请求校验失败。');
        if (active) return error(response, 409, 'SYNC_IN_PROGRESS', '已有同步任务正在进行。');
        active = { runId: `run_${randomUUID()}`, startedAt: iso(Date.now()), finishedAt: null, state: 'syncing', stats: { added: 0, updated: 0, removed: 0, unchanged: 0 }, errorMessage: null };
        runs.unshift(active);
        return ok(response, { runId: active.runId });
      }
      if (path === '/api/eco/history' || path.startsWith('/api/eco/diff/')) {
        if (request.method !== 'GET') return error(response, 405, 'METHOD_NOT_ALLOWED', '不支持此请求方法。');
        const page = Number(url.searchParams.get('page') ?? 1), pageSize = Number(url.searchParams.get('pageSize') ?? 20);
        if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) return error(response, 400, 'INVALID_QUERY', '分页参数无效。');
        const offset = (page - 1) * pageSize;
        if (path === '/api/eco/history') {
          const state = url.searchParams.get('state');
          if (state && !['idle', 'syncing', 'success', 'error'].includes(state)) return error(response, 400, 'INVALID_QUERY', '状态筛选无效。');
          const items = state ? runs.filter(run => run.state === state) : runs;
          return ok(response, { items: items.slice(offset, offset + pageSize), page, pageSize, total: items.length });
        }
        const run = runs.find(item => item.runId === decodeURIComponent(path.slice('/api/eco/diff/'.length)));
        if (!run) return error(response, 404, 'RUN_NOT_FOUND', '未找到该次同步。');
        return ok(response, { runId: run.runId, summary: { added: run.stats.added, updated: run.stats.updated, removed: run.stats.removed }, records: recordList(run).slice(offset, offset + pageSize) });
      }
      if (path.startsWith('/api') || path.startsWith('/admin') || !serveStatic) return error(response, 404, 'NOT_FOUND', '接口不存在。');
      let file = resolve(root, '.' + decodeURIComponent(path));
      if (file !== root && !file.startsWith(root + sep)) return error(response, 403, 'FORBIDDEN', '路径不可用。');
      try { if (!(await stat(file)).isFile()) file = resolve(root, 'index.html'); }
      catch { if (path.startsWith('/assets/')) return error(response, 404, 'NOT_FOUND', '资源不存在。'); file = resolve(root, 'index.html'); }
      const content = await readFile(file);
      const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
      response.writeHead(200, { 'Content-Type': `${types[extname(file)] ?? 'application/octet-stream'}; charset=utf-8`, 'Cache-Control': path.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache', 'Content-Security-Policy': "default-src 'self'; connect-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'", 'X-Content-Type-Options': 'nosniff' });
      response.end(content);
    } catch { error(response, 500, 'DEMO_ERROR', '演示服务处理失败。'); }
  });
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  createDemoServer({ serveStatic: process.argv.includes('--static') }).listen(8000, '127.0.0.1', () => console.log('Demo API: http://127.0.0.1:8000 (synthetic data only)'));
}
