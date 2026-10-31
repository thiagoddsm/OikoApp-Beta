'use client';

import React, { useMemo } from 'react';
import { BookOpen, RotateCcw } from 'lucide-react';
import DiscInventory from './disc/DiscInventory';
import DiscBarChart from './disc/DiscBarChart';
import DiscProfileBadge from './disc/DiscProfileBadge';
import { calculateDisc, DISC_TOTAL, type DiscLetter } from '@/lib/disc';

interface Step6DiscProps {
  discAnswers: Record<string, DiscLetter | string>;
  onDiscAnswer: (questionId: string, letter: DiscLetter) => void;
  /** quadrante do formato antigo (se o aluno já respondeu as escalas O/E) */
  legacyQuadrante?: string;
}

export default function Step6Disc({ discAnswers, onDiscAnswer, legacyQuadrante }: Step6DiscProps) {
  const result = useMemo(() => calculateDisc(discAnswers), [discAnswers]);

  return (
    <div className="flex flex-col gap-5 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="px-3 py-1 bg-emerald-100 text-emerald-900 rounded-full text-[10px] font-black uppercase tracking-wider">
          📗 Aula 2 • Parte A • Passo 6 de 8 • Perfil DISC
        </span>
        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold">
          {result.discAnsweredCount}/{DISC_TOTAL}
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl sm:text-3xl font-black text-[#1E113F] tracking-tight">
          Seu Perfil Comportamental
        </h1>
        <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
          Para cada situação, escolha a alternativa que <strong>mais</strong> parece com você{' '}
          <strong>naturalmente</strong>, não como você gostaria de ser. Não há resposta certa ou errada.
        </p>
      </div>

      {legacyQuadrante && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5">
          <RotateCcw className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-900 leading-relaxed">
            Você já tinha um resultado no formato anterior (<strong>{legacyQuadrante}</strong>). Atualizamos a
            avaliação de personalidade para o <strong>DISC</strong>. Responder agora atualiza só este pilar —
            seus Dons e Habilidades continuam salvos.
          </p>
        </div>
      )}

      <div className="p-4 bg-white rounded-2xl border-l-4 border-l-[#523A8C] border-y border-r border-slate-150 shadow-sm flex flex-col gap-1">
        <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase text-[#523A8C] tracking-wider">
          <BookOpen className="w-3.5 h-3.5" /> SALMOS 139:14
        </div>
        <p className="text-xs sm:text-sm text-slate-700 italic font-medium leading-relaxed">
          “Eu te louvo porque me fizeste de modo especial e admirável. Tuas obras são maravilhosas!”
        </p>
      </div>

      <DiscInventory answers={discAnswers} onAnswer={onDiscAnswer} />

      {/* Prévia ao concluir */}
      {result.discComplete && result.discPrimary && (
        <div className="p-4 bg-gradient-to-br from-[#EDE8F5] to-white rounded-2xl border border-[#523A8C]/30 shadow-sm flex flex-col gap-3 animate-in fade-in">
          <span className="text-[10px] font-black uppercase text-[#523A8C] tracking-wider">
            Prévia do seu resultado
          </span>
          <DiscProfileBadge
            primary={result.discPrimary}
            secondary={result.discSecondary}
            strength={result.discStrength}
            tie={result.discTie}
          />
          <DiscBarChart
            scores={result.discScores}
            primary={result.discPrimary}
            secondary={result.discSecondary}
            total={DISC_TOTAL}
          />
          <p className="text-[11px] text-slate-500">
            Clique em “Salvar e Ir para Habilidades” para guardar. Seu Cartão do Servo completo vem no final.
          </p>
        </div>
      )}
    </div>
  );
}
