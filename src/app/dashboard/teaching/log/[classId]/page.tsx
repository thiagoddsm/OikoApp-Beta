
'use client';
import React, { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useVolunteering } from '@/contexts/volunteering-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, ArrowLeft, BookOpen, Star, Users, CheckCircle2 } from 'lucide-react';
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
    
    const isMemberCourse = courseData?.name?.toLowerCase().includes('membro') || courseData?.name?.toLowerCase().includes('integração');

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
        if (!contentTaught.trim()) {
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
                content_taught: contentTaught,
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
                    // Non-blocking update for student progress
                    progressPromises.push(updateDocumentNonBlocking(userRef, {
                        [`journey.memberCourseProgress.${moduleKey}`]: true
                    }));
                });
            }
            
            await Promise.all([logPromise, attendancePromise, ...progressPromises]);

            toast({
                title: 'Sucesso!',
                description: 'Registro de aula e presença salvos com sucesso.',
            });

            setContentTaught('');
            setObservations('');
            setPerformance(3);
            setPresentStudents([]);
        } catch (error) {
            console.error("Erro ao salvar diário de classe:", error);
            toast({
                variant: 'destructive',
                title: 'Erro ao salvar',
                description: 'Ocorreu um erro ao tentar salvar os dados. Verifique sua conexão.',
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
                    <CardTitle className="flex items-center gap-2"><BookOpen />Diário de Classe: {classData.name}</CardTitle>
                    <CardDescription>
                        Curso: {courseData?.name || '...'} | Professor(a): {teacherData?.name || '...'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Form for new log */}
                    <div className="md:col-span-2 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Registrar Aula de Hoje</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
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
                                
                                <div className="pt-4 border-t">
                                    <Label className="flex items-center gap-2 mb-2"><Users className="size-4" />Chamada / Presença</Label>
                                    <p className="text-sm text-muted-foreground mb-2">Marque os alunos presentes. A conclusão do módulo será registrada automaticamente no perfil do aluno.</p>
                                    <ScrollArea className="h-40 w-full rounded-md border p-4">
                                         <div className="space-y-2">
                                            {studentList.map(student => (
                                                <div key={student.id} className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={`student-${student.id}`}
                                                        checked={presentStudents.includes(student.id)}
                                                        onCheckedChange={checked => handleStudentCheck(student.id, !!checked)}
                                                    />
                                                    <Label htmlFor={`student-${student.id}`} className="font-normal cursor-pointer">
                                                        {student.name}
                                                    </Label>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </div>

                                <Button onClick={handleSaveLog} disabled={isSaving} className="mt-4">
                                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Salvar Registro e Presença
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                    
                    {/* List of past logs */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4">Histórico de Aulas</h3>
                        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                            {classLogs.length === 0 ? (
                                <p className="text-muted-foreground text-sm p-4 text-center">Nenhum registro encontrado para esta turma.</p>
                            ) : (
                                classLogs.map(log => (
                                    <div key={log.id} className="p-4 border rounded-lg bg-muted/50">
                                        <p className="font-bold text-sm">{format(log.date.toDate(), 'dd/MM/yyyy', { locale: ptBR })}</p>
                                        <p className="text-sm mt-2">{log.content_taught}</p>
                                        {log.observations && <p className="text-xs italic text-muted-foreground mt-1">"{log.observations}"</p>}
                                        <div className="flex items-center gap-1 mt-2">
                                            {[...Array(5)].map((_, i) => (
                                                <Star key={i} className={`h-3 w-3 ${i < log.student_performance ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                                            ))}
                                        </div>
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
