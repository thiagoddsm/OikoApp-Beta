'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useVolunteering } from '@/contexts/volunteering-context';

interface EnrollmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EnrollmentDialog({ open, onOpenChange }: EnrollmentDialogProps) {
  const { users, classes, courses, updateClass, isLoading } = useVolunteering();
  const { toast } = useToast();

  const [studentId, setStudentId] = useState('');
  const [classId, setClassId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const courseMap = useMemo(() => new Map(courses.map(c => [c.id, c.name])), [courses]);

  useEffect(() => {
    if (open) {
      // Reset form when opening
      setStudentId('');
      setClassId('');
    }
  }, [open]);

  const handleSave = async () => {
    if (!studentId || !classId) {
      toast({ variant: 'destructive', title: 'Campos obrigatórios', description: 'Por favor, selecione um aluno e uma turma.' });
      return;
    }
    setIsSaving(true);

    const selectedClass = classes.find(c => c.id === classId);
    if (!selectedClass) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Turma não encontrada.' });
        setIsSaving(false);
        return;
    }

    const currentStudents = selectedClass.students || [];
    if (currentStudents.includes(studentId)) {
        toast({ variant: 'default', title: 'Aviso', description: 'Este aluno já está matriculado nesta turma.' });
        setIsSaving(false);
        onOpenChange(false);
        return;
    }

    const updatedStudents = [...currentStudents, studentId];
    await updateClass(classId, { students: updatedStudents });
    
    toast({ title: 'Sucesso!', description: 'Aluno matriculado na turma.' });

    setIsSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Matrícula</DialogTitle>
          <DialogDescription>
            Selecione o aluno e a turma para realizar a matrícula.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="student-id">Aluno</Label>
            <Select value={studentId} onValueChange={setStudentId} disabled={isLoading}>
                <SelectTrigger id="student-id"><SelectValue placeholder="Selecione um aluno..." /></SelectTrigger>
                <SelectContent>
                    {users.map(user => <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>)}
                </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="class-id">Turma</Label>
             <Select value={classId} onValueChange={setClassId} disabled={isLoading}>
                <SelectTrigger id="class-id"><SelectValue placeholder="Selecione uma turma..." /></SelectTrigger>
                <SelectContent>
                    {classes.map(cls => <SelectItem key={cls.id} value={cls.id}>{cls.name} ({courseMap.get(cls.courseId) || 'Curso desconhecido'})</SelectItem>)}
                </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Matricular Aluno
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
