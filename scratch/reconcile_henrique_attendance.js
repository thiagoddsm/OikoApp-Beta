const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { parseISO, format, addWeeks, addMonths } = require('date-fns');
require('dotenv').config({ path: '.env' });

const EPISODE_INDEX_MAP = {
  'membros': { '2ZGClOxUXM4': 0, 'uCZBmhqIo1c': 1, 'h7TeEQOcuUo': 2, '0_TaQe_OmgQ': 3, 'TL6Xd8VYgHw': 4, 'svl2BkLODnc': 5, 'nMCQ316WYaU': 6, 'A0F1ARYje-o': 7, 'Y4JCdKPVEpQ': 8, '3CL5LKIS2dE': 9, '8DcJ_Qci7QY': 10, 'fQgsFloY5BA': 11, 'j242ylV9iEo': 12 },
  'crescer': { 'KBQOdnYuLxc': 0, 'LkOS2dYLdEU': 1, 'VaHA7vbfxNo': 2, 'pWl3AMgG4YY': 3, 'zg_tIdSDH5M': 4 },
  'cuidar': { '48ZcWTvblKk': 0, 'cR_pj7L-_GU': 1, 'alhx4jOv0c4': 2, 'BU5i2fQLC3o': 3, 'wWDuU6sXV2Q': 4 },
  'imersao': { 'dQw4w9WgXcQ': 0 }
};

function projectLessonDate(cls, syllabusIndex, syllabus) {
  if (!cls.startDate) return null;
  const overrides = cls.scheduleOverrides || {};
  const holidaySet = new Set(cls.holidayDates || []);
  const start = parseISO(cls.startDate);
  const end = cls.endDate ? parseISO(cls.endDate) : addMonths(start, 6);

  const syllabusId = syllabus[syllabusIndex]?.id;
  if (syllabusId) {
    const extra = (cls.extraSessions || []).find((s) => s.syllabusId === syllabusId);
    if (extra) return extra.date;
    const overrideEntry = Object.entries(overrides).find(([, ov]) => ov.syllabusId === syllabusId && !ov.isCancelled);
    if (overrideEntry) return overrideEntry[0];
  }

  if (cls.frequency && cls.frequency !== 'pontual') {
    let current = start;
    let currentIndex = 0;
    let safe = 0;
    while (safe++ < 300) {
      if (current > end) break;
      const dStr = format(current, 'yyyy-MM-dd');
      const ov = overrides[dStr];
      if (holidaySet.has(dStr) && !ov) {
        current = addWeeks(current, cls.frequency === 'quinzenal' ? 2 : 1);
        continue;
      }
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

async function reconcileHenrique() {
  const saKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!saKey) {
    console.error('FIREBASE_SERVICE_ACCOUNT_KEY is not defined in .env');
    process.exit(1);
  }

  const sa = JSON.parse(saKey);
  console.log(`Connecting to project: ${sa.project_id}`);

  let app;
  if (!getApps().length) {
    app = initializeApp({ credential: cert(sa) });
  } else {
    app = getApps()[0];
  }

  const db = getFirestore(app);
  const henriqueUid = 'X0DGGWIn2oUOHlASByEAdn2KCc43';

  console.log('Fetching databases...');
  const [coursesSnap, classesSnap, userDoc] = await Promise.all([
    db.collection('courses').get(),
    db.collection('classes').get(),
    db.collection('users').doc(henriqueUid).get()
  ]);

  if (!userDoc.exists) {
    console.error('Henrique not found!');
    return;
  }

  const user = { id: userDoc.id, ...userDoc.data() };
  const courses = coursesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const classes = classesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const theoflixProgress = user.journey?.theoflixProgress;
  if (!theoflixProgress) {
    console.log('Henrique has no TheoFlix progress in journey.theoflixProgress.');
    return;
  }

  console.log(`Reconciling attendance for ${user.name || user.id}...`);

  for (const [theoflixCourseId, episodeProgress] of Object.entries(theoflixProgress)) {
    if (!episodeProgress || typeof episodeProgress !== 'object') continue;

    const linkedCourses = courses.filter(c =>
      c.id === theoflixCourseId ||
      c.linkedTheoflixId === theoflixCourseId ||
      c.syllabus?.some(s => s.theoflixCourseId === theoflixCourseId)
    );

    if (linkedCourses.length === 0) continue;

    const linkedCourseIds = linkedCourses.map(c => c.id);
    const relevantClasses = classes.filter(c =>
      linkedCourseIds.includes(c.courseId) && (c.students || []).includes(user.id)
    );

    if (relevantClasses.length === 0) {
      console.log(`- User is not enrolled in any class for course "${theoflixCourseId}".`);
      continue;
    }

    for (const [epKey, watched] of Object.entries(episodeProgress)) {
      if (!watched) continue;

      for (const cls of relevantClasses) {
        const physicalCourse = linkedCourses.find(c => c.id === cls.courseId);
        const syllabus = physicalCourse?.syllabus || [];

        let lessonIndex = -1;
        if (/^\d+$/.test(epKey)) {
          lessonIndex = syllabus.findIndex(s =>
            s.theoflixCourseId === theoflixCourseId &&
            Array.isArray(s.theoflixRequiredVideoIds) &&
            s.theoflixRequiredVideoIds.includes(epKey)
          );
        }

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

        // Fetch current class attendance
        const classRef = db.collection('classes').doc(cls.id);
        const classDoc = await classRef.get();
        const attendance = classDoc.data().attendance || [];

        const existingRecordIdx = attendance.findIndex(r => r.date === lessonDate);
        let updated = false;

        if (existingRecordIdx !== -1) {
          const record = attendance[existingRecordIdx];
          const online = record.onlineStudentIds || [];
          if (!online.includes(user.id)) {
            record.onlineStudentIds = [...online, user.id];
            record.lessonNotes = {
              ...(record.lessonNotes || {}),
              [user.id]: 'Presença computada via assistido no TheoFlix'
            };
            updated = true;
          }
        } else {
          attendance.push({
            date: lessonDate,
            presentStudentIds: [],
            onlineStudentIds: [user.id],
            lessonNotes: {
              [user.id]: 'Presença computada via assistido no TheoFlix'
            }
          });
          updated = true;
        }

        if (updated) {
          console.log(`  Updating class ${cls.name || cls.id} for date ${lessonDate} (Lesson ${lessonIndex})...`);
          await classRef.update({ attendance });
          console.log(`  ✓ Updated attendance successfully.`);
        } else {
          console.log(`  Already marked present for class ${cls.name || cls.id} on date ${lessonDate}.`);
        }
      }
    }
  }

  console.log('=== Reconciliation Finished! ===');
}

reconcileHenrique().catch(console.error);
