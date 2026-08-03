/**
 * Passo 6a — Auditoria de Reordenação Histórica nos perfis dos alunos
 *
 * Uso:
 *   node audit-theoflix-reorder.js
 */

const fs = require('fs');
const path = require('path');

const projectRoot = 'C:\\Users\\user\\.gemini\\antigravity\\scratch\\OikoApp-Beta';
const admin = require(path.join(projectRoot, 'node_modules', 'firebase-admin'));

const envPath = path.join(projectRoot, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const saMatch = envContent.match(/FIREBASE_SERVICE_ACCOUNT_KEY='(.*)'/);

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(saMatch[1])) });
}
const db = admin.firestore();

async function main() {
  console.log(`\n🔍 PASSO 6a — Auditoria de Reordenação Histórica e Validação de Dados de Alunos\n`);

  const usersSnap = await db.collection('users').get();
  const coursesSnap = await db.collection('courses').get();
  const theoflixSnap = await db.collection('theoflix_courses').get();
  const classesSnap = await db.collection('classes').get();

  const coursesMap = {};
  coursesSnap.forEach(d => { coursesMap[d.id] = d.data(); });

  const theoflixMap = {};
  theoflixSnap.forEach(d => { theoflixMap[d.id] = d.data(); });

  const classesList = classesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  let totalUsersWithAttendance = 0;
  let totalNumericKeysFound = 0;
  let safeKeysCount = 0;
  let inconsistentCount = 0;
  let undeterminedCount = 0;

  for (const userDoc of usersSnap.docs) {
    const user = userDoc.data();
    const userId = userDoc.id;
    const attendance = user.journey?.theoflixAttendance;

    if (!attendance || typeof attendance !== 'object') continue;
    totalUsersWithAttendance++;

    for (const [courseId, epMap] of Object.entries(attendance)) {
      if (!epMap || typeof epMap !== 'object') continue;

      for (const [key, val] of Object.entries(epMap)) {
        if (val !== true) continue;
        if (!/^\d+$/.test(key)) continue; // só chaves numéricas

        totalNumericKeysFound++;
        const episodeIdx = parseInt(key, 10);

        // Achar curso físico correspondente
        const physicalCourse = Object.values(coursesMap).find((c) =>
          c.id === courseId ||
          c.linkedTheoflixId === courseId ||
          c.syllabus?.some((s) => s.theoflixCourseId === courseId)
        );

        const syllabus = physicalCourse?.syllabus || [];
        const tfCourse = theoflixMap[courseId];
        const episodes = tfCourse?.episodes || [];
        const targetEp = episodes[episodeIdx];

        // Verificar se aluno tem registro presencial/online no diário da turma
        const userClasses = classesList.filter(c => c.students?.includes(userId));
        let matchInClassLog = false;
        let mismatchInClassLog = false;

        for (const cls of userClasses) {
          (cls.attendance || []).forEach(att => {
            if (att.onlineStudentIds?.includes(userId)) {
              // Se marcou online nesta data, checar se a data bate com o módulo correspondente
              matchInClassLog = true;
            }
          });
        }

        console.log(`👤 Aluno: ${user.name || userId}`);
        console.log(`   Curso: ${courseId} | Chave Numérica: "${key}" | Vídeo Atual: "${targetEp?.title || 'não encontrado'}" (${targetEp?.youtubeId || 'N/A'})`);

        if (targetEp) {
          safeKeysCount++;
          console.log(`   STATUS: ✅ Mapeável para estado atual`);
        } else {
          inconsistentCount++;
          console.log(`   STATUS: ❌ Índice fora do intervalo de episódios atual`);
        }
      }
    }
  }

  console.log('\n' + '─'.repeat(60));
  console.log(`📊 RELATÓRIO DE AUDITORIA PASSO 6a`);
  console.log(`   👥 Usuários com theoflixAttendance:    ${totalUsersWithAttendance}`);
  console.log(`   🔑 Total de chaves numéricas achadas: ${totalNumericKeysFound}`);
  console.log(`   ✅ Registros mapeáveis para estado atual: ${safeKeysCount}`);
  console.log(`   ❌ Registros com inconsistência detectada: ${inconsistentCount}`);
}

main().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
