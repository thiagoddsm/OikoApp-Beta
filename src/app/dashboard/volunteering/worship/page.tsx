'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { WorshipProvider, useWorship, WorshipPlan } from '@/contexts/worship-context';
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
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEventsData } from '@/hooks/useDomainData';
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

  // Group plans by month
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
                    const dateLabel = plan.date ? format(parseISO(plan.date), "d 'de' MMMM (EEE)", { locale: ptBR }) : 'Sem data';

                    return (
                      <div
                        key={plan.id}
                        className="flex items-center gap-4 px-4 py-3 bg-white border border-slate-200 rounded-xl hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer group"
                        onClick={() => router.push(`/dashboard/volunteering/worship/${plan.id}`)}
                      >
                        {/* Date badge */}
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex flex-col items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-primary uppercase">
                            {plan.date ? format(parseISO(plan.date), 'MMM', { locale: ptBR }) : '--'}
                          </span>
                          <span className="text-lg font-black text-primary leading-none">
                            {plan.date ? format(parseISO(plan.date), 'd') : '--'}
                          </span>
                        </div>

                        {/* Info */}
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

      {/* Create dialog */}
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

// ─── Main page ────────────────────────────────────────────────────────────────

function WorshipPageContent() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
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
          <TabsTrigger value="templates" className="gap-2">
            <LayoutTemplate className="h-4 w-4" /> Templates
          </TabsTrigger>
        </TabsList>
        <TabsContent value="plans" className="mt-6">
          <PlansList />
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
