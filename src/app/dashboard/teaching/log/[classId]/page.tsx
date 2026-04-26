'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useVolunteering } from '@/contexts/volunteering-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, ArrowLeft, CheckCircle2, ClipboardCheck, History, Plus, Save, UserPlus, Search as SearchIcon } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { format, addWeeks, isBefore, isAfter, startOfDay, parseISO, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Timestamp, doc } from 'firebase/firestore';
import { VolunteeringProvider } from '@/contexts/volunteering-context';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFirebase, updateDocumentNonBlocking } from '@/firebase';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';

const weekDayMap: Record<string, number> = {
    "Domingo": 0, "Segunda-feira": 1, "Terça-feira": 2, "Quarta-feira": 3,
    "Quinta-feira": 4, "Sexta-feira": 5, "Sábado": 6
};

function PedagogicalLogPageContent() {
    const params = useParams();
    const router = useRouter();
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const classId = params.classId as string;
    const {
        classes,
        courses,
        users,
        pedagogicalLogs,
        addPedagogicalLog,
        updateClass,
        isLoading
    } = useVolunteering();

    const [selectedDate, setSelectedDate] = useState<string>('');
    const [contentTaught, setContentTaught] = useState('');
    const [observations, setObservations] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [performance, setPerformance] = useState(5);
    const [presentStudents, setPresentStudents] = useState<string[]>([]);
    const [onlineStudents, setOnlineStudents] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [today, setToday] = useState<Date | null>(null);

    useEffect(() => {
        setToday(startOfDay(new Date()));
    }, []);

    const classData = useMemo(() => classes.find(c => c.id === classId), [classes, classId]);
    const courseData = useMemo(() => classData ? courses.find(c => c.id === classData.courseId) : null, [classData, courses]);

    // Dynamic Module Names based on Course Syllabus
    const moduleNames = useMemo(() => {
        if (!courseData) return [];
        if (courseData.syllabus && courseData.syllabus.length > 0) {
            return courseData.syllabus.map(s => s.title);
        }
        // Fallback for member course if no syllabus is defined
        if (courseData.name?.toLowerCase().includes('membro') || courseData.name?.toLowerCase().includes('pertencer')) {
            return [
                "História e Visão",
                "DNA e Células",
                "Mordomia e Finanças",
                "Governança e Ética",
                "Comissionamento"
            ];
        }
        return [];
    }, [courseData]);

    const classOccurrences = useMemo(() => {
        if (!classData || !classData.startDate) return [];
        const occurrences: string[] = [];
        const start = parseISO(classData.startDate);
        const end = classData.endDate ? parseISO(classData.endDate) : addMonths(start, 1);
        const targetDay = classData.dayOfWeek ? weekDayMap[classData.dayOfWeek] : -1;
        const holidays = new Set(classData.holidayDates || []);
        const extras = classData.extraDates || [];

        let current = start;
        let safe = 0;

        if (classData.frequency && classData.frequency !== 'pontual') {
            while (isBefore(current, end) || format(current, 'yyyy-MM-dd') === format(end, 'yyyy-MM-dd')) {
                if (safe++ > 150) break;
                let matches = false;
                if (classData.frequency === 'semanal') {
                    matches = targetDay === -1 || current.getDay() === targetDay;
                } else if (classData.frequency === 'quinzenal') {
                    const diffWeeks = Math.floor((current.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
                    matches = diffWeeks % 2 === 0 && (targetDay === -1 || current.getDay() === targetDay);
                }
                const dateStr = format(current, 'yyyy-MM-dd');
                if (matches && !holidays.has(dateStr)) occurrences.push(dateStr);
                current = addWeeks(current, 1);
            }
        } else if (classData.frequency === 'pontual') {
            occurrences.push(classData.startDate);
        }

        return Array.from(new Set([...occurrences, ...extras])).sort();
    }, [classData]);

    useEffect(() => {
        if (classOccurrences.length > 0 && !selectedDate) {
            const todayStr = format(new Date(), 'yyyy-MM-dd');
            const closest = classOccurrences.find(d => d === todayStr) || classOccurrences.find(d => isAfter(parseISO(d), new Date())) || classOccurrences[0];
            setSelectedDate(closest);
        }
    }, [classOccurrences, selectedDate]);

    const currentModuleIndex = useMemo(() => classOccurrences.indexOf(selectedDate), [classOccurrences, selectedDate]);
    const currentModuleKey = `module${currentModuleIndex + 1}`;

    useEffect(() => {
        if (selectedDate && classData?.attendance) {
            const record = classData.attendance.find(a => a.date === selectedDate);
            setPresentStudents(record?.presentStudentIds || []);
            setOnlineStudents(record?.onlineStudentIds || []);

            const log = pedagogicalLogs.find(l => {
                const logDate = l.date?.toDate ? l.date.toDate() : (l.date instanceof Date ? l.date : null);
                return l.classId === classId && logDate && format(logDate, 'yyyy-MM-dd') === selectedDate;
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

    const isMemberCourse = courseData?.name?.toLowerCase().includes('membro') || courseData?.name?.toLowerCase().includes('pertencer');

    const enrolledStudents = useMemo(() => {
        if (!users || !classData?.students) return [];
        const studentSet = new Set(classData.students);
        return users
            .filter(u => studentSet.has(u.id))
            .filter(u => (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'));
    }, [users, classData, searchTerm]);

    // Alunos de TURMAS ANTERIORES do mesmo curso que faltaram a este módulo específico
    const previousClassStudentsForModule = useMemo(() => {
        if (!users || !selectedDate || currentModuleIndex === -1 || !isMemberCourse || !courseData) return [];
        const currentEnrolledIds = new Set(classData?.students || []);

        // Turmas anteriores do mesmo curso (excluindo a turma atual)
        const siblingClasses = classes.filter(c => c.courseId === courseData.id && c.id !== classId);

        const studentIds = new Set<string>();
        siblingClasses.forEach(sibling => {
            (sibling.students || []).forEach(sid => {
                // Não está na turma atual
                if (currentEnrolledIds.has(sid)) return;
                // Ainda não tem o módulo concluído
                const user = users.find(u => u.id === sid);
                if (!user) return;
                if (user.journey?.memberCourseProgress?.[currentModuleKey]) return;
                studentIds.add(sid);
            });
        });

        return users.filter(u => studentIds.has(u.id));
    }, [users, classes, classData, courseData, classId, selectedDate, currentModuleIndex, currentModuleKey, isMemberCourse]);

    // Lógica para sugerir alunos que precisam repor este módulo específico (pendência no progresso geral)
    const repositionSuggestions = useMemo(() => {
        if (!users || !selectedDate || currentModuleIndex === -1 || !isMemberCourse) return [];
        const enrolledIds = new Set(classData?.students || []);
        const previousClassIds = new Set(previousClassStudentsForModule.map(u => u.id));

        return users.filter(u => {
            const isNotEnrolled = !enrolledIds.has(u.id);
            const isNotFromPreviousClass = !previousClassIds.has(u.id); // evitar duplicata
            const hasPending = !u.journey?.memberCourseProgress?.[currentModuleKey];
            const isStudent = u.integrationStatus === 'novo_convertido' || u.integrationStatus === 'membro' || u.integrationStatus === 'consolidado';
            return isNotEnrolled && isNotFromPreviousClass && hasPending && isStudent;
        }).slice(0, 15);
    }, [users, classData, selectedDate, currentModuleIndex, currentModuleKey, isMemberCourse, previousClassStudentsForModule]);

    const handleStudentCheck = (studentId: string, checked: boolean) => {
        setPresentStudents(prev => checked ? [...prev, studentId] : prev.filter(id => id !== studentId));
    };

    const handleAddRepositionStudent = (studentId: string) => {
        if (presentStudents.includes(studentId)) return;
        setPresentStudents(prev => [...prev, studentId]);
        setIsSearchOpen(false);
        setSearchQuery('');
        toast({ title: "Reposição adicionada", description: "O aluno foi incluído na lista desta aula." });
    };

    const handleSaveLog = async () => {
        if (!selectedDate) return;
        setIsSaving(true);
        try {
            const logPromise = addPedagogicalLog({
                classId,
                date: Timestamp.fromDate(new Date(`${selectedDate}T12:00:00`)),
                content_taught: contentTaught || "Aula realizada",
                student_performance: performance,
                observations,
            });

            const existingAttendance = classData?.attendance || [];
            const updatedAttendance = [
                ...existingAttendance.filter(a => a.date !== selectedDate),
                { date: selectedDate, presentStudentIds: presentStudents, onlineStudentIds: onlineStudents }
            ];
            const attendancePromise = updateClass(classId, { attendance: updatedAttendance });

            const progressPromises: Promise<any>[] = [];
            if (isMemberCourse && firestore) {
                presentStudents.forEach(studentId => {
                    const userRef = doc(firestore, 'users', studentId);
                    progressPromises.push(updateDocumentNonBlocking(userRef, { [`journey.memberCourseProgress.${currentModuleKey}`]: true }));
                });
            }

            await Promise.all([logPromise, attendancePromise, ...progressPromises]);
            toast({ title: 'Registro Salvo!', description: `A presença de ${format(parseISO(selectedDate), 'dd/MM')} foi processada.` });
        } catch (error) {
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
                <div className="flex items-center gap-4 bg-white p-2 rounded-xl border shadow-sm w-full md:w-auto">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-2">Sessão do Ciclo:</Label>
                    <Select value={selectedDate} onValueChange={setSelectedDate}>
                        <SelectTrigger className="w-[280px] h-9 font-bold">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {classOccurrences.map((date, idx) => {
                                const attendance = classData.attendance?.find(a => a.date === date);
                                const hasAttendance = attendance && (attendance.presentStudentIds.length > 0);
                                const moduleName = moduleNames[idx] ? `- ${moduleNames[idx]}` : '';
                                return (
                                    <SelectItem key={date} value={date}>
                                        <div className="flex items-center justify-between w-full gap-2">
                                            <span className="font-bold truncate">Aula {idx + 1} {moduleName}</span>
                                            {hasAttendance && <CheckCircle2 className="size-3 text-emerald-500 shrink-0" />}
                                        </div>
                                    </SelectItem>
                                )
                            })}
                        </SelectContent>
                    </Select>
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
                                    const attendance = classData.attendance?.find(a => a.date === date);
                                    const isSelected = selectedDate === date;
                                    const mName = moduleNames[idx] || '';
                                    return (
                                        <button key={date} onClick={() => setSelectedDate(date)} className={cn(
                                            "w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between group",
                                            isSelected ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm" : "bg-card hover:bg-muted/50"
                                        )}>
                                            <div className="min-w-0 pr-2">
                                                <p className="text-xs font-black uppercase text-muted-foreground opacity-80 truncate">Aula {idx + 1} {mName ? `- ${mName}` : ''}</p>
                                                <p className="text-sm font-bold">{format(parseISO(date), 'dd/MM/yyyy')}</p>
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
