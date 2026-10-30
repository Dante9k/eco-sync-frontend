# ECO 数据同步前端

React 18 + TypeScript + Vite 5，实现 v4 API 契约。生产默认请求同源 `/api/eco/*`，开发时 `/api`、`/admin` 代理至 `127.0.0.1:8000`。

## 启动

```sh
cd frontend
npm install
npm run dev
```

访问 http://127.0.0.1:5173。需要真实后端运行在 8000 端口。仓库也附有 pnpm 锁文件，可用 `pnpm install --frozen-lockfile` 复现依赖。

没有后端时，可运行独立演示模式：

```sh
npm run dev:demo
```

该命令同时启动内存演示 API 与 Vite，界面明确显示「演示数据」。47 条合成历史记录、状态筛选、分页、字段差异和 12 秒模拟同步均可操作；重启后重置。演示服务只监听本机，不用于生产，也不连接真实系统。请勿与占用 8000 端口的真实后端同时启动。生产构建不要设置 `VITE_DEMO_MODE`。

## 检查与构建

```sh
npm run typecheck
npm test
npm run build
```

`dist/` 为生产产物，目标 ES2020，不含 sourcemap。测试覆盖 API 的 HTTP/业务错误、格式校验、取消、GET/POST 超时、同源请求和不透明 ID。`npm run preview` 只预览静态产物，不提供真实 API 代理。

本地验证生产产物和 SPA fallback（使用演示 API）：`node scripts/demo-server.mjs --static`，访问 8000 端口。该工具返回 CSP、JSON API、资源缓存头，对非 API 页面路径回退 `index.html`；未知 API 保持 JSON 404。

## 架构约定

- `src/api/types.ts` 是唯一领域契约；`src/api/client.ts` 是应用唯一网络请求点。测试中的 `fetch` 是替身，不执行网络请求。
- `api/eco.ts` 封装端点、分页校验和运行时响应守卫；所有请求均支持取消与 15 秒超时。
- 副作用在 hooks 中处理；`useLatestRequest` 同时用 AbortController 和请求序号防止旧结果覆盖当前页面，卸载时清理。
- reducer 是纯函数，时间由请求 action 传入；Context 只存展示字段与 UI 状态。展示组件通过回调表达业务意图。
- 首次 status/history 并行加载；可见页面每 10 秒轮询状态，隐藏时暂停。未完成请求不会被定时器重复打断；同步状态变化时刷新历史和当前差异。
- 差异 `summary` 必须表示整次同步的记录总数（每条记录只有一个 kind），用于计算 `added + updated + removed` 的分页总量；后端若定义不同，应扩展契约为明确的 `total`。
- 历史筛选仅按契约提供状态；时间区间需要后端新增 query，未做仅过滤当前页的伪筛选。
- 仅渲染 React 文本节点，长值 200 字符后可展开。`sanitizeText` 仅去除控制字符，不用于 HTML。
- Modal 使用原生 dialog 的模态焦点隔离与 Esc；关闭后恢复焦点。Tab 支持方向键、Home/End。状态通过 aria-live 播报，支持减少动效。
- Modal 额外实现 Tab / Shift+Tab 边界循环，初始聚焦「取消」。主按钮使用更深的蓝色以保证白字对比度：默认 5.17:1，悬停 4.91:1。

## 后端联调与部署

真实后端不在此仓库。本次不实现数据库同步、会话签发、生产调度或服务端字段脱敏。后端须按 v4 白名单序列化，校验 CSRF 自定义头与同源请求，设置 Secure / HttpOnly / SameSite=Strict 会话 cookie，并保证同步触发互斥（409）。前端不保存凭据，不显示错误 detail 或堆栈。

可参考 `deploy/nginx.conf.example`。生产需使用 HTTPS，后端接管 `/api`、`/admin`；哈希资源 `/assets/*` 可设置 `Cache-Control: public, max-age=31536000, immutable`，`index.html` 设置 `no-cache`，其他页面路径回退入口。Vite 开发服务的热更新所需连接不使用生产 CSP。

## 演示验收控制

演示服务额外提供仅本机 QA 接口 `POST http://127.0.0.1:8000/__demo/control`，JSON 参数：`{"failNext":"history"}` 让下一次历史请求返回 500；`{"delayNext":2000}` 延迟下一次 API；`{"specialDiff":true}` 在差异中加入 HTML 字样与长文本。控制接口不会被默认 Vite 代理或生产前端引用。重复 POST `/api/eco/sync` 可验证 409。真正断网可停止演示 API，再点击刷新与重试。

## 验收记录（2026-10-30）

- 类型检查、生产构建通过；12 项 API 测试通过。
- 浏览器验证：首次加载、状态筛选、空态、历史与差异分页、模拟同步完成后的自动刷新、409 行内反馈、500 重试恢复。
- 差异中的 HTML 字样按文本显示，长文本展开和收起可用。
- 375px 视口下概览、历史、差异无横向溢出；桌面断点布局正常。
- 确认弹窗初始焦点、双向 Tab 循环、Esc 关闭和恢复触发按钮焦点通过。
- 本地生产静态托管：入口 200、SPA fallback 内容匹配、未知 API 为 JSON 404、index 为 no-cache、哈希资源为 immutable、无 sourcemap。
- `.github/workflows/frontend.yml` 已提供类型检查、测试和构建工作流；尚未在远端 CI 或真实后端环境运行。真实断网在 API 单测中验证，浏览器故障验收使用模拟 500。
