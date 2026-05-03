'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Loader2, UserPlus, Search, BookOpen, Layers, AlertTriangle, Mail, ArrowLeft, CheckCircle, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useVolunteering } from '@/contexts/volunteering-context';
import { useDoc } from '@/firebase';
import { sendEnrollmentMessage } from '@/app/actions/whatsapp-actions';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { PlusCircle } from 'lucide-react';
import { format, parseISO, isAfter } from 'date-fns';

interface EnrollmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialStudentId?: string;
  initialCourseId?: string | null;
}

export function EnrollmentDialog({ open, onOpenChange, initialStudentId, initialCourseId }: EnrollmentDialogProps) {
  const { users, classes, courses, enrollStudent, addUser, isLoading } = useVolunteering();
  const { data: config } = useDoc<any>('config/notifications');
  const { toast } = useToast();

  const [step, setStep] = useState<'search' | 'details'>(initialStudentId ? 'details' : 'search');
  const [searchTerm, setSearchTerm] = useState('');
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
      setStep(initialStudentId ? 'details' : 'search');
      setSearchTerm('');
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

  // Lógica de validação de pré-requisitos
  const enrollmentError = useMemo(() => {
    if (!selectedCourseId) return null;
    const course = courses.find(c => c.id === selectedCourseId);
    if (!course) return null;

    // Se é um novo usuário, ele não atende a pré-requisitos de membresia ou cursos anteriores
    const isNew = mode === 'new';
    
    const integrationStatus = isNew ? 'nao_alcancado' : selectedUser?.integrationStatus;
    const batizado = isNew ? 'nao' : selectedUser?.batizado;
    const courseStatus = isNew ? {} : (selectedUser?.journey?.courseStatus || {});

    if (course.requiresMemberStatus && integrationStatus !== 'membro') {
        return "Este curso é exclusivo para membros oficiais da IBM.";
    }
    
    if (course.requiresBaptism && batizado !== 'sim') {
        return "Este curso exige que o aluno seja batizado nas águas.";
    }
    
    if (course.prerequisiteCourseId) {
        const isApproved = courseStatus[course.prerequisiteCourseId] === 'approved';
        if (!isApproved) {
            const preReqCourse = courses.find(c => c.id === course.prerequisiteCourseId);
            return `É necessário ter aprovação no curso "${preReqCourse?.name || 'pré-requisito'}" para se matricular.`;
        }
    }

    return null;
  }, [selectedCourseId, selectedUser, courses, mode]);

  const isEnrollmentBlocked = !!enrollmentError;

  const filteredClasses = useMemo(() => {
    if (!selectedCourseId) return [];
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    
    return classes.filter(cls => {
        if (cls.courseId !== selectedCourseId) return false;
        // Se houver data limite e já passou de hoje, não exibe
        if (cls.registrationDeadline && isAfter(parseISO(todayStr), parseISO(cls.registrationDeadline))) {
            return false;
        }
        return true;
    });
  }, [classes, selectedCourseId]);

  const handleSelectUser = (user: any) => {
    setStudentId(user.id);
    setMode('existing');
    setEmailInput(user.email || '');
    setStep('details');
    toast({ title: "Usuário selecionado", description: `${user.name} selecionado para matrícula.` });
  };

  const handleCreateNew = (name?: string) => {
    setStudentId('');
    setMode('new');
    setNewName(name || searchTerm);
    setStep('details');
    toast({ title: "Novo Cadastro", description: "Preencha os dados do novo aluno." });
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
            title: 'Inscrição Bloqueada', 
            description: enrollmentError 
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

        await enrollStudent(finalStudentId, selectedCourseId, classId || undefined);
        
        // Notificação de matrícula
        const targetName = mode === 'new' ? newName : selectedUser?.name;
        const targetPhone = mode === 'new' ? newPhone : selectedUser?.phone;
        const courseName = selectedCourse?.name || 'Curso';

        if (targetName && targetPhone) {
            sendEnrollmentMessage(targetName, String(targetPhone), courseName, {
                enabled: config?.enabled,
                serverUrl: config?.serverUrl,
                instanceKey: config?.instanceKey,
                notifyEnrollment: config?.notifyEnrollment
            });
        }

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
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-hidden flex flex-col p-0 shadow-2xl border-none">
        <DialogHeader className="p-6 border-b bg-muted/20">
          <div className="flex items-center gap-2">
            {step === 'details' && !initialStudentId && (
                <Button variant="ghost" size="icon" className="h-6 w-6 -ml-2" onClick={() => setStep('search')}>
                    <ArrowLeft className="size-4" />
                </Button>
            )}
            <DialogTitle className="text-xl font-black italic tracking-tighter uppercase text-primary">Realizar Matrícula</DialogTitle>
          </div>
          <DialogDescription className="text-xs font-bold uppercase text-muted-foreground tracking-widest mt-1">
            {step === 'search' ? 'Pesquise pelo nome do aluno no sistema.' : 'Confirme os dados e selecione o curso/turma.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {step === 'search' ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                <div className="border rounded-xl shadow-sm overflow-hidden bg-white">
                    <div className="flex items-center border-b px-3 bg-muted/5">
                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50 text-primary" />
                        <input 
                            className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground" 
                            placeholder="Digite o nome do aluno..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div className="max-h-[300px] overflow-y-auto p-1 custom-scrollbar">
                        {users.filter(u => u.name?.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 ? (
                            <div className="py-10 flex flex-col items-center gap-3 text-center">
                                <p className="text-sm text-muted-foreground">Nenhum aluno encontrado com este nome.</p>
                                <Button size="sm" variant="outline" onClick={() => handleCreateNew()}>
                                    <PlusCircle className="mr-2 size-4" /> Cadastrar "{searchTerm}"
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase text-muted-foreground px-3 py-2 tracking-widest">Sugestões do Sistema</p>
                                {users
                                    .filter(u => u.name?.toLowerCase().includes(searchTerm.toLowerCase()))
                                    .slice(0, 15)
                                    .map(user => (
                                    <button 
                                        key={user.id} 
                                        onClick={() => handleSelectUser(user)}
                                        className="flex items-center gap-3 w-full p-3 hover:bg-primary/5 rounded-lg transition-all text-left group border border-transparent hover:border-primary/10"
                                    >
                                        <div className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs group-hover:bg-primary group-hover:text-white transition-colors">
                                            {user.name?.charAt(0)}
                                        </div>
                                        <div className="flex flex-col flex-1 overflow-hidden">
                                            <span className="font-bold text-sm text-slate-900 group-hover:text-primary transition-colors truncate">{user.name}</span>
                                            <span className="text-[10px] text-muted-foreground italic truncate">{user.email || 'Sem e-mail'}</span>
                                        </div>
                                        <ArrowLeft className="size-4 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0 rotate-180 text-primary" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="flex items-center justify-center pt-2">
                    <Button variant="ghost" className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-primary" onClick={() => handleCreateNew()}>
                        <PlusCircle className="mr-2 size-4" /> Ou cadastre um novo aluno manualmente
                    </Button>
                </div>
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
                                    <div className="space-y-1">
                                        <Label htmlFor="newEmail" className="text-xs font-bold">E-mail</Label>
                                        <Input id="newEmail" value={emailInput} onChange={e => setEmailInput(e.target.value)} placeholder="email@exemplo.com" />
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
                            <SelectTrigger id="course-id" className="mt-1 h-11 font-bold">
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

                    {/* Turmas ou Erro de Pré-requisito */}
                    <div>
                        <Label htmlFor="class-id" className="text-[10px] uppercase font-black text-muted-foreground">Turma / Disciplina</Label>
                        
                        {isEnrollmentBlocked ? (
                            <div className="mt-2 p-4 bg-red-50 border-2 border-red-200 rounded-xl flex items-start gap-3 animate-in zoom-in-95">
                                <Lock className="size-5 text-red-600 shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <p className="text-xs font-black uppercase text-red-700">Inscrição Bloqueada</p>
                                    <p className="text-sm font-medium text-red-900 leading-tight">
                                        {enrollmentError}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <Select value={classId} onValueChange={setClassId} disabled={isLoading || !selectedCourseId}>
                                <SelectTrigger id="class-id" className="mt-1 h-11">
                                    <SelectValue placeholder={!selectedCourseId ? "Selecione o curso primeiro" : "Selecione uma turma..."} />
                                </SelectTrigger>
                                <SelectContent>
                                    {filteredClasses.length === 0 ? (
                                        <SelectItem value="none" disabled>Nenhuma turma com inscrições abertas</SelectItem>
                                    ) : (
                                        filteredClasses.map(cls => (
                                            <SelectItem key={cls.id} value={cls.id}>
                                                <div className="flex flex-col">
                                                    <span className="font-bold">{cls.name}</span>
                                                    <span className="text-[10px] opacity-70">
                                                        {cls.dayOfWeek || 'Sem dia'} às {cls.startTime}
                                                        {cls.registrationDeadline && ` • Limite: ${format(parseISO(cls.registrationDeadline), 'dd/MM')}`}
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
                <DialogClose asChild><Button variant="outline" className="font-bold">Cancelar</Button></DialogClose>
                <Button 
                    onClick={handleSave} 
                    disabled={isSaving || isEnrollmentBlocked || (!isMemberCourse && !classId)}
                    className="font-black uppercase tracking-widest shadow-lg"
                >
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {mode === 'new' ? 'Cadastrar e Matricular' : 'Confirmar Matrícula'}
                </Button>
            </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
