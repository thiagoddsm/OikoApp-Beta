'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { WorshipProvider, useWorship, WorshipPlan, LibrarySong, SongAttachment } from '@/contexts/worship-context';
import { TemplateManager } from '@/components/worship/template-manager';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  PlusCircle,
  Loader2,
  ListMusic,
  LayoutTemplate,
  Calendar,
  Music,
  Clock,
  MoreHorizontal,
  Pencil,
  Trash2,
  ChevronRight,
  AlignLeft,
  CalendarCheck,
  FileCheck,
  CheckCircle2,
  XCircle,
  FileText,
  Video,
  AudioLines,
  Youtube,
  ExternalLink,
  Plus,
  Grid3X3,
  Volume2,
  Radio,
  Sliders,
  Upload,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEventsData, useMembersData, useVolunteeringServiceData } from '@/hooks/useDomainData';
import { useFirebase } from '@/firebase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { transmitWorshipPlanToAv } from './actions';

// ─── Plans list ───────────────────────────────────────────────────────────────

function PlansList() {
  const router = useRouter();
  const { plans, isLoading, createPlan, deletePlan } = useWorship();
  const { events } = useEventsData();
  const { savedSchedules } = useVolunteeringServiceData();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ title: '', date: '', startTime: '09:00', serviceEventId: '' });
  const [creatingVirtualId, setCreatingVirtualId] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!form.title || !form.date) return;
    const id = await createPlan({
      title: form.title,
      date: form.date,
      startTime: form.startTime,
      serviceEventId: form.serviceEventId || undefined,
      serviceEventName: events.find(e => e.id === form.serviceEventId)?.name,
      items: [],
    });
    toast({ title: 'Plano criado!' });
    setCreateOpen(false);
    setForm({ title: '', date: '', startTime: '09:00', serviceEventId: '' });
    router.push(`/dashboard/volunteering/worship/${id}`);
  };

  const handleCreateVirtual = async (virtualPlan: WorshipPlan) => {
    if (creatingVirtualId) return;
    setCreatingVirtualId(virtualPlan.id);
    try {
      const matchedEvent = events.find(e => e.name === virtualPlan.title);
      const newId = await createPlan({
        title: virtualPlan.title,
        date: virtualPlan.date,
        startTime: virtualPlan.startTime,
        serviceEventId: matchedEvent?.id || undefined,
        serviceEventName: virtualPlan.title,
        items: [],
      });
      toast({ title: 'Plano criado!' });
      router.push(`/dashboard/volunteering/worship/${newId}`);
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro ao criar plano.', variant: 'destructive' });
    } finally {
      setCreatingVirtualId(null);
    }
  };

  const handleDelete = async (plan: WorshipPlan) => {
    await deletePlan(plan.id);
    toast({ title: 'Plano excluído.' });
  };

  const parseDateRobust = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        const d = new Date(year, month, day);
        return isNaN(d.getTime()) ? null : d;
      }
    }
    const d = parseISO(dateStr);
    return isNaN(d.getTime()) ? null : d;
  };

  const virtualPlans = useMemo(() => {
    const occurrences = new Map<string, { date: string; eventName: string }>();
    savedSchedules.forEach(saved => {
      if (saved.schedule && Array.isArray(saved.schedule)) {
        saved.schedule.forEach(item => {
          if (item.date && item.eventName) {
            const key = `${item.date}_${item.eventName}`;
            occurrences.set(key, { date: item.date, eventName: item.eventName });
          }
        });
      }
    });

    const list: WorshipPlan[] = [];
    occurrences.forEach(({ date, eventName }) => {
      const hasPhysical = plans.some(
        plan =>
          plan.date === date &&
          (plan.title === eventName || plan.serviceEventName === eventName)
      );
      if (!hasPhysical) {
        list.push({
          id: `virtual-${date}-${eventName}`,
          title: eventName,
          date,
          startTime: '18:00',
          isVirtual: true,
          items: [],
          tenantId: plans[0]?.tenantId || '',
        });
      }
    });
    return list;
  }, [savedSchedules, plans]);

  const mixedPlans = useMemo(() => {
    return [...plans, ...virtualPlans];
  }, [plans, virtualPlans]);

  const grouped = mixedPlans.reduce<Record<string, WorshipPlan[]>>((acc, plan) => {
    let key = 'sem-data';
    if (plan.date) {
      const d = parseDateRobust(plan.date);
      if (d) {
        key = format(d, 'yyyy-MM');
      }
    }
    if (!acc[key]) acc[key] = [];
    acc[key].push(plan);
    return acc;
  }, {});

  const sortedMonths = Object.keys(grouped).sort().reverse();

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Planos de Culto</h3>
          <p className="text-sm text-muted-foreground">Ordens de culto detalhadas, organizadas por data.</p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" /> Novo Plano
        </Button>
      </div>

      {mixedPlans.length === 0 ? (
        <div className="border-2 border-dashed rounded-xl py-20 flex flex-col items-center text-center text-slate-500">
          <ListMusic className="h-12 w-12 text-slate-300 mb-4" />
          <p className="font-semibold text-slate-600 text-lg">Nenhum plano criado</p>
          <p className="text-sm mt-2 max-w-sm">
            Crie o primeiro plano de culto para montar sua ordem de serviço e preparar toda a equipe.
          </p>
          <Button className="mt-6" onClick={() => setCreateOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Criar Primeiro Plano
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedMonths.map(month => {
            const dMonth = parseDateRobust(`${month}-01`);
            const monthLabel = dMonth
              ? format(dMonth, 'MMMM yyyy', { locale: ptBR })
              : 'Sem data';
            return (
              <div key={month}>
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3 capitalize">{monthLabel}</h4>
                <div className="space-y-2">
                  {grouped[month].sort((a, b) => b.date.localeCompare(a.date)).map(plan => {
                    const totalSecs = plan.items.reduce((acc, i) => acc + (i.durationSeconds || 0), 0);
                    const totalMins = Math.round(totalSecs / 60);
                    const songs = plan.items.filter(i => i.type === 'song').length;
                    const items = plan.items.filter(i => i.type === 'item').length;

                    return (
                      <div
                        key={plan.id}
                        className={`flex items-center gap-4 px-4 py-3 bg-white border border-slate-200 rounded-xl hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer group ${
                          plan.isVirtual ? 'border-dashed border-emerald-300 bg-emerald-50/10' : ''
                        }`}
                        onClick={() => {
                          if (plan.isVirtual) {
                            handleCreateVirtual(plan);
                          } else {
                            router.push(`/dashboard/volunteering/worship/${plan.id}`);
                          }
                        }}
                      >
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex flex-col items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-primary uppercase">
                            {(() => {
                              const d = parseDateRobust(plan.date);
                              return d ? format(d, 'MMM', { locale: ptBR }) : '--';
                            })()}
                          </span>
                          <span className="text-lg font-black text-primary leading-none">
                            {(() => {
                              const d = parseDateRobust(plan.date);
                              return d ? format(d, 'd') : '--';
                            })()}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm text-slate-800 truncate">{plan.title}</p>
                            {plan.isVirtual && (
                              <Badge className="bg-emerald-500 hover:bg-emerald-600 font-bold text-xs text-white border-none shrink-0">
                                Escala Pronta
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {plan.serviceEventName && <Badge variant="outline" className="text-xs">{plan.serviceEventName}</Badge>}
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              <Clock className="h-3 w-3" />{plan.startTime || '--:--'}
                            </span>
                            {songs > 0 && <span className="text-xs text-slate-400 flex items-center gap-1"><Music className="h-3 w-3" />{songs}</span>}
                            {items > 0 && <span className="text-xs text-slate-400 flex items-center gap-1"><AlignLeft className="h-3 w-3" />{items}</span>}
                            {totalMins > 0 && <span className="text-xs text-slate-400">{totalMins} min</span>}
                            {plan.items.length === 0 && <span className="text-xs text-amber-500">Vazio</span>}
                          </div>
                        </div>

                        {creatingVirtualId === plan.id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-emerald-600 shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-primary transition-colors shrink-0" />
                        )}

                        {!plan.isVirtual && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={e => { e.stopPropagation(); router.push(`/dashboard/volunteering/worship/${plan.id}`); }}>
                                <Pencil className="mr-2 h-4 w-4" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={async (e) => { 
                                  e.stopPropagation(); 
                                  try {
                                    toast({ title: 'Transmitindo...', description: 'Enviando liturgia para a Central AV...' });
                                    const res = await transmitWorshipPlanToAv(plan);
                                    if (res.success) {
                                      toast({ title: '🎛️ Central AV Sincronizada!', description: `${res.totalItems} itens transmitidos para Lumikit & X32!` });
                                    } else {
                                      toast({ title: '❌ Falha ao transmitir', description: res.error, variant: 'destructive' });
                                    }
                                  } catch (err: any) {
                                    toast({ title: '❌ Erro', description: err?.message || 'Falha na transmissão.', variant: 'destructive' });
                                  }
                                }}
                              >
                                <Zap className="mr-2 h-4 w-4 text-amber-600 fill-amber-300" /> Transmitir p/ Central AV
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={e => { e.stopPropagation(); handleDelete(plan); }}>
                                <Trash2 className="mr-2 h-4 w-4" /> Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Plano de Culto</DialogTitle>
            <DialogDescription>Preencha os dados básicos. Você vai montar a ordem detalhada no editor.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                placeholder="Ex: Culto da Família - 06/07"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data *</Label>
                <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Horário de início</Label>
                <Input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Evento / Culto</Label>
              <Select value={form.serviceEventId || 'none'} onValueChange={v => setForm(f => ({ ...f, serviceEventId: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o culto..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {events.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!form.title || !form.date}>Criar e Abrir Editor</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── My Schedule (Volunteers Area) ─────────────────────────────────────────────

function MySchedule() {
  const { plans, updatePlan } = useWorship();
  const { user } = useFirebase();
  const { toast } = useToast();

  const mySchedules = useMemo(() => {
    if (!user) return [];
    return plans.filter(p => 
      p.neededPositions?.some(pos => pos.userId === user.uid && pos.status !== 'draft')
    );
  }, [plans, user]);

  const handleResponse = async (planId: string, positionId: string, status: 'accepted' | 'declined') => {
    const targetPlan = plans.find(p => p.id === planId);
    if (!targetPlan) return;

    const updatedPositions = (targetPlan.neededPositions || []).map(pos => {
      if (pos.id === positionId) {
        return { ...pos, status };
      }
      return pos;
    });

    await updatePlan(planId, { neededPositions: updatedPositions });
    toast({
      title: status === 'accepted' ? 'Escala Confirmada! 🎉' : 'Escala Recusada',
      description: status === 'accepted' ? 'Sua participação foi confirmada.' : 'O líder foi notificado sobre sua ausência.'
    });
  };

  if (!user) return <p className="text-sm text-slate-500 italic">Faça login para ver sua agenda de escalas.</p>;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Minha Agenda</h3>
        <p className="text-sm text-muted-foreground">Confirme sua participação e acesse as cifras dos cultos escalados.</p>
      </div>

      {mySchedules.length === 0 ? (
        <Card className="border border-dashed py-12 flex flex-col items-center justify-center text-center text-slate-500">
          <CalendarCheck className="h-10 w-10 text-slate-300 mb-3" />
          <p className="font-semibold text-slate-700">Tudo calmo por aqui!</p>
          <p className="text-xs mt-1 max-w-xs">Você não possui escalas pendentes ou confirmadas para os próximos cultos.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {mySchedules.map(plan => {
            const myPos = plan.neededPositions?.find(pos => pos.userId === user.uid);
            if (!myPos) return null;

            return (
              <Card key={plan.id} className="border shadow-sm bg-white overflow-hidden">
                <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black uppercase text-slate-500 tracking-wider">
                        {plan.date ? format(parseISO(plan.date), "dd 'de' MMMM (EEE)", { locale: ptBR }) : 'Sem data'}
                      </span>
                      <Badge variant="outline" className="text-xs capitalize font-black bg-primary/5 text-primary border-primary/20">
                        {myPos.role}
                      </Badge>
                      {myPos.status === 'accepted' && <Badge className="bg-emerald-500 hover:bg-emerald-600 font-bold text-xs"><CheckCircle2 className="size-3 mr-1" /> Confirmado</Badge>}
                      {myPos.status === 'declined' && <Badge variant="destructive" className="font-bold text-xs"><XCircle className="size-3 mr-1" /> Indisponível</Badge>}
                      {myPos.status === 'sent' && <Badge variant="secondary" className="font-bold text-xs">Pendente</Badge>}
                    </div>
                    <h4 className="font-black text-base text-slate-800">{plan.title}</h4>
                  </div>

                  <div className="flex items-center gap-2">
                    {myPos.status === 'sent' && (
                      <>
                        <Button
                          size="sm"
                          className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => handleResponse(plan.id, myPos.id, 'accepted')}
                        >
                          Confirmar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => handleResponse(plan.id, myPos.id, 'declined')}
                        >
                          Recusar
                        </Button>
                      </>
                    )}
                    {myPos.status === 'accepted' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => handleResponse(plan.id, myPos.id, 'declined')}
                      >
                        Cancelar Presença
                      </Button>
                    )}
                    {myPos.status === 'declined' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                        onClick={() => handleResponse(plan.id, myPos.id, 'accepted')}
                      >
                        Confirmar Agora
                      </Button>
                    )}
                  </div>
                </div>

                {/* Music resources access area for accepted volunteers */}
                {myPos.status === 'accepted' && plan.items.filter(i => i.type === 'song').length > 0 && (
                  <div className="bg-slate-50/50 border-t p-4 space-y-3">
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Acesso rápido a Cifras e Áudios do Culto</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {plan.items.filter(i => i.type === 'song').map(song => (
                        <div key={song.id} className="p-2.5 rounded-lg border bg-white flex items-center justify-between text-xs font-semibold">
                          <div>
                            <span className="text-slate-800 font-bold block">{song.title}</span>
                            <span className="text-[10px] text-slate-400 block font-medium">Tom: {song.key || '-'} · BPM: {song.bpm || '-'} · {song.arrangement || 'Arranjo padrão'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {song.attachments && song.attachments.length > 0 ? (
                              song.attachments.map((att, idx) => (
                                <Button key={idx} variant="ghost" size="icon" className="h-7 w-7 text-primary hover:bg-primary/10" asChild>
                                  <a href={att.url} target="_blank" rel="noreferrer" title={att.name}>
                                    {att.type === 'pdf' ? <FileText className="size-3.5" /> : att.type === 'mp3' ? <AudioLines className="size-3.5" /> : <Video className="size-3.5" />}
                                  </a>
                                </Button>
                              ))
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">Sem anexos</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Songs Library (Library Management) ──────────────────────────────────────────

function SongsLibrary() {
  const { librarySongs, createLibrarySong, updateLibrarySong, deleteLibrarySong } = useWorship();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ title: '', artist: '', key: '', bpm: '' });

  // New editing states
  const [editingSong, setEditingSong] = useState<LibrarySong | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [attachments, setAttachments] = useState<SongAttachment[]>([]);

  // Auxiliary states for adding attachments
  const [newAttName, setNewAttName] = useState('');
  const [newAttUrl, setNewAttUrl] = useState('');
  const [newAttType, setNewAttType] = useState<'pdf' | 'mp3' | 'link'>('pdf');

  const resetForm = () => {
    setForm({ title: '', artist: '', key: '', bpm: '' });
    setEditingSong(null);
    setYoutubeUrl('');
    setNotes('');
    setAttachments([]);
    setNewAttName('');
    setNewAttUrl('');
    setNewAttType('pdf');
  };

  const handleSave = async () => {
    if (!form.title) return;
    try {
      if (editingSong) {
        await updateLibrarySong(editingSong.id, {
          title: form.title,
          artist: form.artist || "",
          key: form.key || "",
          bpm: form.bpm ? parseInt(form.bpm) : undefined,
          youtubeUrl: youtubeUrl || "",
          notes: notes || "",
          attachments,
        });
        toast({ title: 'Música atualizada! 🎶' });
      } else {
        await createLibrarySong({
          title: form.title,
          artist: form.artist || undefined,
          key: form.key || undefined,
          bpm: form.bpm ? parseInt(form.bpm) : undefined,
          youtubeUrl: youtubeUrl || undefined,
          notes: notes || undefined,
          attachments: attachments.length > 0 ? attachments : [],
        });
        toast({ title: 'Música adicionada à Biblioteca! 🎶' });
      }
      setCreateOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro ao salvar música.', variant: 'destructive' });
    }
  };

  const addAttachment = () => {
    const name = newAttName.trim() || 'Novo Anexo';
    let url = newAttUrl.trim();
    if (!url) {
      url = newAttType === 'pdf'
        ? 'https://example.com/sheet.pdf'
        : newAttType === 'mp3'
          ? 'https://example.com/audio.mp3'
          : 'https://example.com';
    }

    const newAtt: SongAttachment = { name, url, type: newAttType };
    setAttachments([...attachments, newAtt]);
    setNewAttName('');
    setNewAttUrl('');
  };

  const removeAttachment = (idx: number) => {
    setAttachments(attachments.filter((_, i) => i !== idx));
  };

  const filtered = useMemo(() => {
    return librarySongs.filter(s => 
      s.title.toLowerCase().includes(search.toLowerCase()) || 
      (s.artist && s.artist.toLowerCase().includes(search.toLowerCase()))
    );
  }, [librarySongs, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Biblioteca de Músicas</h3>
          <p className="text-sm text-muted-foreground">Acervo compartilhado de tons, cifras e BPMs padrões.</p>
        </div>
        <Button size="sm" onClick={() => { resetForm(); setCreateOpen(true); }} className="w-fit self-end">
          <PlusCircle className="mr-2 h-4 w-4" /> Cadastrar Música
        </Button>
      </div>

      <div className="max-w-md">
        <Input 
          placeholder="Pesquisar por título ou artista..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="h-9 text-sm"
        />
      </div>

      {filtered.length === 0 ? (
        <Card className="border border-dashed py-12 flex flex-col items-center justify-center text-center text-slate-500">
          <Music className="h-10 w-10 text-slate-300 mb-3" />
          <p className="font-semibold text-slate-700">Nenhuma música encontrada</p>
          <p className="text-xs mt-1 max-w-xs">Use o botão cadastrar música para começar a alimentar o acervo geral.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(song => (
            <Card key={song.id} className="border shadow-sm hover:border-primary/30 transition-all bg-white relative group">
              <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-800 leading-tight">{song.title}</CardTitle>
                  <CardDescription className="text-xs font-semibold text-slate-400 mt-0.5">{song.artist || 'Sem artista'}</CardDescription>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-auto shrink-0">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 text-slate-500 hover:text-slate-700" 
                    onClick={() => {
                      setEditingSong(song);
                      setForm({
                        title: song.title || '',
                        artist: song.artist || '',
                        key: song.key || '',
                        bpm: song.bpm ? song.bpm.toString() : '',
                      });
                      setYoutubeUrl(song.youtubeUrl || '');
                      setNotes(song.notes || '');
                      setAttachments(song.attachments || []);
                      setCreateOpen(true);
                    }}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 text-red-500 hover:text-red-700" 
                    onClick={() => deleteLibrarySong(song.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Tom: {song.key || 'N/A'}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-50 text-slate-600 border border-slate-200 font-mono">
                    BPM: {song.bpm || 'N/A'}
                  </span>
                </div>

                {/* Histórico de execuções */}
                <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 space-y-1">
                  <div className="font-bold text-slate-700">
                    {song.playCount && song.playCount > 0 ? (
                      <span>Tocada {song.playCount} {song.playCount === 1 ? 'vez' : 'vezes'}</span>
                    ) : (
                      <span className="text-amber-600 font-medium">Inédita / Nunca executada</span>
                    )}
                  </div>
                  {song.playCount && song.playCount > 0 && song.lastPlayedDate && (
                    <div className="text-slate-400">
                      Última vez: {song.lastPlayedDate.split('-').reverse().join('/')} {song.lastPlayedPlanTitle ? `(${song.lastPlayedPlanTitle})` : ''}
                    </div>
                  )}
                </div>

                {/* Actions: Inserir VS, Oiko Live VS, Youtube */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-100">
                  {song.vsId ? (
                    <Link
                      href={`/dashboard/vs/${song.vsId}`}
                      target="_blank"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-300 text-[10px] font-black text-emerald-800 hover:bg-emerald-100 transition-all shadow-xs"
                    >
                      <Sliders className="h-3 w-3 text-emerald-600 animate-pulse" />
                      <span>Abrir VS Player</span>
                    </Link>
                  ) : (
                    <Link
                      href={`/dashboard/vs/upload?songId=${song.id}&title=${encodeURIComponent(song.title)}&artist=${encodeURIComponent(song.artist || '')}&key=${encodeURIComponent(song.key || '')}&bpm=${song.bpm || ''}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-50 border border-violet-200 text-[10px] font-bold text-violet-700 hover:bg-violet-100 hover:border-violet-300 transition-all"
                    >
                      <Upload className="h-3 w-3 text-violet-600" />
                      <span>Inserir VS na Música</span>
                    </Link>
                  )}

                  {song.youtubeUrl && (
                    <a
                      href={song.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-50 border border-red-200 text-[10px] font-semibold text-red-650 hover:bg-red-100 transition-colors"
                    >
                      <Youtube className="h-3.5 w-3.5 text-red-600" />
                      <span>YouTube</span>
                    </a>
                  )}
                </div>

                {/* Attachments */}
                {song.attachments && song.attachments.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {song.attachments.map((att, idx) => (
                      <a
                        key={idx}
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-50 border border-slate-200 text-[10px] text-slate-650 hover:text-primary hover:border-primary/20 transition-colors"
                        title={att.name}
                      >
                        {att.type === 'pdf' && <FileText className="h-3 w-3 text-red-500" />}
                        {att.type === 'mp3' && <AudioLines className="h-3 w-3 text-blue-500" />}
                        {att.type === 'link' && <ExternalLink className="h-3 w-3 text-emerald-500" />}
                        <span className="truncate max-w-[85px]">{att.name}</span>
                      </a>
                    ))}
                  </div>
                )}

                {/* Notes */}
                {song.notes && (
                  <blockquote className="border-l-2 border-slate-300 pl-2 py-0.5 text-xs text-slate-500 italic">
                    {song.notes}
                  </blockquote>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Register/Edit dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => {
        setCreateOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSong ? 'Editar Música' : 'Cadastrar Música no Acervo'}</DialogTitle>
            <DialogDescription>
              {editingSong 
                ? 'Atualize as informações da música no acervo global.' 
                : 'A música ficará salva globalmente para reutilização em qualquer plano.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                placeholder="Ex: Hosana"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Artista / Arranjo</Label>
              <Input
                placeholder="Ex: Hillsong Worship"
                value={form.artist}
                onChange={e => setForm(f => ({ ...f, artist: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tom Padrão</Label>
                <Input placeholder="Ex: G" value={form.key} onChange={e => setForm(f => ({ ...f, key: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>BPM Padrão</Label>
                <Input type="number" placeholder="78" value={form.bpm} onChange={e => setForm(f => ({ ...f, bpm: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Link do YouTube</Label>
              <Input
                placeholder="Ex: https://youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={e => setYoutubeUrl(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Comentários / Observações</Label>
              <Textarea
                placeholder="Insira notas de arranjo, dinâmicas ou outras observações..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            {/* Attachments management */}
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <Label>Anexos</Label>
              {attachments.length > 0 ? (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {attachments.map((att, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs">
                      <div className="flex items-center gap-1.5 truncate">
                        {att.type === 'pdf' && <span className="text-red-500 font-bold text-[9px] bg-red-50 px-1 py-0.5 rounded border border-red-200">PDF</span>}
                        {att.type === 'mp3' && <span className="text-blue-500 font-bold text-[9px] bg-blue-50 px-1 py-0.5 rounded border border-blue-200">MP3</span>}
                        {att.type === 'link' && <span className="text-emerald-500 font-bold text-[9px] bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200">LINK</span>}
                        <span className="truncate font-medium text-slate-700">{att.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAttachment(idx)}
                        className="text-slate-450 hover:text-red-500 shrink-0 ml-2"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Nenhum anexo adicionado.</p>
              )}

              {/* Add new attachment form */}
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex flex-col gap-2 mt-2">
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Nome do anexo"
                    value={newAttName}
                    onChange={e => setNewAttName(e.target.value)}
                    className="text-xs h-8 bg-white"
                  />
                  <select
                    value={newAttType}
                    onChange={e => setNewAttType(e.target.value as any)}
                    className="text-xs border border-slate-200 rounded px-2 h-8 bg-white focus:outline-none focus:ring-1 focus:ring-primary/20"
                  >
                    <option value="pdf">PDF (Cifra/Partitura)</option>
                    <option value="mp3">MP3 (Áudio/Ensaio)</option>
                    <option value="link">Link Externo</option>
                  </select>
                </div>
                <Input
                  placeholder="URL do arquivo (opcional)"
                  value={newAttUrl}
                  onChange={e => setNewAttUrl(e.target.value)}
                  className="text-xs h-8 bg-white"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs self-end gap-1.5"
                  onClick={addAttachment}
                >
                  <Plus className="h-3.5 w-3.5" /> Adicionar Anexo
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); resetForm(); }}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.title}>{editingSong ? 'Salvar Alterações' : 'Adicionar Música'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

function WorshipPageContent() {
  const router = useRouter();
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pt-16">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <ListMusic className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Ordem de Culto</h2>
          <p className="text-sm text-slate-500">Planejamento litúrgico detalhado para cada culto, minuto a minuto.</p>
        </div>
      </div>

      <Tabs defaultValue="plans">
        <TabsList>
          <TabsTrigger value="plans" className="gap-2">
            <Calendar className="h-4 w-4" /> Planos
          </TabsTrigger>
          <TabsTrigger value="my-schedule" className="gap-2">
            <CalendarCheck className="h-4 w-4" /> Minha Escala
          </TabsTrigger>
          <TabsTrigger value="songs" className="gap-2">
            <Music className="h-4 w-4" /> Biblioteca
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <LayoutTemplate className="h-4 w-4" /> Templates
          </TabsTrigger>
          <TabsTrigger value="matrix" className="gap-2" onClick={() => router.push('/dashboard/volunteering/worship/matrix')}>
            <Grid3X3 className="h-4 w-4" /> Matrix de Escalas
          </TabsTrigger>
        </TabsList>
        <TabsContent value="plans" className="mt-6">
          <PlansList />
        </TabsContent>
        <TabsContent value="my-schedule" className="mt-6">
          <MySchedule />
        </TabsContent>
        <TabsContent value="songs" className="mt-6">
          <SongsLibrary />
        </TabsContent>
        <TabsContent value="templates" className="mt-6">
          <TemplateManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function WorshipPage() {
  return (
    <WorshipProvider>
      <WorshipPageContent />
    </WorshipProvider>
  );
}
