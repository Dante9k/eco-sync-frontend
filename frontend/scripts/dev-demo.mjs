import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { startBackend } from './backend.mjs';

const backend = startBackend({ demo: true, pipe: true });
let vite;
let stopping = false;
let startupOutput = '';
const stop = () => { if (stopping) return; stopping = true; vite?.kill(); backend.kill(); };
backend.stdout.on('data', chunk => {
  process.stdout.write(chunk);
  startupOutput = (startupOutput + String(chunk)).slice(-2048);
  if (!vite && startupOutput.includes('EXO backend listening')) {
    vite = spawn(process.execPath, [fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url)), '--host', '127.0.0.1'], { stdio: 'inherit', windowsHide: true });
    vite.on('error', () => { console.error('Cannot start Vite. Install frontend dependencies first.'); process.exitCode = 1; stop(); });
    vite.on('exit', code => { process.exitCode = code ?? 0; stop(); });
  }
});
backend.on('error', () => { console.error('Cannot start Python 3.11+. Set EXO_PYTHON to your Python executable.'); process.exitCode = 1; stop(); });
backend.on('exit', code => { if (!stopping) process.exitCode = code ?? 1; stop(); });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, stop);
