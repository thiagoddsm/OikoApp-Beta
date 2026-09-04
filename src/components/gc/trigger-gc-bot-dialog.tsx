'use client';

import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { triggerGcReportsBatch } from '@/app/actions/whatsapp-actions';
import { useToast } from '@/hooks/use-toast';
import { Bot, Loader2, Send, CheckCircle2, AlertCircle, ShieldAlert, Sparkles, Layers, MapPin, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Rede = { id: string; nome: string };
type Area = { id: string; nome: string; redeId?: string };
type Cell = { id: string; nome?: string; name?: string; status?: string; redeId?: string; areaId?: string };

interface TriggerGcBotDialogProps {
  buttonVariant?: 'default' | 'outline' | 'secondary' | 'ghost';
  buttonSize?: 'default' | 'sm' | 'lg' | 'icon';
  buttonText?: string;
  className?: string;
  defaultRedeId?: string;
  defaultAreaId?: string;
  defaultCellId?: string;
}

export function TriggerGcBotDialog({
  buttonVariant = 'default',
  buttonSize = 'default',
  buttonText = 'Disparar Bot do GC',
  className,
  defaultRedeId,
  defaultAreaId,
  defaultCellId,
}: TriggerGcBotDialogProps) {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<'all' | 'rede' | 'area' | 'cell'>(
    defaultCellId ? 'cell' : defaultAreaId ? 'area' : defaultRedeId ? 'rede' : 'all'
  );

  const [selectedRedeId, setSelectedRedeId] = useState<string>(defaultRedeId || '');
  const [selectedAreaId, setSelectedAreaId] = useState<string>(defaultAreaId || '');
  const [selectedCellId, setSelectedCellId] = useState<string>(defaultCellId || '');

  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<any>(null);

  const { firestore } = useFirebase();
  const { toast } = useToast();

  const redesQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'redes')) : null), [firestore]);
  const areasQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'areas')) : null), [firestore]);
  const cellsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'cells')) : null), [firestore]);

  const { data: redes } = useCollection<Rede>(redesQuery);
  const { data: areas } = useCollection<Area>(areasQuery);
  const { data: cells } = useCollection<Cell>(cellsQuery);

  const filteredAreas = useMemo(() => {
    if (!areas) return [];
    if (!selectedRedeId) return areas;
    return areas.filter((a) => a.redeId === selectedRedeId);
  }, [areas, selectedRedeId]);

  const filteredCells = useMemo(() => {
    if (!cells) return [];
    return cells.filter((c) => {
      const isAtv = c.status === 'active' || c.status === 'growing' || !c.status;
      if (!isAtv) return false;

      if (scope === 'rede' && selectedRedeId && c.redeId !== selectedRedeId) return false;
      if (scope === 'area' && selectedAreaId && c.areaId !== selectedAreaId) return false;
      if (scope === 'cell' && selectedCellId && c.id !== selectedCellId) return false;
      return true;
    });
  }, [cells, scope, selectedRedeId, selectedAreaId, selectedCellId]);

  const handleSendBatch = async () => {
    if (scope === 'rede' && !selectedRedeId) {
      toast({ variant: 'destructive', title: 'Selecione uma Rede' });
      return;
    }
    if (scope === 'area' && !selectedAreaId) {
      toast({ variant: 'destructive', title: 'Selecione uma Área' });
      return;
    }
    if (scope === 'cell' && !selectedCellId) {
      toast({ variant: 'destructive', title: 'Selecione um GC' });
      return;
    }

    setIsSending(true);
    setResult(null);

    try {
      const res = await triggerGcReportsBatch({
        scope,
        redeId: selectedRedeId || undefined,
        areaId: selectedAreaId || undefined,
        cellId: selectedCellId || undefined,
      });

      if (!res.success) {
        toast({
          variant: 'destructive',
          title: 'Erro ao disparar Bot',
          description: res.error || 'Não foi possível completar o envio.',
        });
      } else {
        setResult(res);
        toast({
          title: '🚀 Bot do GC Disparado!',
          description: `${res.triggeredCount} mensagem(ns) enviada(s) com sucesso para os líderes de GC no WhatsApp.`,
        });
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Falha no disparo',
        description: err.message || 'Erro ao comunicar com o servidor do WhatsApp.',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={buttonVariant} size={buttonSize} className={cn('gap-2 font-bold shadow-sm', className)}>
          <Bot className="size-4 text-emerald-500 animate-pulse" />
          {buttonText}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="size-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
              <Bot className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black tracking-tight">Disparar Bot do GC via WhatsApp</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Envie o formulário de relatório da semana para os líderes por Rede, Área ou Geral.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Seletor de Escopo */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Escopo do Disparo</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setScope('all')}
                className={cn(
                  'p-3 rounded-xl border text-left text-xs font-bold transition-all flex items-center gap-2',
                  scope === 'all'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'border-border bg-card text-muted-foreground hover:bg-accent'
                )}
              >
                <Users className="size-4 shrink-0" />
                <span>Todos os GCs</span>
              </button>

              <button
                type="button"
                onClick={() => setScope('rede')}
                className={cn(
                  'p-3 rounded-xl border text-left text-xs font-bold transition-all flex items-center gap-2',
                  scope === 'rede'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'border-border bg-card text-muted-foreground hover:bg-accent'
                )}
              >
                <Layers className="size-4 shrink-0" />
                <span>Por Rede</span>
              </button>

              <button
                type="button"
                onClick={() => setScope('area')}
                className={cn(
                  'p-3 rounded-xl border text-left text-xs font-bold transition-all flex items-center gap-2',
                  scope === 'area'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'border-border bg-card text-muted-foreground hover:bg-accent'
                )}
              >
                <MapPin className="size-4 shrink-0" />
                <span>Por Área</span>
              </button>

              <button
                type="button"
                onClick={() => setScope('cell')}
                className={cn(
                  'p-3 rounded-xl border text-left text-xs font-bold transition-all flex items-center gap-2',
                  scope === 'cell'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'border-border bg-card text-muted-foreground hover:bg-accent'
                )}
              >
                <Sparkles className="size-4 shrink-0" />
                <span>GC Específico</span>
              </button>
            </div>
          </div>

          {/* Filtro da Rede */}
          {(scope === 'rede' || scope === 'area') && (
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Selecione a Rede</Label>
              <Select value={selectedRedeId} onValueChange={(val) => { setSelectedRedeId(val); setSelectedAreaId(''); }}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Escolha a Rede..." />
                </SelectTrigger>
                <SelectContent>
                  {(redes || []).map((r) => (
                    <SelectItem key={r.id} value={r.id} className="text-xs">
                      {r.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Filtro da Área */}
          {scope === 'area' && (
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Selecione a Área</Label>
              <Select value={selectedAreaId} onValueChange={setSelectedAreaId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Escolha a Área..." />
                </SelectTrigger>
                <SelectContent>
                  {filteredAreas.map((a) => (
                    <SelectItem key={a.id} value={a.id} className="text-xs">
                      {a.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Filtro do GC */}
          {scope === 'cell' && (
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Selecione o GC</Label>
              <Select value={selectedCellId} onValueChange={setSelectedCellId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Escolha a Célula..." />
                </SelectTrigger>
                <SelectContent>
                  {(cells || []).map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.nome || c.name || c.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Badge Resumo de Alvos */}
          <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border flex items-center justify-between text-xs font-bold">
            <span className="text-muted-foreground">GCs Ativos Selecionados:</span>
            <Badge variant="secondary" className="font-extrabold text-emerald-600 bg-emerald-100 dark:bg-emerald-950/60">
              {filteredCells.length} Célula(s)
            </Badge>
          </div>

          {/* Resultado do Envio */}
          {result && (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-2 text-xs">
              <div className="flex items-center gap-2 font-black text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-4 shrink-0" />
                <span>Disparo Concluído!</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                <div>✅ Enviados: <strong>{result.triggeredCount}</strong></div>
                <div>⏳ Em andamento: <strong>{result.alreadyRunningCount}</strong></div>
                <div>👤 Sem líder: <strong>{result.noLeaderCount}</strong></div>
                <div>📱 Sem WhatsApp: <strong>{result.noPhoneCount}</strong></div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={isSending}>
            Fechar
          </Button>
          <Button
            size="sm"
            onClick={handleSendBatch}
            disabled={isSending || filteredCells.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5"
          >
            {isSending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            {isSending ? 'Enviando no WhatsApp...' : 'Iniciar Disparo'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
