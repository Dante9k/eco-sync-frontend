export const endpoints = {
  status: '/api/exo/status',
  sync: '/api/exo/sync',
  history: '/api/exo/history',
  config: '/api/exo/config',
  logs: '/api/exo/logs',
  run: (runId: string) => `/api/exo/runs/${encodeURIComponent(runId)}`,
  diff: (runId: string) => `/api/exo/diff/${encodeURIComponent(runId)}`,
} as const;
