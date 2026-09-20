const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, 'git_push_result.txt');
let log = '';

function run(cmd) {
  log += `\n=== RUNNING: ${cmd} ===\n`;
  try {
    const out = execSync(cmd, { stdio: 'pipe' });
    log += out.toString();
  } catch (err) {
    log += `ERROR: ${err.message}\n`;
    if (err.stdout) log += `STDOUT: ${err.stdout.toString()}\n`;
    if (err.stderr) log += `STDERR: ${err.stderr.toString()}\n`;
  }
}

run('git add -A');
run('git commit -m "feat(igrejas-de-sg): adicionar importacao via JSON e download modelo"');
run('git push origin main');
run('git log -2 --oneline');

fs.writeFileSync(logFile, log);
console.log('Done, wrote to ' + logFile);
