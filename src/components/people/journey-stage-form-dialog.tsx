'use client';

import React, { useState, useEffect } from 'react';
import { useFirebase, setDocumentNonBlocking } from '@/firebase';
import { doc, collection, addDoc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, PlusCircle, Trash2, ShieldCheck, ClipboardList, BookOpen } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { journeyColumns } from '@/components/users/journey-status-config';
import { Separator } from '@/components/ui/separator';

interface JourneyStageFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode: 'requirement' | 'checklist';
    existingData: any;
    courses: any[];
}

export function JourneyStageFormDialog({ open, onOpenChange, mode, existingData, courses }: JourneyStageFormDialogProps) {
    const { firestore } = useFirebase();
    const { toast } = useToast();

    // Fields for Requirement Mode
    const [stageId, setStageId] = useState('');
    const [requiredCourseId, setRequiredCourseId] = useState('');
    const [requiresDisciplerApproval, setRequiresDisciplerApproval] = useState(false);
    const [requiresSupervisorApproval, setRequiresSupervisorApproval] = useState(false);
    const [requiresBaptism, setRequiresBaptism] = useState(false);
    const [requiresActiveService, setRequiresActiveService] = useState(false);

    // Fields for Checklist Mode
    const [title, setTitle] = useState('');
    const [linkedStageId, setLinkedStageId] = useState('none');
    const [questions, setQuestions] = useState<{ id: string; label: string; type: string; }[]>([]);

    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (open) {
            if (mode === 'requirement') {
                setStageId(existingData?.id || '');
                setRequiredCourseId(existingData?.requiredCourseId || 'none');
                setRequiresDisciplerApproval(existingData?.requiresDisciplerApproval || false);
                setRequiresSupervisorApproval(existingData?.requiresSupervisorApproval || false);
                setRequiresBaptism(existingData?.requiresBaptism || false);
                setRequiresActiveService(existingData?.requiresActiveService || false);
            } else {
                setTitle(existingData?.title || '');
                setLinkedStageId(existingData?.linkedStageId || 'none');
                setQuestions(existingData?.questions?.map((q: any) => ({...q, type: q.type || 'checkbox'})) || []);
            }
        }
    }, [open, mode, existingData]);

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
        if (!firestore) return;
        
        if (mode === 'requirement' && !stageId) {
            toast({ variant: 'destructive', title: 'Fase obrigatória' });
            return;
        }

        if (mode === 'checklist' && !title) {
            toast({ variant: 'destructive', title: 'Título obrigatório' });
            return;
        }

        setIsSaving(true);
        
        try {
            if (mode === 'requirement') {
                const data = {
                    requiredCourseId: requiredCourseId === 'none' ? '' : requiredCourseId,
                    requiresDisciplerApproval,
                    requiresSupervisorApproval,
                    requiresBaptism,
                    requiresActiveService,
                };
                await setDocumentNonBlocking(doc(firestore, 'journey_phase_requirements', stageId), data, { merge: true });
                toast({ title: 'Requisitos Atualizados', description: 'Os critérios de avanço foram salvos.' });
            } else {
                const data = {
                    title,
                    linkedStageId: linkedStageId === 'none' ? '' : linkedStageId,
                    questions: questions.filter(q => q.label.trim() !== ''),
                };
                if (existingData?.id) {
                    await updateDoc(doc(firestore, 'discipleship_checklists', existingData.id), data);
                } else {
                    await addDoc(collection(firestore, 'discipleship_checklists'), data);
                }
                toast({ title: 'Checklist Salvo', description: 'O checklist operacional foi atualizado.' });
            }
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
                        {mode === 'requirement' ? <ShieldCheck className="text-primary" /> : <ClipboardList className="text-primary" />}
                        {mode === 'requirement' ? `Requisitos: ${journeyColumns.find(c => c.id === stageId)?.title || stageId}` : (existingData ? 'Editar Checklist' : 'Novo Checklist')}
                    </DialogTitle>
                    <DialogDescription>
                        {mode === 'requirement' ? 'Defina os critérios obrigatórios para um membro avançar para esta fase.' : 'Crie um guia de tarefas para apoiar a equipe de integração.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {mode === 'requirement' ? (
                        <div className="space-y-6">
                            <div className="space-y-4">
                                <Label className="flex items-center gap-2 text-sm font-bold"><BookOpen className="size-4" /> Validação Técnica</Label>
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                                    <Label className="text-[10px] uppercase font-black">Curso Obrigatório</Label>
                                    <Select value={requiredCourseId} onValueChange={setRequiredCourseId}>
                                        <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Livre (Nenhum curso exigido)</SelectItem>
                                            {courses.map(course => <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <Label className="flex items-center gap-2 text-sm font-bold"><ShieldCheck className="size-4" /> Validação Humana</Label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label className="text-xs font-bold">Aprovação do Discipulador</Label>
                                            <p className="text-[10px] text-muted-foreground">Exige visto manual do líder direto.</p>
                                        </div>
                                        <Checkbox checked={requiresDisciplerApproval} onCheckedChange={(v) => setRequiresDisciplerApproval(!!v)} />
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label className="text-xs font-bold">Aprovação do Supervisor</Label>
                                            <p className="text-[10px] text-muted-foreground">Exige visto do pastor ou supervisor.</p>
                                        </div>
                                        <Checkbox checked={requiresSupervisorApproval} onCheckedChange={(v) => setRequiresSupervisorApproval(!!v)} />
                                    </div>

                                    <div className="p-4 bg-blue-50/30 rounded-xl border border-blue-100 flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label className="text-xs font-bold text-blue-900">💧 Exigir Batismo</Label>
                                            <p className="text-[10px] text-blue-800/70">O membro deve estar batizado (Perfil).</p>
                                        </div>
                                        <Checkbox checked={requiresBaptism} onCheckedChange={(v) => setRequiresBaptism(!!v)} />
                                    </div>

                                    <div className="p-4 bg-emerald-50/30 rounded-xl border border-emerald-100 flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label className="text-xs font-bold text-emerald-900">🛠️ Serviço Ativo</Label>
                                            <p className="text-[10px] text-emerald-800/70">O membro deve estar servindo (Perfil).</p>
                                        </div>
                                        <Checkbox checked={requiresActiveService} onCheckedChange={(v) => setRequiresActiveService(!!v)} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] uppercase font-black">Título do Checklist</Label>
                                    <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Boas-vindas ao Novo Convertido" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] uppercase font-black">Vínculo com Fase (Opcional)</Label>
                                    <Select value={linkedStageId} onValueChange={setLinkedStageId}>
                                        <SelectTrigger><SelectValue placeholder="Geral" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Geral (Aparece em todas as fases)</SelectItem>
                                            {journeyColumns.map(col => <SelectItem key={col.id} value={col.id}>{col.title}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <Separator />

                            <div className="space-y-4">
                                <Label className="text-sm font-bold">Itens do Checklist</Label>
                                <div className="space-y-2">
                                    {questions.map((q, index) => (
                                        <div key={q.id} className="flex gap-2 p-2 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                            <Input value={q.label} onChange={(e) => handleQuestionFieldChange(index, 'label', e.target.value)} className="flex-1 bg-white" placeholder="Tarefa ou pergunta..." />
                                            <Button variant="ghost" size="icon" onClick={() => removeQuestion(index)} className="text-destructive"><Trash2 className="size-4" /></Button>
                                        </div>
                                    ))}
                                    <Button variant="outline" size="sm" onClick={addQuestion} className="w-full font-bold border-primary/20 text-primary">
                                        <PlusCircle className="mr-2 size-4" /> Adicionar Tarefa
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="p-6 border-t bg-muted/20">
                    <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                        Salvar Configuração
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
