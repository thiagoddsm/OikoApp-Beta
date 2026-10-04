'use client';

import React, { useMemo } from 'react';
import { Heart, Sparkles, Sliders, BookOpen, Layers, Zap, HeartHandshake } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { SHAPE_DATA } from '@/lib/shape-complete-data';

interface Step3HeartProps {
  heartAnswers: Record<string, string>;
  onHeartChange: (index: number, value: string) => void;
  personalityAnswers: Record<string, number>;
  onPersonalityChange: (id: string, value: number) => void;
}

export default function Step3Heart({
  heartAnswers = {},
  onHeartChange,
  personalityAnswers = {},
  onPersonalityChange,
}: Step3HeartProps) {
  // Cálculo do Feedback Imediato da Personalidade
  const { quadTitle, quadDesc, motLabel, orgLabel } = useMemo(() => {
    let orgSum = 0;
    let motSum = 0;

    SHAPE_DATA.personality.eixo_org.items.forEach((item) => {
      orgSum += personalityAnswers[item.id] !== undefined ? personalityAnswers[item.id] : 3;
    });

    SHAPE_DATA.personality.eixo_mot.items.forEach((item) => {
      motSum += personalityAnswers[item.id] !== undefined ? personalityAnswers[item.id] : 3;
    });

    const orgAvg = orgSum / SHAPE_DATA.personality.eixo_org.items.length;
    const motAvg = motSum / SHAPE_DATA.personality.eixo_mot.items.length;

    const orgRes = orgAvg >= 3.0 ? 'Formal' : 'Informal';
    const motRes = motAvg >= 3.0 ? 'Pessoas' : 'Tarefas';

    let title = '';
    let desc = '';

    if (motRes === 'Tarefas' && orgRes === 'Formal') {
      title = 'Executor Metódico';
      desc = 'Focado em processos, analítico e busca excelência organizando tarefas com início, meio e fim.';
    } else if (motRes === 'Tarefas' && orgRes === 'Informal') {
      title = 'Resolutivo Dinâmico';
      desc = 'Pragmático, ágil e adaptável. Brilha resolvendo problemas na hora e montando estruturas práticas.';
    } else if (motRes === 'Pessoas' && orgRes === 'Formal') {
      title = 'Facilitador Acolhedor & Estruturado';
      desc = 'Tendência a harmonizar processos organizados com profundo cuidado pessoal. Você traz segurança metodológica sem perder o foco na empatia e nos indivíduos.';
    } else {
      title = 'Conector Espontâneo';
      desc = 'Extrovertido, inspirador e criativo. Perfeito para integração, quebra-gelo e acolhimento vibrante.';
    }

    return {
      quadTitle: title,
      quadDesc: desc,
      motLabel: motRes === 'Pessoas' ? 'Relações & Acolhimento' : 'Foco em Tarefas',
      orgLabel: orgRes === 'Formal' ? 'Plano Consistente' : 'Dinâmico & Flexível',
    };
  }, [personalityAnswers]);

  return (
    <div className="flex flex-col gap-5 pb-4">
      {/* 1. Header Badges */}
      <div>
        <span className="px-2.5 py-1 bg-[#EDE8F5] text-[#523A8C] rounded-full text-[10px] font-black uppercase tracking-wider">
          Passo 3 de 5 • Paixões & Temperamento
        </span>
      </div>

      {/* 2. Título */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl sm:text-3xl font-black text-[#1E113F] tracking-tight">
          Coração e Personalidade
        </h1>
        <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
          Mapeie suas inclinações genuínas, onde seu entusiasmo natural encontra a vocação de servir.
        </p>
      </div>

      {/* 3. Versículo Provérbios 4:23 */}
      <div className="p-4 bg-white rounded-2xl border-l-4 border-l-[#523A8C] border-y border-r border-slate-150 shadow-sm flex flex-col gap-1">
        <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase text-[#523A8C] tracking-wider">
          <BookOpen className="w-3.5 h-3.5" /> PROVÉRBIOS 4:23
        </div>
        <p className="text-xs sm:text-sm text-slate-700 italic font-medium leading-relaxed">
          “Sobre tudo o que se deve guardar, guarda o teu coração, porque dele procedem as fontes da vida.”
        </p>
      </div>

      {/* 4. Coração & Paixões */}
      <div className="flex flex-col gap-3 pt-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-rose-500 fill-current" />
            <h2 className="text-sm font-extrabold text-[#1E113F]">
              Coração & Paixões
            </h2>
          </div>
          <span className="text-[11px] font-bold text-slate-400">
            {SHAPE_DATA.heart.length} Reflexões
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {SHAPE_DATA.heart.map((questionText, idx) => (
            <div
              key={idx}
              className="p-4 bg-white rounded-2xl border border-slate-150 shadow-sm flex flex-col gap-2.5"
            >
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#EDE8F5] text-[#523A8C] font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <h3 className="text-xs sm:text-sm font-bold text-slate-800 leading-snug">
                  {questionText}
                </h3>
              </div>
              <Textarea
                rows={2}
                className="text-xs rounded-xl bg-slate-50 border-slate-200 resize-none placeholder:text-slate-400"
                placeholder="Escreva com sinceridade e acolhimento..."
                value={heartAnswers[`q${idx}`] || ''}
                onChange={(e) => onHeartChange(idx, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* 5. Personalidade Vocacional (2 Eixos) */}
      <div className="flex flex-col gap-3 pt-4 border-t border-slate-200 mt-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#523A8C]" />
            <h2 className="text-sm font-extrabold text-[#1E113F]">
              Personalidade Vocacional
            </h2>
          </div>
          <span className="text-[11px] font-bold text-slate-400">
            2 Eixos
          </span>
        </div>

        {/* EIXO 1: COMO ME ORGANIZO */}
        <div className="p-4 bg-white rounded-2xl border border-slate-150 shadow-sm flex flex-col gap-3">
          <div>
            <span className="text-[10px] font-black uppercase text-[#523A8C] tracking-wider">EIXO 1</span>
            <h3 className="text-sm font-extrabold text-slate-900">Como me organizo?</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Defina seu ritmo entre adaptabilidade dinâmica e segurança em rotinas planejadas.
            </p>
          </div>

          <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 px-1 pt-1">
            <span className="text-[#523A8C]">✓ Espontâneo</span>
            <span>Plano Fixo 📅</span>
          </div>

          {/* Botões do Eixo 1 */}
          <div className="space-y-3 pt-1">
            {SHAPE_DATA.personality.eixo_org.items.slice(0, 3).map((item) => {
              const currentVal = personalityAnswers[item.id] || 3;
              const scalePills = [
                { val: 1, label: 'Fluido' },
                { val: 2, label: '-' },
                { val: 3, label: 'Misto' },
                { val: 4, label: '-' },
                { val: 5, label: 'Método' },
              ];

              return (
                <div key={item.id} className="p-3 bg-slate-50/70 rounded-xl border border-slate-100 flex flex-col gap-2">
                  <span className="text-[11px] font-bold text-slate-600">{item.ctx}</span>
                  <div className="grid grid-cols-5 gap-1.5">
                    {scalePills.map((p) => {
                      const isSelected = currentVal === p.val;
                      return (
                        <button
                          type="button"
                          key={p.val}
                          onClick={() => onPersonalityChange(item.id, p.val)}
                          className={`py-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center ${
                            isSelected
                              ? 'bg-[#523A8C] text-white shadow-sm'
                              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <span className="text-xs font-black">{p.val}</span>
                          <span className={`text-[9px] ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                            {p.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* EIXO 2: COMO ME MOTIVO */}
        <div className="p-4 bg-white rounded-2xl border border-slate-150 shadow-sm flex flex-col gap-3">
          <div>
            <span className="text-[10px] font-black uppercase text-[#523A8C] tracking-wider">EIXO 2</span>
            <h3 className="text-sm font-extrabold text-slate-900">Como me motivo?</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Sua energia cresce na realização de metas concretas ou nas relações interpessoais?
            </p>
          </div>

          <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 px-1 pt-1">
            <span className="text-amber-600">⚡ Tarefas</span>
            <span className="text-[#523A8C]">Pessoas 👥</span>
          </div>

          {/* Botões do Eixo 2 */}
          <div className="space-y-3 pt-1">
            {SHAPE_DATA.personality.eixo_mot.items.slice(0, 3).map((item) => {
              const currentVal = personalityAnswers[item.id] || 3;
              const scalePills = [
                { val: 1, label: 'Execução' },
                { val: 2, label: '-' },
                { val: 3, label: 'Equilíbrio' },
                { val: 4, label: '-' },
                { val: 5, label: 'Vínculos' },
              ];

              return (
                <div key={item.id} className="p-3 bg-slate-50/70 rounded-xl border border-slate-100 flex flex-col gap-2">
                  <span className="text-[11px] font-bold text-slate-600">{item.ctx}</span>
                  <div className="grid grid-cols-5 gap-1.5">
                    {scalePills.map((p) => {
                      const isSelected = currentVal === p.val;
                      return (
                        <button
                          type="button"
                          key={p.val}
                          onClick={() => onPersonalityChange(item.id, p.val)}
                          className={`py-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center ${
                            isSelected
                              ? 'bg-[#523A8C] text-white shadow-sm'
                              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <span className="text-xs font-black">{p.val}</span>
                          <span className={`text-[9px] ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                            {p.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 6. FEEDBACK IMEDIATO (SÍNTESE) */}
        <div className="p-4 bg-slate-100/90 rounded-2xl border border-slate-200 flex flex-col gap-2 mt-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-600 tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-[#523A8C]" />
              FEEDBACK IMEDIATO
            </div>
            <span className="text-[10px] font-bold text-[#523A8C] bg-white px-2 py-0.5 rounded-full border border-slate-200">
              Síntese
            </span>
          </div>

          <h4 className="font-extrabold text-sm text-[#1E113F]">
            {quadTitle}
          </h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            {quadDesc}
          </p>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="bg-white p-2 rounded-xl border border-slate-200 text-[10px] font-bold text-slate-700 flex items-center gap-1.5">
              <span>📅</span> {orgLabel}
            </div>
            <div className="bg-white p-2 rounded-xl border border-slate-200 text-[10px] font-bold text-slate-700 flex items-center gap-1.5">
              <span>👥</span> {motLabel}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
