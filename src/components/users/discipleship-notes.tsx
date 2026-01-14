
'use client';
import React, { useState, useMemo } from 'react';
import { useFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, HelpCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { cn } from '@/lib/utils';
import { FollowUpTimeline } from './follow-up-timeline';


// Data structure for discipleship phases and their questions
const discipleshipPhases = [
  { id: 'novo_convertido', title: 'Novo Convertido', questions: [
      { id: 'contact_attempt_1', label: 'Primeiro contato' },
      { id: 'contact_attempt_2', label: 'Segundo contato' },
      { id: 'contact_attempt_3', label: 'Terceiro contato' },
      { id: 'contact_success', label: 'Contato com sucesso' },
      { id: 'contact_fail', label: 'Contato sem sucesso' },
      { id: 'leader_contacted_visitor', label: 'O líder entrou em contato com o visitante?' },
      { id: 'visitor_attended_gc', label: 'O visitante foi ao GC?' },
    ],
  },
  { id: 'reconciliado', title: 'Reconciliado', questions: [
      { id: 'contact_attempt_1', label: 'Primeiro contato' },
      { id: 'contact_attempt_2', label: 'Segundo contato' },
      { id: 'contact_attempt_3', label: 'Terceiro contato' },
      { id: 'contact_success', label: 'Contato com sucesso' },
      { id: 'contact_fail', label: 'Contato sem sucesso' },
      { id: 'leader_contacted_visitor', label: 'O líder entrou em contato com o visitante?' },
      { id: 'visitor_attended_gc', label: 'O visitante foi ao GC?' },
    ],
  },
  { id: 'transferido', title: 'Transferido', questions: [
      { id: 'contact_attempt_1', label: 'Primeiro contato' },
      { id: 'contact_attempt_2', label: 'Segundo contato' },
      { id: 'contact_attempt_3', label: 'Terceiro contato' },
      { id: 'contact_success', label: 'Contato com sucesso' },
      { id: 'contact_fail', label: 'Contato sem sucesso' },
      { id: 'leader_contacted_visitor', label: 'O líder entrou em contato com o visitante?' },
      { id: 'visitor_attended_gc', label: 'O visitante foi ao GC?' },
    ],
  },
  { id: 'membro', title: 'Membro', questions: [
       { id: 'spiritual_gifts_test', label: 'Realizou o teste de dons espirituais?' },
       { id: 'ministry_interest', label: 'Demonstrou interesse em servir em algum ministério?' },
    ],
  },
  { id: 'consolidado', title: 'Consolidado', questions: [
       { id: 'td_started', label: 'Iniciou o Trilho do Crescimento (TD)?' },
       { id: 'discipleship_1_on_1_started', label: 'Iniciou discipulado um a um?' },
    ],
  },
  { id: 'lider_treinamento', title: 'Líder em Treinamento', questions: [
      { id: 'co_leading_gc', label: 'Está co-liderando reuniões do GC?' },
      { id: 'mentoring_new_member', label: 'Está discipulando um novo membro?' },
    ],
  },
   { id: 'lider_gc', title: 'Líder de GC', questions: [
      { id: 'leadership_feedback_1', label: 'Primeiro feedback de liderança realizado com supervisor?' },
      { id: 'multiplication_plan_set', label: 'Plano de multiplicação da célula definido?' },
    ],
  },
];

const allPhaseIds = discipleshipPhases.map(p => p.id);

export function DiscipleshipNotes({ memberId, memberName, currentStatusId }: { memberId: string, memberName: string, currentStatusId: string }) {
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    
    // State to hold notes and checklist answers for each phase
    const [phaseData, setPhaseData] = useState<Record<string, { notes: string; answers: Record<string, boolean> }>>(
      discipleshipPhases.reduce((acc, phase) => {
        acc[phase.id] = { notes: '', answers: {} };
        return acc;
      }, {})
    );

    const handleNotesChange = (phaseId: string, value: string) => {
        setPhaseData(prev => ({
            ...prev,
            [phaseId]: { ...prev[phaseId], notes: value }
        }));
    };

    const handleCheckboxChange = (phaseId: string, questionId: string, checked: boolean) => {
         setPhaseData(prev => ({
            ...prev,
            [phaseId]: {
                ...prev[phaseId],
                answers: {
                    ...prev[phaseId].answers,
                    [questionId]: checked
                }
            }
        }));
    };

    const handleSave = (phaseId: string) => {
        setIsSaving(true);
        console.log(`Salvando dados para a fase ${phaseId}:`, phaseData[phaseId]);
        
        // Simulate saving to Firestore
        setTimeout(() => {
            setIsSaving(false);
            toast({ title: `Progresso de "${discipleshipPhases.find(p => p.id === phaseId)?.title}" salvo!`});
        }, 1000);
    };

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
                            const isFuturePhase = index > currentPhaseIndex;
                            return (
                                <TabsTrigger 
                                    key={phase.id} 
                                    value={phase.id} 
                                    disabled={isFuturePhase}
                                    className={cn(isFuturePhase && 'cursor-not-allowed')}
                                >
                                    {phase.title}
                                    {isFuturePhase && <HelpCircle className="ml-2 size-3 text-muted-foreground" />}
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
                                     <div className="space-y-3">
                                        <Label className="font-semibold">Perguntas de Acompanhamento</Label>
                                        {phase.questions.map(q => (
                                             <div key={q.id} className="flex items-center space-x-2">
                                                <Checkbox 
                                                    id={`${phase.id}-${q.id}`} 
                                                    checked={!!phaseData[phase.id]?.answers[q.id]}
                                                    onCheckedChange={(checked) => handleCheckboxChange(phase.id, q.id, !!checked)}
                                                />
                                                <Label htmlFor={`${phase.id}-${q.id}`} className="font-normal">{q.label.replace('[nome da pessoa]', memberName)}</Label>
                                            </div>
                                        ))}
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
        <FollowUpTimeline memberId={memberId} memberName={memberName} />
      </div>
    );
}
