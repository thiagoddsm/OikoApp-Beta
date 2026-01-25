'use client';

import React, { useState, useEffect } from 'react';
import { useFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const journeyColumns = [
    { id: 'nao_alcancado', title: 'Cidade (Não Alcançado)' },
    { id: 'novo_convertido', title: 'Novo Convertido' },
    { id: 'reconciliado', title: 'Reconciliado' },
    { id: 'transferido', title: 'Transferido' },
    { id: 'membro', title: 'Membro' },
    { id: 'consolidado', title: 'Consolidado' },
    { id: 'lider_treinamento', title: 'Líder em treinamento' },
    { id: 'lider_gc', title: 'Líder de GC' },
    { id: 'lider_area', title: 'Líder de Área' },
    { id: 'lider_rede', title: 'Líder de Rede' },
    { id: 'pastor', title: 'Pastor' },
];

export function JourneyStageFormDialog({ open, onOpenChange, existingStage }) {
    const { firestore } = useFirebase();
    const { toast } = useToast();

    const [title, setTitle] = useState('');
    const [stageId, setStageId] = useState('');
    const [originalId, setOriginalId] = useState(''); // Keep track of the original ID
    const [questions, setQuestions] = useState<{ id: string; label: string; type: string; }[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (open) {
            if (existingStage) {
                setTitle(existingStage.title || '');
                setStageId(existingStage.id || '');
                setOriginalId(existingStage.id || ''); // Set original ID on open
                setQuestions(existingStage.questions?.map(q => ({...q, type: q.type || 'checkbox'})) || []);
            } else {
                setTitle('');
                setStageId('');
                setOriginalId(''); // Reset original ID
                setQuestions([]);
            }
        }
    }, [open, existingStage]);

    const handleQuestionFieldChange = (index: number, field: 'label' | 'type', value: string) => {
        const newQuestions = [...questions];
        newQuestions[index][field] = value;
        setQuestions(newQuestions);
    };
    
    const addQuestion = () => {
        setQuestions([...questions, { id: `q_${Date.now()}`, label: '', type: 'checkbox' }]);
    };

    const removeQuestion = (index: number) => {
        setQuestions(questions.filter((_, i) => i !== index));
    };

    const handleSave = () => {
        if (!title || !stageId) {
            toast({ variant: 'destructive', title: 'Campos obrigatórios', description: 'Título e ID da etapa são obrigatórios.' });
            return;
        }
        setIsSaving(true);
        const dataToSave = {
            title,
            phaseId: stageId, // Legacy field, keeping for compatibility
            questions: questions.filter(q => q.label.trim() !== '')
        };

        if (existingStage && originalId && originalId !== stageId) {
            // ID has changed, this is a rename operation (create new, delete old)
            const newDocRef = doc(firestore, 'discipleship_checklists', stageId);
            const oldDocRef = doc(firestore, 'discipleship_checklists', originalId);

            // Queue up the operations
            setDocumentNonBlocking(newDocRef, dataToSave);
            deleteDocumentNonBlocking(oldDocRef);

            toast({ title: 'Sucesso!', description: `A etapa foi renomeada para "${title}".` });
            toast({
                variant: 'destructive',
                title: 'Atenção Manual Requerida!',
                description: `O ID da etapa foi alterado. Usuários que estavam na etapa "${originalId}" precisam ser atualizados manualmente para "${stageId}".`,
                duration: 10000,
            });

        } else {
            // ID is the same or it's a new stage
            const docRef = doc(firestore, 'discipleship_checklists', stageId);
            setDocumentNonBlocking(docRef, dataToSave, { merge: true });
             toast({ title: 'Sucesso!', description: `A etapa "${title}" será salva.` });
        }
        
        setIsSaving(false);
        onOpenChange(false);
    };


    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{existingStage ? 'Editar Etapa' : 'Nova Etapa da Jornada'}</DialogTitle>
                </DialogHeader>
                <div className="py-4 max-h-[70vh] overflow-y-auto pr-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="stage-title">Título da Etapa</Label>
                            <Input id="stage-title" value={title} onChange={(e) => setTitle(e.target.value)} />
                        </div>
                        <div>
                            <Label htmlFor="stage-id">Fase da Integração (Chave)</Label>
                             <Select value={stageId} onValueChange={setStageId}>
                                <SelectTrigger id="stage-id">
                                    <SelectValue placeholder="Selecione a fase..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {journeyColumns.map((col) => (
                                        <SelectItem key={col.id} value={col.id}>{col.title}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {existingStage && <p className="text-xs text-destructive mt-1">Atenção: alterar a fase pode desvincular membros desta etapa.</p>}
                        </div>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-2">Perguntas do Checklist</h4>
                        <div className="space-y-2">
                            {questions.map((q, index) => (
                                <div key={index} className="flex items-center gap-2 bg-slate-50 p-2 rounded-md border">
                                    <Input
                                        className="flex-grow bg-white"
                                        value={q.label}
                                        onChange={(e) => handleQuestionFieldChange(index, 'label', e.target.value)}
                                        placeholder={`Pergunta ${index + 1}`}
                                    />
                                    <Select value={q.type} onValueChange={(value) => handleQuestionFieldChange(index, 'type', value)}>
                                        <SelectTrigger className="w-[150px] bg-white">
                                            <SelectValue/>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="checkbox">Checkbox</SelectItem>
                                            <SelectItem value="text">Texto</SelectItem>
                                            <SelectItem value="date">Data</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Button variant="ghost" size="icon" onClick={() => removeQuestion(index)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                         <Button variant="outline" size="sm" className="mt-2" onClick={addQuestion}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Pergunta
                        </Button>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Salvar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
