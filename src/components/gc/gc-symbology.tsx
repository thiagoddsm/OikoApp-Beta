import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Rocket, AlertTriangle, AlertCircle, Users, CircleDot } from 'lucide-react';

export type TrafficLightStatus = 'RED' | 'YELLOW' | 'GREEN';

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
  trafficLightStatus: TrafficLightStatus;
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

  let trafficLightStatus: TrafficLightStatus;
  if (!hasCoLider) {
    trafficLightStatus = 'RED';
  } else if (!hasMinMembers) {
    trafficLightStatus = 'YELLOW';
  } else {
    trafficLightStatus = 'GREEN';
  }

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
    operationalAlerts,
    trafficLightStatus
  };
}

export function GcStatusBadges({ data }: { data: GcSymbologyData }) {
  const trafficLightConfig = {
    RED: { className: 'bg-red-100 text-red-800 border-red-300', icon: '🔴', label: 'Célula Vermelha' },
    YELLOW: { className: 'bg-amber-100 text-amber-800 border-amber-300', icon: '🟡', label: 'Célula Amarela' },
    GREEN: { className: 'bg-emerald-100 text-emerald-800 border-emerald-300', icon: '🟢', label: 'Célula Verde' }
  };

  const tl = trafficLightConfig[data.trafficLightStatus];

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {/* 🔴🟡🟢 Semáforo da Célula */}
      <Badge variant="outline" className={`font-bold text-[10px] gap-1 px-2 py-0.5 shadow-sm ${tl.className}`}>
        <span>{tl.icon}</span> {tl.label}
      </Badge>

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
          Simbologia do Semáforo (Saúde do GC)
        </h4>
        <span className="text-[11px] text-muted-foreground font-semibold">Diagnóstico Automático</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        {/* 1. Vermelha */}
        <div className="space-y-2 p-3 rounded-lg bg-red-50/60 border border-red-200/80">
          <div className="flex items-center gap-1.5 font-black text-red-900">
            <span className="text-sm">🔴</span>
            <span>Célula Vermelha</span>
          </div>
          <div className="text-[11px] text-red-800 space-y-1.5 font-medium leading-relaxed">
            <p><span className="font-bold">Critério:</span> Não possui líder em treinamento.</p>
            <p><span className="font-bold">Foco:</span> Prioridade máxima em despertar e formar um líder em treinamento.</p>
          </div>
        </div>

        {/* 2. Amarela */}
        <div className="space-y-2 p-3 rounded-lg bg-amber-50/60 border border-amber-200/80">
          <div className="flex items-center gap-1.5 font-black text-amber-900">
            <span className="text-sm">🟡</span>
            <span>Célula Amarela (Laranja)</span>
          </div>
          <div className="text-[11px] text-amber-800 space-y-1.5 font-medium leading-relaxed">
            <p><span className="font-bold">Critério:</span> Possui líder em treinamento, mas não atingiu n.º para multiplicar (ex: 4 a 5 membros).</p>
            <p><span className="font-bold">Foco:</span> Focar no evangelismo para trazer novas pessoas.</p>
          </div>
        </div>

        {/* 3. Verde */}
        <div className="space-y-2 p-3 rounded-lg bg-emerald-50/60 border border-emerald-200/80">
          <div className="flex items-center gap-1.5 font-black text-emerald-900">
            <span className="text-sm">🟢</span>
            <span>Célula Verde</span>
          </div>
          <div className="text-[11px] text-emerald-800 space-y-1.5 font-medium leading-relaxed">
            <p><span className="font-bold">Critério:</span> Possui líder em treinamento e atingiu a quantidade necessária (12+) para divisão.</p>
            <p><span className="font-bold">Foco:</span> Célula pronta para a multiplicação. Após, retorna ao estágio amarelo.</p>
          </div>
        </div>
      </div>
      
      {/* Alertas Operacionais Antigos */}
      <div className="pt-2 border-t mt-4">
        <h5 className="text-[11px] font-bold text-muted-foreground mb-2 uppercase tracking-wider">Alertas Operacionais Complementares</h5>
        <div className="flex flex-wrap gap-2">
           <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 font-bold text-[10px] gap-1 px-2 py-0.5">
             <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" /> Pontos de Atenção (Tamanho/Frequência)
           </Badge>
           <Badge variant="outline" className="bg-rose-50 text-rose-800 border-rose-200 font-bold text-[10px] gap-1 px-2 py-0.5">
             <AlertCircle className="h-3 w-3 text-rose-500 shrink-0" /> Avisos (Sem data / Sem secretária)
           </Badge>
        </div>
      </div>
    </div>
  );
}
