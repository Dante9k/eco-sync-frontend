import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createDemoServer } from './demo-server.mjs';
const api = createDemoServer();
api.on('error', error => { console.error(`Cannot start demo API: ${error.code}`); process.exitCode = 1; });
api.listen(8000, '127.0.0.1', () => {
  console.log('Demo API: http://127.0.0.1:8000 (synthetic data only)');
  const vite = spawn(process.execPath, [fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url)), '--host', '127.0.0.1'], { stdio: 'inherit', env: { ...process.env, VITE_DEMO_MODE: 'true' } });
  const stop = () => { vite.kill(); api.close(); };
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
  vite.on('exit', code => { api.close(); process.exitCode = code ?? 0; });
});
