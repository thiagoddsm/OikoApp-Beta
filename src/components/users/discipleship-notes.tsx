'use client';
import React, { useState, useMemo } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, HelpCircle, CheckCircle, Send, GraduationCap, PlusCircle, ShieldCheck, UserCheck, AlertTriangle, BookOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { cn } from '@/lib/utils';
import { FollowUpTimeline, Note } from './follow-up-timeline';
import { query, collection } from 'firebase/firestore';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from '../ui/textarea';
import { useVolunteering } from '@/contexts/volunteering-context';
import { journeyColumns } from './journey-status-config';
import { EnrollmentDialog } from '../teaching/enrollment-dialog';
import { Badge } from '../ui/badge';

type ChecklistQuestion = {
    id: string;
    label: string;
    type: 'checkbox' | 'text' | 'date';
};

type DiscipleshipChecklist = {
    id: string;
    title: string;
    questions: ChecklistQuestion[];
    requiredCourseId?: string;
    requiresDisciplerApproval?: boolean;
    requiresSupervisorApproval?: boolean;
};

export function DiscipleshipNotes({ memberId, memberName, currentStatusId }: { memberId: string, memberName: string, currentStatusId: string }) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const { updateVolunteer, classes, courses, users } = useVolunteering();
    const [isSaving, setIsSaving] = useState<string | null>(null);
    const [isEnrollmentOpen, setEnrollmentOpen] = useState(false);
    
    const memberData = useMemo(() => users.find(u => u.id === memberId), [users, memberId]);
    
    const checklistsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'discipleship_checklists')) : null, [firestore]);
    const { data: dbChecklists, isLoading: isLoadingChecklists } = useCollection<DiscipleshipChecklist>(checklistsQuery);
    
    const stageProgress = memberData?.journey?.stageProgress || {};

    const [timelineNotes, setTimelineNotes] = useState<Note[]>([
        { id: '1', authorId: 'admin', type: 'system', content: `Perfil criado na base de dados.`, createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    ]);

    // Modularized course status
    const myCoursesStatus = useMemo(() => {
        const studentClasses = classes.filter(cls => cls.students?.includes(memberId));
        const courseIds = Array.from(new Set(studentClasses.map(c => c.courseId)));
        
        return courseIds.map(courseId => {
            const course = courses.find(c => c.id === courseId);
            const courseClasses = classes.filter(c => c.courseId === courseId);
            const isMembership = course?.name.toLowerCase().includes('membro') || course?.name.toLowerCase().includes('pertencer');
            
            // For modular courses, we count unique modules completed
            if (isMembership) {
                const modulesCompleted = new Set();
                courseClasses.forEach(cls => {
                    const hasAttended = cls.attendance?.some(att => 
                        att.presentStudentIds.includes(memberId) || 
                        att.onlineStudentIds?.includes(memberId)
                    );
                    if (hasAttended && cls.weekOfMonth) modulesCompleted.add(cls.weekOfMonth);
                });
                
                const mandatoryModules = ['1', '2', '3', '4'];
                const isCompleted = mandatoryModules.every(m => modulesCompleted.has(m));

                return {
                    id: courseId,
                    name: course?.name || 'Curso Desconhecido',
                    ministry: course?.ministryName || 'Ensino',
                    isCompleted,
                    attendedCount: modulesCompleted.size,
                    totalCount: 5,
                    isModular: true
                };
            }

            // Normal course logic
            const attendedCount = courseClasses.filter(cls => 
                cls.attendance?.some(att => att.presentStudentIds.includes(memberId))
            ).length;
            
            const totalClasses = courseClasses.length;
            const isCompleted = memberData?.journey?.courseStatus?.[courseId] === 'approved' || (totalClasses > 0 && attendedCount === totalClasses);

            return {
                id: courseId,
                name: course?.name || 'Curso Desconhecido',
                ministry: course?.ministryName || 'Ensino',
                isCompleted,
                attendedCount,
                totalCount: totalClasses,
                isModular: false
            };
        });
    }, [classes, courses, memberId, memberData]);

    const finalChecklists = useMemo(() => {
        if (dbChecklists && dbChecklists.length > 0) {
            return [...dbChecklists].sort((a, b) => {
                const indexA = journeyColumns.findIndex(col => col.id === a.id);
                const indexB = journeyColumns.findIndex(col => col.id === b.id);
                return indexA - indexB;
            });
        }
        return journeyColumns.map(col => ({
            id: col.id,
            title: col.title,
            questions: [],
        } as DiscipleshipChecklist));
    }, [dbChecklists]);

    const validateTransition = (targetStageId: string): { valid: boolean; message?: string } => {
        if (!memberData) return { valid: false };

        const currentStageId = memberData.integrationStatus || 'nao_alcancado';
        
        // Regras Específicas
        if (targetStageId === 'novo_convertido' && currentStageId === 'nao_alcancado') {
            const hasDecision = memberData.decisao?.includes('Decisão por Cristo') || memberData.initialStatus === 'novo_convertido';
            if (!hasDecision) return { valid: false, message: "Este membro precisa registrar uma 'Decisão por Cristo' antes de se tornar Novo Convertido." };
        }

        if (targetStageId === 'membro') {
            // Updated logic for 4 modules
            const progress = memberData.journey?.memberCourseProgress || {};
            const mandatoryModules = ['module1', 'module2', 'module3', 'module4'];
            const completedMandatory = mandatoryModules.every(m => progress[m]);
            
            if (!completedMandatory) return { valid: false, message: "O membro precisa concluir os 4 primeiros módulos do Curso Pertencer (Membros) primeiro." };

            if (memberData.integrationStatus === 'novo_convertido' && memberData.batizado !== 'sim') {
                return { valid: false, message: "Novos convertidos precisam do Batismo nas águas para se tornarem membros IBM." };
            }
        }

        return { valid: true };
    };

    const handleCompleteStage = (currentStageId: string) => {
        const currentIndex = journeyColumns.findIndex(col => col.id === currentStageId);

        if (currentIndex === -1) return;
        if (currentIndex >= journeyColumns.length - 1) {
             toast({ title: "Jornada Completa", description: `${memberName} já atingiu o nível máximo.` });
            return;
        }

        const nextStage = journeyColumns[currentIndex + 1];
        const validation = validateTransition(nextStage.id);

        if (!validation.valid) {
            toast({
                variant: 'destructive',
                title: "Critério não atingido",
                description: validation.message,
            });
            return;
        }

        updateVolunteer(memberId, { integrationStatus: nextStage.id });
        toast({
            title: "Status Atualizado!",
            description: `${memberName} avançou para "${nextStage.title}".`,
        });
    };

    const handleAnswerChange = (checklistId: string, questionId: string, value: boolean | string) => {
        const currentProgress = stageProgress[checklistId] || { answers: {}, approvals: {} };
        const updatedProgress = {
            ...currentProgress,
            answers: { ...currentProgress.answers, [questionId]: value }
        };
        
        updateVolunteer(memberId, {
            [`journey.stageProgress.${checklistId}`]: updatedProgress
        });
    };
    
    const handleApprovalChange = (checklistId: string, role: 'discipler' | 'supervisor', field: 'approved' | 'notes', value: any) => {
        const currentProgress = stageProgress[checklistId] || { answers: {}, approvals: {} };
        const updatedApprovals = {
            ...currentProgress.approvals,
            [role]: { ...(currentProgress.approvals?.[role] || { approved: false, notes: '' }), [field]: value }
        };
        
        updateVolunteer(memberId, {
            [`journey.stageProgress.${checklistId}`]: { ...currentProgress, approvals: updatedApprovals }
        });
    };

    const handleSaveStage = (checklist: DiscipleshipChecklist) => {
        setIsSaving(checklist.id);
        setTimeout(() => {
            setIsSaving(null);
            toast({ title: "Progresso Salvo", description: `As anotações de "${checklist.title}" foram arquivadas.` });
        }, 800);
    };

    if (isLoadingChecklists) {
      return (
        <div className="flex items-center justify-center p-8 h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }
    
    return (
      <div className="space-y-6">
        {/* Validação Técnica (Cursos & Trilhos) */}
        <Card className="bg-emerald-50/50 border-emerald-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                    <CardTitle className="text-lg flex items-center gap-2 text-emerald-800">
                        <GraduationCap className="size-5" />
                        Validação Técnica (Cursos & Trilhos)
                    </CardTitle>
                    <CardDescription className="text-emerald-700/70">Histórico de formação e conclusão de disciplinas.</CardDescription>
                </div>
                <Button size="sm" onClick={() => setEnrollmentOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
                    <PlusCircle className="mr-2 h-4 w-4" /> Matricular Aluno
                </Button>
            </CardHeader>
            <CardContent>
                <div className="flex flex-wrap gap-3 mt-2">
                    {myCoursesStatus.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic py-2">Nenhum curso ou trilho vinculado no momento.</p>
                    ) : (
                        myCoursesStatus.map(course => (
                            <div key={course.id} className="flex items-center gap-3 bg-white p-3 rounded-lg border border-emerald-100 shadow-sm group hover:border-emerald-300 transition-colors">
                                <div className={cn(
                                    "size-2.5 rounded-full shrink-0", 
                                    course.isCompleted ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-amber-500 animate-pulse"
                                )} />
                                <div className="text-xs">
                                    <span className="font-bold text-emerald-900 block">{course.name}</span>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Badge variant="outline" className={cn(
                                            "text-[9px] uppercase font-black px-1.5 h-4 border-none",
                                            course.isCompleted ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                                        )}>
                                            {course.isCompleted ? "Concluído" : "Cursando"}
                                        </Badge>
                                        <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-tighter">
                                            {course.attendedCount}/{course.totalCount} {course.isModular ? 'módulos' : 'aulas'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>

        {/* Validação Humana (Checklists e Aprovações) */}
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><UserCheck className="size-5 text-primary" /> Validação Humana & Discipulado</CardTitle>
                <CardDescription>Acompanhamento prático e validação ministerial do líder.</CardDescription>
            </CardHeader>
            <CardContent>
                 <Tabs defaultValue={currentStatusId || 'nao_alcancado'} className="w-full">
                    <div className="overflow-x-auto pb-2">
                        <TabsList className="flex h-auto justify-start bg-muted/50 p-1 mb-6 min-w-max">
                            {finalChecklists.map(checklist => (
                                <TabsTrigger 
                                    key={checklist.id} 
                                    value={checklist.id}
                                    className="data-[state=active]:bg-white whitespace-nowrap"
                                >
                                    {checklist.title}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </div>
                    {finalChecklists.map(checklist => {
                        const progress = stageProgress[checklist.id] || { answers: {}, approvals: {} };
                        const validation = validateTransition(journeyColumns[journeyColumns.findIndex(c => c.id === checklist.id) + 1]?.id);

                        return (
                        <TabsContent key={checklist.id} value={checklist.id} className="mt-0 space-y-8 animate-in fade-in-50">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <h4 className="text-xs font-black uppercase text-muted-foreground tracking-widest mb-4">Checklist da Etapa</h4>
                                    {checklist.questions.length > 0 ? (
                                        checklist.questions.map(q => {
                                            const answer = progress.answers[q.id];
                                            const label = q.label.replace('[nome]', memberName);

                                            return (
                                                <div key={q.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-start gap-3">
                                                    {q.type === 'checkbox' ? (
                                                        <Checkbox
                                                            id={`${checklist.id}-${q.id}`}
                                                            checked={!!answer}
                                                            onCheckedChange={(checked) => handleAnswerChange(checklist.id, q.id, !!checked)}
                                                            className="mt-0.5"
                                                        />
                                                    ) : null}
                                                    <div className="flex-1 space-y-1.5">
                                                        <Label htmlFor={`${checklist.id}-${q.id}`} className="font-bold text-sm cursor-pointer">{label}</Label>
                                                        {q.type !== 'checkbox' && (
                                                            <Input
                                                                id={`${checklist.id}-${q.id}`}
                                                                type={q.type === 'date' ? 'date' : 'text'}
                                                                value={typeof answer === 'string' ? answer : ''}
                                                                onChange={(e) => handleAnswerChange(checklist.id, q.id, e.target.value)}
                                                                className="h-8 text-xs bg-white"
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="p-8 border-2 border-dashed rounded-xl text-center text-muted-foreground text-sm">
                                            Nenhum checklist configurado para esta fase. Configure em Pessoas &gt; Configurações.
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-6">
                                    <h4 className="text-xs font-black uppercase text-muted-foreground tracking-widest mb-4">Aprovações de Líderes</h4>
                                    
                                    {(checklist.requiresDisciplerApproval || checklist.requiresSupervisorApproval) ? (
                                        <div className="space-y-4">
                                            {checklist.requiresDisciplerApproval && (
                                                <div className={cn("p-4 rounded-xl border-2 transition-all", progress.approvals?.discipler?.approved ? "bg-emerald-50 border-emerald-500" : "bg-slate-50 border-slate-200")}>
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className={cn("p-1.5 rounded-lg", progress.approvals?.discipler?.approved ? "bg-emerald-500 text-white" : "bg-slate-300 text-slate-500")}>
                                                                <ShieldCheck size={16} />
                                                            </div>
                                                            <Label className="font-black text-xs uppercase">Discipulador</Label>
                                                        </div>
                                                        <Checkbox
                                                            checked={progress.approvals?.discipler?.approved || false}
                                                            onCheckedChange={(v) => handleApprovalChange(checklist.id, 'discipler', 'approved', !!v)}
                                                        />
                                                    </div>
                                                    <Textarea
                                                        placeholder="Notas do discipulador..."
                                                        className="text-xs bg-white min-h-[60px]"
                                                        value={progress.approvals?.discipler?.notes || ''}
                                                        onChange={(e) => handleApprovalChange(checklist.id, 'discipler', 'notes', e.target.value)}
                                                    />
                                                </div>
                                            )}

                                            {checklist.requiresSupervisorApproval && (
                                                <div className={cn("p-4 rounded-xl border-2 transition-all", progress.approvals?.supervisor?.approved ? "bg-indigo-50 border-indigo-500" : "bg-slate-50 border-slate-200")}>
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className={cn("p-1.5 rounded-lg", progress.approvals?.supervisor?.approved ? "bg-indigo-500 text-white" : "bg-slate-300 text-slate-500")}>
                                                                <ShieldCheck size={16} />
                                                            </div>
                                                            <Label className="font-black text-xs uppercase">Supervisor</Label>
                                                        </div>
                                                        <Checkbox
                                                            checked={progress.approvals?.supervisor?.approved || false}
                                                            onCheckedChange={(v) => handleApprovalChange(checklist.id, 'supervisor', 'approved', !!v)}
                                                        />
                                                    </div>
                                                    <Textarea
                                                        placeholder="Observações do supervisor..."
                                                        className="text-xs bg-white min-h-[60px]"
                                                        value={progress.approvals?.supervisor?.notes || ''}
                                                        onChange={(e) => handleApprovalChange(checklist.id, 'supervisor', 'notes', e.target.value)}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl text-muted-foreground italic">
                                            <HelpCircle className="size-8 mb-2 opacity-20" />
                                            <p className="text-center text-xs">Validação humana não obrigatória para esta fase.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t">
                                <div className="flex flex-col gap-1 items-end">
                                    <Button 
                                        variant="outline" 
                                        size="lg" 
                                        onClick={() => handleCompleteStage(checklist.id)} 
                                        className={cn("font-bold", !validation.valid && "opacity-50 cursor-not-allowed")}
                                    >
                                        <CheckCircle className="mr-2 h-4 w-4 text-emerald-600" />
                                        Avançar Status Oficial
                                    </Button>
                                    {!validation.valid && (
                                        <p className="text-[10px] text-destructive flex items-center gap-1 font-bold animate-pulse">
                                            <AlertTriangle size={10} /> Critérios pendentes para próxima fase.
                                        </p>
                                    )}
                                </div>
                                <Button size="lg" onClick={() => handleSaveStage(checklist)} disabled={isSaving === checklist.id} className="min-w-[180px]">
                                    {isSaving === checklist.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                    Salvar Anotações
                                </Button>
                            </div>
                        </TabsContent>
                    )})}
                </Tabs>
            </CardContent>
        </Card>

        <FollowUpTimeline memberId={memberId} memberName={memberName} initialNotes={timelineNotes} onNoteAdded={setTimelineNotes} />
        
        <EnrollmentDialog 
            open={isEnrollmentOpen} 
            onOpenChange={setEnrollmentOpen} 
            initialStudentId={memberId} 
        />
      </div>
    );
}
