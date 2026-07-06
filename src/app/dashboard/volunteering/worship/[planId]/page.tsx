'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { WorshipProvider, useWorship, WorshipItem, WorshipPlan, WorshipTimeSlot, NeededPosition, formatDuration, generateItemId } from '@/contexts/worship-context';
import { WorshipPlanEditor } from '@/components/worship/worship-plan-editor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Loader2, Save, ChevronLeft, LayoutTemplate, Clock, Music, Ellipsis, BookMarked, Radio, Plus, Trash2, UserPlus, UserCheck, CalendarDays, Users } from 'lucide-react';
import { useEventsData, useMembersData } from '@/hooks/useDomainData';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { syncLiveWorshipOrder } from '../actions';

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
  const { users } = useMembersData();
  const { toast } = useToast();

  const plan = plans.find(p => p.id === planId);
  const [localItems, setLocalItems] = useState<WorshipItem[]>([]);
  const [localMeta, setLocalMeta] = useState({ title: '', date: '', startTime: '', notes: '' });
  const [localTimeSlots, setLocalTimeSlots] = useState<WorshipTimeSlot[]>([]);
  const [localNeededPositions, setLocalNeededPositions] = useState<NeededPosition[]>([]);
  
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [showApplyDialog, setShowApplyDialog] = useState(false);

  // Time slot form state
  const [newSlotName, setNewSlotName] = useState('');
  const [newSlotTime, setNewSlotTime] = useState('18:00');
  const [newSlotType, setNewSlotType] = useState<'service' | 'rehearsal' | 'other'>('rehearsal');

  // Needed position form state
  const [newRole, setNewRole] = useState('');

  useEffect(() => {
    if (plan) {
      setLocalItems(plan.items || []);
      setLocalMeta({
        title: plan.title,
        date: plan.date,
        startTime: plan.startTime,
        notes: plan.notes || '',
      });
      setLocalTimeSlots(plan.timeSlots || []);
      setLocalNeededPositions(plan.neededPositions || []);
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

  const [isTransmitting, setIsTransmitting] = useState(false);

  const handleTransmitLive = async () => {
    if (!plan) return;
    setIsTransmitting(true);
    try {
      const findPosition = (roles: string[]) => {
        const match = localNeededPositions.find(p => 
          roles.some(r => p.role.toLowerCase().includes(r.toLowerCase()))
        );
        return match?.userName || 'A definir';
      };

      const cultInfo = {
        date: new Date(localMeta.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
        coordenadorTecnico: findPosition(['coordenador', 'liderança', 'técnica', 'direção']),
        som: findPosition(['som', 'áudio', 'sonoplasta', 'mesa']),
        projecao: findPosition(['projeção', 'slides', 'projeção', 'lyrics']),
        iluminacao: findPosition(['iluminação', 'luz', 'luzes']),
        transmissao: findPosition(['transmissão', 'câmera', 'vídeo', 'stream']),
        lead: findPosition(['dirigente', 'líder', 'ministro']),
        pregador: findPosition(['pregador', 'palavra', 'pastor', 'ministrador']),
        staff: 'A definir',
        startTime: localMeta.startTime || '19:00'
      };

      const mappedItems = localItems.map(item => {
        let responsible = 'A definir';
        if (item.type === 'song') {
          responsible = item.arrangement || 'Louvor';
        } else if (item.type === 'header') {
          responsible = 'Transição';
        }

        return {
          id: item.id,
          title: item.title,
          duration: Math.max(1, Math.round((item.durationSeconds || 300) / 60)),
          type: item.type === 'song' ? 'louvor' : item.type === 'header' ? 'transição' : 'palavra',
          responsible,
          description: item.notes || '',
          technical: {
            projection: { text: item.type === 'song' ? `Cifras/Letras (${item.key || 'Tom'})` : '-' },
            sound: { text: '-' },
            microphone: { text: '-' },
            lighting: { text: '-' },
            camera: { text: '-' }
          },
          completed: false,
          actualDuration: null,
          actualStartTime: null,
          actualEndTime: null
        };
      });

      const activeLiveState = {
        currentItemIndex: 0,
        isRunning: false,
        itemStartTime: null,
        accumulatedTime: 0,
        actualStartTime: null,
        announcement: null
      };

      const res = await syncLiveWorshipOrder({
        items: mappedItems,
        cultInfo,
        liveState: activeLiveState
      });

      if (!res.success) {
        throw new Error(res.error || 'Erro na resposta da server action');
      }

      toast({
        title: '🎥 Culto transmitido para a técnica!',
        description: 'Os dados foram sincronizados com o painel ao vivo (/tecnica).'
      });

      window.open('/tecnica', '_blank');
    } catch (err: any) {
      console.error(err);
      toast({
        title: '❌ Falha ao transmitir',
        description: err?.message || 'Ocorreu um erro ao sincronizar os dados com o painel técnico.',
        variant: 'destructive'
      });
    } finally {
      setIsTransmitting(false);
    }
  };

  const handleSave = async () => {
    if (!plan) return;
    setIsSaving(true);
    await updatePlan(plan.id, {
      ...localMeta,
      timeSlots: localTimeSlots,
      neededPositions: localNeededPositions
    });
    await updatePlanItems(plan.id, localItems);
    setIsDirty(false);
    setIsSaving(false);
    toast({ title: '✅ Plano salvo!', description: 'A ordem de culto e as escalas foram salvas com sucesso.' });
  };

  const handleSaveAsTemplate = async () => {
    if (!templateName.trim()) return;
    setShowTemplateDialog(false);
    await updatePlan(planId, {
      timeSlots: localTimeSlots,
      neededPositions: localNeededPositions
    });
    await updatePlanItems(planId, localItems);
    await savePlanAsTemplate(planId, templateName.trim());
    toast({ title: '📋 Template criado!', description: `"${templateName}" salvo como template.` });
    setTemplateName('');
  };

  const handleApplyTemplate = async (templateId: string) => {
    const tpl = templates.find(t => t.id === templateId);
    if (!tpl) return;
    setLocalItems(tpl.items.map((item, idx) => ({ ...item, order: idx })));
    setLocalNeededPositions(tpl.neededPositions || []);
    setIsDirty(true);
    setShowApplyDialog(false);
    toast({ title: `Template "${tpl.name}" aplicado!`, description: 'Os itens e escala base foram carregados. Salve para confirmar.' });
  };

  // Add a new Time Slot
  const handleAddTimeSlot = () => {
    if (!newSlotName.trim()) return;
    const newSlot: WorshipTimeSlot = {
      id: generateItemId(),
      name: newSlotName.trim(),
      time: newSlotTime,
      type: newSlotType
    };
    setLocalTimeSlots(prev => [...prev, newSlot].sort((a, b) => a.time.localeCompare(b.time)));
    setNewSlotName('');
    setIsDirty(true);
  };

  // Remove a Time Slot
  const handleRemoveTimeSlot = (slotId: string) => {
    setLocalTimeSlots(prev => prev.filter(s => s.id !== slotId));
    setIsDirty(true);
  };

  // Add a needed position
  const handleAddPosition = () => {
    if (!newRole.trim()) return;
    const newPos: NeededPosition = {
      id: generateItemId(),
      role: newRole.trim()
    };
    setLocalNeededPositions(prev => [...prev, newPos]);
    setNewRole('');
    setIsDirty(true);
  };

  // Remove needed position
  const handleRemovePosition = (posId: string) => {
    setLocalNeededPositions(prev => prev.filter(p => p.id !== posId));
    setIsDirty(true);
  };

  // Assign user to needed position
  const handleAssignUser = (posId: string, userId: string) => {
    const selectedUser = users.find(u => u.id === userId);
    setLocalNeededPositions(prev => prev.map(p => {
      if (p.id === posId) {
        return {
          ...p,
          userId: userId === 'none' ? undefined : userId,
          userName: userId === 'none' ? undefined : selectedUser?.name || ''
        };
      }
      return p;
    }));
    setIsDirty(true);
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
    <div className="flex flex-col h-full min-h-[85vh] bg-slate-50/30 pt-16">
      {/* Header bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-white">
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

          <Button variant="outline" size="sm" className="h-8 text-xs text-red-600 border-red-200 bg-red-50 hover:bg-red-100" onClick={handleTransmitLive} disabled={isTransmitting}>
            {isTransmitting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Radio className="mr-1.5 h-3.5 w-3.5" />}
            Ao Vivo
          </Button>

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
          <Label className="text-xs font-bold text-slate-600 uppercase">Horário de início</Label>
          <Input
            type="time"
            value={localMeta.startTime}
            onChange={e => handleMetaChange({ startTime: e.target.value })}
            className="h-8 text-sm bg-white"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-bold text-slate-600 uppercase">Evento / Culto</Label>
          <Select
            value={plan.serviceEventId || 'none'}
            onValueChange={v => updatePlan(plan.id, { serviceEventId: v === 'none' ? undefined : v, serviceEventName: events.find(e => e.id === v)?.name })}
          >
            <SelectTrigger className="h-8 text-sm bg-white"><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhum</SelectItem>
              {events.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2 space-y-1">
          <Label className="text-xs font-bold text-slate-600 uppercase">Notas do Plano</Label>
          <Input
            value={localMeta.notes}
            onChange={e => handleMetaChange({ notes: e.target.value })}
            placeholder="Tema do sermão, observações gerais..."
            className="h-8 text-sm bg-white"
          />
        </div>
      </div>

      {/* Main Workspace: 2-column layout for PC features */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 p-4 items-start">
        {/* Left 3 columns: Worship Plan Editor */}
        <div className="lg:col-span-3 bg-white border rounded-xl p-4 shadow-sm min-h-[60vh]">
          <h3 className="font-black italic uppercase text-sm text-slate-800 tracking-tight mb-4 flex items-center gap-1.5 border-b pb-2">
            <Music className="size-4 text-primary" /> Ordem de Culto Litúrgica
          </h3>
          <WorshipPlanEditor
            items={localItems}
            startTime={localMeta.startTime || '09:00'}
            onItemsChange={handleItemsChange}
          />
        </div>

        {/* Right 1 column: Sidebar for Time Slots and neededPositions */}
        <div className="space-y-4 lg:col-span-1">
          {/* Horários (Time Slots) Card */}
          <Card className="border shadow-sm bg-white">
            <CardHeader className="p-4 pb-2 border-b">
              <CardTitle className="text-sm font-black uppercase text-slate-800 flex items-center gap-2">
                <CalendarDays className="size-4 text-primary" /> Horários e Encontros
              </CardTitle>
              <CardDescription className="text-[10px]">Gerencie ensaios, passagem de som e cultos.</CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {/* Existing slots list */}
              {localTimeSlots.length === 0 ? (
                <p className="text-xs text-muted-foreground italic text-center py-2">Sem horários adicionais cadastrados.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {localTimeSlots.map(slot => (
                    <div key={slot.id} className="flex items-center justify-between p-2 rounded-lg border bg-slate-50/50 text-xs">
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-slate-800 truncate">{slot.name}</span>
                        <span className="text-[10px] text-slate-500 capitalize">{slot.type === 'service' ? 'Culto' : slot.type === 'rehearsal' ? 'Ensaio' : 'Outro'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-700 bg-white border px-1.5 py-0.5 rounded font-bold">{slot.time}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-700" onClick={() => handleRemoveTimeSlot(slot.id)}>
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add slot form */}
              <div className="border-t pt-3 space-y-2">
                <Input
                  placeholder="Nome (Ex: Passagem de Som)"
                  value={newSlotName}
                  onChange={e => setNewSlotName(e.target.value)}
                  className="h-8 text-xs bg-white"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="time"
                    value={newSlotTime}
                    onChange={e => setNewSlotTime(e.target.value)}
                    className="h-8 text-xs bg-white"
                  />
                  <Select value={newSlotType} onValueChange={(v: any) => setNewSlotType(v)}>
                    <SelectTrigger className="h-8 text-xs bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rehearsal">Ensaio</SelectItem>
                      <SelectItem value="service">Culto</SelectItem>
                      <SelectItem value="other">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAddTimeSlot} size="sm" className="w-full h-8 text-xs gap-1" disabled={!newSlotName.trim()}>
                  <Plus className="size-3" /> Adicionar Horário
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Escalas e Voluntários (Needed Positions) Card */}
          <Card className="border shadow-sm bg-white">
            <CardHeader className="p-4 pb-2 border-b">
              <CardTitle className="text-sm font-black uppercase text-slate-800 flex items-center gap-2">
                <Users className="size-4 text-primary" /> Equipe e Escalas
              </CardTitle>
              <CardDescription className="text-[10px]">Aloque ministros e a equipe técnica.</CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {/* Positions list */}
              {localNeededPositions.length === 0 ? (
                <p className="text-xs text-muted-foreground italic text-center py-2">Nenhuma vaga ou escala configurada.</p>
              ) : (
                <div className="space-y-2.5 max-h-72 overflow-y-auto">
                  {localNeededPositions.map(pos => (
                    <div key={pos.id} className="space-y-1 p-2 rounded-lg border bg-slate-50/50">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase text-slate-700 tracking-wider">{pos.role}</span>
                        <Button variant="ghost" size="icon" className="h-5 w-5 text-red-500 hover:text-red-700" onClick={() => handleRemovePosition(pos.id)}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>

                      {/* User selector for position */}
                      <Select
                        value={pos.userId || 'none'}
                        onValueChange={v => handleAssignUser(pos.id, v)}
                      >
                        <SelectTrigger className="h-8 text-xs bg-white font-medium">
                          <SelectValue placeholder="Selecione um voluntário..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">A definir / Aberto</SelectItem>
                          {users.map(u => (
                            <SelectItem key={u.id} value={u.id} className="text-xs">{u.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              )}

              {/* Add position form */}
              <div className="border-t pt-3 space-y-2">
                <Input
                  placeholder="Nova Função (Ex: Tecladista)"
                  value={newRole}
                  onChange={e => setNewRole(e.target.value)}
                  className="h-8 text-xs bg-white"
                  onKeyDown={e => e.key === 'Enter' && handleAddPosition()}
                />
                <Button onClick={handleAddPosition} size="sm" className="w-full h-8 text-xs gap-1" disabled={!newRole.trim()}>
                  <UserPlus className="size-3" /> Adicionar Função
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
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
                    <p className="text-xs text-slate-500 mt-0.5">{t.items.length} itens · {(t.neededPositions || []).length} funções</p>
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
