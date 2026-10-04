'use client';

import React, { useMemo, useState } from 'react';
import { Sparkles, CheckCircle2, ChevronLeft, ChevronRight, Layers, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SHAPE_DATA } from '@/lib/shape-complete-data';

interface Step4GiftsProps {
  giftAnswers: Record<string, number>;
  onGiftAnswer: (questionId: string, value: number) => void;
  onFinish?: () => void;
}

const SCALE_OPTIONS = [
  { val: 0, label: 'Nunca' },
  { val: 1, label: 'Às vezes' },
  { val: 2, label: 'Maioria' },
  { val: 3, label: 'Sempre' },
];

export default function Step4Gifts({
  giftAnswers = {},
  onGiftAnswer,
  onFinish,
}: Step4GiftsProps) {
  const [page, setPage] = useState(1);
  const pageSize = 15; // 15 questões por bloco para rolagem super leve no celular

  const totalQuestions = SHAPE_DATA.giftQuestions.length; // 133
  const answeredCount = Object.keys(giftAnswers).length;
  const progressPercent = Math.round((answeredCount / totalQuestions) * 100);

  // Tendência preliminar baseada nas respostas até agora
  const preliminaryTrend = useMemo(() => {
    if (answeredCount < 5) return 'Calculando tendências...';
    const scores: Record<string, number> = {};
    SHAPE_DATA.gifts.forEach(g => scores[g.id] = 0);
    SHAPE_DATA.giftQuestions.forEach(q => {
      if (giftAnswers[q.id] !== undefined) {
        scores[q.domId] += giftAnswers[q.id];
      }
    });
    const sorted = SHAPE_DATA.gifts
      .map(g => ({ name: g.name, score: scores[g.id] }))
      .sort((a, b) => b.score - a.score);
    return `${sorted[0]?.name || ''} & ${sorted[1]?.name || ''}`;
  }, [giftAnswers, answeredCount]);

  const totalPages = Math.ceil(totalQuestions / pageSize);
  const currentQuestions = useMemo(() => {
    const start = (page - 1) * pageSize;
    return SHAPE_DATA.giftQuestions.slice(start, start + pageSize);
  }, [page]);

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* 1. Header Badges & Progress Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-150 shadow-sm flex flex-col gap-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-extrabold text-[#523A8C] uppercase tracking-wider text-[10px]">
            • Passo 4 de 5 • Reta Final
          </span>
          <span className="font-bold text-slate-500 text-[10px]">
            {answeredCount} / {totalQuestions} respondidas
          </span>
        </div>

        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-[#523A8C] h-full rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Tendência Preliminar */}
        <div className="flex items-center justify-between pt-1 text-[11px]">
          <span className="text-slate-500 font-medium flex items-center gap-1">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" /> Tendência preliminar:
          </span>
          <span className="font-extrabold text-[#523A8C] bg-[#EDE8F5] px-2 py-0.5 rounded-full">
            {preliminaryTrend}
          </span>
        </div>
      </div>

      {/* 2. Régua de Escala Fixa/Auxiliar */}
      <div className="grid grid-cols-4 gap-1.5 p-1.5 bg-[#EDE8F5]/60 rounded-2xl border border-[#523A8C]/15 text-center text-[10px] font-bold text-slate-600">
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

      {/* 3. Cards das Questões (Estilo Mobile Fiel) */}
      <div className="flex flex-col gap-3">
        {currentQuestions.map((q, idx) => {
          const globalIdx = (page - 1) * pageSize + idx + 1;
          const currentAnswer = giftAnswers[q.id];
          const isAnswered = currentAnswer !== undefined;
          const giftMeta = SHAPE_DATA.gifts.find(g => g.id === q.domId);

          return (
            <div
              key={q.id}
              className={`p-4 rounded-2xl bg-white border transition-all ${
                isAnswered
                  ? 'border-slate-200 shadow-sm'
                  : 'border-slate-200/90'
              }`}
            >
              {/* Top da questão: Número + Categoria do Dom */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-400">
                    {globalIdx}
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

      {/* 4. Paginação / Controle de Blocos */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-150 shadow-sm mt-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={page === 1}
            onClick={() => {
              setPage((p) => Math.max(p - 1, 1));
              window.scrollTo({ top: 150, behavior: 'smooth' });
            }}
            className="text-xs font-bold text-[#523A8C] gap-1"
          >
            <ChevronLeft className="w-4 h-4" /> Bloco Anterior
          </Button>

          <span className="text-[11px] font-black text-slate-500">
            {page} / {totalPages}
          </span>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={page === totalPages}
            onClick={() => {
              setPage((p) => Math.min(p + 1, totalPages));
              window.scrollTo({ top: 150, behavior: 'smooth' });
            }}
            className="text-xs font-bold text-[#523A8C] gap-1"
          >
            Próximo <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* 5. Mapeamento em Tempo Real Banner */}
      <div className="p-4 bg-[#EDE8F5]/60 rounded-2xl border border-[#523A8C]/15 flex items-start gap-3 mt-1">
        <div className="w-8 h-8 rounded-xl bg-[#523A8C] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
          <Layers className="w-4 h-4" />
        </div>
        <div className="flex flex-col">
          <h4 className="text-xs font-black text-[#1E113F]">
            Mapeamento em Tempo Real
          </h4>
          <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
            Ao concluir, o sistema cruza suas 133 respostas para emitir seu <strong>Cartão do Servo</strong> personalizado com dons primários e ministérios recomendados.
          </p>
        </div>
      </div>

      {/* 6. Botão de Finalização Direto */}
      {answeredCount >= 40 && onFinish && (
        <button
          type="button"
          onClick={onFinish}
          className="w-full h-13 py-3.5 rounded-2xl font-black text-sm bg-[#523A8C] hover:bg-[#432E75] text-white shadow-xl shadow-[#523A8C]/25 transition-all flex items-center justify-center gap-2 mt-1"
        >
          <Sparkles className="w-4 h-4" />
          <span>Calcular e Gerar Meu Cartão do Servo</span>
        </button>
      )}
    </div>
  );
}
