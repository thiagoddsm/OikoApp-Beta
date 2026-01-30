'use client';
import React from 'react';
import { useVolunteering } from '@/contexts/volunteering-context';
import { useFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { MultiSelect, type OptionType } from '@/components/ui/multi-select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export function CourseTeachersManager({ course }) {
  const { users, isLoading } = useVolunteering();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [selectedTeachers, setSelectedTeachers] = React.useState(course.teacherIds || []);
  
  const teacherOptions: OptionType[] = React.useMemo(() => {
    return users
      .filter(u => u.isTeacher)
      .map(u => ({ value: u.id, label: u.name }));
  }, [users]);
  
  const handleSave = () => {
    if (!firestore) return;
    const courseDocRef = doc(firestore, 'courses', course.id);
    updateDocumentNonBlocking(courseDocRef, { teacherIds: selectedTeachers });
    toast({ title: 'Professores atualizados!' });
  };
  
  return (
    <div className="space-y-4 max-w-lg">
      <div className="space-y-2">
        <Label>Professores Habilitados</Label>
        <MultiSelect
          options={teacherOptions}
          selected={selectedTeachers}
          onChange={setSelectedTeachers}
          placeholder="Selecione os professores..."
          disabled={isLoading}
        />
         <p className="text-xs text-muted-foreground">Selecione os professores que podem lecionar este curso.</p>
      </div>
      <div className="flex justify-end">
        <Button onClick={handleSave}>Salvar Professores</Button>
      </div>
    </div>
  );
}
