const fs = require('fs');
let c = fs.readFileSync('src/lib/gc-report-bot.ts', 'utf8');
c = c.replace(/ðŸ”/g, '🔗');
c = c.replace(/ðŸ’/g, '💬');
fs.writeFileSync('src/lib/gc-report-bot.ts', c, 'utf8');
console.log('Fixed link emoji');
