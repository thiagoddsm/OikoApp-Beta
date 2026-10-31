'use client';

import React from 'react';
import { DISC_QUESTIONS, DISC_BLOCK_TITLES, type DiscLetter } from '@/lib/disc-questions';
import DiscQuestionCard from './DiscQuestionCard';

interface DiscInventoryProps {
  answers: Record<string, DiscLetter | string>;
  onAnswer: (questionId: string, letter: DiscLetter) => void;
}

export default function DiscInventory({ answers, onAnswer }: DiscInventoryProps) {
  const answered = DISC_QUESTIONS.filter((q) => !!answers[q.id]).length;
  const total = DISC_QUESTIONS.length;
  const pct = Math.round((answered / total) * 100);

  return (
    <div className="flex flex-col gap-5">
      {/* Contador */}
      <div className="p-3.5 bg-white rounded-2xl border border-slate-150 shadow-sm flex flex-col gap-2">
        <div className="flex items-center justify-between text-[11px] font-bold">
          <span className="text-slate-700">Respondidas</span>
          <span className="text-[#523A8C]">
            {answered}/{total}
          </span>
        </div>
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#523A8C] rounded-full transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {([1, 2] as const).map((block) => {
        const qs = DISC_QUESTIONS.filter((q) => q.block === block);
        const meta = DISC_BLOCK_TITLES[block];
        return (
          <div key={block} className="flex flex-col gap-3">
            <div className="px-1">
              <h3 className="text-sm font-extrabold text-[#1E113F]">{meta.title}</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">{meta.subtitle}</p>
            </div>
            {qs.map((q) => (
              <DiscQuestionCard
                key={q.id}
                question={q}
                number={DISC_QUESTIONS.indexOf(q) + 1}
                value={answers[q.id] as DiscLetter | undefined}
                onSelect={onAnswer}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
