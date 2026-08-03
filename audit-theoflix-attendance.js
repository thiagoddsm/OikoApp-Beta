/**
 * audit-theoflix-attendance.js
 *
 * Auditoria DUPLA sobre journey.theoflixAttendance:
 *
 * AUDITORIA A — Falsos Positivos (urgente)
 *   Alunos com chave numérica em theoflixAttendance que NÃO corresponde
 *   a um módulo do syllabus do curso presencial. Esses alunos provavelmente
 *   têm o mesmo bug do Victor (módulo marcado como TheoFlix sem aula real).
 *
 * AUDITORIA B — Impacto da remoção do fallback numérico
 *   Alunos com chave numérica que SIM corresponde a um módulo do syllabus
 *   e que NÃO têm UUID do syllabus gravado. Esses alunos perderiam o
 *   reconhecimento de presença se o fallback numérico for removido.
 *
 * Uso: node audit-theoflix-attendance.js
 */

// Carregar variáveis de ambiente do .env.local antes de qualquer import do Firebase
require('dotenv').config({ path: '.env.local' });

const { getAdminDb } = require('./src/lib/firebase-admin');

async function audit() {
  const db = getAdminDb();

  console.log('=== Carregando cursos do Firestore... ===');
  const coursesSnap = await db.collection('courses').get();
  const courses = {};
  coursesSnap.docs.forEach(d => {
    const data = d.data();
    if (data.syllabus && data.syllabus.length > 0) {
      courses[d.id] = data;
      // também indexar por linkedTheoflixId e por theoflixCourseId dos módulos
      if (data.linkedTheoflixId) courses[data.linkedTheoflixId] = data;
      data.syllabus.forEach(s => {
        if (s.theoflixCourseId) courses[s.theoflixCourseId] = data;
      });
    }
  });
  console.log(`Cursos com syllabus carregados: ${Object.keys(courses).length}`);

  console.log('\n=== Carregando usuários... ===');
  const usersSnap = await db.collection('users').get();
  console.log(`Total de usuários: ${usersSnap.size}\n`);

  const falsePostiives = []; // Auditoria A
  const falseNegativesAtRisk = []; // Auditoria B

  for (const userDoc of usersSnap.docs) {
    const data = userDoc.data();
    const theoflixAtt = data.journey?.theoflixAttendance;
    if (!theoflixAtt || typeof theoflixAtt !== 'object') continue;

    for (const [courseKey, moduleMap] of Object.entries(theoflixAtt)) {
      if (!moduleMap || typeof moduleMap !== 'object') continue;

      const course = courses[courseKey] || courses[courseKey.toLowerCase()];
      if (!course) continue; // curso não encontrado, pula

      const syllabus = course.syllabus || [];
      const syllabusIds = new Set(syllabus.map(s => s.id).filter(Boolean));

      for (const [key, value] of Object.entries(moduleMap)) {
        if (value !== true) continue;

        const isNumericKey = /^\d+$/.test(key);
        const isUuidKey = syllabusIds.has(key);

        if (!isNumericKey) continue; // chave UUID — não é fallback numérico

        // É uma chave numérica — verificar se corresponde a um módulo real
        const numericIndex = parseInt(key, 10);
        const correspondingSyllabusModule = syllabus[numericIndex]; // 0-based
        const hasValidSyllabusMatch = !!correspondingSyllabusModule;
        const hasUuidAlso = correspondingSyllabusModule?.id && moduleMap[correspondingSyllabusModule.id] === true;

        if (!hasValidSyllabusMatch) {
          // AUDITORIA A: Chave numérica SEM módulo correspondente no syllabus
          // = dado órfão, candidato a falso positivo
          falsePostiives.push({
            userId: userDoc.id,
            userName: data.name || '(sem nome)',
            courseKey,
            orphanKey: key,
            syllabusLength: syllabus.length,
            note: `modIndex=${numericIndex} está FORA do syllabus (${syllabus.length} módulos)`
          });
        } else if (!hasUuidAlso) {
          // AUDITORIA B: Chave numérica COM módulo correspondente, mas SEM UUID
          // = presença legítima que seria perdida se fallback numérico for removido
          falseNegativesAtRisk.push({
            userId: userDoc.id,
            userName: data.name || '(sem nome)',
            courseKey,
            numericKey: key,
            syllabusModuleId: correspondingSyllabusModule.id || '(sem UUID)',
            syllabusModuleTitle: correspondingSyllabusModule.title || '(sem título)',
            note: `modIndex=${numericIndex} existe no syllabus mas não tem UUID gravado`
          });
        }
        // Se hasValidSyllabusMatch && hasUuidAlso: seguro para remover fallback (UUID já cobre)
      }
    }
  }

  // =========================================================
  // RELATÓRIO — AUDITORIA A: Falsos Positivos (candidatos ao bug do Victor)
  // =========================================================
  console.log('='.repeat(70));
  console.log('AUDITORIA A — Falsos Positivos (mesmo padrão do Victor)');
  console.log('='.repeat(70));
  if (falsePostiives.length === 0) {
    console.log('✅ NENHUM usuário encontrado com chave numérica órfã. Victor era caso único.');
  } else {
    console.log(`⚠️  ${falsePostiives.length} ocorrências encontradas:\n`);
    falsePostiives.forEach((r, i) => {
      console.log(`  [${i + 1}] userId=${r.userId} | nome="${r.userName}"`);
      console.log(`       curso="${r.courseKey}" | chave="${r.orphanKey}" (${r.note})`);
    });
    console.log('\n→ Ação necessária: remover esses campos do Firestore (ou usar script de limpeza)');
  }

  // =========================================================
  // RELATÓRIO — AUDITORIA B: Impacto da remoção do fallback numérico
  // =========================================================
  console.log('\n' + '='.repeat(70));
  console.log('AUDITORIA B — Alunos em risco se fallback numérico for removido');
  console.log('='.repeat(70));
  if (falseNegativesAtRisk.length === 0) {
    console.log('✅ NENHUM usuário perderia presença legítima. Correções 2 e 3 são seguras.');
  } else {
    console.log(`⚠️  ${falseNegativesAtRisk.length} ocorrências encontradas (precisam de migração antes da Correção 2):\n`);
    falseNegativesAtRisk.forEach((r, i) => {
      console.log(`  [${i + 1}] userId=${r.userId} | nome="${r.userName}"`);
      console.log(`       curso="${r.courseKey}" | chave="${r.numericKey}" → módulo "${r.syllabusModuleTitle}" (${r.note})`);
    });
    console.log('\n→ Ação necessária: gravar o UUID do syllabus antes de remover o fallback numérico');
  }

  console.log('\n=== Auditoria concluída ===\n');
}

audit().catch(err => {
  console.error('Erro na auditoria:', err);
  process.exit(1);
});
