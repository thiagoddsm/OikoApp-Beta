const fs = require('fs');
const path = require('path');

const filePath = path.resolve('src/components/events/event-checkin-tab.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const regexHasShirt = /function inferHasShirt\(reg: Registration\): boolean \{[\s\S]*?return false;\r?\n\}/;
const replaceHasShirt = `function inferHasShirt(reg: Registration, eventData?: any): boolean {
  const t = normalizeText(reg.ticketName || '');
  if (t.includes('camisa') || t.includes('t-shirt') || t.includes('kit completo')) return true;
  if (!reg.customAnswers) return false;
  for (const [key, val] of Object.entries(reg.customAnswers)) {
    let k = normalizeText(key);
    if (eventData?.customQuestions) {
      const qDef = eventData.customQuestions.find((q: any) => q.id === key);
      if (qDef) k = normalizeText(qDef.label);
    }
    const v = normalizeText(val);
    if ((k.includes('camisa') || k.includes('tamanho')) && v.length > 0 && !v.includes('nao quero') && !v.includes('sem camisa')) return true;
  }
  return false;
}`;

const regexGetShirtSize = /function getShirtSize\(reg: Registration\): string \| null \{[\s\S]*?return null;\r?\n\}/;
const replaceGetShirtSize = `function getShirtSize(reg: Registration, eventData?: any): string | null {
  if (!reg.customAnswers) return null;
  for (const [key, val] of Object.entries(reg.customAnswers)) {
    let k = normalizeText(key);
    if (eventData?.customQuestions) {
      const qDef = eventData.customQuestions.find((q: any) => q.id === key);
      if (qDef) k = normalizeText(qDef.label);
    }
    if (k.includes('tamanho') || k.includes('camisa')) return val;
  }
  return null;
}`;

content = content.replace(regexHasShirt, replaceHasShirt);
content = content.replace(regexGetShirtSize, replaceGetShirtSize);

content = content.replace('const hasShirt = inferHasShirt(reg);', 'const hasShirt = inferHasShirt(reg, eventData);');
content = content.replace('const hasShirt = inferHasShirt(selectedReg);', 'const hasShirt = inferHasShirt(selectedReg, eventData);');
content = content.replace('const shirtSize = getShirtSize(selectedReg);', 'const shirtSize = getShirtSize(selectedReg, eventData);');

fs.writeFileSync(filePath, content, 'utf8');
console.log('patched shirt functions');
