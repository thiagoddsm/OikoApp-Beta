"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const firebase_admin_1 = require("../src/lib/firebase-admin");
async function reconcileFernandaPresence() {
    const db = (0, firebase_admin_1.getAdminDb)();
    const userId = 'pqnPOpEqXRdfuKlhawi3';
    const theoflixCourseId = 'cuidar';
    // Vamos buscar diretamente o progresso de Fernanda
    const userRef = db.collection('users').doc(userId);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
        console.log("Fernanda não encontrada.");
        return;
    }
    const userData = userSnap.data();
    const userProgress = userData.journey?.theoflixProgress?.[theoflixCourseId] || {};
    console.log("Progresso no TheoFlix do curso cuidar:", userProgress);
    // Mapeamento esperado do Cuidar:
    // Aula 6 (Módulo 6: index 5) -> "A Intencionalidade Para Manter a Igreja Unida" (ID: 995ad326-444f-491d-9dc9-361858380880)
    // theoflixRequiredVideoIds para o index 5: ["5"]
    // O episódio com index 5 no TheoFlix é: "[5] A Intencionalidade Para Manter a Igreja Unida -> Key: HDQorg5oUVQ"
    // Fernanda assistiu o vídeo "HDQorg5oUVQ" que é o index 5 do TheoFlix.
    // Ela também assistiu "48ZcWTvblKk" que é o index 0 do TheoFlix.
    // Vamos re-executar a lógica de reconciliação de presença para ela para a turma do Crescer/Cuidar dela.
    const classesSnap = await db.collection('classes').get();
    const enrolledClasses = classesSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(cls => cls.students?.includes(userId));
    console.log(`\nVerificando ${enrolledClasses.length} turmas matriculadas:`);
    for (const cls of enrolledClasses) {
        const courseSnap = await db.collection('courses').doc(cls.courseId).get();
        const courseData = courseSnap.data();
        if (!courseData)
            continue;
        console.log(`- Turma: ${cls.id} | Curso: ${courseData.name}`);
        // Projetar cronograma da turma
        const syllabus = courseData.syllabus || [];
        const items = [];
        if (cls.startDate) {
            const { parseISO, format, addWeeks } = require('date-fns');
            const start = parseISO(cls.startDate);
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
                const originalIdx = override?.syllabusId ? syllabus.findIndex((s) => s.id === override.syllabusId) : syllabusIndex;
                items.push({ dateStr, syllabusOriginalIndex: originalIdx });
                syllabusIndex++;
                currentDate = addWeeks(currentDate, cls.frequency === 'quinzenal' ? 2 : 1);
            }
            Object.entries(overrides).forEach(([dateStr, override]) => {
                if (override.isCancelled)
                    return;
                if (items.find(i => i.dateStr === dateStr))
                    return;
                const originalIdx = override.syllabusId ? syllabus.findIndex((s) => s.id === override.syllabusId) : -1;
                items.push({ dateStr, syllabusOriginalIndex: originalIdx });
            });
            const extraSessions = cls.extraSessions || [];
            extraSessions.forEach((session) => {
                if (items.find(i => i.dateStr === session.date))
                    return;
                const originalIdx = session.syllabusId ? syllabus.findIndex((s) => s.id === session.syllabusId) : -1;
                items.push({ dateStr: session.date, syllabusOriginalIndex: originalIdx });
            });
            items.sort((a, b) => a.dateStr.localeCompare(b.dateStr));
        }
        console.log("Cronograma calculado:", items);
        // Mapear cada vídeo assistido para a presença física
        const attendanceUpdates = [...(cls.attendance || [])];
        let classChanged = false;
        // EPISODE MAP do Cuidar:
        // '48ZcWTvblKk' (vídeo do episódio 0)
        // 'HDQorg5oUVQ' (vídeo do episódio 5)
        const episodeIndexMap = {
            '48ZcWTvblKk': 0,
            'HDQorg5oUVQ': 5
        };
        for (const [epKey, watched] of Object.entries(userProgress)) {
            if (!watched)
                continue;
            const episodeIndex = episodeIndexMap[epKey];
            if (episodeIndex === undefined) {
                console.log(`Sem correspondência de índice para o vídeo: ${epKey}`);
                continue;
            }
            // Encontrar qual módulo exige esse vídeo
            const episodeIdxStr = episodeIndex.toString();
            let targetSyllabusIndex = -1;
            const hybridIndex = syllabus.findIndex((mod) => mod.theoflixCourseId === theoflixCourseId &&
                mod.theoflixRequiredVideoIds?.includes(episodeIdxStr));
            if (hybridIndex !== -1) {
                targetSyllabusIndex = hybridIndex;
            }
            else if (courseData.id === theoflixCourseId || courseData.linkedTheoflixId === theoflixCourseId) {
                targetSyllabusIndex = episodeIndex;
            }
            if (targetSyllabusIndex === -1) {
                console.log(`Não foi possível associar o episódio index ${episodeIndex} à ementa.`);
                continue;
            }
            const matchedItem = items.find((i) => i.syllabusOriginalIndex === targetSyllabusIndex);
            if (!matchedItem) {
                console.log(`Não foi encontrada data no cronograma para o módulo ${targetSyllabusIndex}`);
                continue;
            }
            const targetDate = matchedItem.dateStr;
            console.log(`Computando presença online para ${userData.name} na aula ${targetSyllabusIndex} (Módulo: ${syllabus[targetSyllabusIndex]?.title || 'Sem título'}), Data: ${targetDate}`);
            const recordIdx = attendanceUpdates.findIndex((a) => a.date === targetDate);
            if (recordIdx > -1) {
                const record = attendanceUpdates[recordIdx];
                if (!record.onlineStudentIds)
                    record.onlineStudentIds = [];
                if (!record.onlineStudentIds.includes(userId)) {
                    record.onlineStudentIds.push(userId);
                    record.lessonNotes = { ...(record.lessonNotes || {}), [userId]: "Presença computada via TheoFlix (Reconciliação Forçada)" };
                    classChanged = true;
                }
            }
            else {
                attendanceUpdates.push({
                    date: targetDate,
                    presentStudentIds: [],
                    onlineStudentIds: [userId],
                    lessonNotes: { [userId]: "Presença computada via TheoFlix (Reconciliação Forçada)" }
                });
                classChanged = true;
            }
        }
        if (classChanged) {
            console.log(`Salvando presença atualizada da turma no Firestore...`);
            await db.collection('classes').doc(cls.id).update({ attendance: attendanceUpdates });
            console.log("Salvo com sucesso!");
        }
        else {
            console.log("Nenhuma alteração de presença necessária para esta turma.");
        }
    }
}
reconcileFernandaPresence().catch(console.error);
