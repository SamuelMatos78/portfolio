import { spawn } from 'node:child_process';
import { createArena } from '../war-integration/server.ts';

let arena;
let frontend;
let stopping = false;

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  frontend?.kill('SIGTERM');
  arena?.close();
  process.exitCode = code;
  setTimeout(() => process.exit(code), 1000).unref();
}

process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());

try {
  ({ server: arena } = await createArena());
  // Port zero lets the OS pick a free port, without conflicting with War Game.
  const requestedPort = Number(process.env.ARENA_PORT ?? 0);
  if (!Number.isInteger(requestedPort) || requestedPort < 0 || requestedPort > 65535) {
    throw new Error('ARENA_PORT deve ser uma porta válida entre 0 e 65535.');
  }
  await new Promise((resolve, reject) => {
    arena.once('error', reject);
    arena.listen(requestedPort, '127.0.0.1', () => {
      arena.off('error', reject);
      resolve();
    });
  });
  const { port } = arena.address();
  console.log(`Code Arena backend: http://127.0.0.1:${port}`);
  frontend = spawn(process.execPath, [
    'node_modules/vite/bin/vite.js', '--host', 'localhost', ...process.argv.slice(2),
  ], { stdio: 'inherit', env: { ...process.env, ARENA_PORT: String(port) } });
  frontend.on('error', error => { console.error(error.message); stop(1); });
  frontend.on('exit', code => stop(code ?? 1));
} catch (error) {
  console.error(`Não foi possível iniciar a Code Arena: ${error.message}`);
  stop(1);
}
