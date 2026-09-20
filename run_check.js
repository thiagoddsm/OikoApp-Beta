const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, 'git_check.txt');
let log = '';

function run(cmd) {
  log += `\n=== RUNNING: ${cmd} ===\n`;
  try {
    const out = execSync(cmd, { stdio: 'pipe', timeout: 15000 });
    log += out.toString();
  } catch (err) {
    log += `ERROR: ${err.message}\n`;
    if (err.stdout) log += `STDOUT: ${err.stdout.toString()}\n`;
    if (err.stderr) log += `STDERR: ${err.stderr.toString()}\n`;
  }
}

run('git status');
run('git remote -v');
run('git log -3 --oneline');

fs.writeFileSync(logFile, log);
