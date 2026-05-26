const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const { parseISO, format, addWeeks, isBefore, addMonths } = require('date-fns');

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
  console.log("Fetching courses, classes, and users...");
  const [coursesSnap, classesSnap, usersSnap] = await Promise.all([
    getDocs(collection(db, 'courses')),
    getDocs(collection(db, 'classes')),
    getDocs(collection(db, 'users'))
  ]);

  const courses = coursesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const classes = classesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const userMap = new Map(users.map(u => [u.id, u]));
  const courseMap = new Map(courses.map(c => [c.id, c]));

  console.log(`Loaded ${courses.length} courses, ${classes.length} classes, and ${users.length} users.`);

  let totalInconsistencies = 0;

  for (const cls of classes) {
      const course = courseMap.get(cls.courseId);
      if (!course) {
          console.log(`[WARNING] Class ${cls.id} (${cls.name}) has no course linked!`);
          continue;
      }
      
      const syllabus = course.syllabus || [];
      const schedule = projectSchedule(cls, syllabus);

      if (!cls.attendance) continue;

      for (const att of cls.attendance) {
          if (!att.onlineStudentIds || att.onlineStudentIds.length === 0) continue;

          // Find syllabus module for this date
          const dateOnly = att.date.split('T')[0];
          const matchedItem = schedule.find(item => item.dateStr === dateOnly);
          
          if (!matchedItem) {
              console.log(`[INCONSISTENCY] Class: ${cls.name} (${course.name}) | Date: ${att.date}`);
              console.log(`  No matching syllabus date found in schedule!`);
              console.log(`  Students marked: ${att.onlineStudentIds.map(id => userMap.get(id)?.name || id).join(', ')}`);
              totalInconsistencies++;
              continue;
          }

          const syllabusIdx = matchedItem.syllabusOriginalIndex;
          const module = syllabus[syllabusIdx];

          if (!module) {
              console.log(`[INCONSISTENCY] Class: ${cls.name} (${course.name}) | Date: ${att.date}`);
              console.log(`  Syllabus index ${syllabusIdx} is out of bounds (Syllabus length: ${syllabus.length})!`);
              console.log(`  Students marked: ${att.onlineStudentIds.map(id => userMap.get(id)?.name || id).join(', ')}`);
              totalInconsistencies++;
              continue;
          }

          // Check if this module is linked to TheoFlix
          const isLinkedToTheoflix = module.theoflixCourseId && module.theoflixRequiredVideoIds && module.theoflixRequiredVideoIds.length > 0;
          
          // Also check if course itself is linked
          const isCourseLinked = course.linkedTheoflixId || course.id === 'membros' || course.id === 'crescer' || course.id === 'cuidar' || course.id === 'imersao';

          if (!isLinkedToTheoflix && !isCourseLinked) {
              console.log(`[INCONSISTENCY] Class: ${cls.name} (${course.name}) | Date: ${att.date} | Module: "${module.title}" (Index ${syllabusIdx})`);
              console.log(`  Module is NOT linked to TheoFlix, and course itself is not linked!`);
              console.log(`  Students marked: ${att.onlineStudentIds.map(id => userMap.get(id)?.name || id).join(', ')}`);
              totalInconsistencies++;
          } else if (!isLinkedToTheoflix && isCourseLinked) {
              console.log(`[INFO] Class: ${cls.name} (${course.name}) | Date: ${att.date} | Module: "${module.title}" (Index ${syllabusIdx})`);
              console.log(`  Module has no explicit TheoFlix link, but course is linked. Falling back to index-based mapping.`);
              console.log(`  Students marked: ${att.onlineStudentIds.map(id => userMap.get(id)?.name || id).join(', ')}`);
          }
      }
  }

  console.log(`\nScan completed. Total inconsistencies found: ${totalInconsistencies}`);
}

run().catch(console.error);
