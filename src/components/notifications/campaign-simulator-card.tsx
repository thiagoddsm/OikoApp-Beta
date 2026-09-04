'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { 
  ShieldCheck, AlertTriangle, Sparkles, Calendar, Clock, 
  Users, CheckCircle2, ChevronRight, AlertOctagon, Send, Lock
} from 'lucide-react';
import { CampaignHealthAnalysis } from '@/domain/campaign-health/services/campaign-health-service';
import { Recommendation } from '@/domain/campaign-health/entities/recommendation';

interface CampaignSimulatorCardProps {
  analysis: CampaignHealthAnalysis;
  onApplyRecommendations: () => void;
  onConfirmSend: () => void;
  isSending: boolean;
}

export function CampaignSimulatorCard({
  analysis,
  onApplyRecommendations,
  onConfirmSend,
  isSending
}: CampaignSimulatorCardProps) {
  const [openOverrideDialog, setOpenOverrideDialog] = useState(false);

  const { risk, plan, health } = analysis;
  const isCriticalRisk = risk.level === 'CRITICAL';

  const getRiskBadgeColor = (level: string) => {
    switch (level) {
      case 'LOW': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30';
      case 'MEDIUM': return 'bg-amber-500/10 text-amber-600 border-amber-500/30';
      case 'HIGH': return 'bg-orange-500/10 text-orange-600 border-orange-500/30';
      default: return 'bg-red-500/10 text-red-600 border-red-500/30';
    }
  };

  const handleMainActionButtonClick = () => {
    if (isCriticalRisk) {
      // Se for Risco Crítico, oferece a aplicação de recomendações como ação primária
      onApplyRecommendations();
    } else {
      onConfirmSend();
    }
  };

  return (
    <>
      <Card className="border-2 shadow-md bg-white dark:bg-slate-900 overflow-hidden">
        <CardHeader className="py-4 px-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex flex-row items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="size-5 text-emerald-400" />
            <div>
              <CardTitle className="text-sm font-black uppercase tracking-wider text-white">
                Diagnóstico do Assistente Inteligente
              </CardTitle>
              <CardDescription className="text-[10px] text-slate-300">
                Simulação em tempo real de risco operacional e cronograma gradual
              </CardDescription>
            </div>
          </div>

          <Badge variant="outline" className={getRiskBadgeColor(risk.level)}>
            <span className="font-extrabold text-xs">Risco {risk.label.toUpperCase()}</span>
            <span className="ml-1 text-[10px]">({risk.score}/100)</span>
          </Badge>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Métricas Principais da Campanha */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 rounded-lg border bg-slate-50 dark:bg-slate-800/50">
              <div className="text-[10px] font-bold text-muted-foreground uppercase">Destinatários</div>
              <div className="text-base font-black text-slate-900 dark:text-white mt-0.5">{plan.totalRecipients}</div>
            </div>
            <div className="p-3 rounded-lg border bg-slate-50 dark:bg-slate-800/50">
              <div className="text-[10px] font-bold text-muted-foreground uppercase">Contatos Novos</div>
              <div className="text-base font-black text-amber-600 mt-0.5">{Math.round(risk.newChatsRatio * 100)}%</div>
            </div>
            <div className="p-3 rounded-lg border bg-slate-50 dark:bg-slate-800/50">
              <div className="text-[10px] font-bold text-muted-foreground uppercase">Similaridade</div>
              <div className="text-base font-black text-blue-600 mt-0.5">{risk.similarityIndex}%</div>
            </div>
            <div className="p-3 rounded-lg border bg-slate-50 dark:bg-slate-800/50">
              <div className="text-[10px] font-bold text-muted-foreground uppercase">Saúde da Conta</div>
              <div className="text-base font-black text-emerald-600 mt-0.5">{health.score}/100</div>
            </div>
          </div>

          {/* Recomendações Estruturadas (se existirem) */}
          {risk.recommendations.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="size-4 text-primary" /> Recomendações do Assistente
                </span>
                
                <Button
                  type="button"
                  size="sm"
                  variant="default"
                  className="h-7 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm"
                  onClick={onApplyRecommendations}
                >
                  <Sparkles className="size-3.5" /> Aplicar Recomendações
                </Button>
              </div>

              <div className="space-y-2">
                {risk.recommendations.map((rec) => (
                  <div key={rec.id} className="p-3 rounded-lg border bg-amber-500/5 border-amber-500/20 flex items-start gap-3 text-xs">
                    <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">{rec.title}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{rec.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cronograma Diário e Previsão de Conclusão */}
          <div className="p-4 rounded-xl border bg-slate-50 dark:bg-slate-800/40 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
              <div className="flex items-center gap-2">
                <Calendar className="size-4 text-primary" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Cronograma Recomendado ({plan.totalDays} Lote/s)
                </span>
              </div>
              <div className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <Clock className="size-3.5 text-primary" /> Previsão de Término: <strong className="text-slate-900 dark:text-white">{plan.estimatedCompletionLabel}</strong>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              {plan.batches.map((batch) => (
                <div key={batch.dayIndex} className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border text-center text-xs">
                  <div className="font-bold text-slate-700 dark:text-slate-300">{batch.dateLabel}</div>
                  <div className="text-base font-black text-primary mt-0.5">{batch.recipientCount} msgs</div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>

        <CardFooter className="py-4 px-6 bg-slate-50 dark:bg-slate-900 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
          {isCriticalRisk ? (
            <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="text-xs text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1.5">
                <AlertOctagon className="size-4 text-amber-600 shrink-0" />
                <span>Risco Crítico detectado. Recomendamos ajustar os parâmetros antes do envio.</span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  type="button"
                  size="default"
                  variant="default"
                  className="w-full sm:w-auto font-bold bg-amber-600 hover:bg-amber-700 text-white gap-2"
                  onClick={onApplyRecommendations}
                >
                  <Sparkles className="size-4" /> ⚠️ Ajustar Campanha
                </Button>

                <Button
                  type="button"
                  size="default"
                  variant="outline"
                  className="w-full sm:w-auto text-xs text-muted-foreground hover:text-slate-900"
                  onClick={() => setOpenOverrideDialog(true)}
                >
                  Enviar sem Ajustes...
                </Button>
              </div>
            </div>
          ) : (
            <div className="w-full flex items-center justify-between">
              <span className="text-xs text-emerald-600 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="size-4" /> Campanha em nível seguro para disparo.
              </span>

              <Button
                type="button"
                size="default"
                variant="default"
                className="font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                onClick={onConfirmSend}
                disabled={isSending}
              >
                <Send className="size-4" /> Iniciar Disparo
              </Button>
            </div>
          )}
        </CardFooter>
      </Card>

      {/* Dialog de Confirmação Reforçada (Override Emergencial) */}
      <Dialog open={openOverrideDialog} onOpenChange={setOpenOverrideDialog}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 font-black">
              <AlertOctagon className="size-5" /> Confirmação Reforçada de Envio Especial
            </DialogTitle>
            <DialogDescription className="text-xs pt-2">
              Você está prestes a realizar um disparo com <strong>Risco Crítico ({risk.score}/100)</strong> ignorando as recomendações do Assistente Inteligente.
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-800 dark:text-red-300 space-y-1">
            <strong>Consequências Potenciais:</strong>
            <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
              <li>Aumento significativo da probabilidade de restrição temporária do número.</li>
              <li>Declínio na pontuação de Saúde da Conta no sistema.</li>
            </ul>
          </div>

          <DialogFooter className="pt-3 gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpenOverrideDialog(false)}>
              Voltar e Ajustar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="font-bold"
              onClick={() => {
                setOpenOverrideDialog(false);
                onConfirmSend();
              }}
            >
              Confirmar Envio com Ciência de Risco
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
