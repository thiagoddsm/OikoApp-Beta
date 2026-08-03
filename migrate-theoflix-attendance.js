/**
 * Fase 3 — Migração de theoflixAttendance: índice numérico → youtubeId
 *
 * Uso:
 *   node migrate-theoflix-attendance.js --userId=kvFDLI1QcrZ5XpOCEQB7iAHbD3e2 --dry-run
 *   node migrate-theoflix-attendance.js --userId=kvFDLI1QcrZ5XpOCEQB7iAHbD3e2
 *   node migrate-theoflix-attendance.js --all --dry-run
 *   node migrate-theoflix-attendance.js --all
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

// ── Parse args ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const runAll = args.includes('--all');
const userIdArg = args.find(a => a.startsWith('--userId='))?.split('=')[1];

if (!userIdArg && !runAll) {
  console.error('Uso: node migrate-theoflix-attendance.js --userId=<id> [--dry-run]');
  console.error('      node migrate-theoflix-attendance.js --all [--dry-run]');
  process.exit(1);
}

console.log(`\n🔧 FASE 3 — Migração theoflixAttendance`);
console.log(`   Modo: ${isDryRun ? '🔍 DRY-RUN (sem gravação)' : '✍️  GRAVAÇÃO REAL'}`);
console.log(`   Alvo: ${runAll ? 'TODOS OS USUÁRIOS' : `userId=${userIdArg}`}\n`);

// ── Helpers ───────────────────────────────────────────────────────────────────
function isNumericKey(key) {
  return /^\d+$/.test(key);
}

async function migrateUser(userId, theoflixCoursesMap) {
  const uDoc = await db.collection('users').doc(userId).get();
  if (!uDoc.exists) {
    console.log(`  ⚠️  Usuário ${userId} não encontrado.`);
    return { migrated: 0, skipped: 0, errors: 0 };
  }

  const user = uDoc.data();
  const name = user.name || userId;
  const attendance = user.journey?.theoflixAttendance || {};

  let migrated = 0;
  let skipped = 0;
  let errors = 0;
  const updates = {};

  console.log(`\n👤 ${name} (${userId})`);

  for (const [courseId, episodeMap] of Object.entries(attendance)) {
    if (typeof episodeMap !== 'object' || !episodeMap) continue;

    const theoflixCourse = theoflixCoursesMap[courseId];
    if (!theoflixCourse) {
      console.log(`   ⚠️  Curso TheoFlix '${courseId}' não encontrado — pulando`);
      skipped++;
      continue;
    }

    const episodes = theoflixCourse.episodes || [];

    for (const [key, value] of Object.entries(episodeMap)) {
      // Só migrar chaves numéricas com valor true
      if (!isNumericKey(key)) {
        console.log(`   ✓  [${courseId}]["${key}"] já é youtubeId — sem ação`);
        continue;
      }
      if (value !== true) {
        console.log(`   ⏭️  [${courseId}]["${key}"] = ${value} — ignorado (não é true)`);
        skipped++;
        continue;
      }

      const episodeIdx = parseInt(key, 10);
      const episode = episodes[episodeIdx];

      if (!episode || !episode.youtubeId) {
        console.log(`   ❌  [${courseId}]["${key}"] → episódio ${episodeIdx} não tem youtubeId — erro`);
        errors++;
        continue;
      }

      // Verificar se o youtubeId já existe no mapa
      if (episodeMap[episode.youtubeId] === true) {
        console.log(`   ✓  [${courseId}]["${key}"] → "${episode.youtubeId}" já existe — sem ação`);
        skipped++;
        continue;
      }

      console.log(`   ➕ [${courseId}]["${key}"] → gravar ["${episode.youtubeId}"] = true`);
      console.log(`      (episódio: ${episode.title || episode.youtubeId})`);
      updates[`journey.theoflixAttendance.${courseId}.${episode.youtubeId}`] = true;
      migrated++;
    }
  }

  if (migrated === 0) {
    console.log(`   ✅ Nada a migrar para este usuário.`);
    return { migrated: 0, skipped, errors };
  }

  if (!isDryRun) {
    await db.collection('users').doc(userId).update(updates);
    console.log(`   💾 ${migrated} campo(s) gravado(s) no Firestore.`);
  } else {
    console.log(`   🔍 [DRY-RUN] ${migrated} campo(s) SERIAM gravados.`);
  }

  return { migrated, skipped, errors };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  // Carregar todos os cursos TheoFlix em memória
  const theoflixSnap = await db.collection('theoflix_courses').get();
  const theoflixCoursesMap = {};
  theoflixSnap.forEach(d => { theoflixCoursesMap[d.id] = d.data(); });

  console.log(`📚 TheoFlix cursos carregados: ${Object.keys(theoflixCoursesMap).join(', ')}\n`);

  let totalMigrated = 0, totalSkipped = 0, totalErrors = 0;

  if (runAll) {
    const usersSnap = await db.collection('users').get();
    const userIds = [];
    usersSnap.forEach(d => {
      // Só processar usuários que têm theoflixAttendance
      if (d.data()?.journey?.theoflixAttendance) userIds.push(d.id);
    });

    console.log(`👥 ${userIds.length} usuário(s) com theoflixAttendance encontrados.\n`);

    for (const uid of userIds) {
      const result = await migrateUser(uid, theoflixCoursesMap);
      totalMigrated += result.migrated;
      totalSkipped += result.skipped;
      totalErrors += result.errors;
    }
  } else {
    const result = await migrateUser(userIdArg, theoflixCoursesMap);
    totalMigrated += result.migrated;
    totalSkipped += result.skipped;
    totalErrors += result.errors;
  }

  console.log('\n' + '─'.repeat(60));
  console.log(`📊 RESUMO FINAL`);
  console.log(`   ➕ Campos migrados:  ${totalMigrated}`);
  console.log(`   ⏭️  Campos pulados:   ${totalSkipped}`);
  console.log(`   ❌ Erros:            ${totalErrors}`);
  if (isDryRun) {
    console.log('\n🔍 Modo dry-run — nenhum dado foi alterado.');
    console.log('   Para aplicar, rode sem --dry-run.');
  } else {
    console.log('\n✅ Migração concluída!');
  }
}

main().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
