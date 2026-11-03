# EXO Data Sync Platform

**EXO 数据同步平台**，简称 **EXO Sync**。

React 控制台 + 独立 Python 后端。后端统一处理配置、调度、数据清洗、受控写入和预警；前端负责配置、触发与结果展示。已有智能体 / 工作流通过适配器接入飞书多维表格。

## 当前交付范围

- 八个前端模块：标题与状态、同步管理、预警配置、数据总览、同步历史、差异详情、操作日志、集成配置；支持日间/夜间模式和移动端。
- 十个独立后端业务模块，统一 JSON 配置，SQLite 持久化任务、写入检查点与审计记录。
- 支持每天、每周、每月和每隔 N 天的日历调度（北京时间）；提醒范围左闭右开，两端相同表示单独一天。
- 调度与应急同步共用流程；应急接口接受年份，历史年度查询全年，当前年度查询至当天，按北京时间计算。
- 同目标互斥、条件更新、业务键去重、逐条核验、部分失败恢复、重启恢复、通知单独重试。
- 持久化模拟适配器可运行完整链路。**真实外部系统及工作流协议尚未接入**，未安装适配器时真实同步会被拒绝。字段、清洗规则、认证方式由后续适配器实现，不在框架中猜测。

## 本机运行

需要 Python 3.11+、Node.js 和 npm 或 pnpm。后端只使用 Python 标准库，无额外安装依赖。

```sh
cd frontend
pnpm install --frozen-lockfile
pnpm run dev:demo
```

打开 [本地控制台](http://127.0.0.1:5173/)。该命令启动 Python 后端和 Vite；模拟数据保存到根目录 `.local/demo/`，重启后保留。界面标明模拟模式，不连接真实外部系统或飞书。Python 不在 PATH 时设置环境变量 `EXO_PYTHON` 为解释器路径。

正式开发实例分两个终端启动：

```sh
# 仓库根目录，默认集成状态为待配置
python -m backend

# 另一个终端
cd frontend
pnpm run dev
```

正常实例保存到 `.local/backend/`，与模拟实例隔离。两个实例默认使用同一端口，不能同时启动；可以通过 `--port` 和 Vite 代理调整。

## 验证与构建

```sh
python -m unittest discover -s backend/tests -v
cd frontend
pnpm run typecheck
pnpm test
pnpm run build
```

构建后 `python -m backend --demo` 也可在 [8000 端口](http://127.0.0.1:8000/) 托管 `frontend/dist/`，提供 SPA fallback 和同源 API。未知 API 和缺失资源返回 404，不回退 HTML。

后端与前端均提供 CI 工作流。本地验收包含 34 项后端可靠性测试和 22 项前端契约及规则测试；真实适配器上线前仍须运行文档中的外部集成验收。

详细说明：[后端架构、接口与适配器契约](backend/README.md) · [前端开发](frontend/README.md)。
