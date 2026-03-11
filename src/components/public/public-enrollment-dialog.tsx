'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Loader2, UserPlus, Search, BookOpen, Layers, AlertTriangle, Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePublicEnrollment } from '@/contexts/public/enrollment-context';

interface PublicEnrollmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCourseId?: string | null;
}

export function PublicEnrollmentDialog({ open, onOpenChange, initialCourseId }: PublicEnrollmentDialogProps) {
  const { classes, courses, submitEnrollmentRequest, isLoading } = usePublicEnrollment();
  const { toast } = useToast();

  const [emailInput, setEmailInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [classId, setClassId] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setEmailInput('');
      setNameInput('');
      setPhoneInput('');
      setSelectedCourseId(initialCourseId || '');
      setClassId('');
    }
  }, [open, initialCourseId]);

  const selectedCourse = useMemo(() => courses.find(c => c.id === selectedCourseId), [courses, selectedCourseId]);
  const isMemberCourse = useMemo(() => 
    selectedCourse?.name?.toLowerCase().includes('membro') || 
    selectedCourse?.name?.toLowerCase().includes('pertencer') ||
    selectedCourse?.name?.toLowerCase().includes('integração'),
  [selectedCourse]);

  const filteredClasses = useMemo(() => {
    if (!selectedCourseId || isMemberCourse) return [];
    return classes.filter(cls => cls.courseId === selectedCourseId);
  }, [classes, selectedCourseId, isMemberCourse]);

  const handleSave = async () => {
    if (!nameInput.trim() || !emailInput.trim()) {
        toast({ variant: 'destructive', title: 'Campos obrigatórios', description: 'Preencha nome e e-mail.' });
        return;
    }
    if (!selectedCourseId) {
        toast({ variant: 'destructive', title: 'Campo obrigatório', description: 'Selecione um curso.' });
        return;
    }
    if (!isMemberCourse && !classId) {
      toast({ variant: 'destructive', title: 'Campo obrigatório', description: 'Selecione uma turma.' });
      return;
    }

    setIsSaving(true);

    try {
        await submitEnrollmentRequest({
            name: nameInput,
            email: emailInput,
            phone: phoneInput,
            courseId: selectedCourseId,
            classId: isMemberCourse ? undefined : classId
        });
        
        toast({ 
            title: 'Solicitação enviada!', 
            description: 'Sua solicitação de matrícula foi recebida. Entraremos em contato em breve.' 
        });
        onOpenChange(false);
    } catch (error: any) {
        console.error(error);
        toast({ variant: 'destructive', title: 'Erro', description: error.message || 'Não foi possível enviar a solicitação.' });
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-6 border-b bg-muted/20">
          <DialogTitle>Solicitar Matrícula</DialogTitle>
          <DialogDescription>
            Preencha seus dados para enviar uma solicitação de matrícula. Nossa secretaria fará a aprovação.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                
                <div className="p-4 bg-muted/30 rounded-xl border-2 border-dashed space-y-4">
                    <p className="text-[10px] uppercase font-black text-primary tracking-widest leading-none">Seus Dados</p>
                    <div className="grid gap-4">
                        <div className="space-y-1">
                            <Label htmlFor="newName" className="text-xs font-bold">Nome Completo *</Label>
                            <Input id="newName" value={nameInput} onChange={e => setNameInput(e.target.value)} placeholder="Seu nome" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                             <div className="space-y-1">
                                <Label htmlFor="newEmail" className="text-xs font-bold">E-mail *</Label>
                                <Input id="newEmail" type="email" value={emailInput} onChange={e => setEmailInput(e.target.value)} placeholder="seu@email.com" />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="newPhone" className="text-xs font-bold">Telefone (WhatsApp)</Label>
                                <Input id="newPhone" value={phoneInput} onChange={e => setPhoneInput(e.target.value)} placeholder="(21) 9..." />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <Label htmlFor="course-id" className="text-[10px] uppercase font-black text-muted-foreground">Curso Escolhido</Label>
                        <Select value={selectedCourseId} onValueChange={(v) => { setSelectedCourseId(v); setClassId(''); }} disabled={isLoading || !!initialCourseId}>
                            <SelectTrigger id="course-id" className="mt-1 h-11">
                                <SelectValue placeholder="Escolha o curso..." />
                            </SelectTrigger>
                            <SelectContent>
                                {courses.map(course => (
                                    <SelectItem key={course.id} value={course.id}>
                                        <div className="flex items-center gap-2">
                                            <BookOpen className="size-3 text-muted-foreground" />
                                            {course.name}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label htmlFor="class-id" className="text-[10px] uppercase font-black text-muted-foreground">Turma / Disciplina</Label>
                        
                        {isMemberCourse ? (
                            <div className="mt-2 p-4 bg-primary/5 border border-primary/20 rounded-lg flex items-start gap-3">
                                <Layers className="size-5 text-primary shrink-0 mt-0.5" />
                                <div className="text-[11px] text-muted-foreground mt-1">Ciclo Modular: Você será inserido em nossa base de aulas dominicais automaticamente após aprovação.</div>
                            </div>
                        ) : (
                            <Select value={classId} onValueChange={setClassId} disabled={isLoading || !selectedCourseId}>
                                <SelectTrigger id="class-id" className="mt-1 h-11">
                                    <SelectValue placeholder={!selectedCourseId ? "Selecione o curso primeiro" : "Selecione uma turma..."} />
                                </SelectTrigger>
                                <SelectContent>
                                    {filteredClasses.length === 0 ? (
                                        <SelectItem value="none" disabled>Nenhuma turma ativa</SelectItem>
                                    ) : (
                                        filteredClasses.map(cls => (
                                            <SelectItem key={cls.id} value={cls.id}>
                                                <div className="flex flex-col">
                                                    <span className="font-bold">{cls.name}</span>
                                                    <span className="text-[10px] opacity-70">
                                                        {cls.dayOfWeek || 'Sem dia'} às {cls.startTime}
                                                    </span>
                                                </div>
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                </div>
            </div>
        </div>

        <DialogFooter className="p-6 border-t bg-muted/20">
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button onClick={handleSave} disabled={isSaving || (!isMemberCourse && !classId)}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enviar Solicitação
            </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}
