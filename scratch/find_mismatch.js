const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'contexts', 'TeachingContext.tsx');
const code = fs.readFileSync(filePath, 'utf-8');

let braceCount = 0;
let parenCount = 0;
let bracketCount = 0;

const lines = code.split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (let col = 0; col < line.length; col++) {
    const char = line[col];
    if (char === '{') braceCount++;
    if (char === '}') braceCount--;
    if (char === '(') parenCount++;
    if (char === ')') parenCount--;
    if (char === '[') bracketCount++;
    if (char === ']') bracketCount--;

    if (braceCount < 0) {
      console.log(`Extra closing brace '}' at line ${i + 1}:${col + 1}`);
      braceCount = 0;
    }
    if (parenCount < 0) {
      console.log(`Extra closing parenthesis ')' at line ${i + 1}:${col + 1}`);
      parenCount = 0;
    }
    if (bracketCount < 0) {
      console.log(`Extra closing bracket ']' at line ${i + 1}:${col + 1}`);
      bracketCount = 0;
    }
  }
}

console.log('Final counts:');
console.log(`Braces: ${braceCount}`);
console.log(`Parentheses: ${parenCount}`);
console.log(`Brackets: ${bracketCount}`);
