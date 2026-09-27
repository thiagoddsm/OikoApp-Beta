const fs = require('fs');
const path = require('path');

function fixDoubleEncoding(filePath) {
  const absolutePath = path.resolve(filePath);
  let content = fs.readFileSync(absolutePath, 'utf8');
  
  // se content tiver 'OlÃ¡' ou 'CÃ©lula', está duplamente encodado.
  if (content.includes('OlÃ¡') || content.includes('CÃ©lula') || content.includes('ReuniÃµes')) {
    const fixed = Buffer.from(content, 'latin1').toString('utf8');
    fs.writeFileSync(absolutePath, fixed, 'utf8');
    console.log(`Fixed double encoding in: ${filePath}`);
  } else {
    console.log(`No double encoding found in: ${filePath}`);
  }
}

fixDoubleEncoding('src/lib/gc-report-bot.ts');
fixDoubleEncoding('src/app/dashboard/engajamento/processos/page.tsx');
