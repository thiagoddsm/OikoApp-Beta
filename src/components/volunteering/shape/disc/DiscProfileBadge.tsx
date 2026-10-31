'use client';

import React from 'react';
import { DISC_STRENGTH_LABEL, type DiscLetter, type DiscStrength } from '@/lib/disc';
import { DISC_META } from '@/lib/disc-meta';

interface DiscProfileBadgeProps {
  primary: DiscLetter;
  secondary?: DiscLetter | null;
  strength?: DiscStrength | null;
  tie?: boolean;
  /** mostra descrições completas (Cartão do Servo) */
  detailed?: boolean;
  className?: string;
}

export default function DiscProfileBadge({
  primary,
  secondary,
  strength,
  tie,
  detailed,
  className,
}: DiscProfileBadgeProps) {
  const p = DISC_META[primary];
  const s = secondary ? DISC_META[secondary] : null;

  return (
    <div className={`flex flex-col gap-2.5 ${className || ''}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-black ${p.bg} ${p.text} ${p.border}`}
        >
          {p.emoji} {primary} • {p.name} ({p.nickname})
        </span>
        {s && (
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-bold opacity-90 ${s.bg} ${s.text} ${s.border}`}
          >
            Secundário: {secondary} • {s.name}
          </span>
        )}
      </div>

      {(strength || tie) && (
        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
          {strength && (
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {DISC_STRENGTH_LABEL[strength]}
            </span>
          )}
          {tie && (
            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              Pontuação muito próxima
            </span>
          )}
        </div>
      )}

      {detailed && (
        <div className="flex flex-col gap-2 text-[11px] text-slate-600 leading-relaxed">
          <p>{p.description}</p>
          {s && (
            <p>
              <strong className="text-slate-700">Traço secundário ({s.name}):</strong> {s.description.split('.')[0]}.
            </p>
          )}
          <p className="italic text-slate-500">{p.serviceStyle}</p>
        </div>
      )}
    </div>
  );
}
