'use client';
import React, { useState, useMemo } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, HelpCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { cn } from '@/lib/utils';
import { FollowUpTimeline, Note } from './follow-up-timeline';
import { query, collection } from 'firebase/firestore';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from '../ui/textarea';


type ChecklistQuestion = {
    id: string;
    label: string;
    type: 'checkbox' | 'text' | 'date';
};

type DiscipleshipChecklist = {
    id: string;
    title: string;
    questions: ChecklistQuestion[];
    requiresDisciplerApproval?: boolean;
    requiresSupervisorApproval?: boolean;
};

export function DiscipleshipNotes({ memberId, memberName, currentStatusId }: { memberId: string, memberName: string, currentStatusId: string }) {
    const { user, firestore } = useFirebase();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState<string | null>(null);
    
    const checklistsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'discipleship_checklists')) : null, [firestore]);
    const { data: discipleshipChecklists, isLoading: isLoadingChecklists } = useCollection<DiscipleshipChecklist>(checklistsQuery);
    
    const [phaseData, setPhaseData] = useState<Record<string, {
        notes: string;
        answers: Record<string, boolean | string>;
        approvals?: {
            discipler?: { approved: boolean; notes: string };
            supervisor?: { approved: boolean; notes: string };
        }
    }>>({});

    const [timelineNotes, setTimelineNotes] = useState<Note[]>([
        { id: '1', authorId: 'admin', type: 'system', content: `Perfil criado.`, createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        { id: '2', authorId: 'admin', type: 'system', content: `Status alterado para: Novo Convertido`, createdAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000) },
        { id: '3', authorId: 'leader1', type: 'user', content: `Mostrou grande interesse na célula e fez perguntas pertinentes sobre a fé. Conectei com o João para iniciar o discipulado.`, createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000) },
    ]);
    
    const handleAnswerChange = (checklistId: string, questionId: string, value: boolean | string) => {
         setPhaseData(prev => ({
            ...prev,
            [checklistId]: {
                ...(prev[checklistId] || { notes: '', answers: {} }),
                answers: {
                    ...(prev[checklistId]?.answers || {}),
                    [questionId]: value
                }
            }
        }));
    };
    
    const handleApprovalChange = (checklistId: string, approver: 'discipler' | 'supervisor', field: 'approved' | 'notes', value: boolean | string) => {
        setPhaseData(prev => ({
            ...prev,
            [checklistId]: {
                ...(prev[checklistId] || { answers: {}, notes: '', approvals: {} }),
                approvals: {
                    ...(prev[checklistId]?.approvals || {}),
                    [approver]: {
                        ...(prev[checklistId]?.approvals?.[approver] || { approved: false, notes: '' }),
                        [field]: value
                    }
                }
            }
        }));
    };


    const handleSave = (checklist: DiscipleshipChecklist) => {
        setIsSaving(checklist.id);
        
        const phaseQuestions = checklist.questions || [];
        const newNotes: Note[] = [];

        // Log question answers
        for (const question of phaseQuestions) {
            const answer = phaseData[checklist.id]?.answers[question.id];
            if (answer) { 
                 const noteContent = question.type === 'checkbox' 
                    ? `Checklist '${question.label}' foi completado.`
                    : `Anotação para '${question.label}': ${answer}`;
                
                 const alreadyLogged = timelineNotes.some(note => note.content === noteContent);
                 if(!alreadyLogged) {
                    newNotes.push({
                        id: (timelineNotes.length + newNotes.length + 1).toString(),
                        authorId: user?.uid || 'admin',
                        type: 'system',
                        content: noteContent,
                        createdAt: new Date(),
                    });
                 }
            }
        }
        
        // Log approvals
        const approvalData = phaseData[checklist.id]?.approvals;
        if (approvalData?.discipler?.approved) {
             const noteContent = `Aprovação do Discipulador concedida para "${checklist.title}". Observações: ${approvalData.discipler.notes || 'Nenhuma'}`;
             if(!timelineNotes.some(note => note.content === noteContent)){
                 newNotes.push({ id: `apr-d-${Date.now()}`, authorId: user?.uid || 'admin', type: 'system', content: noteContent, createdAt: new Date() });
             }
        }
        if (approvalData?.supervisor?.approved) {
             const noteContent = `Aprovação do Supervisor concedida para "${checklist.title}". Observações: ${approvalData.supervisor.notes || 'Nenhuma'}`;
             if(!timelineNotes.some(note => note.content === noteContent)){
                 newNotes.push({ id: `apr-s-${Date.now()}`, authorId: user?.uid || 'admin', type: 'system', content: noteContent, createdAt: new Date() });
             }
        }
        
        setTimeout(() => {
            if (newNotes.length > 0) {
                setTimelineNotes(prev => [...newNotes, ...prev]);
            }
            setIsSaving(null);
            toast({ title: `Progresso de "${checklist.title}" salvo!`});
        }, 1000);
    };

    if (isLoadingChecklists) {
      return (
        <div className="flex items-center justify-center p-8 h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }
    
    if (!discipleshipChecklists) {
        return (
            <Card>
                <CardHeader>
                     <CardTitle>Nenhum Checklist Encontrado</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Não foi possível carregar os checklists de discipulado.</p>
                </CardContent>
            </Card>
        )
    }

    return (
      <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">Acompanhamento do Discipulado</CardTitle>
                <CardDescription>Registre o progresso de {memberName} utilizando os checklists disponíveis.</CardDescription>
            </CardHeader>
            <CardContent>
                 {discipleshipChecklists.length > 0 ? (
                    <Tabs defaultValue={discipleshipChecklists[0].id} className="w-full">
                        <TabsList className="flex flex-wrap h-auto justify-start">
                            {discipleshipChecklists.map(checklist => (
                                <TabsTrigger key={checklist.id} value={checklist.id}>{checklist.title}</TabsTrigger>
                            ))}
                        </TabsList>
                        {discipleshipChecklists.map(checklist => (
                            <TabsContent key={checklist.id} value={checklist.id} className="mt-6">
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        {checklist.questions.map(q => {
                                            const answer = phaseData[checklist.id]?.answers[q.id];
                                            const questionLabel = q.label.replace('[nome da pessoa]', memberName);

                                            switch (q.type) {
                                                case 'text':
                                                    return (
                                                        <div key={q.id} className="space-y-1.5">
                                                            <Label htmlFor={`${checklist.id}-${q.id}`}>{questionLabel}</Label>
                                                            <Input
                                                                id={`${checklist.id}-${q.id}`}
                                                                value={typeof answer === 'string' ? answer : ''}
                                                                onChange={(e) => handleAnswerChange(checklist.id, q.id, e.target.value)}
                                                            />
                                                        </div>
                                                    );
                                                case 'date':
                                                    return (
                                                        <div key={q.id} className="space-y-1.5">
                                                            <Label htmlFor={`${checklist.id}-${q.id}`}>{questionLabel}</Label>
                                                            <Input
                                                                id={`${checklist.id}-${q.id}`}
                                                                type="date"
                                                                value={typeof answer === 'string' ? answer : ''}
                                                                onChange={(e) => handleAnswerChange(checklist.id, q.id, e.target.value)}
                                                            />
                                                        </div>
                                                    );
                                                case 'checkbox':
                                                default:
                                                    return (
                                                        <div key={q.id} className="flex items-center space-x-2">
                                                            <Checkbox
                                                                id={`${checklist.id}-${q.id}`}
                                                                checked={!!answer}
                                                                onCheckedChange={(checked) => handleAnswerChange(checklist.id, q.id, !!checked)}
                                                            />
                                                            <Label htmlFor={`${checklist.id}-${q.id}`} className="font-normal">{questionLabel}</Label>
                                                        </div>
                                                    );
                                            }
                                        })}
                                    </div>

                                    {(checklist.requiresDisciplerApproval || checklist.requiresSupervisorApproval) && (
                                        <div className="mt-6 pt-6 border-t">
                                            <h4 className="font-semibold text-foreground mb-4">Aprovações da Liderança</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {checklist.requiresDisciplerApproval && (
                                                    <div className="space-y-3 p-4 border rounded-lg bg-background">
                                                        <div className="flex items-center space-x-2">
                                                            <Checkbox
                                                                id={`discipler-approval-${checklist.id}`}
                                                                checked={phaseData[checklist.id]?.approvals?.discipler?.approved || false}
                                                                onCheckedChange={(checked) => handleApprovalChange(checklist.id, 'discipler', 'approved', !!checked)}
                                                            />
                                                            <Label htmlFor={`discipler-approval-${checklist.id}`} className="font-semibold">Aprovado pelo Discipulador</Label>
                                                        </div>
                                                        <Textarea
                                                            placeholder="Observações do discipulador..."
                                                            value={phaseData[checklist.id]?.approvals?.discipler?.notes || ''}
                                                            onChange={(e) => handleApprovalChange(checklist.id, 'discipler', 'notes', e.target.value)}
                                                        />
                                                    </div>
                                                )}
                                                {checklist.requiresSupervisorApproval && (
                                                    <div className="space-y-3 p-4 border rounded-lg bg-background">
                                                        <div className="flex items-center space-x-2">
                                                            <Checkbox
                                                                id={`supervisor-approval-${checklist.id}`}
                                                                checked={phaseData[checklist.id]?.approvals?.supervisor?.approved || false}
                                                                onCheckedChange={(checked) => handleApprovalChange(checklist.id, 'supervisor', 'approved', !!checked)}
                                                            />
                                                            <Label htmlFor={`supervisor-approval-${checklist.id}`} className="font-semibold">Aprovado pelo Supervisor</Label>
                                                        </div>
                                                        <Textarea
                                                            placeholder="Observações do supervisor..."
                                                            value={phaseData[checklist.id]?.approvals?.supervisor?.notes || ''}
                                                            onChange={(e) => handleApprovalChange(checklist.id, 'supervisor', 'notes', e.target.value)}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex justify-end">
                                        <Button onClick={() => handleSave(checklist)} disabled={isSaving === checklist.id}>
                                            {isSaving === checklist.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Salvar Progresso
                                        </Button>
                                    </div>
                                </div>
                            </TabsContent>
                        ))}
                    </Tabs>
                 ) : (
                    <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
                        <HelpCircle className="mx-auto h-8 w-8 mb-2"/>
                        <p className="font-semibold">Nenhum checklist de acompanhamento definido.</p>
                        <p className="text-sm">Vá para <a href="/dashboard/people/settings" className="underline font-medium">Configurações da Jornada</a> para criar o primeiro.</p>
                    </div>
                 )}
            </CardContent>
        </Card>
        <FollowUpTimeline memberId={memberId} memberName={memberName} initialNotes={timelineNotes} onNoteAdded={setTimelineNotes} />
      </div>
    );
}
