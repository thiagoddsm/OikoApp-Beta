'use client';

import { useState } from 'react';
import { useFirebase } from '@/firebase';
import { doc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { parseISO, format, addWeeks, addMonths } from 'date-fns';

const CRESCER_COURSE_ID = '0p9aolpCoHzGrnnue4nP';

const EPISODE_INDEX_MAP: Record<string, Record<string, number>> = {
  'membros': { '2ZGClOxUXM4': 0, 'uCZBmhqIo1c': 1, 'h7TeEQOcuUo': 2, '0_TaQe_OmgQ': 3, 'TL6Xd8VYgHw': 4, 'svl2BkLODnc': 5, 'nMCQ316WYaU': 6, 'A0F1ARYje-o': 7, 'Y4JCdKPVEpQ': 8, '3CL5LKIS2dE': 9, '8DcJ_Qci7QY': 10, 'fQgsFloY5BA': 11, 'j242ylV9iEo': 12 },
  'crescer': { 'KBQOdnYuLxc': 0, 'LkOS2dYLdEU': 1, 'VaHA7vbfxNo': 2, 'pWl3AMgG4YY': 3, 'zg_tIdSDH5M': 4 },
  'cuidar': { '48ZcWTvblKk': 0, 'cR_pj7L-_GU': 1, 'alhx4jOv0c4': 2, 'BU5i2fQLC3o': 3, 'wWDuU6sXV2Q': 4 },
  'imersao': { 'dQw4w9WgXcQ': 0 }
};

// Projects class schedule and returns the calendar date for a given syllabus index
function projectLessonDate(cls: any, syllabusIndex: number, syllabus: any[]) {
  if (!cls.startDate) return null;

  const overrides = cls.scheduleOverrides || {};
  const holidaySet = new Set(cls.holidayDates || []);
  const start = parseISO(cls.startDate);
  const end = cls.endDate ? parseISO(cls.endDate) : addMonths(start, 6);

  // Check extra sessions for this specific syllabus module
  const syllabusId = syllabus[syllabusIndex]?.id;
  if (syllabusId) {
    const extra = (cls.extraSessions || []).find((s: any) => s.syllabusId === syllabusId);
    if (extra) return extra.date;

    // Check schedule overrides for a date that points to this syllabus item
    const overrideEntry = Object.entries(overrides).find(([, ov]: any) => ov.syllabusId === syllabusId && !ov.isCancelled);
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

export default function MigrateCrescer() {
  const { firestore } = useFirebase();
  const [log, setLog] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addLog = (msg: string) => setLog(prev => [...prev, msg]);
  const clearLog = () => setLog([]);

  const runSyllabusMigration = async () => {
    if (!firestore) { addLog('❌ Firestore não iniciado'); return; }
    setLoading(true);
    clearLog();
    addLog('🔍 Buscando curso Crescer no Firestore...');

    try {
      const courseRef = doc(firestore, 'courses', CRESCER_COURSE_ID);
      const snap = await getDoc(courseRef);

      if (!snap.exists()) { addLog('❌ Curso Crescer não encontrado no Firestore!'); return; }

      const syllabus: any[] = snap.data().syllabus || [];
      addLog(`✅ Curso encontrado: ${syllabus.length} módulos`);
      addLog('');
      addLog('Estado ANTES:');
      syllabus.forEach((s, i) => {
        addLog(`  [${i}] "${s.title}" → ${JSON.stringify(s.theoflixRequiredVideoIds || [])}`);
      });

      const newSyllabus = syllabus.map((s: any, idx: number) => {
        if (idx === 2) { addLog(`\n✏️  [2] corrigindo: ["2"] → ["3"]`); return { ...s, theoflixRequiredVideoIds: ['3'] }; }
        if (idx === 3) { addLog(`✏️  [3] corrigindo: ["3"] → ["4"]`); return { ...s, theoflixRequiredVideoIds: ['4'] }; }
        return s;
      });

      addLog('\n📝 Salvando correções no Firestore...');
      await updateDoc(courseRef, { syllabus: newSyllabus });

      addLog('\nEstado DEPOIS:');
      newSyllabus.forEach((s, i) => {
        addLog(`  [${i}] "${s.title}" → ${JSON.stringify(s.theoflixRequiredVideoIds || [])}`);
      });

      addLog('\n🎉 Migração do Syllabus concluída com sucesso!');
    } catch (e: any) {
      addLog(`\n❌ Erro: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const runReconciliation = async (live: boolean) => {
    if (!firestore) { addLog('❌ Firestore não iniciado'); return; }
    setLoading(true);
    clearLog();
    addLog(`=== Iniciando Reconciliação do TheoFlix (${live ? '🔴 MODO LIVE' : '🟡 MODO DRY RUN'}) ===\n`);

    try {
      addLog('🔍 Buscando cursos, turmas e usuários...');
      const [coursesSnap, classesSnap, usersSnap] = await Promise.all([
        getDocs(collection(firestore, 'courses')),
        getDocs(collection(firestore, 'classes')),
        getDocs(collection(firestore, 'users'))
      ]);

      const courses = coursesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const classes = classesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      addLog(`✅ Carregados: ${courses.length} cursos, ${classes.length} turmas, ${users.length} usuários\n`);

      let totalFixes = 0;
      const classAttendanceUpdates = new Map<string, any[]>();

      // Inicializa mapa de presenças
      classes.forEach(cls => {
        classAttendanceUpdates.set(cls.id, JSON.parse(JSON.stringify(cls.attendance || [])));
      });

      for (const user of users) {
        const theoflixProgress = user.journey?.theoflixProgress;
        if (!theoflixProgress) continue;

        for (const [theoflixCourseId, episodeProgress] of Object.entries(theoflixProgress)) {
          if (!episodeProgress || typeof episodeProgress !== 'object') continue;

          // Cursos físicos vinculados a este curso do TheoFlix
          const linkedCourses = courses.filter(c =>
            c.id === theoflixCourseId ||
            c.linkedTheoflixId === theoflixCourseId ||
            c.syllabus?.some((s: any) => s.theoflixCourseId === theoflixCourseId)
          );

          if (linkedCourses.length === 0) continue;

          // Turmas físicas onde o usuário está matriculado
          const linkedCourseIds = linkedCourses.map(c => c.id);
          const relevantClasses = classes.filter(c =>
            linkedCourseIds.includes(c.courseId) && (c.students || []).includes(user.id)
          );

          if (relevantClasses.length === 0) continue;

          for (const [epKey, watched] of Object.entries(episodeProgress)) {
            if (!watched) continue;

            for (const cls of relevantClasses) {
              const physicalCourse = linkedCourses.find(c => c.id === cls.courseId);
              const syllabus = physicalCourse?.syllabus || [];

              let lessonIndex = -1;
              if (/^\d+$/.test(epKey)) {
                lessonIndex = syllabus.findIndex((s: any) =>
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

                  lessonIndex = syllabus.findIndex((s: any) =>
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

              const currentAttendance = classAttendanceUpdates.get(cls.id) || [];
              const existingRecordIdx = currentAttendance.findIndex((r: any) => r.date === lessonDate);

              let alreadyMarked = false;
              if (existingRecordIdx !== -1) {
                alreadyMarked = (currentAttendance[existingRecordIdx].onlineStudentIds || []).includes(user.id);
              }

              if (!alreadyMarked) {
                totalFixes++;
                addLog(`[RECONCILE] Aluno: ${user.name || user.id} | Curso: ${physicalCourse?.name} | Aula[${lessonIndex}] | Data: ${lessonDate}`);

                if (live) {
                  const newAttendance = [...currentAttendance];
                  if (existingRecordIdx !== -1) {
                    const record = newAttendance[existingRecordIdx];
                    newAttendance[existingRecordIdx] = {
                      ...record,
                      onlineStudentIds: [...(record.onlineStudentIds || []), user.id],
                      lessonNotes: {
                        ...(record.lessonNotes || {}),
                        [user.id]: 'Presença computada via TheoFlix (reconciliação de histórico)'
                      }
                    };
                  } else {
                    newAttendance.push({
                      date: lessonDate,
                      presentStudentIds: [],
                      onlineStudentIds: [user.id],
                      lessonNotes: {
                        [user.id]: 'Presença computada via TheoFlix (reconciliação de histórico)'
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

      addLog(`\n===== RESUMO =====`);
      addLog(`Total de presenças a corrigir: ${totalFixes}`);

      if (live && totalFixes > 0) {
        addLog('\n📝 Gravando alterações no Firestore...');
        let written = 0;
        for (const cls of classes) {
          const newAttendance = classAttendanceUpdates.get(cls.id);
          const oldStr = JSON.stringify(cls.attendance || []);
          const newStr = JSON.stringify(newAttendance);
          if (oldStr !== newStr) {
            const classRef = doc(firestore, 'classes', cls.id);
            await updateDoc(classRef, { attendance: newAttendance });
            addLog(`  ✅ Turma atualizada: ${cls.name || cls.id}`);
            written++;
          }
        }
        addLog(`\n🎉 Reconciliação concluída! ${written} turmas atualizadas.`);
      } else if (!live) {
        addLog('\n⚠️ Execute em MODO LIVE para salvar no banco de dados.');
      }
    } catch (e: any) {
      addLog(`\n❌ Erro: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 40, fontFamily: 'monospace', color: '#fff', background: '#0a0a0c', minHeight: '100vh' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <h1 style={{ color: '#fff', marginBottom: 8, fontSize: '2rem', borderBottom: '1px solid #222', paddingBottom: 16 }}>
          🔧 Painel de Migrações e Reconciliação
        </h1>
        <p style={{ color: '#888', marginBottom: 32, fontSize: '0.95rem' }}>
          Para aplicar no banco desejado, certifique-se de que o servidor está rodando no projeto correto e que você está autenticado.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
          {/* Card 1: Syllabus */}
          <div style={{ background: '#121216', padding: 24, borderRadius: 12, border: '1px solid #222' }}>
            <h3 style={{ color: '#fff', marginBottom: 12, fontSize: '1.2rem' }}>1. Corrigir Syllabus Crescer</h3>
            <p style={{ color: '#aaa', fontSize: '0.85rem', lineHeight: 1.5, marginBottom: 20 }}>
              Ajusta os índices de vídeo requeridos nos módulos 2 e 3 do curso Crescer.
            </p>
            <button
              onClick={runSyllabusMigration}
              disabled={loading}
              style={{
                background: '#e53e3e',
                color: '#fff',
                border: 'none',
                padding: '10px 20px',
                borderRadius: 6,
                fontSize: 14,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                width: '100%'
              }}
            >
              🚀 Corrigir Syllabus
            </button>
          </div>

          {/* Card 2: Reconciliation */}
          <div style={{ background: '#121216', padding: 24, borderRadius: 12, border: '1px solid #222' }}>
            <h3 style={{ color: '#fff', marginBottom: 12, fontSize: '1.2rem' }}>2. Reconciliar TheoFlix</h3>
            <p style={{ color: '#aaa', fontSize: '0.85rem', lineHeight: 1.5, marginBottom: 20 }}>
              Busca registros assistidos no TheoFlix e sincroniza a presença online retroativamente.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => runReconciliation(false)}
                disabled={loading}
                style={{
                  background: '#3182ce',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 16px',
                  borderRadius: 6,
                  fontSize: 14,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  flex: 1
                }}
              >
                🔍 Testar (Dry Run)
              </button>
              <button
                onClick={() => runReconciliation(true)}
                disabled={loading}
                style={{
                  background: '#dd6b20',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 16px',
                  borderRadius: 6,
                  fontSize: 14,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  flex: 1
                }}
              >
                🔴 Executar (Live)
              </button>
            </div>
          </div>
        </div>

        {log.length > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ color: '#0f0', fontSize: '0.9rem', fontWeight: 'bold' }}>Console Output:</span>
              <button
                onClick={clearLog}
                style={{ background: 'transparent', color: '#888', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}
              >
                [Limpar]
              </button>
            </div>
            <pre style={{
              background: '#050507',
              color: '#0f0',
              padding: 20,
              borderRadius: 8,
              border: '1px solid #1a1a22',
              whiteSpace: 'pre-wrap',
              lineHeight: 1.6,
              fontSize: '0.85rem',
              maxHeight: 500,
              overflowY: 'auto'
            }}>
              {log.join('\n')}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
