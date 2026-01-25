'use client';

import React, { useState, useEffect } from 'react';
import { useFirebase, setDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';

export function JourneyStageFormDialog({ open, onOpenChange, existingStage }) {
    const { firestore } = useFirebase();
    const { toast } = useToast();

    const [title, setTitle] = useState('');
    const [stageId, setStageId] = useState('');
    const [questions, setQuestions] = useState<{ id: string; label: string; }[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (open) {
            setTitle(existingStage?.title || '');
            setStageId(existingStage?.id || '');
            setQuestions(existingStage?.questions?.map(q => ({...q})) || []);
        }
    }, [open, existingStage]);

    const handleQuestionChange = (index: number, value: string) => {
        const newQuestions = [...questions];
        newQuestions[index].label = value;
        setQuestions(newQuestions);
    };
    
    const addQuestion = () => {
        setQuestions([...questions, { id: `q_${Date.now()}`, label: '' }]);
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
        const docRef = doc(firestore, 'discipleship_checklists', stageId);
        const dataToSave = {
            title,
            phaseId: stageId, // Legacy field, keeping for compatibility
            questions: questions.filter(q => q.label.trim() !== '')
        };

        setDocumentNonBlocking(docRef, dataToSave, { merge: true });
        
        toast({ title: 'Sucesso!', description: `A etapa "${title}" será salva.` });
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
                            <Label htmlFor="stage-id">ID da Etapa (Chave)</Label>
                            <Input id="stage-id" value={stageId} onChange={(e) => setStageId(e.target.value.toLowerCase().replace(/\s+/g, '_'))} disabled={!!existingStage} placeholder="Ex: novo_convertido" />
                        </div>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-2">Perguntas do Checklist</h4>
                        <div className="space-y-2">
                            {questions.map((q, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <Input
                                        value={q.label}
                                        onChange={(e) => handleQuestionChange(index, e.target.value)}
                                        placeholder={`Pergunta ${index + 1}`}
                                    />
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
