
'use client';
import React, { useState, useEffect } from 'react';
import { useVolunteering } from '@/contexts/volunteering-context';
import { useFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ShieldCheck, Mail, Info } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

export function CourseDetailsForm({ course }) {
  const { users, isLoading } = useVolunteering();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    responsibleId: '',
    description: '',
    type: 'complete' as any,
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (course) {
      setFormData({
        responsibleId: course.responsibleId || '',
        description: course.description || '',
        type: course.type || 'complete',
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
    await updateDocumentNonBlocking(courseDocRef, formData);
    toast({ title: 'Sucesso!', description: 'As configurações do curso foram atualizadas.'});
    setIsSaving(false);
  };

  const responsible = users.find(u => u.id === formData.responsibleId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
          <div className="space-y-4">
              <div className="space-y-2">
                  <Label htmlFor="desc">Descrição Detalhada</Label>
                  <Textarea 
                    id="desc" 
                    rows={5} 
                    value={formData.description} 
                    onChange={e => handleChange('description', e.target.value)}
                    placeholder="Descreva os objetivos, público-alvo e resultados esperados deste curso..."
                  />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                      <Label htmlFor="type">Tipo de Curso</Label>
                      <Select value={formData.type} onValueChange={v => handleChange('type', v)}>
                          <SelectTrigger id="type"><SelectValue /></SelectTrigger>
                          <SelectContent>
                              <SelectItem value="basic">Básico / Workshop</SelectItem>
                              <SelectItem value="complete">Formação Completa</SelectItem>
                              <SelectItem value="theological">Teológico / Doutrinário</SelectItem>
                          </SelectContent>
                      </Select>
                  </div>
              </div>
          </div>
          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Salvar Configurações
            </Button>
          </div>
      </div>

      <div className="space-y-6">
          <Card className="bg-primary/5 border-primary/10">
              <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-2 text-primary font-bold">
                      <ShieldCheck className="size-5" />
                      Coordenação do Curso
                  </div>
                  <div className="space-y-4">
                      <div>
                        <Label htmlFor="responsibleId" className="text-[10px] uppercase font-black text-muted-foreground">Responsável Designado</Label>
                        <Select value={formData.responsibleId || 'null'} onValueChange={v => handleChange('responsibleId', v)} disabled={isLoading}>
                          <SelectTrigger id="responsibleId" className="bg-white mt-1">
                            <SelectValue placeholder="Selecione um líder..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="null">Nenhum</SelectItem>
                            {users.map(user => <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {responsible && (
                          <div className="p-3 bg-white rounded-lg border shadow-sm space-y-2 animate-in fade-in-50">
                              <div className="flex items-center gap-2">
                                  <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                      {responsible.name.charAt(0)}
                                  </div>
                                  <p className="text-sm font-bold truncate">{responsible.name}</p>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Mail className="size-3" />
                                  {responsible.email || 'E-mail não cadastrado'}
                              </div>
                          </div>
                      )}
                  </div>
              </CardContent>
          </Card>

          <div className="p-4 bg-muted/30 rounded-lg border border-dashed text-center">
              <Info className="size-5 mx-auto mb-2 text-muted-foreground" />
              <p className="text-xs text-muted-foreground italic">
                  O responsável pelo curso recebe notificações sobre novas solicitações de inscrição automaticamente.
              </p>
          </div>
      </div>
    </div>
  );
}
