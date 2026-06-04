/**
 * reconcile_attendance.js
 * 
 * Faz uma varredura em todos os usuarios que assistiram videos no TheoFlix
 * e retroativamente corrige/adiciona os registros de presença online nas turmas fisicas.
 * 
 * Uso (dry-run - só mostra o que faria):
 *   node scratch/reconcile_attendance.js
 * 
 * Uso (aplicar mudanças):
 *   $env:APPLY_CHANGES="true"; node scratch/reconcile_attendance.js
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc, getDoc } = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
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

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const APPLY_CHANGES = process.env.APPLY_CHANGES === 'true';

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Set: $env:ADMIN_EMAIL="..." $env:ADMIN_PASSWORD="..." before running');
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

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
  console.log(`=== TheoFlix Attendance Reconciliation ===`);
  console.log(`Mode: ${APPLY_CHANGES ? '🔴 LIVE (will write to DB)' : '🟡 DRY RUN (read-only)'}\n`);

  await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
  console.log('✅ Signed in!\n');

  const [coursesSnap, classesSnap, usersSnap] = await Promise.all([
    getDocs(collection(db, 'courses')),
    getDocs(collection(db, 'classes')),
    getDocs(collection(db, 'users'))
  ]);

  const courses = coursesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const classes = classesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  console.log(`Loaded: ${courses.length} courses, ${classes.length} classes, ${users.length} users\n`);

  // Build course map
  const courseMap = new Map(courses.map(c => [c.id, c]));

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

        // Determine episode index (epKey is the youtubeId; we need to map back to index)
        // The theoflixProgress uses youtubeId as key, but theoflixRequiredVideoIds uses episode index strings.
        // Let's try both: first as index string, then we look at what the Pertencer does.
        // Looking at the data: keys are like "svl2BkLODnc", "nMCQ316WYaU" (youtubeIds), not indexes.
        // But the markAttendanceByTheoflix is called with episodeIndex (numeric), and stores youtubeId as key.
        // The theoflixRequiredVideoIds stores numeric index strings like "7", "8", "9"...
        // So for reconciliation, we need to match youtubeId back to its index in the TheoFlix course.
        // We'll handle this below.
        
        for (const cls of relevantClasses) {
          const physicalCourse = linkedCourses.find(c => c.id === cls.courseId);
          const syllabus = physicalCourse?.syllabus || [];

          // Find syllabus module where this episode (by youtubeId) is required
          // theoflixRequiredVideoIds uses numeric string indexes ("7", "8", etc.)
          // We need to match epKey (which is a youtubeId like "A0F1ARYje-o") to an episode index
          // Since we need the TheoFlix course data for this, we check the indexes
          
          // Try numeric index: if epKey is a numeric string (old format)
          let lessonIndex = -1;
          if (/^\d+$/.test(epKey)) {
            // Old format: stored as numeric index
            lessonIndex = syllabus.findIndex(s =>
              s.theoflixCourseId === theoflixCourseId &&
              Array.isArray(s.theoflixRequiredVideoIds) &&
              s.theoflixRequiredVideoIds.includes(epKey)
            );
          }

          // The youtubeId format requires knowing the episode list to get the index
          // For the `membros` course, episodes are:
          //   [0] 2ZGClOxUXM4, [1] uCZBmhqIo1c, [2] h7TeEQOcuUo, [3] 0_TaQe_OmgQ, [4] TL6Xd8VYgHw, [5] svl2BkLODnc
          //   [6] nMCQ316WYaU, [7] A0F1ARYje-o, [8] Y4JCdKPVEpQ, [9] 3CL5LKIS2dE, [10] 8DcJ_Qci7QY, [11] fQgsFloY5BA, [12] j242ylV9iEo
          // For the `crescer` course, episodes are:
          //   [0] KBQOdnYuLxc, [1] LkOS2dYLdEU, [2] VaHA7vbfxNo, [3] pWl3AMgG4YY, [4] zg_tIdSDH5M
          // For the `cuidar` course, episodes are:
          //   [0] 48ZcWTvblKk, [1] cR_pj7L-_GU, [2] alhx4jOv0c4, [3] BU5i2fQLC3o, [4] wWDuU6sXV2Q
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

              // Fallback for direct-ID linked courses
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
        const classRef = doc(db, 'classes', cls.id);
        await updateDoc(classRef, { attendance: newAttendance });
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
