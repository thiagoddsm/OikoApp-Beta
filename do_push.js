const { execSync, spawnSync } = require('child_process');
const fs = require('fs');

console.log('--- GIT STATUS ---');
try {
  const status = execSync('git status --porcelain', { encoding: 'utf8' });
  console.log(status || '(clean)');
} catch (e) {
  console.error('Status error:', e.message);
}

console.log('--- GIT COMMIT ---');
try {
  execSync('git add public/igrejas-de-sg/index.html public/igrejas-de-sg.html', { encoding: 'utf8' });
  const commit = execSync('git commit -m "feat(igrejas-de-sg): adicionar importacao via JSON e download modelo"', { encoding: 'utf8' });
  console.log(commit);
} catch (e) {
  console.log('Commit note:', e.message);
}

console.log('--- GIT PUSH ---');
try {
  const push = execSync('git push origin main', { encoding: 'utf8', timeout: 30000 });
  console.log(push);
} catch (e) {
  console.error('Push error:', e.message);
  if (e.stdout) console.log('Push stdout:', e.stdout);
  if (e.stderr) console.log('Push stderr:', e.stderr);
}
