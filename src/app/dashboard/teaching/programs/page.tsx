'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useTeachingPrograms } from '@/hooks/useTeachingPrograms';
import { CAPABILITIES_METADATA } from '@/lib/programs/capability-registry';
import { CapabilityId, TeachingProgram, AttendanceMode } from '@/lib/programs/types';
import { Plus, Edit2, Copy, Trash2, ArrowRight, Loader2, Music2, BookOpen, Hand, HeartHandshake, PlayCircle, GraduationCap } from 'lucide-react';
import Link from 'next/link';

const ICON_OPTIONS = [
  { id: 'Music2', label: 'Música', icon: Music2 },
  { id: 'BookOpen', label: 'Livro', icon: BookOpen },
  { id: 'Hand', label: 'Libras/Mão', icon: Hand },
  { id: 'HeartHandshake', label: 'Ministerial', icon: HeartHandshake },
  { id: 'PlayCircle', label: 'Vídeo/Streaming', icon: PlayCircle },
  { id: 'GraduationCap', label: 'Ensino', icon: GraduationCap },
];

function getIconComponent(iconName: string) {
  const item = ICON_OPTIONS.find(i => i.id === iconName);
  return item ? item.icon : GraduationCap;
}

export default function TeachingProgramsPage() {
  const { programs, isLoading, createProgram, updateProgram, archiveProgram, duplicateProgram } = useTeachingPrograms();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<TeachingProgram | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('GraduationCap');
  const [color, setColor] = useState('#6366f1');
  const [attendanceMode, setAttendanceMode] = useState<AttendanceMode>('manual');
  const [selectedCapabilities, setSelectedCapabilities] = useState<CapabilityId[]>([]);

  const handleOpenDialog = (program?: TeachingProgram) => {
    if (program) {
      setEditingProgram(program);
      setName(program.name);
      setSlug(program.slug);
      setDescription(program.description);
      setIcon(program.icon || 'GraduationCap');
      setColor(program.color || '#6366f1');
      setAttendanceMode(program.attendanceMode || 'manual');
      setSelectedCapabilities(program.capabilities || []);
    } else {
      setEditingProgram(null);
      setName('');
      setSlug('');
      setDescription('');
      setIcon('GraduationCap');
      setColor('#6366f1');
      setAttendanceMode('manual');
      setSelectedCapabilities(['materials']);
    }
    setIsDialogOpen(true);
  };

  const handleToggleCapability = (capId: CapabilityId) => {
    setSelectedCapabilities(prev => 
      prev.includes(capId) ? prev.filter(c => c !== capId) : [...prev, capId]
    );
  };

  const handleSave = async () => {
    if (!name || !slug) {
      toast({ variant: 'destructive', title: 'Campos Obrigatórios', description: 'Por favor, preencha o Nome e o Identificador (Slug).' });
      return;
    }

    setIsSaving(true);
    try {
      if (editingProgram) {
        await updateProgram(editingProgram.id, {
          name,
          slug,
          description,
          icon,
          color,
          attendanceMode,
          capabilities: selectedCapabilities
        });
        toast({ title: 'Programa Atualizado', description: `O programa "${name}" foi atualizado com sucesso.` });
      } else {
        await createProgram({
          name,
          slug,
          description,
          icon,
          color,
          attendanceMode,
          capabilities: selectedCapabilities,
          order: programs.length + 1
        });
        toast({ title: 'Programa Criado', description: `O programa "${name}" foi adicionado com sucesso.` });
      }
      setIsDialogOpen(false);
    } catch (err: any) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Erro ao Salvar', description: err.message || 'Não foi possível salvar o programa.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDuplicate = async (program: TeachingProgram) => {
    try {
      await duplicateProgram(program);
      toast({ title: 'Programa Duplicado', description: `Uma cópia de "${program.name}" foi criada com sucesso.` });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao Duplicar', description: err.message });
    }
  };

  const handleArchive = async (id: string, programName: string) => {
    if (!confirm(`Tem certeza que deseja arquivar o programa "${programName}"?`)) return;
    try {
      await archiveProgram(id);
      toast({ title: 'Programa Arquivado', description: `O programa "${programName}" foi arquivado.` });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao Arquivar', description: err.message });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <Loader2 className="size-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Programas de Ensino SaaS</h1>
          <p className="text-sm text-slate-500">
            Cadastre e gerencie os programas educacionais da igreja (Wave, DIS, Lumine, TheoFlix ou novos programas).
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-indigo-600 hover:bg-indigo-700 text-white">
          <Plus className="mr-2 size-4" /> Novo Programa
        </Button>
      </div>

      {/* Programs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {programs.map(program => {
          const IconComp = getIconComponent(program.icon);

          return (
            <Card key={program.id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-xl flex flex-col justify-between hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-xl text-white" style={{ backgroundColor: program.color || '#6366f1' }}>
                    <IconComp className="size-6" />
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="size-8" onClick={() => handleOpenDialog(program)}>
                      <Edit2 className="size-4 text-slate-500" />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-8" onClick={() => handleDuplicate(program)}>
                      <Copy className="size-4 text-slate-500" />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-8 text-red-500" onClick={() => handleArchive(program.id, program.name)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
                <CardTitle className="text-lg mt-3">{program.name}</CardTitle>
                <CardDescription className="line-clamp-2">{program.description}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Capabilities list */}
                <div>
                  <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Capacidades Ativas</p>
                  <div className="flex flex-wrap gap-1.5">
                    {program.capabilities?.map(capId => {
                      const meta = CAPABILITIES_METADATA[capId];
                      if (!meta) return null;
                      return (
                        <Badge key={capId} variant="secondary" className="text-xs py-0.5 px-2 bg-slate-100 dark:bg-slate-800">
                          {meta.label}
                        </Badge>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Modalidade: <strong>{program.attendanceMode}</strong></span>
                  <Link href={`/dashboard/teaching/programs/${program.slug}`}>
                    <Button size="sm" variant="outline" className="text-indigo-600 border-indigo-200 dark:border-indigo-900 hover:bg-indigo-50 dark:hover:bg-indigo-950">
                      Acessar Central <ArrowRight className="ml-1.5 size-3.5" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* CRUD Modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProgram ? 'Editar Programa de Ensino' : 'Novo Programa de Ensino'}</DialogTitle>
            <DialogDescription>
              Configure o nome, cor, ícone e selecione as capacidades ativas que estarão disponíveis para os cursos deste programa.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nome do Programa</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Escola de Música Wave" />
              </div>
              <div>
                <Label>Identificador (Slug)</Label>
                <Input value={slug} onChange={e => setSlug(e.target.value)} placeholder="Ex: wave" />
              </div>
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Breve resumo dos objetivos pedagógicos deste programa..." />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Ícone do Programa</Label>
                <select 
                  value={icon} 
                  onChange={e => setIcon(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm"
                >
                  {ICON_OPTIONS.map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Cor de Destaque</Label>
                <div className="flex items-center gap-2">
                  <Input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-12 h-10 p-1 cursor-pointer" />
                  <Input value={color} onChange={e => setColor(e.target.value)} placeholder="#6366f1" />
                </div>
              </div>
            </div>

            <div>
              <Label>Modo de Frequência Padrão (`attendanceMode`)</Label>
              <select 
                value={attendanceMode} 
                onChange={e => setAttendanceMode(e.target.value as AttendanceMode)}
                className="w-full h-10 px-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm mt-1"
              >
                <option value="electronic">Eletrônica (Ponto com Server Timestamp)</option>
                <option value="manual">Manual (Chamada Tradicional pelo Professor)</option>
                <option value="automatic">Automática (Assistida / Vídeo EAD)</option>
                <option value="none">Nenhuma (Sem controle de frequência)</option>
              </select>
            </div>

            <div>
              <Label className="mb-2 block">Capacidades Habilitadas (`capabilities`)</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border border-slate-100 dark:border-slate-800 p-3 rounded-xl bg-slate-50 dark:bg-slate-950">
                {Object.values(CAPABILITIES_METADATA).map(cap => {
                  const isChecked = selectedCapabilities.includes(cap.id);
                  return (
                    <div key={cap.id} className="flex items-start space-x-2.5 p-2 rounded-lg hover:bg-white dark:hover:bg-slate-900 transition-colors">
                      <Checkbox 
                        id={`cap-${cap.id}`} 
                        checked={isChecked} 
                        onCheckedChange={() => handleToggleCapability(cap.id)} 
                      />
                      <div className="grid gap-0.5 leading-none cursor-pointer" onClick={() => handleToggleCapability(cap.id)}>
                        <label htmlFor={`cap-${cap.id}`} className="text-xs font-bold cursor-pointer">{cap.label}</label>
                        <p className="text-[11px] text-slate-500 line-clamp-2">{cap.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {isSaving && <Loader2 className="mr-2 size-4 animate-spin" />}
              Salvar Programa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
