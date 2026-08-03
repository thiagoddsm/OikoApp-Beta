/**
 * Passo 5 — Migração de theoflixRequiredVideoIds nos cursos: índice numérico → youtubeId
 *
 * Uso:
 *   node migrate-syllabus-required-videos.js --dry-run
 *   node migrate-syllabus-required-videos.js
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

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');

console.log(`\n🔧 PASSO 5 — Migração de theoflixRequiredVideoIds nas ementas dos Cursos`);
console.log(`   Modo: ${isDryRun ? '🔍 DRY-RUN (sem gravação)' : '✍️  GRAVAÇÃO REAL'}\n`);

async function main() {
  const theoflixSnap = await db.collection('theoflix_courses').get();
  const theoflixCoursesMap = {};
  theoflixSnap.forEach(d => { theoflixCoursesMap[d.id] = d.data(); });

  const coursesSnap = await db.collection('courses').get();
  let totalCoursesMigrated = 0;
  let totalModulesUpdated = 0;

  for (const docSnap of coursesSnap.docs) {
    const course = docSnap.data();
    const syllabus = course.syllabus || [];
    let courseUpdated = false;
    const updatedSyllabus = [];

    for (let i = 0; i < syllabus.length; i++) {
      const mod = { ...syllabus[i] };
      const reqVideos = mod.theoflixRequiredVideoIds;

      if (Array.isArray(reqVideos) && reqVideos.length > 0) {
        const tfCourseId = mod.theoflixCourseId || course.linkedTheoflixId || course.id;
        const tfCourse = theoflixCoursesMap[tfCourseId];
        const episodes = tfCourse?.episodes || [];

        const newReqVideos = [];
        let modChanged = false;

        for (const vId of reqVideos) {
          const isNumeric = /^\d+$/.test(vId);
          if (isNumeric) {
            const idx = parseInt(vId, 10);
            const ep = episodes[idx];
            if (ep && ep.youtubeId) {
              newReqVideos.push(ep.youtubeId);
              modChanged = true;
              console.log(`   ✏️ [Curso: ${course.name}] Módulo "${mod.title}": índice "${vId}" → youtubeId "${ep.youtubeId}" (${ep.title})`);
            } else {
              console.log(`   ⚠️ [Curso: ${course.name}] Módulo "${mod.title}": índice "${vId}" não encontrado no TheoFlix "${tfCourseId}". Mantendo "${vId}".`);
              newReqVideos.push(vId);
            }
          } else {
            newReqVideos.push(vId); // já é youtubeId
          }
        }

        if (modChanged) {
          mod.theoflixRequiredVideoIds = newReqVideos;
          courseUpdated = true;
          totalModulesUpdated++;
        }
      }
      updatedSyllabus.push(mod);
    }

    if (courseUpdated) {
      totalCoursesMigrated++;
      if (!isDryRun) {
        await db.collection('courses').doc(docSnap.id).update({ syllabus: updatedSyllabus });
        console.log(`   💾 Atualizada ementa do curso "${course.name}" (${docSnap.id})`);
      } else {
        console.log(`   🔍 [DRY-RUN] Ementa do curso "${course.name}" seria atualizada.`);
      }
    }
  }

  console.log('\n' + '─'.repeat(60));
  console.log(`📊 RESUMO FINAL - PASSO 5`);
  console.log(`   📚 Cursos com ementa atualizada: ${totalCoursesMigrated}`);
  console.log(`   📦 Módulos atualizados:            ${totalModulesUpdated}`);
  if (isDryRun) {
    console.log('\n🔍 Modo dry-run — nenhum dado foi alterado.');
  } else {
    console.log('\n✅ Passo 5 concluído com sucesso!');
  }
}

main().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
