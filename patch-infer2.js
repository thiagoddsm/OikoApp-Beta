const fs = require('fs');
const path = require('path');

const filePath = path.resolve('src/components/events/event-checkin-tab.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const regex = /function inferIsMember\(reg: Registration\): boolean \{[\s\S]*?return false; \/\/ AlguǸm que nǜo estǭ em NADA\.\r?\n\}/;
const replacement = `function inferIsMember(reg: Registration, eventData?: any): boolean {
  if (reg.attendance?.isVisitor === false) return true;
  if (reg.attendance?.isVisitor === true) return false;
  
  if (inferIsInGC(reg, eventData) || inferIsInServico(reg, eventData) || inferIsInEnsino(reg, eventData)) return true;

  if (!reg.customAnswers) return false;
  for (const [key, val] of Object.entries(reg.customAnswers)) {
    let k = normalizeText(key);
    if (eventData?.customQuestions) {
      const qDef = eventData.customQuestions.find((q: any) => q.id === key);
      if (qDef) k = normalizeText(qDef.label);
    }
    const v = normalizeText(val);
    if (k.includes('membro') && (v === 'sim' || v.includes('sou'))) return true;
    if (k.includes('igreja') && (v.includes('manha') || v.includes('ibm'))) return true;
  }
  return false;
}`;

// I will just use a simpler replace strategy
content = content.replace('function inferIsMember(reg: Registration): boolean {', 'function inferIsMember(reg: Registration, eventData?: any): boolean {');

content = content.replace(
  'if (inferIsInGC(reg) || inferIsInServico(reg) || inferIsInEnsino(reg)) return true;', 
  'if (inferIsInGC(reg, eventData) || inferIsInServico(reg, eventData) || inferIsInEnsino(reg, eventData)) return true;'
);

content = content.replace(
  'const k = normalizeText(key);',
  `let k = normalizeText(key);
    if (eventData?.customQuestions) {
      const qDef = eventData.customQuestions.find((q: any) => q.id === key);
      if (qDef) k = normalizeText(qDef.label);
    }`
);

fs.writeFileSync(filePath, content, 'utf8');
