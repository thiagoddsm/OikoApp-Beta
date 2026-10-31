'use client';

import React from 'react';
import { DISC_LETTERS, type DiscLetter, type DiscScores } from '@/lib/disc';
import { DISC_META } from '@/lib/disc-meta';

interface DiscBarChartProps {
  scores: DiscScores;
  primary?: DiscLetter | null;
  secondary?: DiscLetter | null;
  /** total de respostas (para calcular %). Padrão: soma dos scores */
  total?: number;
  compact?: boolean;
  className?: string;
}

export default function DiscBarChart({ scores, primary, secondary, total, compact, className }: DiscBarChartProps) {
  const sum = total ?? DISC_LETTERS.reduce((acc, l) => acc + (scores[l] || 0), 0);
  const max = Math.max(1, ...DISC_LETTERS.map((l) => scores[l] || 0));

  return (
    <div className={`flex flex-col ${compact ? 'gap-1.5' : 'gap-2.5'} ${className || ''}`}>
      {DISC_LETTERS.map((l) => {
        const meta = DISC_META[l];
        const val = scores[l] || 0;
        const pct = sum > 0 ? Math.round((val / sum) * 100) : 0;
        const isPrimary = primary === l;
        const isSecondary = secondary === l;
        return (
          <div key={l} className="flex items-center gap-2.5">
            <span
              className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-[11px] shrink-0 ${meta.bg} ${meta.text} ${
                isPrimary ? 'ring-2 ring-offset-1 ring-current' : ''
              }`}
              title={meta.name}
            >
              {l}
            </span>
            <div className="flex-1 min-w-0">
              {!compact && (
                <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 mb-0.5">
                  <span className="truncate">
                    {meta.name}
                    {isPrimary && <strong className="ml-1 text-slate-800">• Principal</strong>}
                    {isSecondary && <strong className="ml-1 text-slate-600">• Secundário</strong>}
                  </span>
                  <span className="text-slate-700 font-bold">
                    {val} <span className="text-slate-400 font-medium">({pct}%)</span>
                  </span>
                </div>
              )}
              <div className={`w-full ${compact ? 'h-1.5' : 'h-2.5'} bg-slate-100 rounded-full overflow-hidden`}>
                <div
                  className={`h-full rounded-full transition-all duration-500 ${meta.bar} ${
                    !isPrimary && !isSecondary ? 'opacity-50' : ''
                  }`}
                  style={{ width: `${(val / max) * 100}%` }}
                />
              </div>
            </div>
            {compact && <span className="text-[10px] font-bold text-slate-600 w-4 text-right">{val}</span>}
          </div>
        );
      })}
    </div>
  );
}
