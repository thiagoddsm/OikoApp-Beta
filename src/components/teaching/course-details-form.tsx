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

const weekDays = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
const locations = ["IBM", "The School"];

export function CourseDetailsForm({ course }) {
  const { users, isLoading } = useVolunteering();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    responsibleId: '',
    location: '',
    defaultDay: '',
    defaultTime: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (course) {
      setFormData({
        responsibleId: course.responsibleId || '',
        location: course.location || '',
        defaultDay: course.defaultDay || '',
        defaultTime: course.defaultTime || '',
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
    <div className="space-y-6 max-w-2xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        <div>
          <Label htmlFor="location">Local Padrão</Label>
          <Select value={formData.location} onValueChange={v => handleChange('location', v)}>
            <SelectTrigger id="location">
              <SelectValue placeholder="Selecione o local..." />
            </SelectTrigger>
            <SelectContent>
              {locations.map(loc => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="defaultDay">Dia Padrão</Label>
          <Select value={formData.defaultDay} onValueChange={v => handleChange('defaultDay', v)}>
            <SelectTrigger id="defaultDay">
              <SelectValue placeholder="Selecione um dia..." />
            </SelectTrigger>
            <SelectContent>
              {weekDays.map(day => <SelectItem key={day} value={day}>{day}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="defaultTime">Horário Padrão</Label>
          <Input id="defaultTime" type="time" value={formData.defaultTime} onChange={e => handleChange('defaultTime', e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Salvar Alterações
        </Button>
      </div>
    </div>
  );
}
