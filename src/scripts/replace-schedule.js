const fs = require('fs');
const lines = fs.readFileSync('src/components/teaching/class-schedule-manager.tsx', 'utf8').split('\n');
const newLogic = `        // 3. Adicionar overrides fora da recorrencia
        Object.entries(overrides).forEach(([oDateStr, override]) => {
            if (!override || override.isCancelled) return;
            if (items.find(i => i.dateStr === oDateStr || i.dayDateStr === oDateStr)) return;
            const syllabusItem = override.syllabusId ? syllabus.find(s => s.id === override.syllabusId) : undefined;
            if (!syllabusItem) return;
            const teacher = override.teacherId ? users.find(u => u.id === override.teacherId) : users.find(u => u.id === classData.teacherId);
            items.push({
                date: parseISO(oDateStr.split('T')[0]),
                dateStr: oDateStr,
                dayDateStr: oDateStr.split('T')[0],
                syllabusItem,
                teacher,
                isOverride: true,
                isCancelled: false,
                originalIndex: override.syllabusId ? syllabus.findIndex(s => s.id === override.syllabusId) : -1,
                startTime: override.startTime,
                endTime: override.endTime
            });
        });
        // 4. Adicionar aulas extras
        const extraSessions = classData.extraSessions || [];
        extraSessions.forEach((session) => {
            let cleanDate = session.date;
            if (cleanDate && cleanDate.startsWith('0206-')) cleanDate = cleanDate.replace('0206-', '2026-');
            else if (cleanDate && cleanDate.match(/^02[0-9]{2}-/)) cleanDate = '20' + cleanDate.substring(2);
            const uniqueDateStr = session.startTime ? \`\${cleanDate}T\${session.startTime}\` : \`\${cleanDate}-extra\`;
            if (items.find(i => i.dateStr === uniqueDateStr)) return;
            const syllabusItem = session.syllabusId ? syllabus.find(s => s.id === session.syllabusId) : undefined;
            const teacher = users.find(u => u.id === classData.teacherId);
            items.push({
                date: parseISO(cleanDate),
                dateStr: uniqueDateStr,
                dayDateStr: cleanDate,
                syllabusItem,
                teacher,
                isOverride: true,
                isExtraSession: true,
                isCancelled: false,
                originalIndex: session.syllabusId ? syllabus.findIndex(s => s.id === session.syllabusId) : -1,
                startTime: session.startTime,
                endTime: session.endTime
            });
        });

        items.sort((a, b) => a.dateStr.localeCompare(b.dateStr));`;
lines.splice(156, 0, newLogic);
fs.writeFileSync('src/components/teaching/class-schedule-manager.tsx', lines.join('\n'), 'utf8');
console.log('Done!');
