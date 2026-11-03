import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export function startBackend({ demo = false, pipe = false } = {}) {
  return spawn(process.env.EXO_PYTHON || 'python', ['-m', 'backend', ...(demo ? ['--demo'] : [])], {
    cwd: fileURLToPath(new URL('../../', import.meta.url)),
    stdio: pipe ? ['ignore', 'pipe', 'inherit'] : 'inherit',
    windowsHide: true,
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const backend = startBackend({ demo: process.argv.includes('--demo') });
  backend.on('error', () => { console.error('Cannot start Python 3.11+. Set EXO_PYTHON to your Python executable.'); process.exitCode = 1; });
  backend.on('exit', code => { process.exitCode = code ?? 0; });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => backend.kill());
}
