const dotenv = require('dotenv');
dotenv.config();

const admin = require('firebase-admin');
const { parseISO, format, addWeeks, addMonths } = require('date-fns');

const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!serviceAccountKey) {
  console.error("FIREBASE_SERVICE_ACCOUNT_KEY not found in .env");
  process.exit(1);
}

let sa;
try {
  let cleanKey = serviceAccountKey.trim();
  if (cleanKey.startsWith("'") && cleanKey.endsWith("'")) {
    cleanKey = cleanKey.slice(1, -1);
  }
  sa = JSON.parse(cleanKey);
} catch (e) {
  console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:", e.message);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(sa),
  projectId: sa.project_id
});

const db = admin.firestore();
const APPLY_CHANGES = process.env.APPLY_CHANGES === 'true';

// Projects class schedule and returns the calendar date for a given syllabus index
function projectLessonDate(cls, syllabusIndex, syllabus) {
  if (!cls.startDate) return null;

  const overrides = cls.scheduleOverrides || {};
  const holidaySet = new Set(cls.holidayDates || []);
  const start = parseISO(cls.startDate);
  const end = cls.endDate ? parseISO(cls.endDate) : addMonths(start, 6);

  // Check extra sessions for this specific syllabus module
  const syllabusId = syllabus[syllabusIndex]?.id;
  if (syllabusId) {
    const extra = (cls.extraSessions || []).find(s => s.syllabusId === syllabusId);
    if (extra) return extra.date;

    // Check schedule overrides for a date that points to this syllabus item
    const overrideEntry = Object.entries(overrides).find(([, ov]) => ov.syllabusId === syllabusId && !ov.isCancelled);
    if (overrideEntry) return overrideEntry[0];
  }

  // Walk the weekly schedule
  if (cls.frequency && cls.frequency !== 'pontual') {
    let current = start;
    let currentIndex = 0;
    let safe = 0;

    while (safe++ < 300) {
      if (current > end) break;
      const dStr = format(current, 'yyyy-MM-dd');
      const ov = overrides[dStr];

      // Skip holidays without override
      if (holidaySet.has(dStr) && !ov) {
        current = addWeeks(current, cls.frequency === 'quinzenal' ? 2 : 1);
        continue;
      }
      // Skip cancelled sessions
      if (ov?.isCancelled) {
        current = addWeeks(current, cls.frequency === 'quinzenal' ? 2 : 1);
        continue;
      }

      const effectiveIndex = ov?.syllabusId
        ? syllabus.findIndex(s => s.id === ov.syllabusId) ?? currentIndex
        : currentIndex;

      if (effectiveIndex === syllabusIndex) return dStr;

      currentIndex++;
      current = addWeeks(current, cls.frequency === 'quinzenal' ? 2 : 1);
    }
  } else {
    return syllabusIndex === 0 ? format(start, 'yyyy-MM-dd') : null;
  }

  return null;
}

