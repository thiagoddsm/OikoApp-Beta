const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, collection, getDocs } = require('firebase/firestore');
const { parseISO, format, addWeeks, addMonths } = require('date-fns');

const firebaseConfig = {
  "projectId": "studio-1424813022-71754",
  "appId": "1:989586605112:web:66250f4d31e88166a212cd",
  "storageBucket": "studio-1424813022-71754.firebasestorage.app",
  "apiKey": "AIzaSyAOSAJ0WPPXAxbSMtiq7UZxkjzE6vizVq8",
  "authDomain": "studio-1424813022-71754.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "989586605112"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Project schedule logic to map date to syllabus index
function projectSchedule(cls, syllabus) {
    const items = [];
    if (cls && cls.startDate) {
        const start = parseISO(cls.startDate);
        const end = cls.endDate ? parseISO(cls.endDate) : addMonths(start, 2);
        const holidaySet = new Set(cls.holidayDates || []);
        const overrides = cls.scheduleOverrides || {};
        
        let currentDate = start;
        let syllabusIndex = 0;
        let safeCounter = 0;
        const targetCount = syllabus.length > 0 ? syllabus.length : 12;

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

        Object.entries(overrides).forEach(([dateStr, override]) => {
            if (override.isCancelled) return;
            if (items.find(i => i.dateStr === dateStr)) return;
            const originalIdx = override.syllabusId ? syllabus.findIndex(s => s.id === override.syllabusId) : -1;
            items.push({ dateStr, syllabusOriginalIndex: originalIdx });
        });

        const extraSessions = cls.extraSessions || [];
        extraSessions.forEach((session) => {
            if (items.find(i => i.dateStr === session.date)) return;
            const originalIdx = session.syllabusId ? syllabus.findIndex(s => s.id === session.syllabusId) : -1;
            items.push({ dateStr: session.date, syllabusOriginalIndex: originalIdx });
        });
        
        items.sort((a, b) => a.dateStr.localeCompare(b.dateStr));
    }
    return items;
}

async function run() {
  const classId = "3ldwgQCatfHShpF1YKsn";
  const courseId = "QehPgdTXhe0veTW4Xf3J"; // Pertencer
  
  const [classSnap, courseSnap] = await Promise.all([
      getDoc(doc(db, 'classes', classId)),
      getDoc(doc(db, 'courses', courseId))
  ]);

  const cls = { id: classSnap.id, ...classSnap.data() };
  const course = { id: courseSnap.id, ...courseSnap.data() };

  console.log("Class name:", cls.name);
  console.log("Course name:", course.name);
  
  const syllabus = course.syllabus || [];
  console.log("Syllabus length:", syllabus.length);

  const schedule = projectSchedule(cls, syllabus);
  console.log("Projected schedule:");
  console.log(schedule);

  console.log("Attendance records:");
  cls.attendance.forEach(att => {
      console.log(`- Date: ${att.date}`);
      console.log(`  onlineStudentIds:`, att.onlineStudentIds);
      const dateOnly = att.date.split('T')[0];
      const matched = schedule.find(item => item.dateStr === dateOnly);
      console.log(`  Matched in schedule:`, matched);
      if (matched) {
          const mod = syllabus[matched.syllabusOriginalIndex];
          console.log(`  Module title:`, mod ? mod.title : "None");
          console.log(`  theoflixCourseId:`, mod ? mod.theoflixCourseId : "None");
          console.log(`  requiredVideoIds:`, mod ? mod.requiredVideoIds : "None");
      }
  });
}

run().catch(console.error);
