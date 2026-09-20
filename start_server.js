const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, 'server_output.log');
const out = fs.openSync(logFile, 'w');

console.log('Starting Next.js server on port 9002...');

const nextPath = path.join(__dirname, 'node_modules', 'next', 'dist', 'bin', 'next');
const child = spawn(process.execPath, [nextPath, 'dev', '-p', '9002'], {
  cwd: __dirname,
  detached: true,
  stdio: ['ignore', out, out],
  env: { ...process.env, PORT: '9002' }
});

child.unref();
console.log('Next.js process detached with PID:', child.pid);