async function run() {
  console.log(`=== TheoFlix Attendance Reconciliation (Admin SDK) ===`);
  console.log(`Mode: ${APPLY_CHANGES ? '🔴 LIVE (will write to DB)' : '🟡 DRY RUN (read-only)'}\n`);

  // Load all data
  const [coursesSnap, classesSnap, usersSnap] = await Promise.all([
    db.collection('courses').get(),
    db.collection('classes').get(),
    db.collection('users').get()
  ]);

  const courses = [];
  coursesSnap.forEach(d => courses.push({ id: d.id, ...d.data() }));
  
  const classes = [];
  classesSnap.forEach(d => classes.push({ id: d.id, ...d.data() }));
  
  const users = [];
  usersSnap.forEach(d => users.push({ id: d.id, ...d.data() }));

  console.log(`Loaded: ${courses.length} courses, ${classes.length} classes, ${users.length} users\n`);

  let totalFixes = 0;
  const classAttendanceUpdates = new Map(); // classId -> newAttendance array

  // Initialize attendance maps from existing data
  classes.forEach(cls => {
    classAttendanceUpdates.set(cls.id, JSON.parse(JSON.stringify(cls.attendance || [])));
  });

  for (const user of users) {
    const theoflixProgress = user.journey?.theoflixProgress;
    if (!theoflixProgress) continue;

    for (const [theoflixCourseId, episodeProgress] of Object.entries(theoflixProgress)) {
      if (!episodeProgress || typeof episodeProgress !== 'object') continue;

      // Find physical courses linked to this TheoFlix course
      const linkedCourses = courses.filter(c =>
        c.id === theoflixCourseId ||
        c.linkedTheoflixId === theoflixCourseId ||
        c.syllabus?.some(s => s.theoflixCourseId === theoflixCourseId)
      );

      if (linkedCourses.length === 0) continue;

      // Find classes where this user is enrolled
      const linkedCourseIds = linkedCourses.map(c => c.id);
      const relevantClasses = classes.filter(c =>
        linkedCourseIds.includes(c.courseId) && (c.students || []).includes(user.id)
      );

      if (relevantClasses.length === 0) continue;

      // Process each watched episode
      for (const [epKey, watched] of Object.entries(episodeProgress)) {
        if (!watched) continue;

        for (const cls of relevantClasses) {
          const physicalCourse = linkedCourses.find(c => c.id === cls.courseId);
          const syllabus = physicalCourse?.syllabus || [];

          // Try numeric index first
          let lessonIndex = -1;
          if (/^\d+$/.test(epKey)) {
            lessonIndex = syllabus.findIndex(s =>
              s.theoflixCourseId === theoflixCourseId &&
              Array.isArray(s.theoflixRequiredVideoIds) &&
              s.theoflixRequiredVideoIds.includes(epKey)
            );
          }

          const EPISODE_INDEX_MAP = {
            'membros': { '2ZGClOxUXM4': 0, 'uCZBmhqIo1c': 1, 'h7TeEQOcuUo': 2, '0_TaQe_OmgQ': 3, 'TL6Xd8VYgHw': 4, 'svl2BkLODnc': 5, 'nMCQ316WYaU': 6, 'A0F1ARYje-o': 7, 'Y4JCdKPVEpQ': 8, '3CL5LKIS2dE': 9, '8DcJ_Qci7QY': 10, 'fQgsFloY5BA': 11, 'j242ylV9iEo': 12 },
            'crescer': { 'KBQOdnYuLxc': 0, 'LkOS2dYLdEU': 1, 'VaHA7vbfxNo': 2, 'pWl3AMgG4YY': 3, 'zg_tIdSDH5M': 4 },
            'cuidar': { '48ZcWTvblKk': 0, 'cR_pj7L-_GU': 1, 'alhx4jOv0c4': 2, 'BU5i2fQLC3o': 3, 'wWDuU6sXV2Q': 4 },
            'imersao': { 'dQw4w9WgXcQ': 0 }
          };

          if (lessonIndex === -1) {
            const epIndexMap = EPISODE_INDEX_MAP[theoflixCourseId];
            if (epIndexMap && epKey in epIndexMap) {
              const episodeIndex = epIndexMap[epKey];
              const episodeIndexStr = episodeIndex.toString();

              lessonIndex = syllabus.findIndex(s =>
                s.theoflixCourseId === theoflixCourseId &&
                Array.isArray(s.theoflixRequiredVideoIds) &&
                s.theoflixRequiredVideoIds.includes(episodeIndexStr)
              );

              if (lessonIndex === -1 && (physicalCourse?.id === theoflixCourseId || physicalCourse?.linkedTheoflixId === theoflixCourseId)) {
                lessonIndex = episodeIndex;
              }
            }
          }

          if (lessonIndex === -1) continue;

          const lessonDate = projectLessonDate(cls, lessonIndex, syllabus);
          if (!lessonDate) continue;

          // Check if already in onlineStudentIds
          const currentAttendance = classAttendanceUpdates.get(cls.id) || [];
          const existingRecordIdx = currentAttendance.findIndex(r => r.date === lessonDate);

          let alreadyMarked = false;
          if (existingRecordIdx !== -1) {
            alreadyMarked = (currentAttendance[existingRecordIdx].onlineStudentIds || []).includes(user.id);
          }

          if (!alreadyMarked) {
            totalFixes++;
            console.log(`[FIX] User: ${user.name || user.id} | Course: ${physicalCourse?.name} | Lesson[${lessonIndex}] | Date: ${lessonDate} | Video: ${epKey}`);

            if (APPLY_CHANGES) {
              const newAttendance = [...currentAttendance];
              if (existingRecordIdx !== -1) {
                const record = newAttendance[existingRecordIdx];
                newAttendance[existingRecordIdx] = {
                  ...record,
                  onlineStudentIds: [...(record.onlineStudentIds || []), user.id],
                  lessonNotes: {
                    ...(record.lessonNotes || {}),
                    [user.id]: 'Presença computada via TheoFlix (reconciliação histórica)'
                  }
                };
              } else {
                newAttendance.push({
                  date: lessonDate,
                  presentStudentIds: [],
                  onlineStudentIds: [user.id],
                  lessonNotes: {
                    [user.id]: 'Presença computada via TheoFlix (reconciliação histórica)'
                  }
                });
              }
              classAttendanceUpdates.set(cls.id, newAttendance);
            }
          }
        }
      }
    }
  }

  console.log(`\n===== SUMMARY =====`);
  console.log(`Total records to fix: ${totalFixes}`);

  if (APPLY_CHANGES && totalFixes > 0) {
    console.log('\nWriting updates to Firestore...');
    let written = 0;
    for (const cls of classes) {
      const newAttendance = classAttendanceUpdates.get(cls.id);
      const oldStr = JSON.stringify(cls.attendance || []);
      const newStr = JSON.stringify(newAttendance);
      if (oldStr !== newStr) {
        const classRef = db.collection('classes').doc(cls.id);
        await classRef.update({ attendance: newAttendance });
        console.log(`  ✅ Updated class: ${cls.name || cls.id}`);
        written++;
      }
    }
    console.log(`\n🎉 Done! Updated ${written} class documents.`);
  } else if (!APPLY_CHANGES) {
    console.log('\nRun with $env:APPLY_CHANGES="true" to apply changes.');
  }

  process.exit(0);
}

run().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
