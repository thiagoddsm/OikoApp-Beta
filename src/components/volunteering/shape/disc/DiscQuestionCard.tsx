'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { getShuffledOptions, type DiscQuestion, type DiscLetter } from '@/lib/disc-questions';

interface DiscQuestionCardProps {
  question: DiscQuestion;
  number: number;
  value?: DiscLetter;
  onSelect: (questionId: string, letter: DiscLetter) => void;
}

export default function DiscQuestionCard({ question, number, value, onSelect }: DiscQuestionCardProps) {
  const options = React.useMemo(() => getShuffledOptions(question), [question]);

  return (
    <div
      id={`disc-question-${question.id}`}
      role="radiogroup"
      aria-label={question.text}
      className={`p-4 rounded-2xl border bg-white shadow-sm flex flex-col gap-3 transition-colors ${
        value ? 'border-[#523A8C]/30' : 'border-slate-150'
      }`}
    >
      <div className="flex items-start gap-2.5">
        <span
          className={`w-6 h-6 rounded-full text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5 ${
            value ? 'bg-[#523A8C] text-white' : 'bg-[#EDE8F5] text-[#523A8C]'
          }`}
        >
          {value ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : number}
        </span>
        <p className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">{question.text}</p>
      </div>

      <div className="flex flex-col gap-2">
        {options.map((opt) => {
          const selected = value === opt.l;
          return (
            <button
              type="button"
              role="radio"
              aria-checked={selected}
              key={opt.l}
              onClick={() => onSelect(question.id, opt.l)}
              className={`w-full text-left px-3.5 py-3 rounded-xl border text-xs sm:text-[13px] font-semibold leading-snug transition-all flex items-center gap-2.5 ${
                selected
                  ? 'bg-[#523A8C] text-white border-[#523A8C] shadow-md shadow-[#523A8C]/20'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                  selected ? 'border-white' : 'border-slate-300'
                }`}
              >
                {selected && <span className="w-2 h-2 rounded-full bg-white" />}
              </span>
              <span>{opt.text}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
