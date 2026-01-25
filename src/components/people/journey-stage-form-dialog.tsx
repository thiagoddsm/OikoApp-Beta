'use client';

import React, { useState, useEffect } from 'react';
import { useFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '../ui/checkbox';
import { journeyColumns } from './journey-status-config';

export function JourneyStageFormDialog({ open, onOpenChange, existingStage, courses }) {
    const { firestore } = useFirebase();
    const { toast } = useToast();

    const [stageId, setStageId] = useState('');
    const [title, setTitle] = useState('');
    const [questions, setQuestions] = useState<{ id: string; label: string; type: string; }[]>([]);
    const [requiredCourseId, setRequiredCourseId] = useState('');
    const [requiresDisciplerApproval, setRequiresDisciplerApproval] = useState(false);
    const [requiresSupervisorApproval, setRequiresSupervisorApproval] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isEditingId, setIsEditingId] = useState(false);

    useEffect(() => {
        if (open) {
            if (existingStage) {
                setStageId(existingStage.id);
                setTitle(existingStage.title || '');
                setQuestions(existingStage.questions?.map(q => ({...q, type: q.type || 'checkbox'})) || []);
                setRequiredCourseId(existingStage.requiredCourseId || 'none');
                setRequiresDisciplerApproval(existingStage.requiresDisciplerApproval || false);
                setRequiresSupervisorApproval(existingStage.requiresSupervisorApproval || false);
                setIsEditingId(false);
            } else {
                setStageId('');
                setTitle('');
                setQuestions([]);
                setRequiredCourseId('none');
                setRequiresDisciplerApproval(false);
                setRequiresSupervisorApproval(false);
                setIsEditingId(true);
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
            toast({ variant: 'destructive', title: 'Campos obrigatórios', description: 'Título e Fase da Integração são obrigatórios.' });
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

        const docRef = doc(firestore, 'discipleship_checklists', stageId);
        setDocumentNonBlocking(docRef, dataToSave, { merge: true });

        toast({ title: 'Sucesso!', description: `A etapa para "${title}" foi salva.` });
        
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="stage-id">Fase da Integração (Chave)</Label>
                             <Select value={stageId} onValueChange={setStageId} disabled={!isEditingId}>
                                <SelectTrigger id="stage-id"><SelectValue placeholder="Selecione..."/></SelectTrigger>
                                <SelectContent>
                                    {journeyColumns.map(col => <SelectItem key={col.id} value={col.id}>{col.title}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="stage-title">Título do Checklist</Label>
                            <Input id="stage-title" value={title} onChange={(e) => setTitle(e.target.value)} />
                        </div>
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
                                id="requiresDisciplerApproval"
                                checked={requiresDisciplerApproval}
                                onCheckedChange={(checked) => setRequiresDisciplerApproval(!!checked)}
                            />
                            <Label htmlFor="requiresDisciplerApproval">Requer aprovação do Discipulador</Label>
                        </div>
                         <div className="flex items-center space-x-2">
                            <Checkbox
                                id="requiresSupervisorApproval"
                                checked={requiresSupervisorApproval}
                                onCheckedChange={(checked) => setRequiresSupervisorApproval(!!checked)}
                            />
                            <Label htmlFor="requiresSupervisorApproval">Requer aprovação do Supervisor (Dupla aprovação)</Label>
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
