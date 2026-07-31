'use client';

import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ShieldCheck, AlertTriangle, Activity, TrendingUp, Info, CheckCircle2, History, ChevronRight } from 'lucide-react';
import { AccountHealth } from '@/domain/campaign-health/entities/account-health';
import { generateSampleTimeline } from '@/domain/campaign-health/history/health-timeline';
import { PolicyMode } from '@/domain/campaign-health/policies/campaign-policy';

interface AccountHealthHeaderProps {
  health: AccountHealth;
  policyMode: PolicyMode;
  onPolicyModeChange: (mode: PolicyMode) => void;
}

export function AccountHealthHeader({ health, policyMode, onPolicyModeChange }: AccountHealthHeaderProps) {
  const [openModal, setOpenModal] = useState(false);
  const timeline = generateSampleTimeline(health.score);

  const getBadgeStyle = (tier: string) => {
    switch (tier) {
      case 'excellent': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20';
      case 'good': return 'bg-green-500/10 text-green-600 border-green-500/30 hover:bg-green-500/20';
      case 'warning': return 'bg-amber-500/10 text-amber-600 border-amber-500/30 hover:bg-amber-500/20';
      case 'high_risk': return 'bg-orange-500/10 text-orange-600 border-orange-500/30 hover:bg-orange-500/20';
      default: return 'bg-red-500/10 text-red-600 border-red-500/30 hover:bg-red-500/20';
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpenModal(true)}
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-full border bg-white dark:bg-slate-900 shadow-sm hover:shadow transition-all group text-left cursor-pointer"
      >
        <div className="flex items-center gap-1.5">
          <Activity className="size-4 text-primary animate-pulse" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Central de Saúde:</span>
        </div>

        <Badge variant="outline" className={getBadgeStyle(health.tier)}>
          <span className="font-extrabold">{health.score}/100</span>
          <span className="mx-1">•</span>
          <span>{health.label}</span>
        </Badge>

        <span className="text-[10px] text-muted-foreground font-medium flex items-center group-hover:text-primary transition-colors">
          Detalhes <ChevronRight className="size-3 ml-0.5" />
        </span>
      </button>

      {/* Modal de Detalhamento da Saúde da Conta */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">
              <ShieldCheck className="size-6 text-primary" /> Central de Saúde das Campanhas
            </DialogTitle>
            <DialogDescription className="text-xs">
              Diagnóstico operacional de reputação da conta no WhatsApp e histórico de desempenho.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 pt-2">
            {/* Header com Score Principal */}
            <div className="p-4 rounded-xl border bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-900 dark:to-slate-800/50 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="size-16 rounded-2xl bg-white dark:bg-slate-800 shadow-md border flex flex-col items-center justify-center">
                  <span className="text-2xl font-black text-primary">{health.score}</span>
                  <span className="text-[9px] font-bold text-muted-foreground uppercase">Score</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">{health.label}</h3>
                    <Badge variant="outline" className={getBadgeStyle(health.tier)}>{health.tier.toUpperCase()}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {health.history.daysSinceLastRestriction > 90 
                      ? `🟢 Operação estável há ${health.history.daysSinceLastRestriction} dias.` 
                      : `⚠️ Restrição registrada nos últimos meses.`}
                  </p>
                </div>
              </div>

              {/* Seletor de Modo de Envio */}
              <div className="w-full sm:w-auto bg-white dark:bg-slate-800 p-2.5 rounded-lg border shadow-xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Modo de Operação Padrão:
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant={policyMode === 'normal' ? 'default' : 'ghost'}
                    className="h-7 text-xs px-2.5"
                    onClick={() => onPolicyModeChange('normal')}
                  >
                    Normal
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={policyMode === 'conservative' ? 'default' : 'ghost'}
                    className="h-7 text-xs px-2.5 font-bold"
                    onClick={() => onPolicyModeChange('conservative')}
                  >
                    ● Conservador
                  </Button>
                </div>
              </div>
            </div>

            {/* Detalhamento Explicável (Breakdown de Pontos) */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Info className="size-4 text-primary" /> Fatores de Composição do Score
              </h4>
              <div className="grid grid-cols-1 gap-2">
                {health.breakdown.map((item) => (
                  <div key={item.id} className="p-3 rounded-lg border bg-white dark:bg-slate-900 flex items-start justify-between gap-3 text-xs">
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">{item.title}</div>
                      {item.description && <div className="text-[11px] text-muted-foreground mt-0.5">{item.description}</div>}
                    </div>
                    <Badge variant={item.points > 0 ? 'secondary' : 'destructive'} className="font-black text-xs shrink-0">
                      {item.points > 0 ? `+${item.points}` : item.points} pts
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Linha do Tempo Mensal (Histórico em 30-90 dias) */}
            <div className="space-y-3 pt-2 border-t">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <TrendingUp className="size-4 text-emerald-500" /> Tendência de Saúde (Últimos Meses)
              </h4>
              <div className="grid grid-cols-5 gap-2">
                {timeline.records.map((rec) => (
                  <div key={rec.monthLabel} className="p-2.5 rounded-lg border bg-slate-50 dark:bg-slate-800/40 text-center">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase">{rec.monthLabel}</div>
                    <div className="text-sm font-black text-slate-900 dark:text-white mt-1">{rec.score} pts</div>
                    <div className="text-[9px] text-emerald-600 font-medium mt-0.5">{rec.campaignsCount} camp.</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rodapé Informativo */}
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2">
              <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Orientação do Oiko:</strong> O assistente calcula continuamente a reputação do número para garantir entregas com taxa máxima de conversão.
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
