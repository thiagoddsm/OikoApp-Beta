'use client';
import React, { useState, useMemo } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, HelpCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { cn } from '@/lib/utils';
import { FollowUpTimeline, Note } from './follow-up-timeline';
import { query, collection } from 'firebase/firestore';
import { Input } from '../ui/input';


type ChecklistQuestion = {
    id: string;
    label: string;
    type: 'checkbox' | 'text' | 'date';
};

type DiscipleshipPhase = {
    id: string;
    phaseId: string;
    title: string;
    questions: ChecklistQuestion[];
};

export function DiscipleshipNotes({ memberId, memberName, currentStatusId }: { memberId: string, memberName: string, currentStatusId: string }) {
    const { user, firestore } = useFirebase();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    
    // Fetch checklist definitions from Firestore
    const checklistsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'discipleship_checklists')) : null, [firestore]);
    const { data: discipleshipPhases, isLoading: isLoadingChecklists } = useCollection<DiscipleshipPhase>(checklistsQuery);
    
    // State to hold user answers and notes
    const [phaseData, setPhaseData] = useState<Record<string, { notes: string; answers: Record<string, boolean | string> }>>({});

    const [timelineNotes, setTimelineNotes] = useState<Note[]>([
        { id: '1', authorId: 'admin', type: 'system', content: `Perfil criado.`, createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        { id: '2', authorId: 'admin', type: 'system', content: `Status alterado para: Novo Convertido`, createdAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000) },
        { id: '3', authorId: 'leader1', type: 'user', content: `Mostrou grande interesse na célula e fez perguntas pertinentes sobre a fé. Conectei com o João para iniciar o discipulado.`, createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000) },
    ]);


    const handleAnswerChange = (phaseId: string, questionId: string, value: boolean | string) => {
         setPhaseData(prev => ({
            ...prev,
            [phaseId]: {
                ...(prev[phaseId] || { notes: '', answers: {} }),
                answers: {
                    ...(prev[phaseId]?.answers || {}),
                    [questionId]: value
                }
            }
        }));
    };

    const handleSave = (phaseId: string) => {
        setIsSaving(true);
        console.log(`Salvando dados para a fase ${phaseId}:`, phaseData[phaseId]);
        
        const phaseQuestions = discipleshipPhases?.find(p => p.id === phaseId)?.questions || [];
        const newNotes: Note[] = [];

        for (const question of phaseQuestions) {
            const answer = phaseData[phaseId]?.answers[question.id];
            
            // This is a mock implementation. A real one would need to check previous state.
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
        
        setTimeout(() => {
            if (newNotes.length > 0) {
                onNoteAdded(prev => [...newNotes, ...prev]);
            }
            setIsSaving(false);
            toast({ title: `Progresso de "${discipleshipPhases?.find(p => p.id === phaseId)?.title}" salvo!`});
        }, 1000);
    };

    if (isLoadingChecklists) {
      return (
        <div className="flex items-center justify-center p-8 h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }
    
    if (!discipleshipPhases || discipleshipPhases.length === 0) {
        return (
            <Card>
                <CardHeader>
                     <CardTitle>Nenhum Checklist Encontrado</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Os checklists da jornada de discipulado ainda não foram configurados. Vá para <a href="/dashboard/settings" className="underline">Configurações &gt; Jornada</a> para importar os padrões.</p>
                </CardContent>
            </Card>
        )
    }

    const allPhaseIds = discipleshipPhases.map(p => p.id);
    const currentPhaseIndex = allPhaseIds.indexOf(currentStatusId);
    
    return (
      <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">Acompanhamento do Discipulado</CardTitle>
                <CardDescription>Registre o progresso de {memberName} em cada etapa da jornada.</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue={currentStatusId} className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                         {discipleshipPhases.map((phase, index) => {
                            return (
                                <TabsTrigger 
                                    key={phase.id} 
                                    value={phase.id} 
                                >
                                    {phase.title}
                                </TabsTrigger>
                            )
                         })}
                    </TabsList>

                    {discipleshipPhases.map((phase) => (
                        <TabsContent key={phase.id} value={phase.id} className="mt-6">
                            <Card className="border-dashed">
                                <CardHeader>
                                    <CardTitle>Checklist da Fase: {phase.title}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                     <div className="space-y-4">
                                        <Label className="font-semibold">Perguntas de Acompanhamento</Label>
                                        {phase.questions.map(q => {
                                            const answer = phaseData[phase.id]?.answers[q.id];
                                            const questionLabel = q.label.replace('[nome da pessoa]', memberName);

                                            switch (q.type) {
                                                case 'text':
                                                    return (
                                                        <div key={q.id} className="space-y-1.5">
                                                            <Label htmlFor={`${phase.id}-${q.id}`}>{questionLabel}</Label>
                                                            <Input
                                                                id={`${phase.id}-${q.id}`}
                                                                value={typeof answer === 'string' ? answer : ''}
                                                                onChange={(e) => handleAnswerChange(phase.id, q.id, e.target.value)}
                                                            />
                                                        </div>
                                                    );
                                                case 'date':
                                                    return (
                                                        <div key={q.id} className="space-y-1.5">
                                                            <Label htmlFor={`${phase.id}-${q.id}`}>{questionLabel}</Label>
                                                            <Input
                                                                id={`${phase.id}-${q.id}`}
                                                                type="date"
                                                                value={typeof answer === 'string' ? answer : ''}
                                                                onChange={(e) => handleAnswerChange(phase.id, q.id, e.target.value)}
                                                            />
                                                        </div>
                                                    );
                                                case 'checkbox':
                                                default:
                                                    return (
                                                        <div key={q.id} className="flex items-center space-x-2">
                                                            <Checkbox
                                                                id={`${phase.id}-${q.id}`}
                                                                checked={!!answer}
                                                                onCheckedChange={(checked) => handleAnswerChange(phase.id, q.id, !!checked)}
                                                            />
                                                            <Label htmlFor={`${phase.id}-${q.id}`} className="font-normal">{questionLabel}</Label>
                                                        </div>
                                                    );
                                            }
                                        })}
                                    </div>
                                    <div className="flex justify-end">
                                        <Button onClick={() => handleSave(phase.id)} disabled={isSaving}>
                                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Salvar Progresso da Fase
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    ))}
                </Tabs>
            </CardContent>
        </Card>
        <FollowUpTimeline memberId={memberId} memberName={memberName} initialNotes={timelineNotes} onNoteAdded={setTimelineNotes} />
      </div>
    );
}
