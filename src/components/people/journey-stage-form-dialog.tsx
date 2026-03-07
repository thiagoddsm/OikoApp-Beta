'use client';

import React, { useState, useEffect } from 'react';
import { useFirebase, setDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, PlusCircle, Trash2, ShieldAlert, GraduationCap, ListTodo } from 'lucide-react';
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

        try {
            const docRef = doc(firestore, 'discipleship_checklists', stageId);
            await setDocumentNonBlocking(docRef, dataToSave, { merge: true });
            toast({ title: 'Sucesso!', description: `Os requisitos para "${title}" foram atualizados.` });
            onOpenChange(false);
        } catch (e) {
            toast({ variant: 'destructive', title: 'Erro ao salvar', description: 'Ocorreu uma falha no banco de dados.' });
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
                        {existingStage?.title ? `Configurar: ${existingStage.title}` : 'Novo Requisito de Jornada'}
                    </DialogTitle>
                    <DialogDescription>
                        Determine o que é necessário para o membro concluir esta etapa e avançar.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    <section className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="stage-id" className="text-[10px] uppercase font-black text-muted-foreground">Fase do Organismo</Label>
                                <Select value={stageId} onValueChange={setStageId} disabled={!!existingStage}>
                                    <SelectTrigger id="stage-id">
                                        <SelectValue placeholder="Selecione a fase..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {journeyColumns.map(col => <SelectItem key={col.id} value={col.id}>{col.title}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="stage-title" className="text-[10px] uppercase font-black text-muted-foreground">Título do Checklist</Label>
                                <Input id="stage-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Checklist de Novo Convertido" />
                            </div>
                        </div>
                    </section>

                    <Separator />

                    <section className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <GraduationCap className="size-4 text-emerald-600" />
                            <h4 className="font-bold text-sm text-emerald-900">Validação Técnica (Curso)</h4>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="requiredCourseId" className="text-xs">Vincular Curso Obrigatório</Label>
                            <Select value={requiredCourseId} onValueChange={setRequiredCourseId}>
                                <SelectTrigger id="requiredCourseId">
                                    <SelectValue placeholder="Nenhum curso obrigatório" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Nenhum (Avanço liberado tecnicamente)</SelectItem>
                                    {courses.map((course: any) => (
                                        <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-[10px] text-muted-foreground italic">O membro precisará concluir todas as aulas deste curso para poder avançar.</p>
                        </div>
                    </section>

                    <Separator />

                    <section className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <ShieldAlert className="size-4 text-amber-600" />
                            <h4 className="font-bold text-sm text-amber-900">Validação Humana (Governança)</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center space-x-3 p-3 rounded-lg border bg-amber-50/30">
                                <Checkbox
                                    id="requiresDisciplerApproval"
                                    checked={requiresDisciplerApproval}
                                    onCheckedChange={(checked) => setRequiresDisciplerApproval(!!checked)}
                                />
                                <div className="space-y-0.5">
                                    <Label htmlFor="requiresDisciplerApproval" className="text-sm font-bold">Aprovação do Discipulador</Label>
                                    <p className="text-[10px] text-muted-foreground uppercase">Obrigatório</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3 p-3 rounded-lg border bg-indigo-50/30">
                                <Checkbox
                                    id="requiresSupervisorApproval"
                                    checked={requiresSupervisorApproval}
                                    onCheckedChange={(checked) => setRequiresSupervisorApproval(!!checked)}
                                />
                                <div className="space-y-0.5">
                                    <Label htmlFor="requiresSupervisorApproval" className="text-sm font-bold">Aprovação do Supervisor</Label>
                                    <p className="text-[10px] text-muted-foreground uppercase">Controle de Qualidade (Auditoria)</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    <Separator />

                    <section className="space-y-4 pb-8">
                        <div className="flex items-center justify-between gap-2 mb-4">
                            <div className="flex items-center gap-2">
                                <ListTodo className="size-4 text-primary" />
                                <h4 className="font-bold text-sm text-slate-900">Checklist Prático / Tarefas</h4>
                            </div>
                            <Button variant="outline" size="sm" onClick={addQuestion} className="h-7 text-[10px] uppercase font-black">
                                <PlusCircle className="mr-1 size-3" /> Adicionar Item
                            </Button>
                        </div>
                        <div className="space-y-2">
                            {questions.map((q, index) => (
                                <div key={q.id} className="flex items-start gap-2 bg-slate-50 p-2 rounded-md border border-dashed group transition-colors hover:border-primary/50">
                                    <div className="flex-1 space-y-2">
                                        <Input
                                            className="bg-white h-8 text-sm"
                                            value={q.label}
                                            onChange={(e) => handleQuestionFieldChange(index, 'label', e.target.value)}
                                            placeholder={`Ex: O membro realizou o primeiro contato?`}
                                        />
                                        <div className="flex gap-4">
                                            <Select value={q.type} onValueChange={(value) => handleQuestionFieldChange(index, 'type', value)}>
                                                <SelectTrigger className="w-[120px] h-6 text-[10px] uppercase font-bold bg-white">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="checkbox">Sim/Não</SelectItem>
                                                    <SelectItem value="text">Resposta Texto</SelectItem>
                                                    <SelectItem value="date">Data Realizada</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <span className="text-[10px] text-muted-foreground italic mt-1.5">Dica: Use [nome] para o nome do membro.</span>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeQuestion(index)}>
                                        <Trash2 className="size-4" />
                                    </Button>
                                </div>
                            ))}
                            {questions.length === 0 && (
                                <p className="text-center py-6 text-xs text-muted-foreground border-2 border-dashed rounded-lg">
                                    Nenhum item de checklist para esta etapa.
                                </p>
                            )}
                        </div>
                    </section>
                </div>

                <DialogFooter className="p-6 border-t bg-muted/20">
                    <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                    <Button onClick={handleSave} disabled={isSaving || !stageId}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <PlusCircle className="mr-2 h-4 w-4" />}
                        Salvar Requisitos
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
