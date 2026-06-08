const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');
const { parseISO, format, addWeeks, addMonths } = require('date-fns');

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

async function run() {
  const classIds = ["FDgRLyPbBEVdHM8cJKN1", "3ldwgQCatfHShpF1YKsn"];
  
  for (const classId of classIds) {
    const snap = await getDoc(doc(db, 'classes', classId));
    if (!snap.exists()) {
      console.log(`Class ${classId} not found`);
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
