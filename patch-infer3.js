const fs = require('fs');
const path = require('path');

const filePath = path.resolve('src/components/events/event-checkin-tab.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const replacement = `function inferIsInGC(reg: Registration, eventData?: any): boolean {
  if (!reg.customAnswers) return false;
  for (const [key, val] of Object.entries(reg.customAnswers)) {
    let k = normalizeText(key);
    if (eventData?.customQuestions) {
      const qDef = eventData.customQuestions.find((q: any) => q.id === key);
      if (qDef) k = normalizeText(qDef.label);
    }
    const v = normalizeText(val);
    if (k.includes('gc') || k.includes('celula') || k.includes('grupo de crescimento')) {
      if (v === 'sim' || (v.length > 2 && !v.includes('nao') && !v.includes('nenhum') && !v.includes('nao participo'))) return true;
    }
  }
  return false;
}

function inferIsInServico(reg: Registration, eventData?: any): boolean {
  if (!reg.customAnswers) return false;
  for (const [key, val] of Object.entries(reg.customAnswers)) {
    let k = normalizeText(key);
    if (eventData?.customQuestions) {
      const qDef = eventData.customQuestions.find((q: any) => q.id === key);
      if (qDef) k = normalizeText(qDef.label);
    }
    const v = normalizeText(val);
    if (k.includes('servico') || k.includes('servir') || k.includes('ministerio') || k.includes('voluntario') || k.includes('equipe')) {
      if (v === 'sim' || (v.length > 2 && !v.includes('nao') && !v.includes('nenhum') && !v.includes('nao participo'))) return true;
    }
  }
  return false;
}

function inferIsInEnsino(reg: Registration, eventData?: any): boolean {
  if (!reg.customAnswers) return false;
  for (const [key, val] of Object.entries(reg.customAnswers)) {
    let k = normalizeText(key);
    if (eventData?.customQuestions) {
      const qDef = eventData.customQuestions.find((q: any) => q.id === key);
      if (qDef) k = normalizeText(qDef.label);
    }
    const v = normalizeText(val);
    if (k.includes('ensino') || k.includes('trilho') || k.includes('academia') || k.includes('discipulado') || k.includes('classe') || k.includes('curso')) {
      if (v === 'sim' || (v.length > 2 && !v.includes('nao') && !v.includes('nenhum') && !v.includes('nao participo'))) return true;
    }
  }
  return false;
}

function inferIsMember(reg: Registration, eventData?: any): boolean {
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
  return false; // Alguém que não está em NADA.
}`;

const startRegex = /function inferIsInGC\(reg: Registration\): boolean \{/;
const endRegex = /function inferHasShirt\(reg: Registration\): boolean \{/;

const startMatch = content.match(startRegex);
const endMatch = content.match(endRegex);

if (startMatch && endMatch) {
  const startIndex = startMatch.index;
  const endIndex = endMatch.index;
  
  const before = content.substring(0, startIndex);
  const after = content.substring(endIndex);
  
  content = before + replacement + '\n\n' + after;
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('patched exactly');
} else {
  console.log('could not find match');
}
