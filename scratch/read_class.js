// Executar com: node scratch/read_class.js
require('dotenv').config();
const admin = require('firebase-admin');

const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
let app;
try {
  if (serviceAccountKey) {
    let cleanKey = serviceAccountKey.trim();
    if (cleanKey.startsWith("'") && cleanKey.endsWith("'")) {
      cleanKey = cleanKey.slice(1, -1);
    }
    const sa = JSON.parse(cleanKey);
    app = admin.initializeApp({
      credential: admin.credential.cert(sa),
      projectId: sa.project_id || 'studio-1424813022-71754'
    });
  } else {
    app = admin.initializeApp({
      projectId: 'studio-1424813022-71754',
      credential: admin.credential.applicationDefault()
    });
  }
} catch (e) {
  console.error("Firebase Admin initialization error:", e);
}

const db = admin.firestore();

async function run() {
  const classId = 'BrlTKwGAGLUT7xJ4usG5';
  const snap = await db.collection('classes').doc(classId).get();
  if (!snap.exists) {
    console.log(`Class ${classId} not found.`);
    return;
  }
  const data = snap.data();
  console.log('=== Class Data ===');
  console.log('Nome:', data.name || data.courseId);
  console.log('StartDate:', data.startDate);
  console.log('EndDate:', data.endDate);
  console.log('Frequency:', data.frequency);
  console.log('HolidayDates:', data.holidayDates);
  console.log('ScheduleOverrides:', data.scheduleOverrides);
  console.log('ExtraSessions:', data.extraSessions);
  console.log('Membros/Alunos count:', data.students ? data.students.length : 0);
  console.log('Attendance Records Count:', data.attendance ? data.attendance.length : 0);
  if (data.attendance) {
    console.log('Attendance dates:');
    data.attendance.forEach((att, idx) => {
      console.log(`  [${idx}] Date: ${att.date}, Status count: ${att.status ? Object.keys(att.status).length : 0}`);
    });
  }
}

run().catch(console.error);
