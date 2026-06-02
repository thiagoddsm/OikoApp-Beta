'use client';
import React, { useState, useEffect } from 'react';
import { useVolunteering } from '@/contexts/volunteering-context';
import { useFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, ShieldCheck, Mail, Info, School, PlayCircle, Percent, Lock, UserCheck, CheckCircle2, GraduationCap } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { PersonSearchInput } from '@/components/common/person-search-input';

export function CourseDetailsForm({ course }) {
  const { users, courses, theoflixCourses, isLoading } = useVolunteering();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    responsibleId: '',
    description: '',
    type: 'trilho' as 'trilho' | 'eletivo',
    ebdTrack: '',
    linkedTheoflixId: '',
    minAttendanceApproval: '75',
    requiresMemberStatus: false,
    requiresBaptism: false,
    prerequisiteCourseId: '',
    sortOrder: '0',
    imageUrl: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const isLumine = course.ministryName?.toLowerCase().includes('lumine') || course.ministryName?.toLowerCase().includes('ebd');

  useEffect(() => {
    if (course) {
      setFormData({
        responsibleId: course.responsibleId || '',
        description: course.description || '',
        type: course.type || 'trilho',
        ebdTrack: course.ebdTrack || '',
        linkedTheoflixId: course.linkedTheoflixId || '',
        minAttendanceApproval: course.minAttendanceApproval?.toString() || '75',
        requiresMemberStatus: course.requiresMemberStatus || false,
        requiresBaptism: course.requiresBaptism || false,
        prerequisiteCourseId: course.prerequisiteCourseId || '',
        sortOrder: course.sortOrder?.toString() || '0',
        imageUrl: course.imageUrl || '',
      });
    }
  }, [course]);

  const handleFieldChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSave = async () => {
    if(!firestore) return;
    setIsSaving(true);
    const courseDocRef = doc(firestore, 'courses', course.id);
    
    try {
        await updateDocumentNonBlocking(courseDocRef, {
            responsibleId: formData.responsibleId === 'null' ? '' : formData.responsibleId,
            description: formData.description,
            type: formData.type,
            ebdTrack: formData.ebdTrack,
            linkedTheoflixId: formData.linkedTheoflixId === 'none' ? '' : formData.linkedTheoflixId,
            minAttendanceApproval: Number(formData.minAttendanceApproval) || 0,
            requiresMemberStatus: formData.requiresMemberStatus,
            requiresBaptism: formData.requiresBaptism,
            prerequisiteCourseId: formData.prerequisiteCourseId === 'none' ? '' : formData.prerequisiteCourseId,
            sortOrder: Number(formData.sortOrder) || 0,
            imageUrl: formData.imageUrl,
        });
        toast({ title: 'Sucesso!', description: 'As configurações do curso foram atualizadas.'});
    } catch (e) {
        console.error(e);
        toast({ variant: 'destructive', title: 'Erro ao salvar', description: 'Não foi possível atualizar o curso.' });
    } finally {
        setIsSaving(false);
    }
  };

  const responsible = users.find(u => u.id === formData.responsibleId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
          <div className="space-y-4">
              <div className="space-y-2">
                  <Label htmlFor="desc">Descrição Detalhada</Label>
                  <Textarea 
                    id="desc" 
                    rows={5} 
                    value={formData.description} 
                    onChange={e => handleFieldChange('description', e.target.value)}
                    placeholder="Descreva os objetivos, público-alvo e resultados esperados deste curso..."
                  />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                      <Label htmlFor="type">Tipo de Curso</Label>
                      <Select value={formData.type} onValueChange={v => handleFieldChange('type', v)}>
                          <SelectTrigger id="type"><SelectValue /></SelectTrigger>
                          <SelectContent>
                              <SelectItem value="trilho">Trilhos</SelectItem>
                              <SelectItem value="eletivo">Eletivos</SelectItem>
                          </SelectContent>
                      </Select>
                  </div>
                  
                  {isLumine && (
                    <div className="space-y-2 animate-in slide-in-from-top-2">
                        <Label htmlFor="ebdTrack" className="flex items-center gap-2">
                            <School className="size-3 text-primary" />
                            Trilho EBD (Escola Bíblica Discipuladora)
                        </Label>
                        <Select value={formData.ebdTrack} onValueChange={v => handleFieldChange('ebdTrack', v)}>
                            <SelectTrigger id="ebdTrack"><SelectValue placeholder="Selecione o trilho..." /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="teologico">Trilho Teológico</SelectItem>
                                <SelectItem value="biblico">Trilho Bíblico</SelectItem>
                                <SelectItem value="discipulado">Trilho de Discipulado</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                  )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                  <div className="space-y-2">
                      <Label htmlFor="minAttendance" className="flex items-center gap-2">
                          <Percent className="size-3 text-primary" />
                          Mínimo de Presença para Aprovação
                      </Label>
                      <div className="relative">
                          <Input 
                            id="minAttendance" 
                            type="number" 
                            min="0" 
                            max="100" 
                            value={formData.minAttendanceApproval} 
                            onChange={e => handleFieldChange('minAttendanceApproval', e.target.value)}
                            className="pr-8"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                      </div>
                  </div>

                  <div className="space-y-2">
                      <Label htmlFor="theoflix-link" className="flex items-center gap-2">
                          <PlayCircle className="size-3 text-primary" />
                          Vincular Curso Online (TheoFlix)
                      </Label>
                      <Select value={formData.linkedTheoflixId || 'none'} onValueChange={v => handleFieldChange('linkedTheoflixId', v)}>
                          <SelectTrigger id="theoflix-link">
                              <SelectValue placeholder="Nenhum curso online vinculado" />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="none">Nenhum vínculo</SelectItem>
                              {theoflixCourses.map(tf => (
                                  <SelectItem key={tf.id} value={tf.id}>{tf.title}</SelectItem>
                              ))}
                          </SelectContent>
                      </Select>
                  </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                  <div className="space-y-2">
                      <Label htmlFor="sortOrder">Ordem de Exibição (Sort Order)</Label>
                      <Input 
                        id="sortOrder" 
                        type="number" 
                        value={formData.sortOrder} 
                        onChange={e => handleFieldChange('sortOrder', e.target.value)}
                        placeholder="Ex: 1"
                      />
                      <p className="text-[10px] text-muted-foreground italic">
                          Define a ordem em que este curso será exibido na listagem (valores menores aparecem primeiro).
                      </p>
                  </div>

                  <div className="space-y-2">
                      <Label htmlFor="imageUrl">URL da Imagem de Capa</Label>
                      <Input 
                        id="imageUrl" 
                        type="text" 
                        value={formData.imageUrl} 
                        onChange={e => handleFieldChange('imageUrl', e.target.value)}
                        placeholder="https://exemplo.com/imagem.jpg"
                      />
                      <p className="text-[10px] text-muted-foreground italic">
                          URL da imagem que será exibida como capa deste curso. Se vazio, uma imagem padrão será usada.
                      </p>
                  </div>
              </div>
          </div>

          {/* Seção de Pré-requisitos */}
          <div className="pt-6 border-t space-y-6">
              <div className="flex items-center gap-2 text-primary font-bold">
                  <Lock className="size-5" />
                  Trava de Pré-requisitos (Opcional)
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-xl border border-slate-200">
                  <div className="space-y-4">
                      <div className="flex items-center justify-between gap-4">
                          <div className="space-y-0.5">
                              <Label className="text-sm font-bold flex items-center gap-2">
                                  <UserCheck className="size-3 text-indigo-600" /> Somente Membros
                              </Label>
                              <p className="text-[10px] text-muted-foreground italic">Exige status oficial de Membro IBM.</p>
                          </div>
                          <Switch 
                            checked={formData.requiresMemberStatus} 
                            onCheckedChange={(v) => handleFieldChange('requiresMemberStatus', v)} 
                          />
                      </div>

                      <div className="flex items-center justify-between gap-4">
                          <div className="space-y-0.5">
                              <Label className="text-sm font-bold flex items-center gap-2">
                                  <CheckCircle2 className="size-3 text-blue-600" /> Somente Batizados
                              </Label>
                              <p className="text-[10px] text-muted-foreground italic">Exige registro de batismo nas águas.</p>
                          </div>
                          <Switch 
                            checked={formData.requiresBaptism} 
                            onCheckedChange={(v) => handleFieldChange('requiresBaptism', v)} 
                          />
                      </div>
                  </div>

                  <div className="space-y-2">
                      <Label className="text-sm font-bold flex items-center gap-2">
                          <GraduationCap className="size-3 text-amber-600" /> Concluiu o curso...
                      </Label>
                      <Select 
                        value={formData.prerequisiteCourseId || 'none'} 
                        onValueChange={(v) => handleFieldChange('prerequisiteCourseId', v)}
                      >
                          <SelectTrigger className="bg-white">
                              <SelectValue placeholder="Nenhum curso prévio" />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="none">Sem curso prévio</SelectItem>
                              {courses.filter(c => c.id !== course.id).map(c => (
                                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                              ))}
                          </SelectContent>
                      </Select>
                      <p className="text-[10px] text-muted-foreground italic">
                          O aluno precisa ter sido aprovado no curso selecionado para poder se matricular neste.
                      </p>
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
                        <div className="mt-1">
                          <PersonSearchInput
                            value={formData.responsibleId === 'null' ? '' : formData.responsibleId}
                            onChange={v => handleFieldChange('responsibleId', v)}
                            users={users}
                            placeholder="Buscar coordenador..."
                            optional
                          />
                        </div>
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

          <Card className="overflow-hidden border border-outline-variant/20 shadow-sm bg-card">
              <div className="p-4 border-b font-bold text-xs uppercase tracking-wider text-primary flex items-center gap-2">
                  <BookOpen className="size-4" /> Pré-visualização da Capa
              </div>
              <div className="relative aspect-video bg-slate-100 flex items-center justify-center">
                  {formData.imageUrl ? (
                      <img 
                          src={formData.imageUrl} 
                          alt="Capa do curso" 
                          className="object-cover w-full h-full"
                          onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${course.id}/600/300`;
                          }}
                      />
                  ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-4 text-center">
                          <BookOpen className="size-8 mb-2 opacity-40 text-primary" />
                          <span className="text-xs font-bold text-slate-800">Nenhuma capa personalizada</span>
                          <span className="text-[10px] opacity-75 mt-1">Usando imagem padrão do Picsum</span>
                      </div>
                  )}
              </div>
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