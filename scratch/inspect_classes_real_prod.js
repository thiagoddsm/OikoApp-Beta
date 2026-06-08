require('dotenv').config();
const admin = require('firebase-admin');

const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
let app;
if (serviceAccountKey) {
  let cleanKey = serviceAccountKey.trim();
  if (cleanKey.startsWith("'") && cleanKey.endsWith("'")) {
    cleanKey = cleanKey.slice(1, -1);
  }
  const sa = JSON.parse(cleanKey);
  app = admin.initializeApp({
    credential: admin.credential.cert(sa),
    projectId: sa.project_id
  }, 'prod');
} else {
  app = admin.initializeApp({
    projectId: 'studio-8044285263-a0cc3',
    credential: admin.credential.applicationDefault()
  }, 'prod');
}

const db = admin.firestore(app);

async function run() {
  const classIds = ["FDgRLyPbBEVdHM8cJKN1", "3ldwgQCatfHShpF1YKsn"];
  
  for (const classId of classIds) {
    const snap = await db.collection('classes').doc(classId).get();
    if (!snap.exists) {
      console.log(`Class ${classId} not found in prod.`);
      continue;
    }
    const cls = snap.data();
    console.log(`\n================= CLASS: ${cls.name} (${classId}) =================`);
    console.log(`StartDate: ${cls.startDate}`);
    console.log(`EndDate: ${cls.endDate}`);
    console.log(`Frequency: ${cls.frequency}`);
    console.log(`HolidayDates:`, cls.holidayDates);
    console.log(`ScheduleOverrides:`, JSON.stringify(cls.scheduleOverrides, null, 2));
    console.log(`ExtraSessions:`, JSON.stringify(cls.extraSessions, null, 2));
    console.log(`Attendance dates in DB:`, (cls.attendance || []).map(a => a.date).sort());
  }
}

run().catch(console.error);
