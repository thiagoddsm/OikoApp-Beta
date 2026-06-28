'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { WorshipProvider, useWorship, WorshipItem, WorshipPlan, formatDuration, generateItemId } from '@/contexts/worship-context';
import { WorshipPlanEditor } from '@/components/worship/worship-plan-editor';
import { TemplateManager } from '@/components/worship/template-manager';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, ChevronLeft, LayoutTemplate, Clock, Music, Ellipsis, BookMarked } from 'lucide-react';
import { useEventsData } from '@/hooks/useDomainData';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// keyboard shortcut hook
function useKeyboardShortcuts(addItem: (type: 'header' | 'item' | 'song') => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'h' || e.key === 'H') addItem('header');
      if (e.key === 'i' || e.key === 'I') addItem('item');
      if (e.key === 's' || e.key === 'S') addItem('song');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [addItem]);
}

function PlanEditorInner({ planId }: { planId: string }) {
  const router = useRouter();
  const { plans, templates, isLoading, updatePlan, updatePlanItems, savePlanAsTemplate, applyTemplate } = useWorship();
  const { events } = useEventsData();
  const { toast } = useToast();

  const plan = plans.find(p => p.id === planId);
  const [localItems, setLocalItems] = useState<WorshipItem[]>([]);
  const [localMeta, setLocalMeta] = useState({ title: '', date: '', startTime: '', notes: '' });
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [showApplyDialog, setShowApplyDialog] = useState(false);

  useEffect(() => {
    if (plan) {
      setLocalItems(plan.items || []);
      setLocalMeta({
        title: plan.title,
        date: plan.date,
        startTime: plan.startTime,
        notes: plan.notes || '',
      });
    }
  }, [plan]);

  const handleItemsChange = useCallback((items: WorshipItem[]) => {
    setLocalItems(items);
    setIsDirty(true);
  }, []);

  const handleMetaChange = (patch: Partial<typeof localMeta>) => {
    setLocalMeta(prev => ({ ...prev, ...patch }));
    setIsDirty(true);
  };

  const addItem = useCallback((type: 'header' | 'item' | 'song') => {
    const newItem: WorshipItem = {
      id: generateItemId(),
      type,
      order: localItems.length,
      title: type === 'header' ? 'NOVO BLOCO' : type === 'song' ? 'Nova Música' : 'Novo Item',
      durationSeconds: type === 'header' ? undefined : type === 'song' ? 270 : 300,
      color: 'none',
    };
    setLocalItems(prev => [...prev, newItem]);
    setIsDirty(true);
  }, [localItems.length]);

  useKeyboardShortcuts(addItem);

  const handleSave = async () => {
    if (!plan) return;
    setIsSaving(true);
    await updatePlan(plan.id, localMeta);
    await updatePlanItems(plan.id, localItems);
    setIsDirty(false);
    setIsSaving(false);
    toast({ title: '✅ Plano salvo!', description: 'A ordem de culto foi salva com sucesso.' });
  };

  const handleSaveAsTemplate = async () => {
    if (!templateName.trim()) return;
    setShowTemplateDialog(false);
    // temporarily update items so template captures current state
    await updatePlanItems(planId, localItems);
    await savePlanAsTemplate(planId, templateName.trim());
    toast({ title: '📋 Template criado!', description: `"${templateName}" salvo como template.` });
    setTemplateName('');
  };

  const handleApplyTemplate = async (templateId: string) => {
    const tpl = templates.find(t => t.id === templateId);
    if (!tpl) return;
    setLocalItems(tpl.items.map((item, idx) => ({ ...item, order: idx })));
    setIsDirty(true);
    setShowApplyDialog(false);
    toast({ title: `Template "${tpl.name}" aplicado!`, description: 'Os itens foram adicionados. Salve para confirmar.' });
  };

  const totalSecs = localItems.reduce((acc, i) => acc + (i.durationSeconds || 0), 0);
  const totalMins = Math.round(totalSecs / 60);

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  if (!plan) return (
    <div className="flex flex-col items-center justify-center h-64 text-slate-500">
      <p className="font-medium">Plano não encontrado</p>
      <Button className="mt-4" variant="outline" onClick={() => router.push('/dashboard/volunteering/worship')}>
        Voltar
      </Button>
    </div>
  );

  return (
    <div className="flex flex-col h-full min-h-[80vh]">
      {/* Header bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-white sticky top-0 z-20">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push('/dashboard/volunteering/worship')}>
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex-1 min-w-0">
          <input
            className="text-lg font-bold text-slate-800 bg-transparent focus:outline-none focus:border-b-2 focus:border-primary/40 w-full truncate"
            value={localMeta.title}
            onChange={e => handleMetaChange({ title: e.target.value })}
            placeholder="Nome do plano..."
          />
          <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
            <input type="date" value={localMeta.date} onChange={e => handleMetaChange({ date: e.target.value })} className="bg-transparent focus:outline-none" />
            <span>·</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{localMeta.startTime || '--:--'}</span>
            <span>·</span>
            <span className="flex items-center gap-1"><Music className="h-3 w-3" />{localItems.filter(i => i.type === 'song').length} músicas</span>
            {totalMins > 0 && <><span>·</span><span>{totalMins} min</span></>}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isDirty && <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 bg-amber-50">Não salvo</Badge>}

          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setShowApplyDialog(true)}>
            <LayoutTemplate className="mr-1.5 h-3.5 w-3.5" />
            Template
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Ellipsis className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { setTemplateName(localMeta.title); setShowTemplateDialog(true); }}>
                <BookMarked className="mr-2 h-4 w-4" />
                Salvar como template
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button size="sm" className="h-8 text-xs" onClick={handleSave} disabled={isSaving || !isDirty}>
            {isSaving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
            Salvar
          </Button>
        </div>
      </div>

      {/* Plan metadata strip */}
      <div className="px-4 py-3 bg-slate-50 border-b grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-1">
          <Label className="text-xs">Horário de início</Label>
          <Input
            type="time"
            value={localMeta.startTime}
            onChange={e => handleMetaChange({ startTime: e.target.value })}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Evento / Culto</Label>
          <Select
            value={plan.serviceEventId || 'none'}
            onValueChange={v => updatePlan(plan.id, { serviceEventId: v === 'none' ? undefined : v, serviceEventName: events.find(e => e.id === v)?.name })}
          >
            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhum</SelectItem>
              {events.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2 space-y-1">
          <Label className="text-xs">Notas do Plano</Label>
          <Input
            value={localMeta.notes}
            onChange={e => handleMetaChange({ notes: e.target.value })}
            placeholder="Tema do sermão, observações gerais..."
            className="h-8 text-sm"
          />
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 p-4">
        <WorshipPlanEditor
          items={localItems}
          startTime={localMeta.startTime || '09:00'}
          onItemsChange={handleItemsChange}
        />
      </div>

      {/* Save as template dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salvar como Template</DialogTitle>
            <DialogDescription>Este plano será salvo como um template reutilizável para futuros cultos.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Nome do template *</Label>
            <Input value={templateName} onChange={e => setTemplateName(e.target.value)} autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveAsTemplate} disabled={!templateName.trim()}>Salvar Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Apply template dialog */}
      <Dialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Importar Template</DialogTitle>
            <DialogDescription>
              Escolha um template para preencher a ordem de culto. Os itens atuais serão substituídos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-64 overflow-auto py-2">
            {templates.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">Nenhum template disponível.</p>
            ) : (
              templates.map(t => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-primary/40 hover:bg-primary/5 transition-colors cursor-pointer"
                  onClick={() => handleApplyTemplate(t.id)}
                >
                  <div>
                    <p className="font-medium text-sm">{t.name}</p>
                    {t.description && <p className="text-xs text-slate-400">{t.description}</p>}
                    <p className="text-xs text-slate-500 mt-0.5">{t.items.length} itens</p>
                  </div>
                  <Button size="sm" variant="outline" className="h-7 text-xs">Usar</Button>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApplyDialog(false)}>Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function WorshipPlanPage() {
  const params = useParams();
  const planId = params?.planId as string;

  return (
    <WorshipProvider>
      <PlanEditorInner planId={planId} />
    </WorshipProvider>
  );
}
