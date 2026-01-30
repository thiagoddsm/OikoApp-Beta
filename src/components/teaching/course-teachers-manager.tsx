'use client';
import React from 'react';
import { useVolunteering } from '@/contexts/volunteering-context';
import { useFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

export function CourseTeachersManager({ course }) {
  const { users, isLoading } = useVolunteering();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [selectedTeachers, setSelectedTeachers] = React.useState(course.teacherIds || []);

  const teachers = React.useMemo(() => {
      return users.filter(u => u.isTeacher);
  }, [users]);

  const handleTeacherSelectionChange = (teacherId: string, checked: boolean) => {
    setSelectedTeachers((prev: string[]) => {
        if (checked) {
            return [...prev, teacherId];
        } else {
            return prev.filter(id => id !== teacherId);
        }
    });
  };
  
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
        <ScrollArea className="h-48 w-full rounded-md border p-4">
            <div className="space-y-2">
                {teachers.map(teacher => (
                    <div key={teacher.id} className="flex items-center space-x-2">
                        <Checkbox
                            id={`teacher-${course.id}-${teacher.id}`}
                            checked={selectedTeachers.includes(teacher.id)}
                            onCheckedChange={(checked) => handleTeacherSelectionChange(teacher.id, !!checked)}
                            disabled={isLoading}
                        />
                        <Label htmlFor={`teacher-${course.id}-${teacher.id}`} className="font-normal cursor-pointer">
                            {teacher.name}
                        </Label>
                    </div>
                ))}
            </div>
        </ScrollArea>
        <p className="text-xs text-muted-foreground">Selecione os professores que podem lecionar este curso.</p>
      </div>
      <div className="flex justify-end">
        <Button onClick={handleSave}>Salvar Professores</Button>
      </div>
    </div>
  );
}
