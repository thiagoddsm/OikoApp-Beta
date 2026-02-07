
'use client';
import React, { useState, useMemo } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, HelpCircle, CheckCircle, Send, GraduationCap, PlusCircle, BookOpen } from 'lucide-react';
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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
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
    requiresDisciplerApproval?: boolean;
    requiresSupervisorApproval?: boolean;
};

function NotificationScheduler({ memberName }: { memberName: string }) {
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [reminder, setReminder] = useState('');
    const [date, setDate] = useState('');
    const [channel, setChannel] = useState('whatsapp');

    const handleScheduleReminder = () => {
        if (!reminder || !date) {
            toast({ variant: 'destructive', title: 'Campos obrigatórios', description: 'Por favor, preencha a mensagem e a data.'});
            return;
        }
        setIsSaving(true);
        setTimeout(() => {
            toast({ title: 'Lembrete Agendado!', description: `Você será lembrado em ${date} via ${channel} sobre ${memberName}.`});
            setIsSaving(false);
            setReminder('');
            setDate('');
        }, 1000);
    };

    return (
        <Card className="bg-muted/30 border-dashed">
            <CardHeader>
                <CardTitle>Agendar Lembrete Pessoal</CardTitle>
                <CardDescription>
                    Crie um lembrete para você mesmo sobre {memberName}. A notificação será enviada para você no canal escolhido na data agendada.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="reminder-message">Mensagem do Lembrete</Label>
                    <Textarea 
                        id="reminder-message" 
                        value={reminder}
                        onChange={(e) => setReminder(e.target.value)}
                        placeholder={`Ex: Verificar como foi a semana de ${memberName} e se ele(a) precisa de oração...`}
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="reminder-date">Data do Lembrete</Label>
                        <Input id="reminder-date" type="date" value={date} onChange={e => setDate(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="reminder-channel">Canal</Label>
                         <Select value={channel} onValueChange={setChannel}>
                            <SelectTrigger id="reminder-channel"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                                <SelectItem value="email">Email</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardContent>
            <CardFooter>
                 <Button onClick={handleScheduleReminder} disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4"/>}
                    Agendar
                </Button>
            </CardFooter>
        </Card>
    )
}

export function DiscipleshipNotes({ memberId, memberName, currentStatusId }: { memberId: string, memberName: string, currentStatusId: string }) {
    const { user, firestore } = useFirebase();
    const { toast } = useToast();
    const { updateVolunteer, classes, courses } = useVolunteering();
    const [isSaving, setIsSaving] = useState<string | null>(null);
    const [isEnrollmentOpen, setEnrollmentOpen] = useState(false);
    
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

    const myClasses = useMemo(() => {
        return classes.filter(cls => cls.students?.includes(memberId));
    }, [classes, memberId]);

    const courseMap = useMemo(() => new Map(courses.map(c => [c.id, c.name])), [courses]);
    
    const handleCompleteStage = (currentStageId: string) => {
        const currentIndex = journeyColumns.findIndex(col => col.id === currentStageId);

        if (currentIndex === -1) {
            toast({
                variant: "destructive",
                title: "Erro",
                description: "Não foi possível encontrar a etapa atual na configuração da jornada.",
            });
            return;
        }
        
        if (currentIndex >= journeyColumns.length - 1) {
             toast({
                title: "Jornada Completa",
                description: `${memberName} já está na última etapa.`,
            });
            return;
        }

        const nextStage = journeyColumns[currentIndex + 1];
        updateVolunteer(memberId, { integrationStatus: nextStage.id });
        toast({
            title: "Etapa Concluída!",
            description: `${memberName} foi avançado(a) para "${nextStage.title}".`,
        });
    };

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
    
    return (
      <div className="space-y-6">
        {/* Seção de Ensino & Trilho */}
        <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <GraduationCap className="size-5 text-primary" />
                        Ensino & Trilho do Discípulo
                    </CardTitle>
                    <CardDescription>Gerencie as matrículas obrigatórias para a membresia.</CardDescription>
                </div>
                <Button size="sm" onClick={() => setEnrollmentOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Matricular em Curso
                </Button>
            </CardHeader>
            <CardContent>
                <div className="flex flex-wrap gap-3">
                    {myClasses.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic py-2">Nenhuma matrícula ativa identificada.</p>
                    ) : (
                        myClasses.map(cls => (
                            <div key={cls.id} className="flex items-center gap-2 bg-white p-2 rounded-lg border shadow-sm">
                                <BookOpen className="size-3 text-primary" />
                                <div className="text-xs">
                                    <span className="font-bold">{courseMap.get(cls.courseId)}</span>
                                    <span className="text-muted-foreground ml-1">({cls.name})</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">Checklists de Discipulado</CardTitle>
                <CardDescription>Registre o progresso de {memberName} utilizando os checklists, ou agende lembretes.</CardDescription>
            </CardHeader>
            <CardContent>
                 {discipleshipChecklists && discipleshipChecklists.length > 0 ? (
                    <Tabs defaultValue={discipleshipChecklists[0].id} className="w-full">
                        <TabsList className="flex flex-wrap h-auto justify-start">
                            {discipleshipChecklists.map(checklist => (
                                <TabsTrigger key={checklist.id} value={checklist.id}>{checklist.title}</TabsTrigger>
                            ))}
                            <TabsTrigger value="notifications">Lembretes</TabsTrigger>
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

                                    <div className="flex justify-end mt-6 gap-2">
                                        <Button variant="outline" onClick={() => handleCompleteStage(checklist.id)}>
                                            <CheckCircle className="mr-2 h-4 w-4" />
                                            Marcar como Concluído e Avançar
                                        </Button>
                                        <Button onClick={() => handleSave(checklist)} disabled={isSaving === checklist.id}>
                                            {isSaving === checklist.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Salvar Anotações
                                        </Button>
                                    </div>
                                </div>
                            </TabsContent>
                        ))}
                         <TabsContent value="notifications" className="mt-6">
                            <NotificationScheduler memberName={memberName} />
                        </TabsContent>
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
        
        <EnrollmentDialog 
            open={isEnrollmentOpen} 
            onOpenChange={setEnrollmentOpen} 
            initialStudentId={memberId} 
        />
      </div>
    );
}
