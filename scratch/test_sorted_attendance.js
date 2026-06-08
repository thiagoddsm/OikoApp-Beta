const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');
const { parseISO, format, addWeeks, addMonths, isBefore } = require('date-fns');

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

function getSortedAttendance(classData) {
    const attendance = classData.attendance || [];
    if (!classData.startDate) return [...attendance].sort((a, b) => a.date.localeCompare(b.date));

    const validDatesForThisClass = new Set();
    const repoOnlyDates = new Set(
        (classData.extraSessions || []).filter((s) => s.isRepositionOnly).map((s) => `${s.date}T${s.startTime}`)
    );
    const allExtraSessionDates = new Set(
        (classData.extraSessions || []).map((s) => `${s.date}T${s.startTime}`)
    );

    const start = parseISO(classData.startDate);
    const end = classData.endDate ? parseISO(classData.endDate) : addMonths(start, 6);
    const holidaySet = new Set(classData.holidayDates || []);
    const overrides = classData.scheduleOverrides || {};

    // 1. Gerar datas regulares pelo cronograma
    if (classData.frequency === 'pontual') {
        validDatesForThisClass.add(classData.startDate);
    } else if (classData.frequency) {
        let current = start;
        let safe = 0;
        while (safe++ < 200) {
            const dStr = format(current, 'yyyy-MM-dd');
            if (!holidaySet.has(dStr) && !overrides[dStr]?.isCancelled) {
                validDatesForThisClass.add(dStr);
            } else if (overrides[dStr] && !overrides[dStr]?.isCancelled) {
                validDatesForThisClass.add(dStr);
            }
            current = addWeeks(current, classData.frequency === 'quinzenal' ? 2 : 1);
            if (isBefore(end, current)) break;
        }
    }

    // 2. Overrides que caem fora da recorrência normal
    Object.keys(overrides).forEach(dStr => {
        if (!overrides[dStr]?.isCancelled) {
            validDatesForThisClass.add(dStr);
        }
    });

    // 3. Sessões extras (aulas adicionais, NÃO reposições)
    (classData.extraSessions || []).forEach((s) => {
        if (!s.isRepositionOnly) {
            validDatesForThisClass.add(`${s.date}T${s.startTime}`);
        }
    });

    console.log("validDatesForThisClass:", Array.from(validDatesForThisClass).sort());

    // 4. Filtrar attendance da mesma forma que o cronograma
    return [...attendance]
        .filter(r => {
            // Ignorar reposições estritas (não contam como aula regular)
            if (repoOnlyDates.has(r.date) || r.isRepositionOnly) return false;

            // Se é uma data com horário (aula extra) e não está na lista de extras atual → fantasma
            if (r.date.includes('T') && !allExtraSessionDates.has(r.date)) return false;

            // Se a turma tem cronograma, a data deve estar no cronograma válido
            if (classData.startDate && !validDatesForThisClass.has(r.date)) return false;

            return true;
        })
        .sort((a, b) => a.date.localeCompare(b.date));
}

async function run() {
  const classId = "w3q7qjHhLNs9D8m2a9K0";
  const snap = await getDoc(doc(db, 'classes', classId));
  const cls = snap.data();
  console.log(`\n================= CLASS: ${cls.name} (${classId}) =================`);
  const sortedAtt = getSortedAttendance(cls);
  console.log("sortedAttendance length:", sortedAtt.length);
  sortedAtt.forEach((record, index) => {
      console.log(`  Index ${index + 1}: Date = ${record.date}`);
  });
}

run().catch(console.error);
