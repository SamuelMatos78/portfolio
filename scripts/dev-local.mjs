// Compatibility entry: the Arena now runs entirely in the browser.
import { spawn } from 'node:child_process';
const args = process.argv.slice(2);
const preview = args.includes('--preview');
const child = spawn(process.execPath, ['node_modules/vite/bin/vite.js', ...(preview ? ['preview'] : []), ...args.filter(arg => arg !== '--preview')], { stdio: 'inherit' });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
