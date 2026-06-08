const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, getDocs, updateDoc, collection, query, where, Timestamp } = require('firebase/firestore');
const { getAuth, signInAnonymously } = require('firebase/auth');

const firebaseConfig = {
  "projectId": "studio-1424813022-71754",
  "appId": "1:989586605112:web:66250f4d31e88166a212cd",
  "storageBucket": "studio-1424813022-71754.firebasestorage.app",
  "apiKey": "AIzaSyAOSAJ0WPPXAxbSMtiq7UZxkjzE6vizVq8",
  "authDomain": "studio-1424813022-71754.firebaseapp.com",
  "messagingSenderId": "989586605112"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function run() {
  await signInAnonymously(auth);
  console.log("Authenticated anonymously.");

  const classId = "ET3AxGzPKYVWootYAYbe"; // Junho de 2026
  const classRef = doc(db, 'classes', classId);
  const classSnap = await getDoc(classRef);
  if (!classSnap.exists()) {
    console.error("Class not found!");
    return;
  }
  const classData = classSnap.data();

  // 1. Corrigir data no array de attendance da classe (de 2026-06-14 para 2026-06-07)
  const attendance = classData.attendance || [];
  let updated = false;
  const newAttendance = attendance.map(a => {
    if (a.date === '2026-06-14') {
      updated = true;
      return {
        ...a,
        date: '2026-06-07'
      };
    }
    return a;
  });

  if (updated) {
    await updateDoc(classRef, { attendance: newAttendance });
    console.log("Updated class attendance array date to 2026-06-07.");
  } else {
    console.log("No attendance record found for 2026-06-14 in class.");
  }

  // 2. Corrigir os registros de logs pedagógicos (pedagogical_logs)
  const logsQuery = query(collection(db, 'pedagogical_logs'), where('classId', '==', classId), where('dateStr', '==', '2026-06-14'));
  const logsSnap = await getDocs(logsQuery);
  console.log(`Found ${logsSnap.size} pedagogical logs to fix.`);
  for (const d of logsSnap.docs) {
    const logRef = doc(db, 'pedagogical_logs', d.id);
    await updateDoc(logRef, {
      dateStr: '2026-06-07',
      date: Timestamp.fromDate(new Date('2026-06-07T12:00:00')),
      content_taught: 'Aula 1: A Importância de Pertencer' // Nome padrão da Aula 1 do Pertencer
    });
    console.log(`Updated pedagogical log ${d.id} date to 2026-06-07.`);
  }

  // 3. Corrigir o progresso dos alunos no perfil (remover module2 e colocar module1)
  const students = classData.students || [];
  // Alunos que de fato estavam presentes na chamada do dia 14/06 (agora 07/06)
  const targetRecord = attendance.find(a => a.date === '2026-06-14');
  const presentStudentIds = targetRecord ? (targetRecord.presentStudentIds || []) : [];

  console.log(`Reconciling progress for ${students.length} students...`);
  for (const sId of students) {
    const userRef = doc(db, 'users', sId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) continue;
    const userData = userSnap.data();

    const currentProgress = userData.journey?.memberCourseProgress || {};
    
    // Se o aluno estava presente, ele concluiu a Aula 1 (module1) e NÃO a Aula 2 (module2)
    const isPresent = presentStudentIds.includes(sId);
    
    await updateDoc(userRef, {
      'journey.memberCourseProgress.module1': isPresent ? true : (currentProgress.module1 || false),
      'journey.memberCourseProgress.module2': false // Como eles não fizeram a Aula 2 ainda, definimos como false
    });
    console.log(`Updated student ${userData.name} progress: module1 = ${isPresent}, module2 = false`);
  }

  console.log("Reconciliation finished successfully.");
}

run().catch(console.error);
