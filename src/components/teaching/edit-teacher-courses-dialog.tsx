'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { useVolunteering, type User, type Course } from '@/contexts/volunteering-context';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { MultiSelect, type OptionType } from '@/components/ui/multi-select';
import { Loader2 } from 'lucide-react';

interface EditTeacherCoursesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
}

export function EditTeacherCoursesDialog({ open, onOpenChange, user }: EditTeacherCoursesDialogProps) {
  const { courses, updateVolunteer, isLoading } = useVolunteering();
  const [isSaving, setIsSaving] = useState(false);
  const [isTeacher, setIsTeacher] = useState(false);
  const [taughtCourseIds, setTaughtCourseIds] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      setIsTeacher(user.isTeacher || false);
      setTaughtCourseIds(user.taughtCourseIds || []);
    }
  }, [user]);

  const courseOptions: OptionType[] = useMemo(() => {
    return courses.map(course => ({ value: course.id, label: course.name }));
  }, [courses]);

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    
    const updateData: Partial<User> = {
        isTeacher,
        taughtCourseIds: isTeacher ? taughtCourseIds : []
    };
    
    await updateVolunteer(user.id, updateData);
    setIsSaving(false);
    onOpenChange(false);
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onPointerDownOutside={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest('[cmdk-root]')) {
          e.preventDefault();
        }
      }}>
        <DialogHeader>
          <DialogTitle>Gerenciar Cursos para {user.name}</DialogTitle>
          <DialogDescription>
            Habilite este membro como professor e selecione os cursos que ele(a) pode lecionar.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="flex items-center space-x-3">
            <Switch
              id={`teacher-status-${user.id}`}
              checked={isTeacher}
              onCheckedChange={setIsTeacher}
            />
            <Label htmlFor={`teacher-status-${user.id}`} className="text-base">
              Professor(a) Habilitado(a)
            </Label>
          </div>

          {isTeacher && (
            <div className="space-y-2">
              <Label>Cursos Elegíveis</Label>
              <MultiSelect
                options={courseOptions}
                selected={taughtCourseIds}
                onChange={setTaughtCourseIds}
                placeholder="Selecione os cursos..."
                disabled={isLoading}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
