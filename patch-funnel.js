const fs = require('fs');
const path = require('path');

const filePath = path.resolve('src/app/dashboard/engajamento/processos/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// The original lines are:
//    GC: [
//      { id: 'AGUARDANDO_CONTATO', label: '1. Encaminhado ao GC', badgeColor: 'bg-amber-100 text-amber-800 border-amber-200' },
//      { id: 'EM_VISITA', label: '2. Visitando Reuniões', badgeColor: 'bg-blue-100 text-blue-800 border-blue-200' },
//      { id: 'INTEGRADO_GC', label: '3. Frequente no GC', badgeColor: 'bg-purple-100 text-purple-800 border-purple-200' },
//      { id: 'CONCLUIDO', label: '4. Membro Efetivo da Célula', badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
//    ],

const regex = /GC:\s*\[[\s\S]*?\]\,/m;
const match = content.match(regex);

if (match) {
  let block = match[0];
  // Remove INTEGRADO_GC line
  block = block.replace(/\s*\{\s*id:\s*'INTEGRADO_GC'[^}]+\},/g, '');
  // Rename 4. to 3.
  block = block.replace(/4\. Membro Efetivo da/, '3. Membro Efetivo da');
  
  content = content.replace(regex, block);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('GC funnel updated in processos page');
} else {
  console.log('GC funnel block not found');
}
