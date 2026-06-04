const fs = require('fs');
const envContent = fs.readFileSync('.env', 'utf8');
const lines = envContent.split(/\r?\n/);
lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const parts = trimmed.split('=');
    const key = parts[0];
    if (key === 'FIREBASE_SERVICE_ACCOUNT_KEY') {
        console.log(`${key}=<HIDDEN> (length: ${parts[1].length})`);
    } else {
        console.log(line);
    }
});
