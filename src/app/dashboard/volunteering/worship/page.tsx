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
  AudioLines
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEventsData, useMembersData } from '@/hooks/useDomainData';
import { useFirebase } from '@/firebase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// ─── Plans list ───────────────────────────────────────────────────────────────

function PlansList() {
  const router = useRouter();
  const { plans, isLoading, createPlan, deletePlan } = useWorship();
  const { events } = useEventsData();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ title: '', date: '', startTime: '09:00', serviceEventId: '' });

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

  const handleDelete = async (plan: WorshipPlan) => {
    await deletePlan(plan.id);
    toast({ title: 'Plano excluído.' });
  };

  const grouped = plans.reduce<Record<string, WorshipPlan[]>>((acc, plan) => {
    const key = plan.date ? plan.date.slice(0, 7) : 'sem-data';
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

      {plans.length === 0 ? (
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
            const monthLabel = month !== 'sem-data'
              ? format(parseISO(`${month}-01`), 'MMMM yyyy', { locale: ptBR })
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
                        className="flex items-center gap-4 px-4 py-3 bg-white border border-slate-200 rounded-xl hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer group"
                        onClick={() => router.push(`/dashboard/volunteering/worship/${plan.id}`)}
                      >
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex flex-col items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-primary uppercase">
                            {plan.date ? format(parseISO(plan.date), 'MMM', { locale: ptBR }) : '--'}
                          </span>
                          <span className="text-lg font-black text-primary leading-none">
                            {plan.date ? format(parseISO(plan.date), 'd') : '--'}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-slate-800 truncate">{plan.title}</p>
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

                        <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-primary transition-colors shrink-0" />

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
                            <DropdownMenuItem className="text-destructive" onClick={e => { e.stopPropagation(); handleDelete(plan); }}>
                              <Trash2 className="mr-2 h-4 w-4" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
  const { librarySongs, createLibrarySong, deleteLibrarySong } = useWorship();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ title: '', artist: '', key: '', bpm: '' });

  const handleCreate = async () => {
    if (!form.title) return;
    await createLibrarySong({
      title: form.title,
      artist: form.artist || undefined,
      key: form.key || undefined,
      bpm: form.bpm ? parseInt(form.bpm) : undefined,
      attachments: []
    });
    toast({ title: 'Música adicionada à Biblioteca! 🎶' });
    setCreateOpen(false);
    setForm({ title: '', artist: '', key: '', bpm: '' });
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
        <Button size="sm" onClick={() => setCreateOpen(true)} className="w-fit self-end">
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
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" 
                  onClick={() => deleteLibrarySong(song.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Tom: {song.key || 'N/A'}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-50 text-slate-600 border border-slate-200 font-mono">
                    BPM: {song.bpm || 'N/A'}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Register dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cadastrar Música no Acervo</DialogTitle>
            <DialogDescription>A música ficará salva globalmente para reutilização em qualquer plano.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!form.title}>Adicionar Música</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

function WorshipPageContent() {
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
