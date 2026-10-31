'use client';

import React, { useMemo } from 'react';
import { Layers, Zap, Heart, Sparkles, Check } from 'lucide-react';
import { SHAPE_DATA } from '@/lib/shape-complete-data';

interface Step6PersonalityScalesProps {
  answers: Record<string, number>;
  onChange: (id: string, value: number) => void;
}

export default function Step6PersonalityScales({
  answers = {},
  onChange,
}: Step6PersonalityScalesProps) {
  // Cálculo do Feedback Imediato da Personalidade (Os 4 Quadrantes Clássicos)
  const { quadTitle, quadDesc, motLabel, orgLabel, orgScore, motScore } = useMemo(() => {
    let orgSum = 0;
    let motSum = 0;

    SHAPE_DATA.personality.eixo_org.items.forEach((item) => {
      orgSum += answers[item.id] !== undefined ? answers[item.id] : 3;
    });

    SHAPE_DATA.personality.eixo_mot.items.forEach((item) => {
      motSum += answers[item.id] !== undefined ? answers[item.id] : 3;
    });

    const orgAvg = orgSum / SHAPE_DATA.personality.eixo_org.items.length;
    const motAvg = motSum / SHAPE_DATA.personality.eixo_mot.items.length;

    const orgRes = orgAvg >= 3.0 ? 'Formal' : 'Informal';
    const motRes = motAvg >= 3.0 ? 'Pessoas' : 'Tarefas';

    let title = '';
    let desc = '';
    let icon = Sparkles;

    if (motRes === 'Tarefas' && orgRes === 'Formal') {
      title = '🎯 Tarefa / Formal';
      desc = 'Prefere clareza de processos, rotinas estruturadas e saber exatamente os alvos para executar a tarefa com perfeição.';
      icon = Layers;
    } else if (motRes === 'Tarefas' && orgRes === 'Informal') {
      title = '⚡ Tarefa / Informal';
      desc = 'Prefere liberdade de ação, flexibilidade e variedade de responsabilidades, agindo rápido para entregar resultados.';
      icon = Zap;
    } else if (motRes === 'Pessoas' && orgRes === 'Formal') {
      title = '❤️ Pessoas / Formal';
      desc = 'Prefere interagir e cuidar de pessoas em ambientes mais calmos, estáveis e com papéis relacionais definidos.';
      icon = Heart;
    } else {
      title = '✨ Pessoas / Informal';
      desc = 'Prefere responder e conectar-se com as pessoas de forma espontânea, acolhedora, leve e dinâmica.';
      icon = Sparkles;
    }

    return {
      quadTitle: title,
      quadDesc: desc,
      quadIcon: icon,
      orgScore: Number(orgAvg.toFixed(1)),
      motScore: Number(motAvg.toFixed(1)),
      motLabel: orgRes === 'Formal' ? 'Formal / Estruturado' : 'Informal / Espontâneo',
      orgLabel: motRes === 'Pessoas' ? 'Foco em Pessoas' : 'Foco em Tarefas',
    };
  }, [answers]);

  const QuadIcon = useMemo(() => {
    if (motLabel.includes('Pessoas') && orgLabel.includes('Formal')) return Heart;
    if (motLabel.includes('Pessoas')) return Sparkles;
    if (orgLabel.includes('Formal')) return Layers;
    return Zap;
  }, [motLabel, orgLabel]);

  const answeredCount = Object.keys(answers).length;

  return (
    <div className="flex flex-col gap-6 pb-6 animate-in fade-in duration-300">
      {/* 1. Header Badges */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase text-[#523A8C] tracking-wider">
          • PILAR P • PERSONALIDADE
        </span>
        <span className="px-2.5 py-1 bg-[#EDE8F5] text-[#523A8C] rounded-full text-[10px] font-black uppercase tracking-wider">
          Passo 6A (Aula 2)
        </span>
      </div>

      {/* 2. Título & Subtítulo */}
      <div className="flex flex-col gap-1 text-left">
        <h1 className="text-2xl sm:text-3xl font-black text-[#1E113F] tracking-tight">
          Preferência de Ambiente 🧭
        </h1>
        <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
          Descubra o estilo de ambiente onde você melhor floresce. São 14 perguntas rápidas de escala
          (1 a 5) divididas em <strong>Organização</strong> e <strong>Motivação</strong>.
        </p>
      </div>

      {/* 3. Card de Diagnóstico Imediato do Quadrante */}
      <div className="bg-gradient-to-br from-[#523A8C]/5 via-[#EDE8F5]/50 to-white p-4 sm:p-5 rounded-2xl border border-[#523A8C]/20 shadow-xs flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#523A8C] text-white flex items-center justify-center shrink-0">
              <QuadIcon className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[9px] font-extrabold uppercase text-[#523A8C] tracking-wider block">
                Seu Quadrante em Formação
              </span>
              <h3 className="text-sm sm:text-base font-extrabold text-[#1E113F]">
                {quadTitle}
              </h3>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600">
            {answeredCount}/14 respondidas
          </span>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          {quadDesc}
        </p>

        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 text-center">
          <div className="p-2 bg-white/80 rounded-xl border border-slate-100">
            <span className="text-[10px] text-slate-400 font-bold block uppercase">Como Me Organizo</span>
            <span className="text-xs font-black text-slate-800">{motLabel}</span>
            <span className="text-[10px] text-[#523A8C] font-mono block">Média: {orgScore}/5.0</span>
          </div>
          <div className="p-2 bg-white/80 rounded-xl border border-slate-100">
            <span className="text-[10px] text-slate-400 font-bold block uppercase">Como Me Motivo</span>
            <span className="text-xs font-black text-slate-800">{orgLabel}</span>
            <span className="text-[10px] text-[#523A8C] font-mono block">Média: {motScore}/5.0</span>
          </div>
        </div>
      </div>

      {/* 4. Bloco 1: Como Me Organizo (Eixo Organização - 7 Perguntas) */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-150 shadow-sm flex flex-col gap-4">
        <div className="border-b border-slate-100 pb-3">
          <span className="text-[10px] font-extrabold uppercase text-[#523A8C] tracking-wider block">
            PARTE 1 DE 2
          </span>
          <h2 className="text-base font-black text-slate-900 mt-0.5">
            {SHAPE_DATA.personality.eixo_org.title}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Indique onde você se posiciona entre as duas opções (1 = Totalmente à Esquerda, 5 = Totalmente à Direita).
          </p>
        </div>

        <div className="space-y-4">
          {SHAPE_DATA.personality.eixo_org.items.map((item, idx) => {
            const currentVal = answers[item.id] ?? 3;
            return (
              <div
                key={item.id}
                id={`scale-question-${item.id}`}
                className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-150 flex flex-col gap-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-800">
                    <span className="text-[#523A8C] font-black mr-1">{idx + 1}.</span> {item.ctx}
                  </span>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[#523A8C] shrink-0">
                    Nota: {currentVal}
                  </span>
                </div>

                {/* Legendas Esquerda vs Direita */}
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 px-1">
                  <span className="text-slate-700 text-left max-w-[45%]">
                    {item.esq} <span className="text-slate-400 font-normal">(1)</span>
                  </span>
                  <span className="text-slate-700 text-right max-w-[45%]">
                    {item.dir} <span className="text-slate-400 font-normal">(5)</span>
                  </span>
                </div>

                {/* Seletor Tátil 1 a 5 */}
                <div className="grid grid-cols-5 gap-1.5 pt-1">
                  {[1, 2, 3, 4, 5].map((val) => {
                    const isSelected = currentVal === val;
                    return (
                      <button
                        type="button"
                        key={val}
                        onClick={() => onChange(item.id, val)}
                        className={`py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center ${
                          isSelected
                            ? 'bg-[#523A8C] text-white shadow-sm ring-2 ring-[#523A8C]/20 scale-102'
                            : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {val}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Bloco 2: Como Me Motivo (Eixo Motivação - 7 Perguntas) */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-150 shadow-sm flex flex-col gap-4">
        <div className="border-b border-slate-100 pb-3">
          <span className="text-[10px] font-extrabold uppercase text-[#523A8C] tracking-wider block">
            PARTE 2 DE 2
          </span>
          <h2 className="text-base font-black text-slate-900 mt-0.5">
            {SHAPE_DATA.personality.eixo_mot.title}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Indique sua inclinação natural de foco (Tarefas ou Pessoas) em cada situação.
          </p>
        </div>

        <div className="space-y-4">
          {SHAPE_DATA.personality.eixo_mot.items.map((item, idx) => {
            const currentVal = answers[item.id] ?? 3;
            return (
              <div
                key={item.id}
                id={`scale-question-${item.id}`}
                className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-150 flex flex-col gap-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-800">
                    <span className="text-[#523A8C] font-black mr-1">{idx + 8}.</span> {item.ctx}
                  </span>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[#523A8C] shrink-0">
                    Nota: {currentVal}
                  </span>
                </div>

                {/* Legendas Esquerda vs Direita */}
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 px-1">
                  <span className="text-slate-700 text-left max-w-[45%]">
                    {item.esq} <span className="text-slate-400 font-normal">(1)</span>
                  </span>
                  <span className="text-slate-700 text-right max-w-[45%]">
                    {item.dir} <span className="text-slate-400 font-normal">(5)</span>
                  </span>
                </div>

                {/* Seletor Tátil 1 a 5 */}
                <div className="grid grid-cols-5 gap-1.5 pt-1">
                  {[1, 2, 3, 4, 5].map((val) => {
                    const isSelected = currentVal === val;
                    return (
                      <button
                        type="button"
                        key={val}
                        onClick={() => onChange(item.id, val)}
                        className={`py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center ${
                          isSelected
                            ? 'bg-[#523A8C] text-white shadow-sm ring-2 ring-[#523A8C]/20 scale-102'
                            : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {val}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
