'use client';

import React from 'react';
import { DISC_QUESTIONS, DISC_BLOCK_TITLES, type DiscLetter } from '@/lib/disc-questions';
import DiscQuestionCard from './DiscQuestionCard';
import { ArrowUpDown, HelpCircle } from 'lucide-react';

interface DiscInventoryProps {
  answers: Record<string, DiscLetter[]>;
  onAnswer: (questionId: string, order: DiscLetter[]) => void;
}

export default function DiscInventory({ answers, onAnswer }: DiscInventoryProps) {
  const answered = DISC_QUESTIONS.filter((q) => answers[q.id] && answers[q.id].length === 4).length;
  const total = DISC_QUESTIONS.length;
  const pct = Math.round((answered / total) * 100);

  return (
    <div className="flex flex-col gap-5">
      {/* Barra de Progresso e Instruções de Ranking */}
      <div className="p-4 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-slate-700 flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-[#523A8C]" />
            Questões Ordenadas
          </span>
          <span className="text-[#523A8C] font-black">
            {answered} de {total} ({pct}%)
          </span>
        </div>
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#523A8C] rounded-full transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Guia de Pontuação por Peso */}
        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-col gap-1.5 mt-1">
          <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-[#1E113F]">
            <HelpCircle className="w-3.5 h-3.5 text-[#523A8C]" />
            <span>Como funciona a pontuação por ordem de prioridade:</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px] pt-1">
            <div className="bg-white p-2 rounded-xl border border-emerald-200 text-emerald-950 flex flex-col">
              <span className="font-black">🥇 1º Lugar (4 pts)</span>
              <span className="text-emerald-700">Mais me descreve</span>
            </div>
            <div className="bg-white p-2 rounded-xl border border-blue-200 text-blue-950 flex flex-col">
              <span className="font-black">🥈 2º Lugar (3 pts)</span>
              <span className="text-blue-700">Bastante a ver</span>
            </div>
            <div className="bg-white p-2 rounded-xl border border-amber-200 text-amber-950 flex flex-col">
              <span className="font-black">🥉 3º Lugar (2 pts)</span>
              <span className="text-amber-700">Pouco a ver</span>
            </div>
            <div className="bg-white p-2 rounded-xl border border-slate-200 text-slate-800 flex flex-col">
              <span className="font-black">⚪ 4º Lugar (1 pt)</span>
              <span className="text-slate-500">Menos me descreve</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Use as setas <strong>⬆️</strong> e <strong>⬇️</strong> em cada alternativa para colocá-las na sua ordem natural.
          </p>
        </div>
      </div>

      {/* Blocos 1 e 2 */}
      {([1, 2] as const).map((block) => {
        const qs = DISC_QUESTIONS.filter((q) => q.block === block);
        const meta = DISC_BLOCK_TITLES[block];
        return (
          <div key={block} className="flex flex-col gap-3.5">
            <div className="px-1">
              <h3 className="text-sm sm:text-base font-black text-[#1E113F]">{meta.title}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{meta.subtitle}</p>
            </div>
            {qs.map((q) => (
              <DiscQuestionCard
                key={q.id}
                question={q}
                number={DISC_QUESTIONS.indexOf(q) + 1}
                value={answers[q.id]}
                onOrderChange={onAnswer}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
