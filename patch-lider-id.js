const fs = require('fs');
const path = require('path');

const filePath = path.resolve('src/app/public/conectar/actions.ts');
let content = fs.readFileSync(filePath, 'utf8');

const regex = /const cellData = cellDoc\.data\(\)!;\s+const liderId = cellData\.liderId;\s+if \(liderId\) \{/m;
const replacement = `const cellData = cellDoc.data()!;
          const liderId = cellData.liderId || cellData.leaderId || cellData.liderCasalId;
          if (liderId) {`;

if (content.match(regex)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('patched liderId for notifications');
} else {
  console.log('could not find match');
}
