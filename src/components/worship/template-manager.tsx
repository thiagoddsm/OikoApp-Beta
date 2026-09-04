'use client';

import React, { useState } from 'react';
import { useWorship, WorshipTemplate } from '@/contexts/worship-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  LayoutTemplate,
  PlusCircle,
  MoreHorizontal,
  Trash2,
  Pencil,
  Music,
  AlignLeft,
  Heading2,
  CheckCircle2,
} from 'lucide-react';
import { formatDuration } from '@/contexts/worship-context';

interface TemplateManagerProps {
  onApplyToCurrentPlan?: (templateId: string) => void;
  currentPlanId?: string;
}

export function TemplateManager({ onApplyToCurrentPlan, currentPlanId }: TemplateManagerProps) {
  const { templates, isLoading, createTemplate, updateTemplate, deleteTemplate } = useWorship();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<WorshipTemplate | null>(null);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createTemplate({ name: newName.trim(), description: newDesc.trim(), items: [] });
    toast({ title: 'Template criado!', description: 'Abra o editor para adicionar os itens do template.' });
    setNewName('');
    setNewDesc('');
    setCreateOpen(false);
  };

  const handleRename = async () => {
    if (!editTarget || !newName.trim()) return;
    await updateTemplate(editTarget.id, { name: newName.trim(), description: newDesc.trim() });
    toast({ title: 'Template atualizado!' });
    setEditTarget(null);
  };

  const handleDelete = async (id: string) => {
    await deleteTemplate(id);
    toast({ title: 'Template excluído.' });
  };

  const getItemSummary = (template: WorshipTemplate) => {
    const songs = template.items.filter(i => i.type === 'song').length;
    const items = template.items.filter(i => i.type === 'item').length;
    const headers = template.items.filter(i => i.type === 'header').length;
    const totalSecs = template.items.reduce((acc, i) => acc + (i.durationSeconds || 0), 0);
    const totalMins = Math.round(totalSecs / 60);
    return { songs, items, headers, totalMins };
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Templates de Culto</h3>
            <p className="text-sm text-muted-foreground">
              Salve estruturas de culto reutilizáveis para montar novas ordens rapidamente.
            </p>
          </div>
          <Button size="sm" onClick={() => { setNewName(''); setNewDesc(''); setCreateOpen(true); }}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Novo Template
          </Button>
        </div>

        {templates.length === 0 ? (
          <div className="border-2 border-dashed rounded-xl py-16 flex flex-col items-center text-center text-slate-500">
            <LayoutTemplate className="h-10 w-10 text-slate-300 mb-3" />
            <p className="font-medium">Nenhum template criado</p>
            <p className="text-sm mt-1 max-w-xs">
              Crie um template com a estrutura base do seu culto e importe-o toda semana em segundos.
            </p>
            <Button className="mt-4" size="sm" onClick={() => setCreateOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Criar primeiro template
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map(template => {
              const { songs, items, headers, totalMins } = getItemSummary(template);
              return (
                <Card key={template.id} className="relative group hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base truncate">{template.name}</CardTitle>
                        {template.description && (
                          <CardDescription className="mt-0.5 text-xs line-clamp-2">{template.description}</CardDescription>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 -mr-1">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditTarget(template); setNewName(template.name); setNewDesc(template.description || ''); }}>
                            <Pencil className="mr-2 h-4 w-4" /> Renomear
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(template.id)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Item counts */}
                    <div className="flex flex-wrap gap-1.5">
                      {headers > 0 && <Badge variant="outline" className="text-xs gap-1"><Heading2 className="h-3 w-3" />{headers} bloco{headers !== 1 ? 's' : ''}</Badge>}
                      {songs > 0 && <Badge variant="outline" className="text-xs gap-1 border-violet-200 text-violet-700"><Music className="h-3 w-3" />{songs} músic{songs !== 1 ? 'as' : 'a'}</Badge>}
                      {items > 0 && <Badge variant="outline" className="text-xs gap-1"><AlignLeft className="h-3 w-3" />{items} item{items !== 1 ? 'ns' : ''}</Badge>}
                      {totalMins > 0 && <Badge variant="secondary" className="text-xs">{totalMins} min</Badge>}
                      {template.items.length === 0 && <span className="text-xs text-slate-400">Template vazio</span>}
                    </div>

                    {/* Apply button */}
                    {onApplyToCurrentPlan && currentPlanId && (
                      <Button
                        className="w-full h-8 text-xs"
                        onClick={() => onApplyToCurrentPlan(template.id)}
                      >
                        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                        Usar este template
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Template de Culto</DialogTitle>
            <DialogDescription>
              Crie um template reutilizável. Você poderá adicionar itens a ele depois.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome do template *</Label>
              <Input
                placeholder="Ex: Culto Contemporâneo Padrão"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Textarea
                placeholder="Ex: Para os cultos de domingo às 10h com 6 músicas e 40min de mensagem."
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!newName.trim()}>Criar Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={() => setEditTarget(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Renomear Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} autoFocus />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>Cancelar</Button>
            <Button onClick={handleRename} disabled={!newName.trim()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
