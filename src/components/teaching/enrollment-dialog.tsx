'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, UserPlus, Search, BookOpen, Layers, AlertTriangle } from 'lucide-react';
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

  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [studentId, setStudentId] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [classId, setClassId] = useState('');
  
  // Fields for new user
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setStudentId(initialStudentId || '');
      setSelectedCourseId(initialCourseId || '');
      setClassId('');
      setNewName('');
      setNewEmail('');
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

  const selectedUser = useMemo(() => users.find(u => u.id === studentId), [users, studentId]);
  const isStudentInCidade = selectedUser?.integrationStatus === 'nao_alcancado';

  // Rule: Someone in "Cidade" stage CANNOT take the membership course.
  const isEnrollmentBlocked = isMemberCourse && isStudentInCidade;

  // Filtra as turmas com base no curso selecionado
  const filteredClasses = useMemo(() => {
    if (!selectedCourseId || isMemberCourse) return [];
    return classes.filter(cls => cls.courseId === selectedCourseId);
  }, [classes, selectedCourseId, isMemberCourse]);

  const handleSave = async () => {
    if (mode === 'existing' && !studentId) {
        toast({ variant: 'destructive', title: 'Campo obrigatório', description: 'Selecione um aluno.' });
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
                email: newEmail,
                phone: newPhone,
                integrationStatus: isMemberCourse ? 'novo_convertido' : 'nao_alcancado', // New users for member courses start as converted
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
          <DialogTitle>Realizar Matrícula</DialogTitle>
          <DialogDescription>
            Escolha o aluno e o curso. {isMemberCourse && "A matrícula será feita em todas as disciplinas do curso automaticamente."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Passo 1: Aluno */}
          {!initialStudentId && (
            <RadioGroup value={mode} onValueChange={(v: any) => setMode(v)} className="flex gap-4 p-1 bg-muted rounded-md">
                <Label htmlFor="mode-existing" className={`flex-1 flex items-center justify-center p-2 rounded-sm cursor-pointer transition-all ${mode === 'existing' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}>
                    <RadioGroupItem value="existing" id="mode-existing" className="sr-only" />
                    <Search className="size-4 mr-2" /> Selecionar Aluno
                </Label>
                <Label htmlFor="mode-new" className={`flex-1 flex items-center justify-center p-2 rounded-sm cursor-pointer transition-all ${mode === 'new' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}>
                    <RadioGroupItem value="new" id="mode-new" className="sr-only" />
                    <UserPlus className="size-4 mr-2" /> Cadastrar Novo
                </Label>
            </RadioGroup>
          )}

          <div className="space-y-4">
            {mode === 'existing' ? (
                <div>
                    <Label htmlFor="student-id" className="text-[10px] uppercase font-black text-muted-foreground">1. Aluno</Label>
                    <Select value={studentId} onValueChange={setStudentId} disabled={isLoading || !!initialStudentId}>
                        <SelectTrigger id="student-id" className="mt-1"><SelectValue placeholder="Selecione um aluno..." /></SelectTrigger>
                        <SelectContent>
                            {users.map(user => <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            ) : (
                <div className="space-y-3">
                    <Label className="text-[10px] uppercase font-black text-muted-foreground">1. Novos Dados do Aluno</Label>
                    <div>
                        <Label htmlFor="newName" className="text-xs">Nome Completo *</Label>
                        <Input id="newName" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ex: João da Silva" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label htmlFor="newPhone" className="text-xs">Telefone</Label>
                            <Input id="newPhone" value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="(21) 9..." />
                        </div>
                        <div>
                            <Label htmlFor="newEmail" className="text-xs">E-mail</Label>
                            <Input id="newEmail" value={newEmail} onChange={e => setNewEmail(e.target.value)} type="email" placeholder="exemplo@mail.com" />
                        </div>
                    </div>
                </div>
            )}

            {/* Passo 2: Curso */}
            <div>
                <Label htmlFor="course-id" className="text-[10px] uppercase font-black text-muted-foreground">2. Selecionar Curso</Label>
                <Select value={selectedCourseId} onValueChange={(v) => { setSelectedCourseId(v); setClassId(''); }} disabled={isLoading}>
                    <SelectTrigger id="course-id" className="mt-1">
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

            {/* Passo 3: Disciplinas / Turmas */}
            <div>
                <Label htmlFor="class-id" className="text-[10px] uppercase font-black text-muted-foreground">3. Disciplinas de Destino</Label>
                
                {isEnrollmentBlocked ? (
                    <div className="mt-2 p-4 bg-destructive/10 border-2 border-destructive rounded-lg flex items-start gap-3 animate-in shake-1 duration-300">
                        <AlertTriangle className="size-5 text-destructive shrink-0 mt-0.5" />
                        <div>
                            <p className="text-xs font-black text-destructive uppercase tracking-tighter">Acesso Negado à Membresia</p>
                            <p className="text-[11px] text-destructive/80 mt-1 leading-tight font-medium">
                                Este aluno está no estágio <strong>CIDADE</strong>. Para participar do Curso Pertencer, ele precisa primeiro registrar uma <strong>decisão</strong> (Novo Convertido, Reconciliado ou Transferido).
                            </p>
                        </div>
                    </div>
                ) : isMemberCourse ? (
                    <div className="mt-2 p-4 bg-primary/5 border border-primary/20 rounded-lg flex items-start gap-3 animate-in fade-in zoom-in-95">
                        <Layers className="size-5 text-primary shrink-0 mt-0.5" />
                        <div>
                            <p className="text-xs font-bold text-primary uppercase">Ciclo de Membresia Ativo</p>
                            <p className="text-[11px] text-muted-foreground mt-1">Este curso contempla 5 módulos dominicais sucessivos. O aluno será inscrito em todas as disciplinas automaticamente.</p>
                        </div>
                    </div>
                ) : (
                    <>
                        <Select value={classId} onValueChange={setClassId} disabled={isLoading || !selectedCourseId}>
                            <SelectTrigger id="class-id" className="mt-1">
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
                                                    {cls.dayOfWeek || 'Dia não definido'} às {cls.startTime}
                                                </span>
                                            </div>
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                        {selectedCourseId && !isMemberCourse && filteredClasses.length === 0 && (
                            <p className="text-[10px] text-destructive mt-1 font-bold">Aviso: Não existem turmas cadastradas para este curso.</p>
                        )}
                    </>
                )}
            </div>
          </div>
        </div>
        <DialogFooter className="p-6 border-t bg-muted/20">
          <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
          <Button onClick={handleSave} disabled={isSaving || isEnrollmentBlocked || (!isMemberCourse && !classId)}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === 'new' ? 'Cadastrar e Matricular' : 'Efetivar Matrícula'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
