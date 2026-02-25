
'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useVolunteering } from '@/contexts/volunteering-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, ArrowLeft, BookOpen, Star, Users, CheckCircle2, ClipboardCheck, History, Lock, AlertCircle, Calendar as CalendarIcon, ChevronRight, ChevronLeft, MinusCircle, Clock, Save, PlayCircle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { format, addWeeks, isBefore, isAfter, startOfDay, parseISO, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Timestamp } from 'firebase/firestore';
import { VolunteeringProvider } from '@/contexts/volunteering-context';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
    const [performance, setPerformance] = useState(3);
    const [presentStudents, setPresentStudents] = useState<string[]>([]);
    const [onlineStudents, setOnlineStudents] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    const classData = useMemo(() => classes.find(c => c.id === classId), [classes, classId]);
    const courseData = useMemo(() => classData ? courses.find(c => c.id === classData.courseId) : null, [classData, courses]);
    
    // Cálculo das datas válidas de aula
    const classOccurrences = useMemo(() => {
        if (!classData || !classData.startDate) return [];
        const occurrences: string[] = [];
        const start = parseISO(classData.startDate);
        const end = classData.endDate ? parseISO(classData.endDate) : addMonths(start, 6);
        const targetDay = classData.dayOfWeek ? weekDayMap[classData.dayOfWeek] : -1;
        const holidays = new Set(classData.holidayDates || []);

        let current = start;
        let safe = 0;

        if (!classData.frequency || classData.frequency === 'pontual') {
            const dateStr = classData.startDate;
            return holidays.has(dateStr) ? [] : [dateStr];
        }

        while (isBefore(current, end) || format(current, 'yyyy-MM-dd') === format(end, 'yyyy-MM-dd')) {
            if (safe++ > 100) break;

            let matches = false;
            if (classData.frequency === 'semanal') {
                matches = targetDay === -1 || current.getDay() === targetDay;
            } else if (classData.frequency === 'quinzenal') {
                const diffWeeks = Math.floor((current.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
                matches = diffWeeks % 2 === 0 && (targetDay === -1 || current.getDay() === targetDay);
            } else if (classData.frequency === 'mensal') {
                if (classData.weekOfMonth) {
                    const week = Math.ceil(current.getDate() / 7);
                    const isLastWeek = current.getDate() > (new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate() - 7);
                    matches = (classData.weekOfMonth === 'last' && isLastWeek) || (week.toString() === classData.weekOfMonth);
                    matches = matches && current.getDay() === targetDay;
                } else {
                    matches = current.getDate() === start.getDate();
                }
            }

            const dateStr = format(current, 'yyyy-MM-dd');
            if (matches && !holidays.has(dateStr)) {
                occurrences.push(dateStr);
            }
            current = addWeeks(current, 1);
        }
        return occurrences;
    }, [classData]);

    useEffect(() => {
        if (classOccurrences.length > 0 && !selectedDate) {
            const today = format(new Date(), 'yyyy-MM-dd');
            const closest = classOccurrences.find(d => d === today) || classOccurrences.find(d => isAfter(parseISO(d), new Date())) || classOccurrences[0];
            setSelectedDate(closest);
        }
    }, [classOccurrences, selectedDate]);

    useEffect(() => {
        if (selectedDate && classData?.attendance) {
            const record = classData.attendance.find(a => a.date === selectedDate);
            setPresentStudents(record?.presentStudentIds || []);
            setOnlineStudents(record?.onlineStudentIds || []);
            
            const log = pedagogicalLogs.find(l => l.classId === classId && format(l.date.toDate(), 'yyyy-MM-dd') === selectedDate);
            if (log) {
                setContentTaught(log.content_taught);
                setObservations(log.observations);
                setPerformance(log.student_performance);
            } else {
                setContentTaught('');
                setObservations('');
                setPerformance(3);
            }
        }
    }, [selectedDate, classData, pedagogicalLogs, classId]);

    const isMemberCourse = courseData?.name?.toLowerCase().includes('membro') || courseData?.name?.toLowerCase().includes('integração');
    const isWaveOrDis = courseData?.ministryName.toLowerCase().includes('wave') || courseData?.ministryName.toLowerCase().includes('dis');
    const showPedagogicalFields = isWaveOrDis;

    const studentList = useMemo(() => {
        if (!users || !classData?.students) return [];
        const studentSet = new Set(classData.students);
        return users.filter(u => studentSet.has(u.id));
    }, [users, classData]);

    const handleStudentCheck = (studentId: string, checked: boolean) => {
        setPresentStudents(prev => checked ? [...prev, studentId] : prev.filter(id => id !== studentId));
    };

    const handleSaveLog = async () => {
        if (showPedagogicalFields && !contentTaught.trim()) {
            toast({ variant: 'destructive', title: 'Campo obrigatório', description: 'Descreva o conteúdo ensinado.' });
            return;
        }
        
        setIsSaving(true);
        try {
            const logPromise = addPedagogicalLog({
                classId,
                date: Timestamp.fromDate(new Date(`${selectedDate}T12:00:00`)),
                content_taught: contentTaught || (isMemberCourse ? `Presença Módulo ${classData?.weekOfMonth}` : "Aula realizada"),
                student_performance: performance,
                observations,
            });

            const existingAttendance = classData?.attendance || [];
            // Mantemos os onlineStudentIds que já existiam para aquela data
            const updatedAttendance = [
                ...existingAttendance.filter(a => a.date !== selectedDate), 
                { date: selectedDate, presentStudentIds: presentStudents, onlineStudentIds: onlineStudents }
            ];
            const attendancePromise = updateClass(classId, { attendance: updatedAttendance });

            const progressPromises: Promise<any>[] = [];
            if (isMemberCourse && classData?.weekOfMonth && firestore) {
                const moduleKey = `module${classData.weekOfMonth === 'last' ? '5' : classData.weekOfMonth}`;
                presentStudents.forEach(studentId => {
                    const userRef = doc(firestore, 'users', studentId);
                    progressPromises.push(updateDocumentNonBlocking(userRef, { [`journey.memberCourseProgress.${moduleKey}`]: true }));
                });
            }
            
            await Promise.all([logPromise, attendancePromise, ...progressPromises]);
            toast({ title: 'Chamada Salva!', description: `Frequência de ${format(parseISO(selectedDate), 'dd/MM')} registrada.` });
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
            <div className="flex justify-between items-center">
                <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para o Painel
                </Button>
                <div className="flex items-center gap-4 bg-white p-2 rounded-xl border shadow-sm">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-2">Data da Aula:</Label>
                    <Select value={selectedDate} onValueChange={setSelectedDate}>
                        <SelectTrigger className="w-[200px] h-9 font-bold">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {classOccurrences.map(date => {
                                const attendance = classData.attendance?.find(a => a.date === date);
                                const hasAttendance = attendance && (attendance.presentStudentIds.length > 0 || attendance.onlineStudentIds?.length > 0);
                                return (
                                    <SelectItem key={date} value={date}>
                                        <div className="flex items-center justify-between w-full gap-2">
                                            <span>{format(parseISO(date), 'dd/MM/yyyy')}</span>
                                            {hasAttendance && <CheckCircle2 className="size-3 text-emerald-500" />}
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
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ClipboardCheck className="text-primary" />
                                Lista de Chamada: {format(parseISO(selectedDate || '2000-01-01'), 'dd/MM/yyyy')}
                            </CardTitle>
                            <CardDescription>Marque os nomes para registrar presença física.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <TooltipProvider>
                                <ScrollArea className="h-[500px] w-full rounded-md border p-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {studentList.map(student => {
                                            const isCidade = student.integrationStatus === 'nao_alcancado';
                                            const isLockedByStatus = isMemberCourse && isCidade;
                                            const isPresentPhysical = presentStudents.includes(student.id);
                                            const isPresentOnline = onlineStudents.includes(student.id);

                                            return (
                                                <div key={student.id} className={cn(
                                                    "flex items-center space-x-3 p-3 rounded-xl transition-all border cursor-pointer",
                                                    isPresentPhysical ? "bg-emerald-50 border-emerald-200" : isPresentOnline ? "bg-blue-50 border-blue-200" : "hover:bg-muted/50 border-transparent",
                                                    isLockedByStatus && "opacity-50 grayscale"
                                                )} onClick={() => !isLockedByStatus && handleStudentCheck(student.id, !isPresentPhysical)}>
                                                    <Checkbox
                                                        id={`student-${student.id}`}
                                                        checked={isPresentPhysical}
                                                        onCheckedChange={checked => handleStudentCheck(student.id, !!checked)}
                                                        disabled={isLockedByStatus}
                                                        className="pointer-events-none"
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <Label className="font-bold text-sm block truncate">{student.name}</Label>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            {isLockedByStatus && <span className="text-[9px] text-destructive font-black uppercase tracking-tighter">Bloqueado (Cidade)</span>}
                                                            {isPresentOnline && <Badge variant="outline" className="text-[8px] h-4 bg-blue-100 text-blue-700 border-none uppercase font-black"><PlayCircle className="size-2 mr-1"/> Validado Online</Badge>}
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </ScrollArea>
                            </TooltipProvider>

                            {showPedagogicalFields && (
                                <div className="space-y-4 pt-6 border-t">
                                    <h3 className="font-bold text-sm uppercase text-primary">Relatório da Aula</h3>
                                    <div className="grid gap-4">
                                        <div>
                                            <Label>Conteúdo Ministrado</Label>
                                            <Input value={contentTaught} onChange={e => setContentTaught(e.target.value)} placeholder="O que foi ensinado hoje?" />
                                        </div>
                                        <div>
                                            <Label>Observações</Label>
                                            <Textarea value={observations} onChange={e => setObservations(e.target.value)} placeholder="Ex: Aluno com dificuldade no rítmo..." />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Label>Desempenho da Turma:</Label>
                                            <div className="flex gap-1">
                                                {[1,2,3,4,5].map(s => (
                                                    <Star key={s} className={cn("size-5 cursor-pointer", performance >= s ? "fill-yellow-400 text-yellow-400" : "text-slate-300")} onClick={() => setPerformance(s)} />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <Button onClick={handleSaveLog} disabled={isSaving} className="w-full h-12 text-base font-bold shadow-lg">
                                {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
                                Salvar Registro de {format(parseISO(selectedDate || '2000-01-01'), 'dd/MM')}
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-bold uppercase flex items-center gap-2">
                                <History className="size-4" /> Histórico & Estados
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[600px]">
                                <div className="space-y-3">
                                    {classOccurrences.map(date => {
                                        const attendance = classData.attendance?.find(a => a.date === date);
                                        const isPast = isBefore(parseISO(date), startOfDay(new Date()));
                                        const isToday = date === format(new Date(), 'yyyy-MM-dd');
                                        const isSelected = selectedDate === date;

                                        return (
                                            <button
                                                key={date}
                                                onClick={() => setSelectedDate(date)}
                                                className={cn(
                                                    "w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between group",
                                                    isSelected ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "bg-card hover:bg-muted/50"
                                                )}
                                            >
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold">{format(parseISO(date), 'dd/MM/yyyy', { locale: ptBR })}</p>
                                                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-tighter">
                                                        {isToday ? 'Hoje' : isPast ? 'Passada' : 'Pendente'}
                                                    </p>
                                                </div>
                                                {attendance ? (
                                                    <div className="text-right flex flex-col items-end gap-1">
                                                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[9px] h-5">
                                                            {attendance.presentStudentIds.length} físicos
                                                        </Badge>
                                                        {attendance.onlineStudentIds && attendance.onlineStudentIds.length > 0 && (
                                                            <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 text-[9px] h-5">
                                                                {attendance.onlineStudentIds.length} online
                                                            </Badge>
                                                        )}
                                                    </div>
                                                ) : isPast ? (
                                                    <div className="text-right">
                                                        <Badge variant="outline" className="text-[9px] h-5 text-destructive border-destructive/30 bg-destructive/5 flex items-center gap-1">
                                                            <MinusCircle size={10}/> Não realizada
                                                        </Badge>
                                                    </div>
                                                ) : (
                                                    <div className="text-right opacity-30 group-hover:opacity-100">
                                                        <Badge variant="outline" className="text-[9px] h-5 flex items-center gap-1">
                                                            <Clock size={10}/> Pendente
                                                        </Badge>
                                                    </div>
                                                )}
                                            </button>
                                        )
                                    })}
                                </div>
                            </ScrollArea>
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
