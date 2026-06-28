const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
require('dotenv').config();

const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY.trim();
const cleanJson = rawKey.startsWith("'") && rawKey.endsWith("'") ? rawKey.slice(1, -1) : rawKey;
const serviceAccount = JSON.parse(cleanJson);

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// Vídeos do Crescer no Theoflix
const crescerVideos = ['KBQodnYuLxc', 'LkOS2dYLdEU', 'VaHA7vbfXNo', 'VaHA7vbfxNo', 'pWl3AMGg4YY', 'zg_tIdSDH5M'];

async function run() {
  const usersSnap = await db.collection('users').get();
  console.log(`Analisando ${usersSnap.size} usuários no Firestore...`);

  const classesSnap = await db.collection('classes').get();
  const classes = classesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const coursesSnap = await db.collection('courses').get();
  const courses = coursesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const { parseISO, format, addWeeks } = require('date-fns');

  let migratedUsersCount = 0;
  let updatedClassesCount = 0;

  for (const userDoc of usersSnap.docs) {
    const userId = userDoc.id;
    const userData = userDoc.data();
    const progressToMigrate = {};

    crescerVideos.forEach(vid => {
      const exactKey = Object.keys(userData).find(k => k.toLowerCase() === vid.toLowerCase());
      if (exactKey && userData[exactKey] === true) {
        progressToMigrate[vid] = true;
      }
    });

    if (Object.keys(progressToMigrate).length === 0) {
      continue;
    }

    console.log(`\nUsuário com progresso antigo encontrado: ${userData.name || userId}`);
    console.log('Vídeos:', Object.keys(progressToMigrate));

    // 1. Migrar para a estrutura correta
    const updatePayload = {};
    for (const [vid, val] of Object.entries(progressToMigrate)) {
      updatePayload[`journey.theoflixProgress.crescer.${vid}`] = val;
    }

    await db.collection('users').doc(userId).update(updatePayload);
    migratedUsersCount++;
    console.log('-> Progresso migrado com sucesso!');

    // 2. Procurar turmas deste usuário associadas ao curso Crescer
    const userClasses = classes.filter(cls => cls.students?.includes(userId));

    for (const cls of userClasses) {
      const course = courses.find(c => c.id === cls.courseId);
      if (!course || !course.name?.toLowerCase().includes('crescer')) {
        continue;
      }

      console.log(`-> Atualizando presenças na turma "${cls.name}" (ID: ${cls.id})`);
      const syllabus = course.syllabus || [];
      const items = [];

      if (cls.startDate) {
        const start = parseISO(cls.startDate);
        const holidaySet = new Set(cls.holidayDates || []);
        const overrides = cls.scheduleOverrides || {};
        
        let currentDate = start;
        let syllabusIndex = 0;
        let safeCounter = 0;
        const targetCount = syllabus.length;

        while (items.length < targetCount && safeCounter < 200) {
          safeCounter++;
          const dateStr = format(currentDate, 'yyyy-MM-dd');
          
          if (holidaySet.has(dateStr) && !overrides[dateStr]) {
            currentDate = addWeeks(currentDate, cls.frequency === 'quinzenal' ? 2 : 1);
            continue;
          }

          const override = overrides[dateStr];
          if (override?.isCancelled) {
            currentDate = addWeeks(currentDate, cls.frequency === 'quinzenal' ? 2 : 1);
            continue;
          }

          const originalIdx = override?.syllabusId ? syllabus.findIndex(s => s.id === override.syllabusId) : syllabusIndex;
          items.push({ dateStr, syllabusOriginalIndex: originalIdx });
          
          syllabusIndex++;
          currentDate = addWeeks(currentDate, cls.frequency === 'quinzenal' ? 2 : 1);
        }
      }

      // Vamos atualizar a presença para os módulos que possuem vídeos assistidos
      // Ementa do Crescer e seus vídeos correspondentes (índices):
      // Aula 1 (index 0) -> vídeo 0 ('KBQodnYuLxc')
      // Aula 2 (index 1) -> vídeos 1 ('LkOS2dYLdEU') e 2 ('VaHA7vbfXNo'/'VaHA7vbfxNo')
      // Aula 3 (index 2) -> vídeo 3 ('pWl3AMGg4YY')
      // Aula 4 (index 3) -> vídeo 4 ('zg_tIdSDH5M')
      
      const syllabusMapping = [
        { syllabusIdx: 0, requiredVids: ['KBQodnYuLxc'] },
        { syllabusIdx: 1, requiredVids: ['LkOS2dYLdEU', 'VaHA7vbfXNo', 'VaHA7vbfxNo'] },
        { syllabusIdx: 2, requiredVids: ['pWl3AMGg4YY'] },
        { syllabusIdx: 3, requiredVids: ['zg_tIdSDH5M'] }
      ];

      // Pegamos o progresso completo dele agora
      const fullProgress = {
        ...progressToMigrate,
        ...(userData.journey?.theoflixProgress?.crescer || {})
      };

      const finalAttendance = cls.attendance || [];
      let classUpdated = false;

      syllabusMapping.forEach(({ syllabusIdx, requiredVids }) => {
        // Para a Aula 2, exige ambos os vídeos 1 e 2
        let hasWatchedAll = false;
        if (syllabusIdx === 1) {
          const hasVid1 = fullProgress['LkOS2dYLdEU'];
          const hasVid2 = fullProgress['VaHA7vbfXNo'] || fullProgress['VaHA7vbfxNo'];
          hasWatchedAll = !!(hasVid1 && hasVid2);
        } else {
          hasWatchedAll = requiredVids.some(vid => fullProgress[vid] === true);
        }

        if (hasWatchedAll) {
          const matchedItem = items.find(i => i.syllabusOriginalIndex === syllabusIdx);
          if (matchedItem) {
            const targetDate = matchedItem.dateStr;
            const recordIdx = finalAttendance.findIndex(a => a.date === targetDate);

            if (recordIdx > -1) {
              const record = finalAttendance[recordIdx];
              if (!record.onlineStudentIds) record.onlineStudentIds = [];
              if (!record.onlineStudentIds.includes(userId)) {
                record.onlineStudentIds.push(userId);
                classUpdated = true;
              }
            } else {
              finalAttendance.push({
                date: targetDate,
                presentStudentIds: [],
                onlineStudentIds: [userId]
              });
              classUpdated = true;
            }
          }
        }
      });

      if (classUpdated) {
        await db.collection('classes').doc(cls.id).update({ attendance: finalAttendance });
        updatedClassesCount++;
        console.log('  -> Presenças do Theoflix sincronizadas na turma!');
      }
    }
  }

  console.log('\n=== MIGRACAO CONCLUIDA ===');
  console.log(`Total de usuários migrados: ${migratedUsersCount}`);
  console.log(`Total de turmas atualizadas: ${updatedClassesCount}`);
}

run().catch(console.error);
