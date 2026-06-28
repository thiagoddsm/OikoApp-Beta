const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
require('dotenv').config();

const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY.trim();
const cleanJson = rawKey.startsWith("'") && rawKey.endsWith("'") ? rawKey.slice(1, -1) : rawKey;
const serviceAccount = JSON.parse(cleanJson);

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function run() {
  // Busca pelo e-mail para obter o ID correto sem falhas de digitação
  const userQuery = await db.collection('users').where('email', '==', 'rowenna_coubelle@hotmail.com').get();
  
  if (userQuery.empty) {
    console.log('Usuário não encontrado por e-mail.');
    return;
  }

  const userDoc = userQuery.docs[0];
  const userId = userDoc.id;
  const userData = userDoc.data();
  console.log('Usuário encontrado! Nome:', userData.name, '| ID:', userId);

  // Lista de vídeos conhecidos do Crescer na raiz
  const crescerVideos = ['KBQodnYuLxc', 'LkOS2dYLdEU', 'VaHA7vbfXNo', 'VaHA7vbfxNo', 'pWl3AMGg4YY', 'zg_tIdSDH5M'];
  const progressToMigrate = {};

  crescerVideos.forEach(vid => {
    const exactKey = Object.keys(userData).find(k => k.toLowerCase() === vid.toLowerCase());
    if (exactKey && userData[exactKey] === true) {
      progressToMigrate[vid] = true;
    }
  });

  console.log('Vídeos para migrar:', progressToMigrate);

  // 1. Atualizar o progresso no local estruturado correto
  const updatePayload = {};
  for (const [vid, val] of Object.entries(progressToMigrate)) {
    updatePayload[`journey.theoflixProgress.crescer.${vid}`] = val;
  }

  if (Object.keys(updatePayload).length > 0) {
    await db.collection('users').doc(userId).update(updatePayload);
    console.log('Progresso estruturado atualizado com sucesso!');
  }

  // 2. Agora vamos marcar a presença no diário de classe da turma
  const classesSnap = await db.collection('classes').get();
  let rowennaClass = null;
  
  classesSnap.forEach(doc => {
    const cls = doc.data();
    if (cls.students?.includes(userId)) {
      rowennaClass = { id: doc.id, ...cls };
    }
  });

  if (!rowennaClass) {
    console.log('Nenhuma turma encontrada para a aluna.');
    return;
  }

  console.log('Turma encontrada:', rowennaClass.name, 'ID:', rowennaClass.id);

  // Vamos carregar o curso físico para ver a ementa
  const courseSnap = await db.collection('courses').doc(rowennaClass.courseId).get();
  if (!courseSnap.exists) {
    console.log('Curso físico não encontrado.');
    return;
  }
  const course = courseSnap.data();
  const syllabus = course.syllabus || [];

  // Mapeamos os episódios assistidos e marcamos as presenças das Aulas 3 e 4 (índices 2 e 3 do syllabus)
  const { parseISO, format, addWeeks } = require('date-fns');
  const items = [];
  if (rowennaClass.startDate) {
    const start = parseISO(rowennaClass.startDate);
    const holidaySet = new Set(rowennaClass.holidayDates || []);
    const overrides = rowennaClass.scheduleOverrides || {};
    
    let currentDate = start;
    let syllabusIndex = 0;
    let safeCounter = 0;
    const targetCount = syllabus.length;

    while (items.length < targetCount && safeCounter < 200) {
      safeCounter++;
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      
      if (holidaySet.has(dateStr) && !overrides[dateStr]) {
        currentDate = addWeeks(currentDate, rowennaClass.frequency === 'quinzenal' ? 2 : 1);
        continue;
      }

      const override = overrides[dateStr];
      if (override?.isCancelled) {
        currentDate = addWeeks(currentDate, rowennaClass.frequency === 'quinzenal' ? 2 : 1);
        continue;
      }

      const originalIdx = override?.syllabusId ? syllabus.findIndex(s => s.id === override.syllabusId) : syllabusIndex;
      items.push({ dateStr, syllabusOriginalIndex: originalIdx });
      
      syllabusIndex++;
      currentDate = addWeeks(currentDate, rowennaClass.frequency === 'quinzenal' ? 2 : 1);
    }
  }

  console.log('Cronograma gerado:', items);

  const attendance = rowennaClass.attendance || [];
  let classUpdated = false;

  const syllabusIndicesToMark = [2, 3]; // Aula 3 (index 2) e Aula 4 (index 3)

  syllabusIndicesToMark.forEach(syllabusIdx => {
    const matchedItem = items.find(i => i.syllabusOriginalIndex === syllabusIdx);
    if (matchedItem) {
      const targetDate = matchedItem.dateStr;
      console.log(`Marcando presença para a Aula index ${syllabusIdx} na data ${targetDate}`);
      
      const recordIdx = attendance.findIndex(a => a.date === targetDate);
      if (recordIdx > -1) {
        const record = attendance[recordIdx];
        if (!record.onlineStudentIds) record.onlineStudentIds = [];
        if (!record.onlineStudentIds.includes(userId)) {
          record.onlineStudentIds.push(userId);
          classUpdated = true;
        }
      } else {
        attendance.push({
          date: targetDate,
          presentStudentIds: [],
          onlineStudentIds: [userId]
        });
        classUpdated = true;
      }
    }
  });

  if (classUpdated) {
    await db.collection('classes').doc(rowennaClass.id).update({ attendance });
    console.log('Presenças da Rowenna adicionadas com sucesso na turma!');
  } else {
    console.log('Presenças já estavam marcadas ou nenhuma correspondência de cronograma.');
  }
}

run().catch(console.error);
