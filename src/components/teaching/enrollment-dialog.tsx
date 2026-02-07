
'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, UserPlus, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useVolunteering } from '@/contexts/volunteering-context';

interface EnrollmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EnrollmentDialog({ open, onOpenChange }: EnrollmentDialogProps) {
  const { users, classes, courses, enrollStudent, addUser, isLoading } = useVolunteering();
  const { toast } = useToast();

  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [studentId, setStudentId] = useState('');
  const [classId, setClassId] = useState('');
  
  // Fields for new user
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);

  const courseMap = useMemo(() => new Map(courses.map(c => [c.id, c.name])), [courses]);

  useEffect(() => {
    if (open) {
      setStudentId('');
      setClassId('');
      setNewName('');
      setNewEmail('');
      setNewPhone('');
      setMode('existing');
    }
  }, [open]);

  const handleSave = async () => {
    if (mode === 'existing' && !studentId) {
        toast({ variant: 'destructive', title: 'Campo obrigatório', description: 'Selecione um aluno.' });
        return;
    }
    if (mode === 'new' && !newName.trim()) {
        toast({ variant: 'destructive', title: 'Campo obrigatório', description: 'Digite o nome do aluno.' });
        return;
    }
    if (!classId) {
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
            });
        }

        const selectedClass = classes.find(c => c.id === classId);
        if (!selectedClass) throw new Error("Turma não encontrada");

        // Utiliza a função unificada de matrícula que gera faturas automaticamente
        await enrollStudent(finalStudentId, classId);
        
        toast({ title: 'Sucesso!', description: 'Matrícula realizada e financeiro iniciado.' });
        onOpenChange(false);
    } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível concluir a matrícula.' });
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Realizar Matrícula</DialogTitle>
          <DialogDescription>
            Matricule um aluno existente ou cadastre um novo interessado no sistema.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
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

          <div className="space-y-4">
            {mode === 'existing' ? (
                <div>
                    <Label htmlFor="student-id">Pesquisar Aluno</Label>
                    <Select value={studentId} onValueChange={setStudentId} disabled={isLoading}>
                        <SelectTrigger id="student-id"><SelectValue placeholder="Selecione um aluno..." /></SelectTrigger>
                        <SelectContent>
                            {users.map(user => <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            ) : (
                <div className="space-y-3">
                    <div>
                        <Label htmlFor="newName">Nome Completo *</Label>
                        <Input id="newName" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ex: João da Silva" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label htmlFor="newPhone">Telefone</Label>
                            <Input id="newPhone" value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="(21) 9..." />
                        </div>
                        <div>
                            <Label htmlFor="newEmail">E-mail</Label>
                            <Input id="newEmail" value={newEmail} onChange={e => setNewEmail(e.target.value)} type="email" placeholder="exemplo@mail.com" />
                        </div>
                    </div>
                </div>
            )}

            <div>
                <Label htmlFor="class-id">Turma de Destino *</Label>
                <Select value={classId} onValueChange={setClassId} disabled={isLoading}>
                    <SelectTrigger id="class-id"><SelectValue placeholder="Selecione uma turma..." /></SelectTrigger>
                    <SelectContent>
                        {classes.map(cls => <SelectItem key={cls.id} value={cls.id}>{cls.name} ({courseMap.get(cls.courseId) || 'Curso'})</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === 'new' ? 'Cadastrar e Matricular' : 'Efetivar Matrícula'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
