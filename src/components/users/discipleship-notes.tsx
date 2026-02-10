'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, HelpCircle, CheckCircle, Send, GraduationCap, PlusCircle, ShieldCheck, UserCheck, History } from 'lucide-react';
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

    const myClasses = useMemo(() => {
        return classes.filter(cls => cls.students?.includes(memberId));
    }, [classes, memberId]);

    const courseMap = useMemo(() => new Map(courses.map(c => [c.id, c.name])), [courses]);
    
    // Mostra as abas baseadas no que existe no banco (Acolhimento, etc),
    // ou usa as colunas de jornada como fallback se o banco estiver vazio.
    const finalChecklists = useMemo(() => {
        if (dbChecklists && dbChecklists.length > 0) {
            // Ordena os checklists do banco seguindo a ordem da jornada para consistência
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

    const handleCompleteStage = (currentStageId: string) => {
        const currentIndex = journeyColumns.findIndex(col => col.id === currentStageId);

        if (currentIndex === -1) return;
        if (currentIndex >= journeyColumns.length - 1) {
             toast({ title: "Jornada Completa", description: `${memberName} já atingiu o nível máximo.` });
            return;
        }

        const nextStage = journeyColumns[currentIndex + 1];
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
        {/* Validação Técnica (Cursos) */}
        <Card className="bg-emerald-50/50 border-emerald-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                    <CardTitle className="text-lg flex items-center gap-2 text-emerald-800">
                        <GraduationCap className="size-5" />
                        Validação Técnica (Cursos & Trilho)
                    </CardTitle>
                    <CardDescription className="text-emerald-700/70">Formações técnicas e cursos obrigatórios.</CardDescription>
                </div>
                <Button size="sm" onClick={() => setEnrollmentOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
                    <PlusCircle className="mr-2 h-4 w-4" /> Matricular
                </Button>
            </CardHeader>
            <CardContent>
                <div className="flex flex-wrap gap-3">
                    {myClasses.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic py-2">Nenhum curso técnico em andamento.</p>
                    ) : (
                        myClasses.map(cls => (
                            <div key={cls.id} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-emerald-100 shadow-sm">
                                <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                                <div className="text-xs">
                                    <span className="font-bold text-emerald-900">{courseMap.get(cls.courseId)}</span>
                                    <span className="text-[10px] text-emerald-600 ml-1 block uppercase font-black">{cls.name}</span>
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
                        return (
                        <TabsContent key={checklist.id} value={checklist.id} className="mt-0 space-y-8 animate-in fade-in-50">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Checklist de Perguntas */}
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

                                {/* Seção de Aprovações */}
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
                                <Button variant="outline" size="lg" onClick={() => handleCompleteStage(checklist.id)} className="font-bold">
                                    <CheckCircle className="mr-2 h-4 w-4 text-emerald-600" />
                                    Avançar Status Oficial
                                </Button>
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

        {/* Timeline de Histórico */}
        <FollowUpTimeline memberId={memberId} memberName={memberName} initialNotes={timelineNotes} onNoteAdded={setTimelineNotes} />
        
        <EnrollmentDialog 
            open={isEnrollmentOpen} 
            onOpenChange={setEnrollmentOpen} 
            initialStudentId={memberId} 
        />
      </div>
    );
}
