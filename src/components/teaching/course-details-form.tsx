'use client';
import React, { useState, useEffect } from 'react';
import { useVolunteering } from '@/contexts/volunteering-context';
import { useFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function CourseDetailsForm({ course }) {
  const { users, isLoading } = useVolunteering();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    responsibleId: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (course) {
      setFormData({
        responsibleId: course.responsibleId || '',
      });
    }
  }, [course]);

  const handleChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSave = async () => {
    if(!firestore) return;
    setIsSaving(true);
    const courseDocRef = doc(firestore, 'courses', course.id);
    updateDocumentNonBlocking(courseDocRef, formData);
    toast({ title: 'Sucesso!', description: 'As alterações do curso foram salvas.'});
    setIsSaving(false);
  };

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <Label htmlFor="responsibleId">Responsável pelo curso</Label>
        <Select value={formData.responsibleId} onValueChange={v => handleChange('responsibleId', v)} disabled={isLoading}>
          <SelectTrigger id="responsibleId">
            <SelectValue placeholder="Selecione um responsável..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="null">Nenhum</SelectItem>
            {users.map(user => <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Salvar Alterações
        </Button>
      </div>
    </div>
  );
}

    