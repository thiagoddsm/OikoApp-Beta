
'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc, query } from 'firebase/firestore';
import { MultiSelect, type OptionType } from '@/components/ui/multi-select';

type User = { id: string; name: string; isTeacher?: boolean; };

export function ClassFormDialog({ open, onOpenChange, existingClass, courseId }) {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [schedule, setSchedule] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [studentIds, setStudentIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  const usersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'users')) : null, [firestore]);
  const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);

  const teachers = useMemo(() => users?.filter(u => u.isTeacher) || [], [users]);
  const studentOptions: OptionType[] = useMemo(() => users?.map(u => ({ value: u.id, label: u.name })) || [], [users]);

  useEffect(() => {
    if (open) {
      setName(existingClass?.name || '');
      setSchedule(existingClass?.schedule || '');
      setTeacherId(existingClass?.teacherId || '');
      setStudentIds(existingClass?.students || []);
    }
  }, [open, existingClass]);

  const handleSave = async () => {
    if (!name.trim() || !courseId) {
      toast({ variant: 'destructive', title: 'Campos obrigatórios', description: 'Nome da turma é obrigatório.' });
      return;
    }
    setIsSaving(true);
    const classData = { courseId, name, schedule, teacherId, students: studentIds };

    if (existingClass) {
      const docRef = doc(firestore, `courses/${courseId}/classes`, existingClass.id);
      await updateDocumentNonBlocking(docRef, classData);
      toast({ title: 'Turma atualizada!' });
    } else {
      const collectionRef = collection(firestore, `courses/${courseId}/classes`);
      await addDocumentNonBlocking(collectionRef, classData);
      toast({ title: 'Turma criada!' });
    }

    setIsSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{existingClass ? 'Editar Turma' : 'Nova Turma'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
          <div>
            <Label htmlFor="name">Nome da Turma</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Turma de Sábado" />
          </div>
          <div>
            <Label htmlFor="schedule">Horário</Label>
            <Input id="schedule" value={schedule} onChange={e => setSchedule(e.target.value)} placeholder="Ex: Sábados, 10:00 - 12:00" />
          </div>
          <div>
            <Label htmlFor="teacherId">Professor</Label>
            <Select value={teacherId} onValueChange={setTeacherId} disabled={isLoadingUsers}>
              <SelectTrigger id="teacherId"><SelectValue placeholder={isLoadingUsers ? "Carregando..." : "Selecione um professor"} /></SelectTrigger>
              <SelectContent>
                {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="students">Alunos</Label>
            <MultiSelect
                options={studentOptions}
                selected={studentIds}
                onChange={setStudentIds}
                placeholder="Selecione os alunos..."
                className="w-full"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 size-4 animate-spin"/>} Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
