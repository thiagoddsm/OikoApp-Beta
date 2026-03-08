'use client';

import React, { useState, useEffect } from 'react';
import { useFirebase, setDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, PlusCircle, Trash2, ShieldAlert } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '../ui/checkbox';
import { journeyColumns } from '@/components/users/journey-status-config';
import { Separator } from '../ui/separator';

interface JourneyStageFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    existingStage: any;
    courses: any[];
}

export function JourneyStageFormDialog({ open, onOpenChange, existingStage, courses }: JourneyStageFormDialogProps) {
    const { firestore } = useFirebase();
    const { toast } = useToast();

    const [stageId, setStageId] = useState('');
    const [title, setTitle] = useState('');
    const [questions, setQuestions] = useState<{ id: string; label: string; type: string; }[]>([]);
    const [requiredCourseId, setRequiredCourseId] = useState('');
    const [requiresDisciplerApproval, setRequiresDisciplerApproval] = useState(false);
    const [requiresSupervisorApproval, setRequiresSupervisorApproval] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (open) {
            if (existingStage) {
                setStageId(existingStage.id);
                setTitle(existingStage.title || '');
                setQuestions(existingStage.questions?.map((q: any) => ({...q, type: q.type || 'checkbox'})) || []);
                setRequiredCourseId(existingStage.requiredCourseId || 'none');
                setRequiresDisciplerApproval(existingStage.requiresDisciplerApproval || false);
                setRequiresSupervisorApproval(existingStage.requiresSupervisorApproval || false);
            } else {
                setStageId('');
                setTitle('');
                setQuestions([]);
                setRequiredCourseId('none');
                setRequiresDisciplerApproval(false);
                setRequiresSupervisorApproval(false);
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

    const handleSave = async () => {
        if (!title || !stageId || !firestore) {
            toast({ variant: 'destructive', title: 'Campos obrigatórios', description: 'Título e Fase são obrigatórios.' });
            return;
        }
        setIsSaving(true);
        
        const dataToSave = {
            title,
            questions: questions.filter(q => q.label.trim() !== ''),
            requiredCourseId: requiredCourseId === 'none' ? '' : requiredCourseId,
            requiresDisciplerApproval,
            requiresSupervisorApproval,
        };

        try {
            const docRef = doc(firestore, 'discipleship_checklists', stageId);
            await setDocumentNonBlocking(docRef, dataToSave, { merge: true });
            toast({ title: 'Sucesso!', description: `Os requisitos foram atualizados.` });
            onOpenChange(false);
        } catch (e) {
            toast({ variant: 'destructive', title: 'Erro ao salvar' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-6 border-b bg-muted/20">
                    <DialogTitle className="flex items-center gap-2">
                        <ShieldAlert className="text-primary" />
                        {existingStage?.title ? `Configurar: ${existingStage.title}` : 'Novo Requisito'}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-black">Fase</Label>
                            <Select value={stageId} onValueChange={setStageId} disabled={!!existingStage}>
                                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                <SelectContent>
                                    {journeyColumns.map(col => <SelectItem key={col.id} value={col.id}>{col.title}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-black">Título do Checklist</Label>
                            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                        </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                        <Label>Checklist de Tarefas</Label>
                        <div className="space-y-2">
                            {questions.map((q, index) => (
                                <div key={q.id} className="flex gap-2">
                                    <Input value={q.label} onChange={(e) => handleQuestionFieldChange(index, 'label', e.target.value)} className="flex-1" />
                                    <Button variant="ghost" size="icon" onClick={() => removeQuestion(index)}><Trash2 className="size-4" /></Button>
                                </div>
                            ))}
                            <Button variant="outline" size="sm" onClick={addQuestion} className="w-full">
                                <PlusCircle className="mr-2 size-4" /> Adicionar Item
                            </Button>
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-6 border-t bg-muted/20">
                    <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                    <Button onClick={handleSave} disabled={isSaving || !stageId}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                        Salvar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
