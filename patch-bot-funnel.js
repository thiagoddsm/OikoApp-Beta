const fs = require('fs');
const path = require('path');

const filePath = path.resolve('src/lib/gc-report-bot.ts');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/newStage = 'INTEGRADO_GC';/g, "newStage = 'CONCLUIDO';");

fs.writeFileSync(filePath, content, 'utf8');
console.log('GC bot funnel target updated');
