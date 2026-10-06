import { spawn } from 'node:child_process';

const isWin = process.platform === 'win32';
const npxCmd = isWin ? 'npx.cmd' : 'npx';

console.log('🚀 Starting Nepshare backend & frontend services...');

const server = spawn(npxCmd, ['tsx', 'watch', 'server/index.ts'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, PORT: process.env.PORT || '5000', NODE_ENV: 'development' }
});

const client = spawn(npxCmd, ['vite'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env }
});

function cleanup() {
  console.log('\n🛑 Shutting down Nepshare services...');
  if (server) server.kill();
  if (client) client.kill();
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
