
'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Loader2, UserPlus, Search, BookOpen, Layers, AlertTriangle, Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useVolunteering } from '@/contexts/volunteering-context';

interface EnrollmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialStudentId?: string;
  initialCourseId?: string | null;
}

export function EnrollmentDialog({ open, onOpenChange, initialStudentId, initialCourseId }: EnrollmentDialogProps) {
  const { users, classes, courses, enrollStudent, addUser, isLoading } = useVolunteering();
  const { toast } = useToast();

  const [step, setStep] = useState<'email' | 'details'>(initialStudentId ? 'details' : 'email');
  const [emailInput, setEmailInput] = useState('');
  const [studentId, setStudentId] = useState(initialStudentId || '');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [classId, setClassId] = useState('');
  
  // Fields for new user
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [mode, setMode] = useState<'existing' | 'new'>(initialStudentId ? 'existing' : 'existing');
  
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setStep(initialStudentId ? 'details' : 'email');
      setEmailInput('');
      setStudentId(initialStudentId || '');
      setSelectedCourseId(initialCourseId || '');
      setClassId('');
      setNewName('');
      setNewPhone('');
      setMode(initialStudentId ? 'existing' : 'existing');
    }
  }, [open, initialStudentId, initialCourseId]);

  const selectedCourse = useMemo(() => courses.find(c => c.id === selectedCourseId), [courses, selectedCourseId]);
  const isMemberCourse = useMemo(() => 
    selectedCourse?.name?.toLowerCase().includes('membro') || 
    selectedCourse?.name?.toLowerCase().includes('pertencer') ||
    selectedCourse?.name?.toLowerCase().includes('integração'),
  [selectedCourse]);

  const selectedUser = useMemo(() => users.find(u => u.id === (studentId || '')), [users, studentId]);

  // REGRA REMOVIDA: Alunos no estágio CIDADE podem se matricular em cursos de membresia.
  // Esta mudança foi feita para permitir que o curso 'Pertencer' funcione como uma porta de entrada
  // para novos membros, exatamente como solicitado pelo usuário.
  const isEnrollmentBlocked = false;

  const filteredClasses = useMemo(() => {
    if (!selectedCourseId || isMemberCourse) return [];
    return classes.filter(cls => cls.courseId === selectedCourseId);
  }, [classes, selectedCourseId, isMemberCourse]);

  const handleVerifyEmail = () => {
    if (!emailInput.trim()) return;
    
    const found = users.find(u => u.email?.toLowerCase() === emailInput.toLowerCase());
    
    if (found) {
        setStudentId(found.id);
        setMode('existing');
        toast({ title: "Usuário identificado", description: `Reconhecemos o cadastro de ${found.name}.` });
    } else {
        setStudentId('');
        setMode('new');
        toast({ title: "Novo Cadastro", description: "E-mail não encontrado. Por favor, preencha os dados para continuar." });
    }
    setStep('details');
  };

  const handleSave = async () => {
    if (mode === 'existing' && !studentId) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Usuário não identificado.' });
        return;
    }
    if (mode === 'new' && !newName.trim()) {
        toast({ variant: 'destructive', title: 'Campo obrigatório', description: 'Digite o nome do aluno.' });
        return;
    }
    if (!selectedCourseId) {
        toast({ variant: 'destructive', title: 'Campo obrigatório', description: 'Selecione um curso.' });
        return;
    }
    if (isEnrollmentBlocked) {
        toast({ 
            variant: 'destructive', 
            title: 'Matrícula Bloqueada', 
            description: 'Visitantes no estágio "Cidade" não podem fazer o curso de membresia. Registre uma decisão primeiro.' 
        });
        return;
    }
    if (!isMemberCourse && !classId) {
      toast({ variant: 'destructive', title: 'Campo obrigatório', description: 'Selecione uma turma.' });
      return;
    }

    setIsSaving(true);

    try {
        let finalStudentId = studentId;

        if (mode === 'new') {
            finalStudentId = await addUser({
                name: newName,
                email: emailInput,
                phone: newPhone,
                integrationStatus: isMemberCourse ? 'novo_convertido' : 'nao_alcancado',
            });
        }

        await enrollStudent(finalStudentId, selectedCourseId, isMemberCourse ? undefined : classId);
        
        toast({ title: 'Sucesso!', description: 'Matrícula realizada com sucesso.' });
        onOpenChange(false);
    } catch (error: any) {
        console.error(error);
        toast({ variant: 'destructive', title: 'Erro', description: error.message || 'Não foi possível concluir a matrícula.' });
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-6 border-b bg-muted/20">
          <div className="flex items-center gap-2">
            {step === 'details' && !initialStudentId && (
                <Button variant="ghost" size="icon" className="h-6 w-6 -ml-2" onClick={() => setStep('email')}>
                    <ArrowLeft className="size-4" />
                </Button>
            )}
            <DialogTitle>Realizar Matrícula</DialogTitle>
          </div>
          <DialogDescription>
            {step === 'email' ? 'Informe o e-mail do aluno para verificar o cadastro.' : 'Confirme os dados e selecione o curso/turma.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {step === 'email' ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                <div className="space-y-2">
                    <Label htmlFor="email-verify" className="text-[10px] uppercase font-black text-muted-foreground">E-mail do Aluno</Label>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Mail className="absolute left-3 top-3 size-4 text-muted-foreground" />
                            <Input 
                                id="email-verify" 
                                type="email" 
                                placeholder="aluno@exemplo.com" 
                                className="pl-10 h-11"
                                value={emailInput}
                                onChange={e => setEmailInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleVerifyEmail()}
                            />
                        </div>
                        <Button onClick={handleVerifyEmail} className="h-11 px-6 font-bold" disabled={!emailInput.trim() || isLoading}>
                            {isLoading ? <Loader2 className="animate-spin size-4" /> : 'Verificar'}
                        </Button>
                    </div>
                </div>
                <p className="text-xs text-muted-foreground italic">
                    O sistema verificará automaticamente se já existe um cadastro com este e-mail.
                </p>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                {/* Aluno Info */}
                <div className="p-4 bg-muted/30 rounded-xl border-2 border-dashed">
                    {mode === 'existing' ? (
                        <div className="flex items-center gap-3">
                            <div className="size-10 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center">
                                <CheckCircle size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest leading-none">Membro Identificado</p>
                                <p className="font-bold text-lg">{selectedUser?.name}</p>
                                <p className="text-xs text-muted-foreground">{selectedUser?.email}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-[10px] uppercase font-black text-primary tracking-widest leading-none">Novo Cadastro</p>
                            <div className="grid gap-4">
                                <div className="space-y-1">
                                    <Label htmlFor="newName" className="text-xs font-bold">Nome Completo *</Label>
                                    <Input id="newName" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nome do aluno" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label htmlFor="newPhone" className="text-xs font-bold">Telefone</Label>
                                        <Input id="newPhone" value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="(21) 9..." />
                                    </div>
                                    <div className="space-y-1 opacity-50">
                                        <Label className="text-xs font-bold">E-mail</Label>
                                        <Input value={emailInput} disabled />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Curso */}
                <div className="space-y-4">
                    <div>
                        <Label htmlFor="course-id" className="text-[10px] uppercase font-black text-muted-foreground">Selecionar Curso</Label>
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

                    {/* Turmas */}
                    <div>
                        <Label htmlFor="class-id" className="text-[10px] uppercase font-black text-muted-foreground">Turma / Disciplina</Label>
                        
                        {isEnrollmentBlocked ? (
                            <div className="mt-2 p-4 bg-destructive/10 border-2 border-destructive rounded-lg flex items-start gap-3">
                                <AlertTriangle className="size-5 text-destructive shrink-0 mt-0.5" />
                                <div className="text-[11px] text-destructive leading-tight font-medium">
                                    Acesso Negado: Alunos no estágio <strong>CIDADE</strong> não podem ingressar na membresia. Registre uma decisão primeiro.
                                </div>
                            </div>
                        ) : isMemberCourse ? (
                            <div className="mt-2 p-4 bg-primary/5 border border-primary/20 rounded-lg flex items-start gap-3">
                                <Layers className="size-5 text-primary shrink-0 mt-0.5" />
                                <div className="text-[11px] text-muted-foreground mt-1">Ciclo Modular: O aluno será inscrito em todas as aulas dominicais automaticamente.</div>
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
          )}
        </div>

        {step === 'details' && (
            <DialogFooter className="p-6 border-t bg-muted/20">
                <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                <Button onClick={handleSave} disabled={isSaving || isEnrollmentBlocked || (!isMemberCourse && !classId)}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {mode === 'new' ? 'Cadastrar e Matricular' : 'Confirmar Matrícula'}
                </Button>
            </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
