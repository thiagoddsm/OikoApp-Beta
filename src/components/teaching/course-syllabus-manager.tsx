'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  PlusCircle, 
  Trash2, 
  Edit, 
  BookOpen, 
  Loader2, 
  Save,
  ChevronDown,
  ChevronUp,
  Video,
  Link as LinkIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVolunteering } from '@/contexts/volunteering-context';
import { useCoursesData } from "@/hooks/useDomainData";

type SyllabusModule = {
  id: string;
  title: string;
  description: string;
  theoflixCourseId?: string; // The parent TheoFlix course
  theoflixRequiredVideoIds?: string[]; // Specific videos that must be watched to get attendance
  materialName?: string; // Ex: PDF Apostila Aula 1
  materialUrl?: string; // Link direto do arquivo
};

interface CourseSyllabusManagerProps {
  course: any;
}

export function CourseSyllabusManager({ course }: CourseSyllabusManagerProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
    const { courses, classes, enrollmentRequests, pedagogicalLogs, theoflixCourses } = useCoursesData();

  const [modules, setModules] = useState<SyllabusModule[]>(course.syllabus || []);
  const [isSaving, setIsSaving] = useState(false);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  
  // Form state for adding/editing
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formTheoflixId, setFormTheoflixId] = useState('none');
  const [formSelectedVideos, setFormSelectedVideos] = useState<string[]>([]);
  const [formMaterialName, setFormMaterialName] = useState('');
  const [formMaterialUrl, setFormMaterialUrl] = useState('');

  useEffect(() => {
    if (course.syllabus) {
      setModules(course.syllabus);
    }
  }, [course.syllabus]);

  // When changing the TheoFlix course, reset the selected videos
  const handleTheoflixCourseChange = (courseId: string) => {
      setFormTheoflixId(courseId);
      setFormSelectedVideos([]);
  };

  const selectedTfCourse = useMemo(() => {
      if (formTheoflixId === 'none') return null;
      return theoflixCourses.find(c => c.id === formTheoflixId);
  }, [formTheoflixId, theoflixCourses]);

  const toggleVideoSelection = (videoId: string, isChecked: boolean) => {
      setFormSelectedVideos(prev => 
          isChecked ? [...prev, videoId] : prev.filter(id => id !== videoId)
      );
  };

  const handleAddOrUpdateModule = () => {
    if (!formTitle.trim()) {
      toast({ variant: 'destructive', title: 'O título do módulo é obrigatório.' });
      return;
    }

    if (editingModuleId) {
      setModules(prev => prev.map(m => 
        m.id === editingModuleId 
          ? { 
              ...m, 
              title: formTitle, 
              description: formDescription,
              theoflixCourseId: formTheoflixId === 'none' ? undefined : formTheoflixId,
              theoflixRequiredVideoIds: formTheoflixId === 'none' ? [] : formSelectedVideos,
              materialName: formMaterialName.trim() || undefined,
              materialUrl: formMaterialUrl.trim() || undefined
            } 
          : m
      ));
      setEditingModuleId(null);
    } else {
      const newModule: SyllabusModule = {
        id: crypto.randomUUID(),
        title: formTitle,
        description: formDescription,
        theoflixCourseId: formTheoflixId === 'none' ? undefined : formTheoflixId,
        theoflixRequiredVideoIds: formTheoflixId === 'none' ? [] : formSelectedVideos,
        materialName: formMaterialName.trim() || undefined,
        materialUrl: formMaterialUrl.trim() || undefined
      };
      setModules(prev => [...prev, newModule]);
    }

    setFormTitle('');
    setFormDescription('');
    setFormTheoflixId('none');
    setFormSelectedVideos([]);
    setFormMaterialName('');
    setFormMaterialUrl('');
  };

  const handleEdit = (mod: SyllabusModule) => {
    setEditingModuleId(mod.id);
    setFormTitle(mod.title);
    setFormDescription(mod.description || '');
    setFormTheoflixId(mod.theoflixCourseId || 'none');
    setFormSelectedVideos(mod.theoflixRequiredVideoIds || []);
    setFormMaterialName(mod.materialName || '');
    setFormMaterialUrl(mod.materialUrl || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id: string) => {
    setModules(prev => prev.filter(m => m.id !== id));
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const newModules = [...modules];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newModules.length) return;
    
    [newModules[index], newModules[targetIndex]] = [newModules[targetIndex], newModules[index]];
    setModules(newModules);
  };

  const handleSaveSyllabus = async () => {
    if (!firestore) return;
    setIsSaving(true);
    
    try {
      const courseDocRef = doc(firestore, 'courses', course.id);
      await updateDocumentNonBlocking(courseDocRef, { syllabus: modules });
      toast({ title: 'Ementa Atualizada!', description: 'O conteúdo programático foi salvo com sucesso.' });
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: 'Não foi possível atualizar a ementa.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Formulário de Módulo */}
      <div className="lg:col-span-1 space-y-6">
        <Card className="sticky top-24">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="size-5 text-primary" />
              {editingModuleId ? 'Editar Módulo' : 'Novo Módulo'}
            </CardTitle>
            <CardDescription>
              Defina o título e o que será abordado nesta etapa do curso.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mod-title" className="text-xs font-black uppercase text-muted-foreground">Título do Módulo</Label>
              <Input 
                id="mod-title" 
                value={formTitle} 
                onChange={e => setFormTitle(e.target.value)} 
                placeholder="Ex: Fundamentos da Fé"
                className="font-bold"
              />
            </div>
            
            <div className="space-y-3 p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                <Label className="text-[10px] font-black uppercase text-indigo-700 tracking-widest flex items-center gap-1.5">
                    <Video className="size-3" /> Vínculo Online (TheoFlix)
                </Label>
                <Select value={formTheoflixId} onValueChange={handleTheoflixCourseChange}>
                    <SelectTrigger className="bg-white border-indigo-200">
                        <SelectValue placeholder="Selecione um curso TheoFlix..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none" className="text-muted-foreground italic">Nenhum (Apenas Presencial)</SelectItem>
                        {theoflixCourses.map(tf => (
                            <SelectItem key={tf.id} value={tf.id}>
                                {tf.title} <span className="text-[10px] text-muted-foreground ml-2">({tf.episodes?.length || 0} vídeos)</span>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {selectedTfCourse && selectedTfCourse.episodes && selectedTfCourse.episodes.length > 0 && (
                    <div className="space-y-2 mt-2 pt-3 border-t border-indigo-200">
                        <Label className="text-[10px] font-black uppercase text-indigo-700">Selecione as aulas requeridas:</Label>
                        <div className="max-h-32 overflow-y-auto space-y-1.5 pr-2">
                            {selectedTfCourse.episodes.map((ep: any, idx: number) => {
                                const videoIdStr = idx.toString();
                                const isChecked = formSelectedVideos.includes(videoIdStr);
                                return (
                                    <div key={idx} className="flex items-start space-x-2 p-1.5 hover:bg-indigo-100/50 rounded transition-colors cursor-pointer" onClick={() => toggleVideoSelection(videoIdStr, !isChecked)}>
                                        <Checkbox 
                                            id={`vid-${idx}`} 
                                            checked={isChecked} 
                                            onCheckedChange={(c) => toggleVideoSelection(videoIdStr, !!c)} 
                                            className="mt-0.5 border-indigo-300 data-[state=checked]:bg-indigo-600 pointer-events-none"
                                        />
                                        <label htmlFor={`vid-${idx}`} className="text-xs font-medium leading-tight cursor-pointer text-indigo-950">
                                            <span className="font-bold mr-1">{idx+1}.</span> {ep.title}
                                            <span className="text-[9px] text-indigo-500/80 block mt-0.5">Duração: {ep.duration}</span>
                                        </label>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <p className="text-[9px] text-indigo-600/70 leading-tight">
                    O aluno receberá presença automática se assistir a <strong>todos</strong> os vídeos selecionados acima no TheoFlix.
                </p>
            </div>

            <div className="space-y-3 p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                <Label className="text-[10px] font-black uppercase text-emerald-700 tracking-widest flex items-center gap-1.5">
                    <LinkIcon className="size-3" /> Material de Apoio (Opcional)
                </Label>
                <div className="space-y-2">
                    <Input 
                        placeholder="Nome do Material (Ex: Apostila Aula 1)" 
                        className="h-8 text-[10px] bg-white border-emerald-200"
                        value={formMaterialName}
                        onChange={e => setFormMaterialName(e.target.value)}
                    />
                    <Input 
                        placeholder="Link do Material (URL do PDF/Google Drive)" 
                        className="h-8 text-[10px] bg-white border-emerald-200"
                        value={formMaterialUrl}
                        onChange={e => setFormMaterialUrl(e.target.value)}
                    />
                </div>
                <p className="text-[9px] text-emerald-600/70 leading-tight">
                    Cole o link direto do PDF ou uma pasta no Google Drive com os slides e apostilas da aula.
                </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mod-desc" className="text-xs font-black uppercase text-muted-foreground">Descrição / Conteúdo</Label>
              <Textarea 
                id="mod-desc" 
                rows={6}
                value={formDescription} 
                onChange={e => setFormDescription(e.target.value)} 
                placeholder="Descreva os tópicos, referências bíblicas e objetivos deste módulo..."
              />
            </div>
            <div className="flex gap-2 pt-2 border-t">
              <Button onClick={handleAddOrUpdateModule} className="flex-1 font-bold">
                {editingModuleId ? 'Atualizar Módulo' : 'Adicionar à Ementa'}
              </Button>
              {editingModuleId && (
                <Button variant="outline" onClick={() => {
                  setEditingModuleId(null);
                  setFormTitle('');
                  setFormDescription('');
                  setFormTheoflixId('none');
                  setFormSelectedVideos([]);
                }}>
                  Cancelar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Listagem da Ementa */}
      <div className="lg:col-span-2 space-y-6">
        <div className="flex justify-between items-center bg-muted/30 p-4 rounded-xl border border-dashed">
          <div>
              <h3 className="text-xl font-bold flex items-center gap-2">Conteúdo Programático</h3>
              <p className="text-xs text-muted-foreground mt-1">A ordem abaixo reflete a cronologia de ensino na sala de aula.</p>
          </div>
          <Button 
            onClick={handleSaveSyllabus} 
            disabled={isSaving}
            className="bg-primary hover:bg-primary/90 font-bold"
          >
            {isSaving ? <Loader2 className="mr-2 size-4 animate-spin"/> : <Save className="mr-2 size-4"/>}
            Salvar Ementa Completa
          </Button>
        </div>

        <div className="space-y-4">
          {modules.length === 0 ? (
            <div className="p-12 text-center border-2 border-dashed rounded-xl bg-muted/20">
              <BookOpen className="size-12 mx-auto mb-4 text-muted-foreground opacity-20" />
              <p className="text-muted-foreground">Nenhum módulo cadastrado na ementa.</p>
              <p className="text-sm text-muted-foreground mt-1">Use o formulário ao lado para começar a estruturar o curso.</p>
            </div>
          ) : (
            modules.map((mod, index) => {
                const tfLink = mod.theoflixCourseId ? theoflixCourses.find(t => t.id === mod.theoflixCourseId) : null;
                const requiredVideosCount = mod.theoflixRequiredVideoIds?.length || 0;
                
                return (
                  <Card key={mod.id} className="group hover:border-primary/50 transition-colors overflow-hidden">
                    <div className="flex">
                      {/* Handle de Ordenação lateral */}
                      <div className="w-10 bg-muted/30 flex flex-col items-center justify-center gap-2 border-r group-hover:bg-muted/50 transition-colors">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-muted-foreground hover:text-primary"
                          onClick={() => handleMove(index, 'up')}
                          disabled={index === 0}
                        >
                          <ChevronUp size={14} />
                        </Button>
                        <span className="text-[10px] font-black text-muted-foreground/50">{index + 1}</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-muted-foreground hover:text-primary"
                          onClick={() => handleMove(index, 'down')}
                          disabled={index === modules.length - 1}
                        >
                          <ChevronDown size={14} />
                        </Button>
                      </div>

                      <div className="flex-1 p-5">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-lg text-slate-900">{mod.title}</h4>
                          <div className="flex gap-1 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:text-primary hover:bg-primary/10" onClick={() => handleEdit(mod)}>
                              <Edit size={14} />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(mod.id)}>
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </div>
                        
                        {tfLink && (
                            <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase rounded border border-indigo-100 mb-3">
                                <LinkIcon className="size-3" /> Híbrido: {requiredVideosCount} {requiredVideosCount === 1 ? 'vídeo' : 'vídeos'} no TheoFlix
                            </div>
                        )}

                        <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                          {mod.description || 'Sem descrição definida para este módulo.'}
                        </p>
                      </div>
                    </div>
                  </Card>
                )
            })
          )}
        </div>
      </div>
    </div>
  );
}