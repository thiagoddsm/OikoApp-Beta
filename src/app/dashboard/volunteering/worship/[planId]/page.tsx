'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { WorshipProvider, useWorship, WorshipItem, WorshipPlan, WorshipTimeSlot, NeededPosition, SongAttachment, formatDuration, generateItemId } from '@/contexts/worship-context';
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
import {
  Loader2,
  Save,
  ChevronLeft,
  LayoutTemplate,
  Clock,
  Music,
  Ellipsis,
  BookMarked,
  Radio,
  Plus,
  Trash2,
  UserPlus,
  UserCheck,
  CalendarDays,
  Users,
  Send,
  CheckCircle2,
  XCircle,
  Mail,
  FileText,
  AudioLines,
  Video,
  ListMusic,
  CalendarRange,
  Files,
  Volume2
} from 'lucide-react';
import { useEventsData, useMembersData, useVolunteeringServiceData } from '@/hooks/useDomainData';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  const { plans, templates, librarySongs, isLoading, updatePlan, updatePlanItems, savePlanAsTemplate, applyTemplate } = useWorship();
  const { events } = useEventsData();
  const { users } = useMembersData();
  const { savedSchedules, serviceAreas, teams } = useVolunteeringServiceData();
  const { toast } = useToast();

  const plan = plans.find(p => p.id === planId);
  const [localItems, setLocalItems] = useState<WorshipItem[]>([]);
  const [localMeta, setLocalMeta] = useState({ title: '', date: '', startTime: '', notes: '' });
  const [localTimeSlots, setLocalTimeSlots] = useState<WorshipTimeSlot[]>([]);
  const [localNeededPositions, setLocalNeededPositions] = useState<NeededPosition[]>([]);
  const [localAttachments, setLocalAttachments] = useState<SongAttachment[]>([]);
  
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [showApplyDialog, setShowApplyDialog] = useState(false);

  // Rehearsal Player State
  const [selectedRehearsalSong, setSelectedRehearsalSong] = useState<WorshipItem | null>(null);

  // Form states
  const [newSlotName, setNewSlotName] = useState('');
  const [newSlotTime, setNewSlotTime] = useState('18:00');
  const [newSlotType, setNewSlotType] = useState<'service' | 'rehearsal' | 'other'>('rehearsal');

  const [newRole, setNewRole] = useState('');
  
  // Plan attachments state
  const [newPlanAttName, setNewPlanAttName] = useState('');
  const [newPlanAttUrl, setNewPlanAttUrl] = useState('');
  const [newPlanAttType, setNewPlanAttType] = useState<'pdf' | 'mp3' | 'link'>('pdf');

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
      setLocalAttachments(plan.attachments || []);
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
    try {      const findVolunteerByAreaKeywords = (keywords: string[]) => {
        for (const [areaName, volunteers] of Object.entries(matchedVolunteersGroupedByArea)) {
          const areaLower = areaName.toLowerCase();
          if (keywords.some(kw => areaLower.includes(kw.toLowerCase()))) {
            if (volunteers && volunteers.length > 0) {
              return volunteers[0].userName;
            }
          }
        }
        return 'A definir';
      };

      const cultInfo = {
        date: new Date(localMeta.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
        coordenadorTecnico: findVolunteerByAreaKeywords(['técnica', 'coordenador', 'coordenação', 'direção']),
        som: findVolunteerByAreaKeywords(['som', 'áudio', 'sonoplastia', 'mesa']),
        projecao: findVolunteerByAreaKeywords(['projeção', 'slides', 'letras']),
        iluminacao: findVolunteerByAreaKeywords(['iluminação', 'luz']),
        transmissao: findVolunteerByAreaKeywords(['transmissão', 'câmera', 'vídeo', 'stream']),
        lead: findVolunteerByAreaKeywords(['dirigente', 'líder', 'ministro']),
        pregador: findVolunteerByAreaKeywords(['pregador', 'palavra', 'pastor', 'pregadora']),
        staff: 'A definir',
        startTime: localMeta.startTime || '19:00'
      };

      const mappedItems = localItems
        .filter(item => item.type !== 'header')
        .map(item => {
        let responsible = 'A definir';
        if (item.type === 'song') {
          responsible = item.arrangement || 'Louvor';
        }

        return {
          id: item.id,
          title: item.title,
          duration: Math.max(1, Math.round((item.durationSeconds || 300) / 60)),
          type: item.type === 'song' ? 'louvor' : item.type === 'header' ? 'transição' : 'palavra',
          responsible,
          description: item.notes || '',
          technical: {
            projection: { text: item.departmentNotes?.video || item.departmentNotes?.projection || (item.type === 'song' ? `Tom: ${item.key || 'Tom'}` : '-') },
            sound: { text: item.departmentNotes?.audio || item.departmentNotes?.sound || '-' },
            microphone: { text: item.departmentNotes?.banda || item.departmentNotes?.microphone || '-' },
            lighting: { text: item.departmentNotes?.lighting || item.departmentNotes?.iluminacao || '-' },
            camera: { text: item.departmentNotes?.camera || item.departmentNotes?.transmissao || '-' }
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
      neededPositions: localNeededPositions,
      attachments: localAttachments
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
      neededPositions: localNeededPositions,
      attachments: localAttachments
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
    toast({ title: `Template "${tpl.name}" applied!`, description: 'Os itens e escala base foram carregados. Salve para confirmar.' });
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

  // Add a needed position (Default to draft status)
  const handleAddPosition = () => {
    if (!newRole.trim()) return;
    const newPos: NeededPosition = {
      id: generateItemId(),
      role: newRole.trim(),
      status: 'draft'
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
          userName: userId === 'none' ? undefined : selectedUser?.name || '',
          status: userId === 'none' ? 'draft' : p.status // maintain draft status
        };
      }
      return p;
    }));
    setIsDirty(true);
  };

  // Batch Notify Volunteers (Send notifications in batch)
  const handleNotifyTeam = () => {
    const drafts = localNeededPositions.filter(p => p.status === 'draft' && p.userId);
    if (drafts.length === 0) {
      toast({ title: 'Tudo notificado! ✉️', description: 'Não há novos rascunhos de escalas para notificar.' });
      return;
    }

    setLocalNeededPositions(prev => prev.map(p => {
      if (p.status === 'draft' && p.userId) {
        return { ...p, status: 'sent' };
      }
      return p;
    }));
    setIsDirty(true);
    toast({
      title: '✉️ Escala disparada!',
      description: `${drafts.length} voluntários foram notificados e colocados como pendentes.`
    });
  };

  // Plan Attachments management
  const handleAddPlanAttachment = () => {
    if (!newPlanAttName.trim()) return;
    const fileUrl = newPlanAttUrl.trim() || 'https://example.com/mock_file.pdf';
    const newAtt: SongAttachment = {
      name: newPlanAttName.trim(),
      url: fileUrl,
      type: newPlanAttType
    };
    setLocalAttachments(prev => [...prev, newAtt]);
    setNewPlanAttName('');
    setNewPlanAttUrl('');
    setIsDirty(true);
  };

  const handleRemovePlanAttachment = (index: number) => {
    setLocalAttachments(prev => prev.filter((_, idx) => idx !== index));
    setIsDirty(true);
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return parts[0] ? parts[0][0].toUpperCase() : 'U';
  };

  const matchedVolunteersGroupedByArea = useMemo(() => {
    if (!plan || !savedSchedules) return {};

    const parts = plan.date?.split('-');
    const planDateFormatted = parts && parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : plan.date;

    const planEventId = plan.serviceEventId;
    const planEventName = plan.serviceEventName;

    const grouped: Record<string, {
      userId: string;
      userName: string;
      userAvatar?: string;
      role: string;
      status: 'confirmed' | 'declined' | 'pending';
    }[]> = {};

    savedSchedules.forEach((ss) => {
      const area = serviceAreas.find(a => a.id === ss.areaId);
      const areaName = area ? area.name : 'Outras Áreas';

      ss.schedule?.forEach((item) => {
        const isDateMatch = item.date === planDateFormatted;
        const isEventMatch = (planEventName && item.eventName && planEventName.toLowerCase().trim() === item.eventName.toLowerCase().trim()) ||
                             (planEventId && (events.find(e => e.id === planEventId)?.name?.toLowerCase().trim() === item.eventName?.toLowerCase().trim()));

        if (isDateMatch && isEventMatch) {
          const confirmations = ss.confirmations || {};

          item.memberIds?.forEach((mId) => {
            const memberObj = users.find(u => u.id === mId);
            const memberName = memberObj?.name || 'Voluntário';
            const memberAvatar = memberObj?.avatar;
            const status = confirmations[mId]?.status || 'pending';

            if (!grouped[areaName]) {
              grouped[areaName] = [];
            }

            const role = item.teamName || 'Voluntário';

            grouped[areaName].push({
              userId: mId,
              userName: memberName,
              userAvatar: memberAvatar,
              role,
              status,
            });
          });
        }
      });
    });

    return grouped;
  }, [plan, savedSchedules, serviceAreas, events, users]);

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

      {/* Tabs navigation: Order, Teams, Rehearse (Planning Center Services experience) */}
      <div className="flex-1 p-4">
        <Tabs defaultValue="order" className="w-full space-y-4">
          <TabsList className="bg-slate-100 p-1 rounded-lg">
            <TabsTrigger value="order" className="gap-2 text-xs font-black uppercase tracking-wider">
              <ListMusic className="size-4" /> Ordem (Order)
            </TabsTrigger>
            <TabsTrigger value="teams" className="gap-2 text-xs font-black uppercase tracking-wider">
              <Users className="size-4" /> Escalas (Teams)
            </TabsTrigger>
            <TabsTrigger value="rehearse" className="gap-2 text-xs font-black uppercase tracking-wider">
              <Volume2 className="size-4" /> Ensaiar & Arquivos (Rehearse)
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Order (Liturgical list) */}
          <TabsContent value="order" className="bg-white border rounded-xl p-4 shadow-sm min-h-[60vh]">
            <h3 className="font-black italic uppercase text-sm text-slate-800 tracking-tight mb-4 flex items-center gap-1.5 border-b pb-2">
              <Music className="size-4 text-primary" /> Ordem de Culto Litúrgica
            </h3>
            <WorshipPlanEditor
              items={localItems}
              startTime={localMeta.startTime || '09:00'}
              onItemsChange={handleItemsChange}
            />
          </TabsContent>

          {/* TAB 2: Teams (People management & notifications) */}
          <TabsContent value="teams" className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
            {/* Left 3 columns: Volunteer matrix/divisions */}
            <div className="lg:col-span-3 bg-white border rounded-xl p-6 shadow-sm min-h-[60vh] space-y-6">
              <div className="border-b pb-4">
                <h3 className="font-black italic uppercase text-sm text-slate-800 tracking-tight">Voluntários Escalados</h3>
                <p className="text-xs text-slate-500">Membros oficiais escalados para esta celebração nas Áreas de Serviço.</p>
              </div>

              {Object.keys(matchedVolunteersGroupedByArea).length === 0 ? (
                <div className="text-center py-12 text-slate-500 italic text-sm">
                  Nenhum voluntário escalado para este culto nas escalas oficiais.
                </div>
              ) : (
                <div className="space-y-8">
                  {Object.entries(matchedVolunteersGroupedByArea).map(([areaName, volunteers]) => (
                    <div key={areaName} className="space-y-3">
                      <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider border-b pb-1.5">{areaName}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {volunteers.map((vol, idx) => (
                          <div key={`${vol.userId}-${idx}`} className="flex items-center justify-between p-3.5 rounded-xl border bg-slate-50/50 hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                {vol.userAvatar && <AvatarImage src={vol.userAvatar} alt={vol.userName} />}
                                <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                                  {getInitials(vol.userName)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-bold text-slate-850 leading-snug">{vol.userName}</p>
                                <p className="text-[11px] text-slate-500 font-semibold">{vol.role}</p>
                              </div>
                            </div>
                            <div>
                              {vol.status === 'confirmed' && (
                                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 text-[10px] font-bold">
                                  <CheckCircle2 className="size-3 mr-1" /> Confirmado
                                </Badge>
                              )}
                              {vol.status === 'declined' && (
                                <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100 text-[10px] font-bold">
                                  <XCircle className="size-3 mr-1" /> Recusou
                                </Badge>
                              )}
                              {vol.status === 'pending' && (
                                <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 text-[10px] font-bold">
                                  <Clock className="size-3 mr-1" /> Pendente
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right 1 column: Settings & Scheduling config */}
            <div className="lg:col-span-1 space-y-4">

              {/* Time Slots inside Teams page */}
              <Card className="border shadow-sm bg-white">
                <CardHeader className="p-4 pb-2 border-b">
                  <CardTitle className="text-xs font-black uppercase text-slate-800 flex items-center gap-2">
                    <CalendarRange className="size-4 text-primary" /> Horários do Culto
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {localTimeSlots.length > 0 && (
                    <div className="space-y-2 max-h-36 overflow-y-auto border-b pb-2">
                      {localTimeSlots.map(slot => (
                        <div key={slot.id} className="flex items-center justify-between p-1.5 border rounded bg-slate-50 text-[11px] font-semibold">
                          <span className="truncate max-w-[120px]">{slot.name}</span>
                          <div className="flex items-center gap-1">
                            <span className="font-mono bg-white px-1 border rounded">{slot.time}</span>
                            <Button variant="ghost" size="icon" className="h-5 w-5 text-red-500" onClick={() => handleRemoveTimeSlot(slot.id)}>
                              <Trash2 className="size-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Input
                      placeholder="Passagem de Som, Ensaio..."
                      value={newSlotName}
                      onChange={e => setNewSlotName(e.target.value)}
                      className="h-8 text-xs bg-white font-medium"
                    />
                    <div className="grid grid-cols-2 gap-1.5">
                      <Input type="time" value={newSlotTime} onChange={e => setNewSlotTime(e.target.value)} className="h-8 text-xs bg-white" />
                      <Select value={newSlotType} onValueChange={(v: any) => setNewSlotType(v)}>
                        <SelectTrigger className="h-8 text-xs bg-white"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="rehearsal">Ensaio</SelectItem>
                          <SelectItem value="service">Culto</SelectItem>
                          <SelectItem value="other">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleAddTimeSlot} size="sm" variant="outline" className="w-full h-8 text-xs gap-1" disabled={!newSlotName.trim()}>
                      Adicionar Horário
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB 3: Rehearse / Media Player / Cifras Stand */}
          <TabsContent value="rehearse" className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
            {/* Left 3 columns: Media player and Cifra display */}
            <div className="lg:col-span-3 bg-white border rounded-xl p-6 shadow-sm min-h-[60vh] flex flex-col md:flex-row gap-6">
              {/* Songs listing & player selector */}
              <div className="w-full md:w-1/3 border-r pr-0 md:pr-6 space-y-4">
                <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">Músicas do Culto</h4>
                {localItems.filter(i => i.type === 'song').length === 0 ? (
                  <p className="text-xs italic text-slate-400">Nenhuma música adicionada a este culto.</p>
                ) : (
                  <div className="space-y-2">
                    {localItems.filter(i => i.type === 'song').map(song => (
                      <div
                        key={song.id}
                        onClick={() => setSelectedRehearsalSong(song)}
                        className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${selectedRehearsalSong?.id === song.id ? 'border-primary bg-primary/5 text-primary' : 'hover:bg-slate-50 border-slate-200'}`}
                      >
                        <span className="text-xs font-bold block">{song.title}</span>
                        <span className="text-[10px] block opacity-70 mt-0.5">{song.arrangement || 'Arranjo Padrão'} · Tom: {song.key || '-'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Cifra Display / MediaPlayer Area */}
              <div className="flex-1 space-y-4">
                {selectedRehearsalSong ? (() => {
                  const generalSong = librarySongs.find(s => s.title.toLowerCase() === selectedRehearsalSong.title.toLowerCase());
                  const localAtts = selectedRehearsalSong.attachments || [];
                  const libAtts = generalSong?.attachments || [];
                  
                  const mergedAttachmentsMap = new Map<string, SongAttachment>();
                  localAtts.forEach(att => {
                    mergedAttachmentsMap.set(att.name.toLowerCase(), att);
                  });
                  libAtts.forEach(att => {
                    if (!mergedAttachmentsMap.has(att.name.toLowerCase())) {
                      mergedAttachmentsMap.set(att.name.toLowerCase(), att);
                    }
                  });
                  
                  const mergedAttachments = Array.from(mergedAttachmentsMap.values());
                  const youtubeUrl = generalSong?.youtubeUrl || selectedRehearsalSong.youtubeUrl;
                  if (youtubeUrl) {
                    mergedAttachments.push({
                      name: 'YouTube (Vídeo de Referência)',
                      url: youtubeUrl,
                      type: 'link'
                    });
                  }

                  return (
                    <div className="space-y-4">
                      <div className="border-b pb-2">
                        <h3 className="font-black text-base text-slate-800">{selectedRehearsalSong.title}</h3>
                        <span className="text-xs font-semibold text-slate-500">{selectedRehearsalSong.arrangement || 'Sem artista'} · Tom: {selectedRehearsalSong.key || '-'} · BPM: {selectedRehearsalSong.bpm || '-'}</span>
                      </div>

                      {/* Media attachments */}
                      {mergedAttachments.length > 0 ? (
                        <div className="space-y-3">
                          <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">Arquivos e Cifras Disponíveis</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {mergedAttachments.map((att, idx) => (
                              <a
                                key={idx}
                                href={att.url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2 p-2 rounded-lg border hover:border-primary/40 hover:bg-primary/5 transition-all text-xs font-bold text-slate-700"
                              >
                                {att.type === 'pdf' ? <FileText className="size-4 text-red-500" /> : att.type === 'mp3' ? <AudioLines className="size-4 text-emerald-500" /> : <Video className="size-4 text-blue-500" />}
                                <span className="truncate">{att.name}</span>
                              </a>
                            ))}
                          </div>

                          {/* Embed Player Mock */}
                          <div className="p-6 border rounded-xl bg-slate-50 flex flex-col items-center justify-center text-center space-y-3">
                            <Volume2 className="size-8 text-primary animate-pulse" />
                            <div className="space-y-1">
                              <p className="text-xs font-black uppercase text-slate-700">Media Player & Ensaiador</p>
                              <p className="text-[10px] text-slate-400">Clique nos links de anexo acima para carregar cifras em PDF e escutar faixas.</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-12 border border-dashed rounded-xl text-slate-400 text-xs italic">
                          Nenhum anexo de cifra ou áudio vinculado a esta música.
                        </div>
                      )}
                    </div>
                  );
                })() : (
                  <div className="text-center py-16 text-slate-500 italic text-sm">
                    Selecione uma música da lista ao lado para acessar cifras e áudios de ensaio.
                  </div>
                )}
              </div>
            </div>

            {/* Right 1 column: Plan general attachments */}
            <div className="lg:col-span-1 space-y-4">
              <Card className="border shadow-sm bg-white">
                <CardHeader className="p-4 pb-2 border-b">
                  <CardTitle className="text-xs font-black uppercase text-slate-800 flex items-center gap-2">
                    <Files className="size-4 text-primary" /> Arquivos Gerais do Culto
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {localAttachments.length > 0 ? (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto mb-3">
                      {localAttachments.map((att, idx) => (
                        <div key={idx} className="flex items-center justify-between p-1.5 border rounded bg-slate-50 text-[11px] font-bold">
                          <a href={att.url} target="_blank" rel="noreferrer" className="truncate text-primary hover:underline flex items-center gap-1.5 max-w-[140px]">
                            <FileText className="size-3.5 shrink-0" />
                            {att.name}
                          </a>
                          <Button variant="ghost" size="icon" className="h-5 w-5 text-red-500" onClick={() => handleRemovePlanAttachment(idx)}>
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400 italic mb-2">Nenhum roteiro ou arquivo de Stage adicionado.</p>
                  )}

                  {/* Add Plan attachment Form */}
                  <div className="space-y-2 border-t pt-3">
                    <Input
                      placeholder="Nome (Ex: Roteiro, Mapa)"
                      value={newPlanAttName}
                      onChange={e => setNewPlanAttName(e.target.value)}
                      className="h-8 text-xs bg-white"
                    />
                    <Input
                      placeholder="Link / URL do Arquivo"
                      value={newPlanAttUrl}
                      onChange={e => setNewPlanAttUrl(e.target.value)}
                      className="h-8 text-xs bg-white"
                    />
                    <Select value={newPlanAttType} onValueChange={(v: any) => setNewPlanAttType(v)}>
                      <SelectTrigger className="h-8 text-xs bg-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">PDF (Documento)</SelectItem>
                        <SelectItem value="mp3">Áudio (MP3)</SelectItem>
                        <SelectItem value="link">Vídeo / YouTube</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="sm" onClick={handleAddPlanAttachment} className="w-full h-8 text-xs font-bold gap-1" disabled={!newPlanAttName.trim()}>
                      Anexar Arquivo
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
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
