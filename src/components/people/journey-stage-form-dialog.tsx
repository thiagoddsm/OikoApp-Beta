'use client';

import React, { useState, useEffect } from 'react';
import { useFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '../ui/checkbox';

export function JourneyStageFormDialog({ open, onOpenChange, existingStage, courses }) {
    const { firestore } = useFirebase();
    const { toast } = useToast();

    const [title, setTitle] = useState('');
    const [questions, setQuestions] = useState<{ id: string; label: string; type: string; }[]>([]);
    const [requiredCourseId, setRequiredCourseId] = useState('');
    const [requiresDualApproval, setRequiresDualApproval] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (open) {
            if (existingStage) {
                setTitle(existingStage.title || '');
                setQuestions(existingStage.questions?.map(q => ({...q, type: q.type || 'checkbox'})) || []);
                setRequiredCourseId(existingStage.requiredCourseId || '');
                setRequiresDualApproval(existingStage.requiresDualApproval || false);
            } else {
                setTitle('');
                setQuestions([]);
                setRequiredCourseId('');
                setRequiresDualApproval(false);
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
        if (!title) {
            toast({ variant: 'destructive', title: 'Campo obrigatório', description: 'O título é obrigatório.' });
            return;
        }
        setIsSaving(true);
        const dataToSave = {
            title,
            questions: questions.filter(q => q.label.trim() !== ''),
            requiredCourseId: requiredCourseId === 'none' ? '' : requiredCourseId,
            requiresDualApproval,
        };

        if (existingStage) {
            const docRef = doc(firestore, 'discipleship_checklists', existingStage.id);
            updateDocumentNonBlocking(docRef, dataToSave);
            toast({ title: 'Sucesso!', description: `A etapa "${title}" será atualizada.` });
        } else {
            const collectionRef = collection(firestore, 'discipleship_checklists');
            addDocumentNonBlocking(collectionRef, dataToSave);
            toast({ title: 'Sucesso!', description: `A nova etapa "${title}" foi criada.` });
        }
        
        setIsSaving(false);
        onOpenChange(false);
    };


    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{existingStage ? 'Editar Checklist' : 'Novo Checklist de Discipulado'}</DialogTitle>
                </DialogHeader>
                <div className="py-4 max-h-[70vh] overflow-y-auto pr-4 space-y-4">
                    <div>
                        <Label htmlFor="stage-title">Título do Checklist</Label>
                        <Input id="stage-title" value={title} onChange={(e) => setTitle(e.target.value)} />
                    </div>

                    <h4 className="font-semibold mb-2 pt-4 border-t">Pré-requisitos da Etapa</h4>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="requiredCourseId">Curso Obrigatório (Técnico)</Label>
                            <Select value={requiredCourseId} onValueChange={setRequiredCourseId}>
                                <SelectTrigger id="requiredCourseId"><SelectValue placeholder="Nenhum..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Nenhum</SelectItem>
                                    {courses.map(course => (
                                        <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center space-x-2 pt-2">
                            <Checkbox
                                id="requiresDualApproval"
                                checked={requiresDualApproval}
                                onCheckedChange={(checked) => setRequiresDualApproval(!!checked)}
                            />
                            <Label htmlFor="requiresDualApproval">Requer Aprovação Dupla (Humano)</Label>
                        </div>
                    </div>


                    <div>
                        <h4 className="font-semibold mb-2 pt-4 border-t">Perguntas do Checklist</h4>
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
