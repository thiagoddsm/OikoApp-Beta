import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Rocket, AlertTriangle, AlertCircle, Users } from 'lucide-react';

export type GcSymbologyData = {
  isReadyForMultiplication: boolean;
  readyConditions: {
    hasCoLider: boolean;
    hasEligibleHost: boolean;
    hasHighAttendance: boolean;
    hasMinMembers: boolean;
  };
  attentionReasons: string[];
  operationalAlerts: string[];
};

export function evaluateGcSymbology(cell: {
  coLideres?: any[];
  coLiderIds?: string[];
  anfitriaoElegiveiIds?: string[];
  anfitriaoId?: string;
  secretariaId?: string;
  secretarioId?: string;
  multiplicationDate?: string;
}, memberCount: number, attendanceRatePct: number): GcSymbologyData {
  const hasCoLider = (cell.coLideres?.length || 0) > 0 || (cell.coLiderIds?.length || 0) > 0;
  const hasEligibleHost = (cell.anfitriaoElegiveiIds?.length || 0) > 0 || !!cell.anfitriaoId;
  const hasHighAttendance = attendanceRatePct >= 50;
  const hasMinMembers = memberCount >= 12;

  const isReadyForMultiplication = hasCoLider && hasEligibleHost && hasHighAttendance && hasMinMembers;

  const attentionReasons: string[] = [];
  if (memberCount > 16) attentionReasons.push(`Número Elevado (${memberCount} membros)`);
  if (memberCount < 6) attentionReasons.push(`Número Reduzido (${memberCount} membros)`);
  if (attendanceRatePct < 50) attentionReasons.push(`Frequência Baixa (${attendanceRatePct.toFixed(0)}%)`);

  const operationalAlerts: string[] = [];
  if (!cell.secretariaId && !(cell as any).secretarioId) operationalAlerts.push('Sem Secretário(a)');
  if (!hasCoLider) operationalAlerts.push('Sem Líder em Treinamento');
  if (!cell.multiplicationDate) operationalAlerts.push('Sem Data de Multiplicação');

  return {
    isReadyForMultiplication,
    readyConditions: {
      hasCoLider,
      hasEligibleHost,
      hasHighAttendance,
      hasMinMembers
    },
    attentionReasons,
    operationalAlerts
  };
}

export function GcStatusBadges({ data }: { data: GcSymbologyData }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {/* 🚀 Pronto para Multiplicação */}
      {data.isReadyForMultiplication && (
        <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] gap-1 px-2.5 py-0.5 shadow-sm">
          <Rocket className="h-3 w-3 animate-pulse" />
          Pronto para Multiplicação
        </Badge>
      )}

      {/* ⚠️ Atenção (Tamanho / Frequência) */}
      {data.attentionReasons.map((reason, idx) => (
        <Badge key={idx} variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 font-bold text-[10px] gap-1 px-2 py-0.5">
          <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />
          {reason}
        </Badge>
      ))}

      {/* 🔔 Alertas Específicos */}
      {data.operationalAlerts.map((alert, idx) => (
        <Badge key={idx} variant="outline" className="bg-rose-50 text-rose-800 border-rose-200 font-bold text-[10px] gap-1 px-2 py-0.5">
          <AlertCircle className="h-3 w-3 text-rose-500 shrink-0" />
          {alert}
        </Badge>
      ))}
    </div>
  );
}

export function GcSupervisorLegendCard() {
  return (
    <div className="bg-card border rounded-xl p-4 space-y-4 shadow-sm">
      <div className="flex items-center justify-between border-b pb-2">
        <h4 className="text-sm font-black text-foreground flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          Simbologia &amp; Diagnóstico do Supervisor
        </h4>
        <span className="text-[11px] text-muted-foreground font-semibold">Indicadores Automáticos</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        {/* 1. Pronto para Multiplicação */}
        <div className="space-y-1.5 p-3 rounded-lg bg-emerald-50/60 border border-emerald-200/80">
          <div className="flex items-center gap-1.5 font-black text-emerald-900">
            <Rocket className="h-4 w-4 text-emerald-600" />
            <span>Pronto para Multiplicação</span>
          </div>
          <ul className="text-[11px] text-emerald-800 space-y-1 pl-4 list-disc font-medium">
            <li>Líder em Treinamento definido</li>
            <li>Anfitrião elegível cadastrado</li>
            <li>Frequência recente &ge; 50%</li>
            <li>GC com &ge; 12 membros</li>
          </ul>
        </div>

        {/* 2. Atenção */}
        <div className="space-y-1.5 p-3 rounded-lg bg-amber-50/60 border border-amber-200/80">
          <div className="flex items-center gap-1.5 font-black text-amber-900">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span>Pontos de Atenção</span>
          </div>
          <ul className="text-[11px] text-amber-800 space-y-1 pl-4 list-disc font-medium">
            <li>Tamanho elevado (&gt; 16 membros)</li>
            <li>Tamanho reduzido (&lt; 6 membros)</li>
            <li>Frequência baixa (&lt; 50%)</li>
          </ul>
        </div>

        {/* 3. Alertas Específicos */}
        <div className="space-y-1.5 p-3 rounded-lg bg-rose-50/60 border border-rose-200/80">
          <div className="flex items-center gap-1.5 font-black text-rose-900">
            <AlertCircle className="h-4 w-4 text-rose-600" />
            <span>Alertas Específicos</span>
          </div>
          <ul className="text-[11px] text-rose-800 space-y-1 pl-4 list-disc font-medium">
            <li>Sem Secretário(a) cadastrado(a)</li>
            <li>Sem Líder em Treinamento</li>
            <li>Sem data para multiplicação</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
