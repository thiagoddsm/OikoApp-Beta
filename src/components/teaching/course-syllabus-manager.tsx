'use client';

import React, { useState, useEffect } from 'react';
import { useFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  PlusCircle, 
  Trash2, 
  Edit, 
  GripVertical, 
  BookOpen, 
  Loader2, 
  Save,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

type SyllabusModule = {
  id: string;
  title: string;
  description: string;
};

interface CourseSyllabusManagerProps {
  course: any;
}

export function CourseSyllabusManager({ course }: CourseSyllabusManagerProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  
  const [modules, setModules] = useState<SyllabusModule[]>(course.syllabus || []);
  const [isSaving, setIsSaving] = useState(false);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  
  // Form state for adding/editing
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');

  useEffect(() => {
    if (course.syllabus) {
      setModules(course.syllabus);
    }
  }, [course.syllabus]);

  const handleAddOrUpdateModule = () => {
    if (!formTitle.trim()) {
      toast({ variant: 'destructive', title: 'O título do módulo é obrigatório.' });
      return;
    }

    if (editingModuleId) {
      setModules(prev => prev.map(m => 
        m.id === editingModuleId 
          ? { ...m, title: formTitle, description: formDescription } 
          : m
      ));
      setEditingModuleId(null);
    } else {
      const newModule: SyllabusModule = {
        id: crypto.randomUUID(),
        title: formTitle,
        description: formDescription
      };
      setModules(prev => [...prev, newModule]);
    }

    setFormTitle('');
    setFormDescription('');
  };

  const handleEdit = (mod: SyllabusModule) => {
    setEditingModuleId(mod.id);
    setFormTitle(mod.title);
    setFormDescription(mod.description);
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
              <Label htmlFor="mod-title">Título do Módulo</Label>
              <Input 
                id="mod-title" 
                value={formTitle} 
                onChange={e => setFormTitle(e.target.value)} 
                placeholder="Ex: Fundamentos da Fé"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mod-desc">Descrição / Conteúdo</Label>
              <Textarea 
                id="mod-desc" 
                rows={6}
                value={formDescription} 
                onChange={e => setFormDescription(e.target.value)} 
                placeholder="Descreva os tópicos, referências bíblicas e objetivos deste módulo..."
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleAddOrUpdateModule} className="flex-1">
                {editingModuleId ? 'Atualizar Módulo' : 'Adicionar à Ementa'}
              </Button>
              {editingModuleId && (
                <Button variant="outline" onClick={() => {
                  setEditingModuleId(null);
                  setFormTitle('');
                  setFormDescription('');
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
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold">Conteúdo Programático</h3>
          <Button 
            onClick={handleSaveSyllabus} 
            disabled={isSaving}
            className="bg-primary hover:bg-primary/90"
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
            modules.map((mod, index) => (
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
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(mod)}>
                          <Edit size={14} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(mod.id)}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                      {mod.description || 'Sem descrição definida para este módulo.'}
                    </p>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}