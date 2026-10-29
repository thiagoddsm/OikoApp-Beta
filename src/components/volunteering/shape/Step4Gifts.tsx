'use client';

import React, { useMemo } from 'react';
import { CheckCircle2, Layers, Lightbulb, BookmarkCheck } from 'lucide-react';
import { SHAPE_DATA } from '@/lib/shape-complete-data';

interface Step4GiftsProps {
  partNumber: 1 | 2 | 3;
  giftAnswers: Record<string, number>;
  onGiftAnswer: (questionId: string, value: number) => void;
}

const SCALE_OPTIONS = [
  { val: 0, label: 'Nunca' },
  { val: 1, label: 'Às vezes' },
  { val: 2, label: 'Maioria' },
  { val: 3, label: 'Sempre' },
];

export const GIFT_PARTS_RANGES: Record<1 | 2 | 3, { start: number; end: number; stepNum: number; title: string }> = {
  1: { start: 0, end: 45, stepNum: 4, title: 'Inventário de Dons (Parte 1 de 3)' },
  2: { start: 45, end: 90, stepNum: 5, title: 'Inventário de Dons (Parte 2 de 3)' },
  3: { start: 90, end: 133, stepNum: 6, title: 'Inventário de Dons (Parte 3 de 3)' },
};

export default function Step4Gifts({
  partNumber = 1,
  giftAnswers = {},
  onGiftAnswer,
}: Step4GiftsProps) {
  const range = GIFT_PARTS_RANGES[partNumber];
  const totalQuestions = SHAPE_DATA.giftQuestions.length; // 133

  const currentPartQuestions = useMemo(() => {
    return SHAPE_DATA.giftQuestions.slice(range.start, range.end);
  }, [range.start, range.end]);

  const partTotal = currentPartQuestions.length;
  const partAnsweredCount = useMemo(() => {
    return currentPartQuestions.filter((q) => giftAnswers[q.id] !== undefined).length;
  }, [currentPartQuestions, giftAnswers]);

  const totalAnsweredCount = Object.keys(giftAnswers).length;
  const partProgressPercent = Math.round((partAnsweredCount / partTotal) * 100);

  // Tendência preliminar baseada nas respostas até agora
  const preliminaryTrend = useMemo(() => {
    if (totalAnsweredCount < 5) return 'Calculando tendências...';
    const scores: Record<string, number> = {};
    SHAPE_DATA.gifts.forEach((g) => (scores[g.id] = 0));
    SHAPE_DATA.giftQuestions.forEach((q) => {
      if (giftAnswers[q.id] !== undefined) {
        scores[q.domId] += giftAnswers[q.id];
      }
    });
    const sorted = SHAPE_DATA.gifts
      .map((g) => ({ name: g.name, score: scores[g.id] }))
      .sort((a, b) => b.score - a.score);
    return `${sorted[0]?.name || ''} & ${sorted[1]?.name || ''}`;
  }, [giftAnswers, totalAnsweredCount]);

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* 1. Header Badges & Progress Bar da Parte Atual */}
      <div className="bg-white rounded-2xl p-4 border border-slate-150 shadow-sm flex flex-col gap-2.5 sticky top-[76px] z-30">
        <div className="flex items-center justify-between text-xs">
          <span className="font-extrabold text-[#523A8C] uppercase tracking-wider text-[10px]">
            • Passo {range.stepNum} de 7 • {range.title}
          </span>
          <span className="font-bold text-slate-600 text-[10px]">
            Página: {partAnsweredCount}/{partTotal} • Total: {totalAnsweredCount}/{totalQuestions}
          </span>
        </div>

        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-[#523A8C] h-full rounded-full transition-all duration-300"
            style={{ width: `${partProgressPercent}%` }}
          />
        </div>

        {/* Tendência Preliminar */}
        <div className="flex items-center justify-between pt-0.5 text-[11px]">
          <span className="text-slate-500 font-medium flex items-center gap-1">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" /> Tendência preliminar:
          </span>
          <span className="font-extrabold text-[#523A8C] bg-[#EDE8F5] px-2 py-0.5 rounded-full truncate max-w-[190px] sm:max-w-xs">
            {preliminaryTrend}
          </span>
        </div>
      </div>

      {/* 2. Régua de Escala Auxiliar */}
      <div className="grid grid-cols-4 gap-1.5 p-2 bg-[#EDE8F5]/60 rounded-2xl border border-[#523A8C]/15 text-center text-[10px] font-bold text-slate-600">
        <div>
          <span className="font-black text-[#523A8C]">0</span> Nunca
        </div>
        <div>
          <span className="font-black text-[#523A8C]">1</span> Às vezes
        </div>
        <div>
          <span className="font-black text-[#523A8C]">2</span> Maioria
        </div>
        <div>
          <span className="font-black text-[#523A8C]">3</span> Sempre
        </div>
      </div>

      {/* 3. Cards das Questões desta Parte */}
      <div className="flex flex-col gap-3">
        {currentPartQuestions.map((q, idx) => {
          const globalIdx = range.start + idx + 1;
          const currentAnswer = giftAnswers[q.id];
          const isAnswered = currentAnswer !== undefined;
          const giftMeta = SHAPE_DATA.gifts.find((g) => g.id === q.domId);

          return (
            <div
              key={q.id}
              id={`gift-question-${q.id}`}
              className={`p-4 rounded-2xl bg-white border transition-all ${
                isAnswered
                  ? 'border-emerald-200/80 shadow-sm'
                  : 'border-slate-200/90'
              }`}
            >
              {/* Top da questão: Número + Categoria do Dom */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-400">
                    #{globalIdx}
                  </span>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#EDE8F5] text-[#523A8C] uppercase tracking-wider">
                    {giftMeta?.name || 'Dom'}
                  </span>
                </div>
                {isAnswered ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <span className="w-4 h-4 rounded-full border border-slate-300" />
                )}
              </div>

              {/* Texto da Declaração */}
              <h3 className="text-xs sm:text-sm font-bold text-slate-800 leading-snug mb-3.5">
                {q.text}
              </h3>

              {/* 4 Botões de Escala (0 a 3) */}
              <div className="grid grid-cols-4 gap-1.5">
                {SCALE_OPTIONS.map((opt) => {
                  const isSelected = currentAnswer === opt.val;
                  return (
                    <button
                      type="button"
                      key={opt.val}
                      onClick={() => onGiftAnswer(q.id, opt.val)}
                      className={`py-2 rounded-xl text-center transition-all flex flex-col items-center justify-center ${
                        isSelected
                          ? 'bg-[#523A8C] text-white shadow-md font-black scale-102'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      <span className="text-xs font-black leading-none">{opt.val}</span>
                      <span className={`text-[9px] mt-0.5 ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                        {opt.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Aviso de Salvamento ao final da Parte */}
      <div className="p-4 bg-[#EDE8F5]/60 rounded-2xl border border-[#523A8C]/15 flex items-start gap-3 mt-1">
        <div className="w-8 h-8 rounded-xl bg-[#523A8C] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
          <BookmarkCheck className="w-4 h-4" />
        </div>
        <div className="flex flex-col">
          <h4 className="text-xs font-black text-[#1E113F]">
            {partNumber < 3
              ? `Fim da Parte ${partNumber} de 3 (Questões ${range.start + 1} a ${range.end})`
              : 'Fim da Parte 3 de 3 • Pronto para Gerar seu Cartão!'}
          </h4>
          <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
            {partNumber < 3
              ? 'Ao clicar em "Salvar e Avançar" na barra inferior, todas as suas respostas até aqui serão gravadas com segurança no seu cadastro.'
              : 'Ao clicar em "Salvar e Ver Resultado", seu diagnóstico completo será gravado e seu Cartão do Servo será emitido.'}
          </p>
        </div>
      </div>
    </div>
  );
}
