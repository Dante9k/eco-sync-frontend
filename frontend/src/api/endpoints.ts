export const endpoints = {
  status: '/api/eco/status',
  sync: '/api/eco/sync',
  history: '/api/eco/history',
  diff: (runId: string) => `/api/eco/diff/${encodeURIComponent(runId)}`,
} as const;
