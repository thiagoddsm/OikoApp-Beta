const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'contexts', 'TeachingContext.tsx');
const code = fs.readFileSync(filePath, 'utf-8');
const lines = code.split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('<') || line.includes('>')) {
    console.log(`${i + 1}: ${line.trim()}`);
  }
}
