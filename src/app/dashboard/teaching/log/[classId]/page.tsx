'use client';
import React, { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useVolunteering } from '@/contexts/volunteering-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, ArrowLeft, BookOpen, Star, Users, CheckCircle2, ClipboardCheck, History, Lock, AlertCircle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
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
    
    const [contentTaught, setContentTaught] = useState('');
    const [observations, setObservations] = useState('');
    const [performance, setPerformance] = useState(3); // Default to 3 stars
    const [presentStudents, setPresentStudents] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    const classData = useMemo(() => classes.find(c => c.id === classId), [classes, classId]);
    const courseData = useMemo(() => classData ? courses.find(c => c.id === classData.courseId) : null, [classData, courses]);
    const teacherData = useMemo(() => classData ? users.find(u => u.id === classData.teacherId) : null, [classData, users]);
    const classLogs = useMemo(() => pedagogicalLogs.filter(log => log.classId === classId).sort((a,b) => b.date.toMillis() - a.date.toMillis()), [pedagogicalLogs, classId]);
    
    const isMemberCourse = courseData?.name?.toLowerCase().includes('membro') || courseData?.name?.toLowerCase().includes('integração') || courseData?.name?.toLowerCase().includes('pertencer');
    const isWaveOrDis = courseData?.ministryName.toLowerCase().includes('wave') || courseData?.ministryName.toLowerCase().includes('dis');
    
    const isModule5 = isMemberCourse && classData?.weekOfMonth === 'last';

    // Se for Wave ou DIS, precisa do diário completo. Se for Membro ou Geral, apenas presença.
    const showPedagogicalFields = isWaveOrDis;

    const studentList = useMemo(() => {
        if (!users || !classData?.students) return [];
        const studentSet = new Set(classData.students);
        return users.filter(u => studentSet.has(u.id));
    }, [users, classData]);

    const handleStudentCheck = (studentId: string, checked: boolean) => {
        setPresentStudents(prev => {
            if (checked) {
                return [...prev, studentId];
            } else {
                return prev.filter(id => id !== studentId);
            }
        });
    };

    const handleSaveLog = async () => {
        if (showPedagogicalFields && !contentTaught.trim()) {
            toast({
                variant: 'destructive',
                title: 'Campo obrigatório',
                description: 'Por favor, descreva o conteúdo ensinado na aula de hoje.',
            });
            return;
        }
        
        setIsSaving(true);
        
        try {
            // 1. Save Pedagogical Log
            const logPromise = addPedagogicalLog({
                classId,
                date: Timestamp.now(),
                content_taught: contentTaught || (isMemberCourse ? `Presença em ${classData?.name}` : "Aula realizada"),
                student_performance: performance,
                observations,
            });

            // 2. Update Class Attendance
            const attendancePromise = classData ? (() => {
                const today = format(new Date(), 'yyyy-MM-dd');
                const newAttendanceRecord = { date: today, presentStudentIds: presentStudents };
                
                const existingAttendance = classData.attendance || [];
                const todayRecordIndex = existingAttendance.findIndex(att => att.date === today);
                
                let updatedAttendance;
                if (todayRecordIndex > -1) {
                    updatedAttendance = [...existingAttendance];
                    updatedAttendance[todayRecordIndex] = newAttendanceRecord;
                } else {
                    updatedAttendance = [...existingAttendance, newAttendanceRecord];
                }

                return updateClass(classId, { attendance: updatedAttendance });
            })() : Promise.resolve();

            // 3. IF MEMBER COURSE: Update individual progress in user profile
            const progressPromises: Promise<any>[] = [];
            if (isMemberCourse && classData?.weekOfMonth && firestore) {
                const moduleKey = `module${classData.weekOfMonth === 'last' ? '5' : classData.weekOfMonth}`;
                presentStudents.forEach(studentId => {
                    const userRef = doc(firestore, 'users', studentId);
                    progressPromises.push(updateDocumentNonBlocking(userRef, {
                        [`journey.memberCourseProgress.${moduleKey}`]: true
                    }));
                });
            }
            
            await Promise.all([logPromise, attendancePromise, ...progressPromises]);

            toast({
                title: 'Sucesso!',
                description: 'Registro de presença salvo com sucesso.',
            });

            setContentTaught('');
            setObservations('');
            setPerformance(3);
            setPresentStudents([]);
        } catch (error) {
            console.error("Erro ao salvar:", error);
            toast({
                variant: 'destructive',
                title: 'Erro ao salvar',
                description: 'Não foi possível salvar os dados. Tente novamente.',
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <div className="flex h-64 w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (!classData) {
        return <div className="p-8 text-center"><p>Turma não encontrada.</p></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para o Painel
                </Button>
                {isMemberCourse && (
                    <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                        <CheckCircle2 className="size-3 mr-1" />
                        Curso de Membro: Módulo {classData.weekOfMonth === 'last' ? '5' : classData.weekOfMonth}
                    </Badge>
                )}
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        {showPedagogicalFields ? <BookOpen /> : <ClipboardCheck />}
                        {showPedagogicalFields ? `Diário de Classe: ${classData.name}` : `Lista de Chamada: ${classData.name}`}
                    </CardTitle>
                    <CardDescription>
                        Curso: {courseData?.name || '...'} | Professor(a): {teacherData?.name || '...'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Form for new log / attendance */}
                    <div className="md:col-span-2 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">
                                    {showPedagogicalFields ? 'Registrar Aula de Hoje' : 'Lançar Presença de Hoje'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {showPedagogicalFields && (
                                    <>
                                        <div>
                                            <Label htmlFor="content">Conteúdo Ensinado</Label>
                                            <Input id="content" value={contentTaught} onChange={e => setContentTaught(e.target.value)} placeholder="Ex: Escalas maiores, inversão de acordes..." />
                                        </div>
                                        <div>
                                            <Label htmlFor="observations">Observações Pedagógicas</Label>
                                            <Textarea id="observations" value={observations} onChange={e => setObservations(e.target.value)} placeholder="Ex: Aluno X teve dificuldade com o ritmo. Reforçar na próxima aula."/>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Desempenho Geral da Turma</Label>
                                            <div className="flex items-center gap-1">
                                                {[1, 2, 3, 4, 5].map(star => (
                                                    <Star
                                                        key={star}
                                                        className={`cursor-pointer transition-colors ${performance >= star ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 hover:text-gray-400'}`}
                                                        onClick={() => setPerformance(star)}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                                
                                <div className={cn("pt-4", showPedagogicalFields && "border-t")}>
                                    <Label className="flex items-center gap-2 mb-2"><Users className="size-4" />Chamada / Presença</Label>
                                    <p className="text-sm text-muted-foreground mb-4">Marque os alunos presentes na data de hoje ({format(new Date(), 'dd/MM/yyyy')}).</p>
                                    
                                    <TooltipProvider>
                                    <ScrollArea className="h-80 w-full rounded-md border p-4">
                                         <div className="space-y-2">
                                            {studentList.length === 0 ? (
                                                <p className="text-sm text-muted-foreground italic">Nenhum aluno matriculado nesta turma.</p>
                                            ) : (
                                                studentList.map(student => {
                                                    const progress = student.journey?.memberCourseProgress || {};
                                                    const hasFinishedFirstFour = ['module1', 'module2', 'module3', 'module4'].every(m => progress[m]);
                                                    const isLocked = isModule5 && !hasFinishedFirstFour;

                                                    return (
                                                        <div key={student.id} className={cn(
                                                            "flex items-center space-x-3 p-3 rounded-lg transition-colors border",
                                                            isLocked ? "bg-slate-50 opacity-60 border-slate-100" : "hover:bg-muted/50 border-transparent"
                                                        )}>
                                                            <Checkbox
                                                                id={`student-${student.id}`}
                                                                checked={presentStudents.includes(student.id)}
                                                                onCheckedChange={checked => handleStudentCheck(student.id, !!checked)}
                                                                disabled={isLocked}
                                                            />
                                                            <div className="flex-1 flex items-center justify-between">
                                                                <Label 
                                                                    htmlFor={`student-${student.id}`} 
                                                                    className={cn("font-medium", isLocked ? "cursor-not-allowed" : "cursor-pointer")}
                                                                >
                                                                    {student.name}
                                                                </Label>
                                                                {isLocked && (
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <div className="flex items-center gap-1.5 text-destructive font-black text-[10px] uppercase bg-destructive/10 px-2 py-1 rounded">
                                                                                <Lock size={12} /> BLOQUEADO
                                                                            </div>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent className="max-w-[200px]">
                                                                            <p className="text-xs">Este aluno ainda não concluiu os 4 módulos anteriores obrigatórios para participar do Comissionamento.</p>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )
                                                })
                                            )}
                                        </div>
                                    </ScrollArea>
                                    </TooltipProvider>
                                </div>

                                <Button onClick={handleSaveLog} disabled={isSaving} className="mt-4 w-full md:w-auto">
                                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {showPedagogicalFields ? 'Salvar Registro e Chamada' : 'Salvar Lista de Presença'}
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                    
                    {/* List of past logs / history */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <History className="size-4" />
                            Histórico
                        </h3>
                        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                            {classLogs.length === 0 ? (
                                <p className="text-muted-foreground text-sm p-4 text-center">Nenhum registro anterior.</p>
                            ) : (
                                classLogs.map(log => (
                                    <div key={log.id} className="p-4 border rounded-lg bg-muted/50">
                                        <p className="font-bold text-xs text-primary">{format(log.date.toDate(), 'dd/MM/yyyy', { locale: ptBR })}</p>
                                        <p className="text-sm mt-2 font-medium">{log.content_taught}</p>
                                        {showPedagogicalFields && (
                                            <>
                                                {log.observations && <p className="text-xs italic text-muted-foreground mt-1">"{log.observations}"</p>}
                                                <div className="flex items-center gap-1 mt-2">
                                                    {[...Array(5)].map((_, i) => (
                                                        <Star key={i} className={`h-3 w-3 ${i < log.student_performance ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
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