'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useVolunteering } from '@/contexts/volunteering-context';
import { getModuleCompletion } from '@/domain/teaching/module-completion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, ArrowLeft, CheckCircle2, ClipboardCheck, History, Plus, Save, UserPlus, Search as SearchIcon } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { format, addWeeks, isBefore, isAfter, startOfDay, parseISO, addMonths, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Timestamp, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { VolunteeringProvider, getResolvedSchedule } from '@/contexts/volunteering-context';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFirebase, updateDocumentNonBlocking } from '@/firebase';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { useMembersData, useCoursesData } from "@/hooks/useDomainData";
import { isMembershipCourse } from '@/lib/teaching/is-membership-course';

const weekDayMap: Record<string, number> = {
    "Domingo": 0, "Segunda-feira": 1, "Terça-feira": 2, "Quarta-feira": 3,
    "Quinta-feira": 4, "Sexta-feira": 5, "Sábado": 6
};

function PedagogicalLogPageContent() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const classId = params.classId as string;
    const { users } = useMembersData();
    const { courses, classes, enrollmentRequests, pedagogicalLogs, theoflixCourses } = useCoursesData();

    const { addPedagogicalLog, updateClass, isLoading } = useVolunteering();

    const [selectedDate, setSelectedDate] = useState<string>('');
    const [contentTaught, setContentTaught] = useState('');
    const [observations, setObservations] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [performance, setPerformance] = useState(5);
    const [presentStudents, setPresentStudents] = useState<string[]>([]);
    const [onlineStudents, setOnlineStudents] = useState<string[]>([]);
    const [makeupStudentIds, setMakeupStudentIds] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [today, setToday] = useState<Date | null>(null);

    useEffect(() => {
        setToday(startOfDay(new Date()));
    }, []);

    const classData = useMemo(() => classes.find(c => c.id === classId), [classes, classId]);
    const courseData = useMemo(() => classData ? courses.find(c => c.id === classData.courseId) : null, [classData, courses]);

    const resolvedSchedule = useMemo(() => {
        return getResolvedSchedule(classData, courseData);
    }, [classData, courseData]);

    const classOccurrences = useMemo(() => resolvedSchedule.map(i => i.dateStr), [resolvedSchedule]);
    const moduleNames = useMemo(() => resolvedSchedule.map(i => i.syllabusItem?.title || ''), [resolvedSchedule]);
    const requestedSession = searchParams.get('session');

    const currentResolvedItem = useMemo(() => resolvedSchedule.find(i => i.dateStr === selectedDate), [resolvedSchedule, selectedDate]);
    const autoModuleKey = useMemo(() => {
        if (!currentResolvedItem || currentResolvedItem.syllabusOriginalIndex === -1) return '';
        return `module${currentResolvedItem.syllabusOriginalIndex + 1}`;
    }, [currentResolvedItem]);

    const [manualModuleKey, setManualModuleKey] = useState<string>('');

    // Sincronizar manualModuleKey quando a data selecionada/módulo automático mudar
    useEffect(() => {
        setManualModuleKey(autoModuleKey);
    }, [autoModuleKey]);

    const currentModuleKey = manualModuleKey || autoModuleKey;

    useEffect(() => {
        if (classOccurrences.length > 0 && !selectedDate) {
            if (requestedSession && classOccurrences.includes(requestedSession)) {
                setSelectedDate(requestedSession);
                return;
            }
            const todayStr = format(new Date(), 'yyyy-MM-dd');
            const closest = classOccurrences.find(d => d.split('T')[0] === todayStr) || classOccurrences.find(d => {
                let cleanD = d.split('T')[0];
                const dashCount = (cleanD.match(/-/g) || []).length;
                if (dashCount > 2) {
                    const parts = cleanD.split('-');
                    cleanD = `${parts[0]}-${parts[1]}-${parts[2]}`;
                }
                try {
                    return isAfter(parseISO(cleanD), new Date());
                } catch (e) {
                    return false;
                }
            }) || classOccurrences[0];
            setSelectedDate(closest);
        }
    }, [classOccurrences, selectedDate, requestedSession]);

    const currentModuleIndex = useMemo(() => classOccurrences.indexOf(selectedDate), [classOccurrences, selectedDate]);

    useEffect(() => {
        if (selectedDate && classData?.attendance) {
            const cleanSelected = selectedDate.split('T')[0];
            const record = classData.attendance.find((a: any) => a.date === selectedDate || a.date?.split('T')[0] === cleanSelected);
            setPresentStudents(record?.presentStudentIds || []);
            setOnlineStudents(record?.onlineStudentIds || []);
            setMakeupStudentIds(record?.repositions?.map((reposition: any) => reposition.studentId) || []);

            const baseDateStr = selectedDate.split('T')[0];

            const log = pedagogicalLogs.find(l => {
                if (l.dateStr && (l.dateStr === selectedDate || l.dateStr.split('T')[0] === baseDateStr)) return true;
                const logDate = l.date?.toDate ? l.date.toDate() : (l.date instanceof Date ? l.date : null);
                if (!logDate) return false;
                return l.classId === classId && format(logDate, 'yyyy-MM-dd') === baseDateStr;
            });

            if (log) {
                setContentTaught(log.content_taught);
                setObservations(log.observations);
                setPerformance(log.student_performance);
            } else {
                const defaultContent = currentModuleIndex !== -1 && moduleNames[currentModuleIndex]
                    ? `Aula ${currentModuleIndex + 1}: ${moduleNames[currentModuleIndex]}`
                    : (currentModuleIndex !== -1 ? `Aula ${currentModuleIndex + 1}` : '');
                setContentTaught(defaultContent);
                setObservations('');
                setPerformance(3);
            }
        }
    }, [selectedDate, classData, pedagogicalLogs, classId, currentModuleIndex, moduleNames]);

    const isMemberCourse = useMemo(() => {
        return isMembershipCourse(courseData);
    }, [courseData]);

    const isDisCourse = useMemo(() => {
        if (!courseData) return false;
        const name = (courseData.name || '').toLowerCase();
        const ministry = ((courseData as any).ministry || '').toLowerCase();
        return (courseData as any).schoolId === 'dis' ||
            (courseData as any).programId === 'dis' ||
            ministry === 'dis' ||
            name.includes('libras');
    }, [courseData]);

    const enrolledStudents = useMemo(() => {
        if (!users || !classData?.students) return [];
        const studentSet = new Set(classData.students);
        return users
            .filter(u => studentSet.has(u.id))
            .filter(u => (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'));
    }, [users, classData, searchTerm]);

    // Alunos de OUTRAS TURMAS do mesmo curso que faltaram a este módulo específico (calculado apenas com turmas já passadas)
    const previousClassStudentsForModule = useMemo(() => {
        if (!users || !selectedDate || currentModuleIndex === -1 || !courseData || !isSearchOpen) return [];
        const currentEnrolledIds = new Set(classData?.students || []);
        const currentSyllabusId = currentResolvedItem?.syllabusItem?.id;

        const siblingClasses = classes.filter((c: any) => c.courseId === courseData.id && c.id !== classId && (!classData?.cycle || c.cycle === classData?.cycle));

        const studentIds = new Set<string>();
        siblingClasses.forEach((sibling: any) => {
            const siblingSchedule = getResolvedSchedule(sibling, courseData);
            const matchingDates = siblingSchedule.filter((s: any) => s.syllabusItem?.id === currentSyllabusId).map((s: any) => s.dateStr);

            (sibling.students || []).forEach((sid: string) => {
                if (currentEnrolledIds.has(sid)) return;

                let attendedInSibling = false;
                for (const dStr of matchingDates) {
                    const record = sibling.attendance?.find((a: any) => a.date === dStr);
                    if (record?.presentStudentIds?.includes(sid) || record?.onlineStudentIds?.includes(sid) || record?.repositions?.some((r: any) => r.studentId === sid)) {
                        attendedInSibling = true;
                        break;
                    }
                }

                if (!attendedInSibling) {
                    studentIds.add(sid);
                }
            });
        });

        return users.filter((u: any) => studentIds.has(u.id));
    }, [users, classes, classData, courseData, classId, selectedDate, currentModuleIndex, currentResolvedItem, isSearchOpen]);

    // Lógica para sugerir alunos que precisam repor este módulo específico (calculado apenas quando a busca de reposição estiver aberta)
    const repositionSuggestions = useMemo(() => {
        if (!users || !selectedDate || currentModuleIndex === -1 || !isSearchOpen) return [];
        const enrolledIds = new Set(classData?.students || []);
        const previousClassIds = new Set(previousClassStudentsForModule.map((u: any) => u.id));

        const suggestions: any[] = [];
        for (const u of users) {
            if (suggestions.length >= 15) break;
            if (enrolledIds.has(u.id) || previousClassIds.has(u.id)) continue;

            const isStudent = u.integrationStatus === 'novo_convertido' || u.integrationStatus === 'membro' || u.integrationStatus === 'consolidado';
            if (!isStudent) continue;

            let hasPending = false;
            if (isMemberCourse) {
                const status = getModuleCompletion({
                    studentId: u.id,
                    studentEmail: u.email,
                    studentJourney: u.journey,
                    course: courseData,
                    modIndex: currentModuleIndex,
                    modId: currentModuleKey,
                    modules: courseData?.syllabus || [],
                    courseClasses: classes,
                    isMembership: true
                });
                hasPending = !status.isDone;
            } else {
                hasPending = true;
            }

            if (hasPending) {
                suggestions.push(u);
            }
        }
        return suggestions;
    }, [users, classData, selectedDate, currentModuleIndex, currentModuleKey, isMemberCourse, previousClassStudentsForModule, isSearchOpen, courseData, classes]);

    const handleStudentCheck = (studentId: string, checked: boolean) => {
        setPresentStudents(prev => checked ? [...prev, studentId] : prev.filter(id => id !== studentId));
    };

    const handleAddRepositionStudent = (studentId: string) => {
        if (presentStudents.includes(studentId)) return;
        setPresentStudents(prev => [...prev, studentId]);
        setMakeupStudentIds(prev => [...prev, studentId]);
        setIsSearchOpen(false);
        setSearchQuery('');
        toast({ title: "Reposição adicionada", description: "O aluno foi incluído na lista desta aula." });
    };

    const handleSaveLog = async () => {
        if (!selectedDate) return;
        setIsSaving(true);
        try {
            // Se selectedDate contiver sufixos como YYYY-MM-DD-1, removemos o sufixo numérico da data base
            let rawDatePart = selectedDate.split('T')[0];
            const dashCount = (rawDatePart.match(/-/g) || []).length;
            if (dashCount > 2) {
                // YYYY-MM-DD-1 -> mantemos apenas YYYY-MM-DD
                const parts = rawDatePart.split('-');
                rawDatePart = `${parts[0]}-${parts[1]}-${parts[2]}`;
            }

            const baseDateStr = rawDatePart;
            const timePart = selectedDate.includes('T') ? selectedDate.split('T')[1] : '12:00:00';
            const dateStrWithTime = `${baseDateStr}T${timePart.substring(0, 8)}`; // Garante limite de hh:mm:ss

            const existingLog = pedagogicalLogs.find(l => {
                if (l.dateStr && l.dateStr === selectedDate) return true;
                const logDate = l.date?.toDate ? l.date.toDate() : (l.date instanceof Date ? l.date : null);
                if (!logDate) return false;
                return l.classId === classId && format(logDate, 'yyyy-MM-dd') === baseDateStr;
            });

            const logData = {
                classId,
                date: Timestamp.fromDate(new Date(dateStrWithTime)),
                dateStr: selectedDate, // <- Chave única original (com sufixo) mantida para isolar diários no mesmo dia
                content_taught: contentTaught || "Aula realizada",
                student_performance: performance,
                observations,
            };

            let logPromise;
            if (existingLog) {
                logPromise = updateDocumentNonBlocking(doc(firestore!, 'pedagogical_logs', existingLog.id), logData);
            } else {
                logPromise = addPedagogicalLog(logData);
            }

            const existingAttendance = classData?.attendance || [];
            const enrolledSet = new Set(classData?.students || []);
            // Bug #5 fix: somente externos presenciais viram reposição; externos apenas online são contabilizados como online externo
            const externalPresentIds = presentStudents.filter(id => !enrolledSet.has(id));
            const allRepoIds = Array.from(new Set([...makeupStudentIds, ...externalPresentIds]));

            // Bug #4 fix: inclui moduleIndex e syllabusId para que reposições em turmas
            // de calendário diferente sejam reconhecidas corretamente pelo motor de domínio.
            const repoModuleId = currentResolvedItem?.syllabusItem?.id || null;
            const repoModuleIndex = currentResolvedItem?.syllabusOriginalIndex ?? currentModuleIndex;
            const repositions = allRepoIds.map(studentId => ({
                studentId,
                date: selectedDate,
                dateStr: selectedDate,
                ...(repoModuleId !== null && { syllabusId: repoModuleId }),
                ...(repoModuleIndex !== -1 && { moduleIndex: repoModuleIndex }),
            }));
            const updatedAttendance = [
                ...existingAttendance.filter((a: any) => a.date !== selectedDate),
                { date: selectedDate, presentStudentIds: presentStudents, onlineStudentIds: onlineStudents, repositions }
            ];
            const attendancePromise = updateClass(classId, { attendance: updatedAttendance });

            // Modelo normalizado para sessões e presenças. O formato legado acima é
            // preservado enquanto relatórios existentes ainda o consomem.
            const normalizedWrites: Promise<void>[] = [];
            if (firestore && currentResolvedItem && classData) {
                const safeSessionKey = `${classId}_${selectedDate}`.replace(/[^a-zA-Z0-9_-]/g, '_');
                const sessionRef = doc(firestore, 'class_sessions', safeSessionKey);
                const batch = writeBatch(firestore);
                batch.set(sessionRef, {
                    classId,
                    courseId: classData.courseId,
                    dateStr: selectedDate,
                    date: Timestamp.fromDate(new Date(dateStrWithTime)),
                    cycle: classData.cycle || null,
                    moduleId: currentResolvedItem.syllabusItem?.id || null,
                    moduleTitle: currentResolvedItem.syllabusItem?.title || null,
                    teacherId: currentResolvedItem.isOverride
                        ? (classData.scheduleOverrides?.[selectedDate]?.teacherId || classData.teacherId)
                        : classData.teacherId,
                    startTime: currentResolvedItem.startTime || classData.startTime,
                    endTime: currentResolvedItem.endTime || classData.endTime,
                    status: 'completed',
                    updatedAt: serverTimestamp(),
                    createdAt: serverTimestamp(),
                }, { merge: true });

                // Bug #7 fix: iterar sobre todos (matriculados + reposição + online),
                // determinando status correto independente de estar em presentStudents.
                const enrolledIds = new Set(classData.students || []);
                const allStudentsForSession = new Set([...enrolledIds, ...makeupStudentIds, ...onlineStudents]);
                allStudentsForSession.forEach(studentId => {
                    const attendanceRef = doc(firestore, 'class_session_attendance', `${safeSessionKey}_${studentId}`);
                    const isInPerson = presentStudents.includes(studentId);
                    const isOnline = onlineStudents.includes(studentId);
                    const isMakeup = makeupStudentIds.includes(studentId);
                    let status: string;
                    if (isMakeup && (isInPerson || isOnline)) {
                        status = 'makeup';
                    } else if (isInPerson) {
                        status = 'present';
                    } else if (isOnline) {
                        status = 'online';
                    } else {
                        status = 'absent';
                    }
                    batch.set(attendanceRef, {
                        sessionId: safeSessionKey,
                        classId,
                        courseId: classData.courseId,
                        studentId,
                        status,
                        recordedAt: serverTimestamp(),
                    }, { merge: true });
                });
                normalizedWrites.push(batch.commit());

                if (isDisCourse && currentResolvedItem.syllabusItem?.id) {
                    const moduleId = currentResolvedItem.syllabusItem.id;
                    const moduleTitle = currentResolvedItem.syllabusItem.title || null;

                    // Present students: update module progress and resolve any pending reposicao for this module
                    presentStudents.forEach(studentId => {
                        const progressRef = doc(
                            firestore,
                            'student_course_module_progress',
                            `${studentId}_${classData.courseId}_${moduleId}`.replace(/[^a-zA-Z0-9_-]/g, '_')
                        );
                        const isMakeup = makeupStudentIds.includes(studentId);
                        
                        normalizedWrites.push(
                            Promise.resolve(writeBatch(firestore).set(progressRef, {
                                studentId,
                                courseId: classData.courseId,
                                classId,
                                moduleId,
                                moduleTitle,
                                completed: true,
                                completionType: isMakeup ? 'makeup' : 'attendance',
                                lastSessionId: safeSessionKey,
                                updatedAt: serverTimestamp(),
                            }, { merge: true }).commit())
                        );

                        if (isMakeup) {
                            const reposicaoRef = doc(
                                firestore,
                                'reposicoes_pendentes',
                                `${studentId}_${classData.courseId}_${moduleId}`.replace(/[^a-zA-Z0-9_-]/g, '_')
                            );
                            normalizedWrites.push(
                                Promise.resolve(writeBatch(firestore).set(reposicaoRef, {
                                    status: 'concluida',
                                    completedAt: serverTimestamp(),
                                    resolvedInSessionId: safeSessionKey
                                }, { merge: true }).commit())
                            );
                        }
                    });

                    // Absent enrolled students: create a pending reposicao record
                    const absentEnrolledStudents = (classData.students || []).filter(
                        (id: string) => !presentStudents.includes(id) && !onlineStudents.includes(id)
                    );

                    absentEnrolledStudents.forEach((studentId: string) => {
                        const reposicaoRef = doc(
                            firestore,
                            'reposicoes_pendentes',
                            `${studentId}_${classData.courseId}_${moduleId}`.replace(/[^a-zA-Z0-9_-]/g, '_')
                        );
                        normalizedWrites.push(
                            Promise.resolve(writeBatch(firestore).set(reposicaoRef, {
                                studentId,
                                classId,
                                courseId: classData.courseId,
                                moduleId,
                                moduleTitle,
                                originalSessionId: safeSessionKey,
                                dateStr: selectedDate,
                                status: 'pendente',
                                createdAt: serverTimestamp(),
                                updatedAt: serverTimestamp()
                            }, { merge: true }).commit())
                        );
                    });
                }
            }


            await Promise.all([
                logPromise, 
                attendancePromise, 
                ...normalizedWrites
            ]);

            try {
                fetch('/api/logs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'SUBMIT_ATTENDANCE_LOG',
                        classId,
                        dateStr: selectedDate,
                        presentCount: presentStudents.length,
                        onlineCount: onlineStudents.length,
                        makeupCount: makeupStudentIds.length
                    })
                }).catch(() => {});
            } catch (e) {}

            let formattedSuccessDate = 'Chamada';
            try {
                const parsed = parseISO(selectedDate.split('T')[0]);
                if (!isNaN(parsed.getTime())) {
                    formattedSuccessDate = format(parsed, 'dd/MM');
                }
            } catch (e) {}

            toast({ title: 'Registro Salvo!', description: `A presença de ${formattedSuccessDate} foi processada.` });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Erro ao salvar', description: 'Tente novamente.' });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="flex h-64 w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    if (!classData) return <div className="p-8 text-center"><p>Turma não encontrada.</p></div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <Button variant="outline" onClick={() => router.back()} className="h-9">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para o Painel
                </Button>
                <div className="flex flex-wrap items-center gap-4 bg-white p-2 rounded-xl border shadow-sm w-full md:w-auto">
                    <div className="flex items-center gap-2">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground ml-2">Sessão do Ciclo:</Label>
                        <Select value={selectedDate} onValueChange={setSelectedDate}>
                            <SelectTrigger className="w-[280px] h-9 font-bold">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                    {classOccurrences.map((date, idx) => {
                                        const attendance = classData.attendance?.find((a: any) => a.date === date);
                                        // Bug #6 fix: mostra ✓ para aulas com presença física OU online
                                        const hasAttendance = attendance && (
                                            (attendance.presentStudentIds?.length || 0) > 0 ||
                                            (attendance.onlineStudentIds?.length || 0) > 0
                                        );
                                        const moduleName = moduleNames[idx] ? `- ${moduleNames[idx]}` : '';
                                        const isExtra = resolvedSchedule[idx]?.isExtraSession;
                                        const isRepoOnly = resolvedSchedule[idx]?.isRepositionOnly;
                                        const startTime = resolvedSchedule[idx]?.startTime;
                                        const titlePrefix = isExtra ? 'Aula Extra' : `Aula ${idx + 1}`;
                                        const timeDisplay = startTime ? ` (${startTime})` : '';

                                        return (
                                            <SelectItem key={date} value={date}>
                                                <div className="flex items-center justify-between w-full gap-2">
                                                    <span className="font-bold truncate text-xs">
                                                        {titlePrefix}{timeDisplay} {moduleName}
                                                        {isRepoOnly && <span className="text-[9px] uppercase font-black text-amber-500 ml-2">(Apenas Reposição)</span>}
                                                    </span>
                                                    {hasAttendance && <CheckCircle2 className="size-3 text-emerald-500 shrink-0" />}
                                                </div>
                                            </SelectItem>
                                        )
                                    })}
                            </SelectContent>
                        </Select>
                    </div>

                    {isMemberCourse && (
                        <div className="flex items-center gap-2 border-l pl-4 animate-in fade-in duration-200">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-2">Vincular a:</Label>
                            <Select value={currentModuleKey} onValueChange={setManualModuleKey}>
                                <SelectTrigger className="w-[220px] h-9 font-bold">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {courseData?.syllabus?.map((item: any, idx: number) => (
                                        <SelectItem key={`module${idx + 1}`} value={`module${idx + 1}`}>
                                            <span className="font-bold text-xs">Aula {idx + 1}: {item.title}</span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <ClipboardCheck className="text-primary" />
                                    Chamada: {classData.name}
                                </CardTitle>
                                <CardDescription>
                                    {currentModuleIndex !== -1 && moduleNames[currentModuleIndex] ? `Módulo ${currentModuleIndex + 1}: ${moduleNames[currentModuleIndex]}` : 'Sessão Avulsa'}
                                </CardDescription>
                            </div>

                            <Popover open={isSearchOpen} onOpenChange={setIsSearchOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-8 font-bold">
                                        <UserPlus className="mr-2 size-4" /> Reposição
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="p-0 w-80" align="end">
                                    {/* Dropdown customizado — evita bug do Command dentro de Popover no Radix UI */}
                                    <div className="flex flex-col">
                                        {/* Campo de busca */}
                                        <div className="flex items-center border-b px-3">
                                            <SearchIcon className="mr-2 size-4 shrink-0 opacity-50" />
                                            <input
                                                autoFocus
                                                placeholder="Buscar aluno para reposição..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
                                            />
                                        </div>

                                        <div className="max-h-72 overflow-y-auto py-1">
                                            {/* Turmas anteriores */}
                                            {previousClassStudentsForModule.filter(u =>
                                                !searchQuery || u.name?.toLowerCase().includes(searchQuery.toLowerCase())
                                            ).length > 0 && (
                                                    <div>
                                                        <p className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                                            Turmas anteriores — Módulo {currentModuleIndex + 1}
                                                        </p>
                                                        {previousClassStudentsForModule
                                                            .filter(u => !searchQuery || u.name?.toLowerCase().includes(searchQuery.toLowerCase()))
                                                            .map(u => (
                                                                <button
                                                                    key={u.id}
                                                                    type="button"
                                                                    onClick={() => handleAddRepositionStudent(u.id)}
                                                                    className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer text-left transition-colors"
                                                                >
                                                                    <span className="truncate">{u.name}</span>
                                                                    <Badge variant="outline" className="ml-2 shrink-0 text-[8px] bg-blue-50 text-blue-700">TURMA ANT.</Badge>
                                                                </button>
                                                            ))
                                                        }
                                                    </div>
                                                )}

                                            {/* Pendência no módulo */}
                                            {repositionSuggestions.filter(u =>
                                                !searchQuery || u.name?.toLowerCase().includes(searchQuery.toLowerCase())
                                            ).length > 0 && (
                                                    <div>
                                                        <p className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                                            Pendência no Módulo {currentModuleIndex + 1}
                                                        </p>
                                                        {repositionSuggestions
                                                            .filter(u => !searchQuery || u.name?.toLowerCase().includes(searchQuery.toLowerCase()))
                                                            .map(u => (
                                                                <button
                                                                    key={u.id}
                                                                    type="button"
                                                                    onClick={() => handleAddRepositionStudent(u.id)}
                                                                    className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer text-left transition-colors"
                                                                >
                                                                    <span className="truncate">{u.name}</span>
                                                                    <Badge variant="outline" className="ml-2 shrink-0 text-[8px] bg-amber-50">PENDENTE</Badge>
                                                                </button>
                                                            ))
                                                        }
                                                    </div>
                                                )}

                                            {/* Busca geral */}
                                            {searchQuery && users.filter(u =>
                                                !classData.students.includes(u.id) &&
                                                !repositionSuggestions.find(s => s.id === u.id) &&
                                                !previousClassStudentsForModule.find(s => s.id === u.id) &&
                                                u.name?.toLowerCase().includes(searchQuery.toLowerCase())
                                            ).length > 0 && (
                                                    <div>
                                                        <p className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Outros membros</p>
                                                        {users
                                                            .filter(u =>
                                                                !classData.students.includes(u.id) &&
                                                                !repositionSuggestions.find(s => s.id === u.id) &&
                                                                !previousClassStudentsForModule.find(s => s.id === u.id) &&
                                                                u.name?.toLowerCase().includes(searchQuery.toLowerCase())
                                                            )
                                                            .slice(0, 10)
                                                            .map(u => (
                                                                <button
                                                                    key={u.id}
                                                                    type="button"
                                                                    onClick={() => handleAddRepositionStudent(u.id)}
                                                                    className="flex w-full items-center px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer text-left transition-colors"
                                                                >
                                                                    <Plus className="mr-2 size-4 shrink-0" />
                                                                    <span className="truncate">{u.name}</span>
                                                                </button>
                                                            ))
                                                        }
                                                    </div>
                                                )}

                                            {/* Vazio */}
                                            {previousClassStudentsForModule.filter(u => !searchQuery || u.name?.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 &&
                                                repositionSuggestions.filter(u => !searchQuery || u.name?.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 &&
                                                (!searchQuery || users.filter(u => !classData.students.includes(u.id) && u.name?.toLowerCase().includes(searchQuery.toLowerCase())).length === 0) && (
                                                    <p className="py-6 text-center text-sm text-muted-foreground">Nenhum aluno encontrado.</p>
                                                )}
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="relative">
                                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Pesquisar nome do aluno..."
                                    className="pl-10 h-10 rounded-xl"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <ScrollArea className="h-[450px] w-full rounded-md border p-4">
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Inscritos no Ciclo</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {enrolledStudents.map(student => {
                                                const isPresent = presentStudents.includes(student.id);
                                                return (
                                                    <div key={student.id} className={cn(
                                                        "flex items-center space-x-3 p-3 rounded-xl transition-all border cursor-pointer",
                                                        isPresent ? "bg-emerald-50 border-emerald-200" : "hover:bg-muted/50 border-transparent"
                                                    )} onClick={() => handleStudentCheck(student.id, !isPresent)}>
                                                        <Checkbox checked={isPresent} onCheckedChange={c => handleStudentCheck(student.id, !!c)} className="pointer-events-none" />
                                                        <span className="font-bold text-sm block truncate cursor-pointer">{student.name}</span>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>

                                    {presentStudents.filter(id => !classData.students.includes(id)).length > 0 && (
                                        <div className="space-y-2 pt-4 border-t">
                                            <h4 className="text-[10px] font-black uppercase text-blue-600 tracking-widest flex items-center gap-2">
                                                <Badge variant="outline" className="bg-blue-50 text-blue-700 h-4 px-1">REPOSIÇÃO</Badge> Alunos de outros meses/ciclos
                                            </h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {presentStudents.filter(id => !classData.students.includes(id)).map(id => {
                                                    const student = users.find(u => u.id === id);
                                                    if (!student) return null;
                                                    return (
                                                        <div key={id} className="flex items-center space-x-3 p-3 rounded-xl bg-blue-50 border-blue-200 border cursor-pointer" onClick={() => handleStudentCheck(id, false)}>
                                                            <Checkbox checked={true} onCheckedChange={() => handleStudentCheck(id, false)} className="pointer-events-none" />
                                                            <span className="font-bold text-sm block truncate cursor-pointer">{student.name}</span>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>

                            <div className="space-y-4 pt-4 border-t">
                                <Label className="text-[10px] uppercase font-black">Conteúdo Ministrado (Automático pela Ementa)</Label>
                                <Textarea value={contentTaught} onChange={e => setContentTaught(e.target.value)} className="h-10 text-xs text-muted-foreground bg-muted/50" />

                                <Label className="text-[10px] uppercase font-black mt-2 block">Observações da Aula</Label>
                                <Textarea value={observations} onChange={e => setObservations(e.target.value)} placeholder="Ex: Aula de reposição para o João..." className="h-20" />
                                <Button onClick={handleSaveLog} disabled={isSaving} className="w-full h-12 font-black shadow-lg mt-2">
                                    {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
                                    Finalizar Registro de Chamada
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-xs font-black uppercase flex items-center gap-2 text-muted-foreground">
                                <History className="size-4" /> Cronograma do Ciclo
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {classOccurrences.map((date, idx) => {
                                    const attendance = classData.attendance?.find((a: any) => a.date === date);
                                    const isSelected = selectedDate === date;
                                    const mName = moduleNames[idx] || '';
                                    const isExtra = resolvedSchedule[idx]?.isExtraSession;
                                    const isRepoOnly = resolvedSchedule[idx]?.isRepositionOnly;
                                    const startTime = resolvedSchedule[idx]?.startTime;
                                    const titlePrefix = isExtra ? 'AULA EXTRA' : `AULA ${idx + 1}`;
                                    
                                    const baseDateStr = date ? date.split('T')[0] : '';
                                    const timeDisplay = startTime ? ` às ${startTime}` : '';

                                    // Validar se a data é válida antes de formatar
                                    let cleanDateStr = baseDateStr;
                                    const dashCount = (baseDateStr.match(/-/g) || []).length;
                                    if (dashCount > 2) {
                                        const parts = baseDateStr.split('-');
                                        cleanDateStr = `${parts[0]}-${parts[1]}-${parts[2]}`;
                                    }

                                    let formattedDate = 'Data Pendente';
                                    if (cleanDateStr) {
                                        try {
                                            const parsed = parseISO(cleanDateStr);
                                            if (!isNaN(parsed.getTime())) {
                                                formattedDate = format(parsed, 'dd/MM/yyyy');
                                            }
                                        } catch (e) {
                                            console.error(e);
                                        }
                                    }

                                    return (
                                        <button key={date} onClick={() => setSelectedDate(date)} className={cn(
                                            "w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between group",
                                            isSelected ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm" : "bg-card hover:bg-muted/50"
                                        )}>
                                            <div className="min-w-0 pr-2">
                                                <p className="text-xs font-black uppercase text-muted-foreground opacity-80 truncate">
                                                    {titlePrefix} {mName ? `- ${mName}` : ''}
                                                </p>
                                                <p className="text-sm font-bold flex items-center gap-2">
                                                    {formattedDate}{timeDisplay}
                                                    {isRepoOnly && <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-[9px] h-4 px-1 py-0 uppercase">Reposição</Badge>}
                                                </p>
                                            </div>
                                            {attendance ? (
                                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[10px] h-5 font-black shrink-0">
                                                    {attendance.presentStudentIds.length} PRS.
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-[10px] h-5 opacity-40 font-black shrink-0">PEND.</Badge>
                                            )}
                                        </button>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

export default function PedagogicalLogPage() {
    return (
        <VolunteeringProvider>
            <PedagogicalLogPageContent />
        </VolunteeringProvider>
    );
}
