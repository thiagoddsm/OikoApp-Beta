'use client';

import React from 'react';
import { Heart, BookOpen, BookmarkCheck } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { SHAPE_DATA } from '@/lib/shape-complete-data';

interface Step3HeartProps {
  heartAnswers: Record<string, string>;
  onHeartChange: (index: number, value: string) => void;
}

export default function Step3Heart({
  heartAnswers = {},
  onHeartChange,
}: Step3HeartProps) {
  const answeredCount = Object.values(heartAnswers).filter(
    (v) => typeof v === 'string' && v.trim().length > 0
  ).length;

  return (
    <div className="flex flex-col gap-5 pb-4">
      {/* 1. Header Badges */}
      <div className="flex items-center justify-between">
        <span className="px-3 py-1 bg-[#EDE8F5] text-[#523A8C] rounded-full text-[10px] font-black uppercase tracking-wider">
          📘 Aula 1 • Passo 2 de 7 • Coração & Sonho Ministerial
        </span>
        <span className="text-[11px] font-bold text-slate-500">
          {answeredCount} / {SHAPE_DATA.heart.length} respondidas
        </span>
      </div>

      {/* 2. Título */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl sm:text-3xl font-black text-[#1E113F] tracking-tight">
          Coração & Sonho Ministerial
        </h1>
        <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
          Mapeie suas inclinações genuínas, as causas e as pessoas que fazem seu coração bater mais forte para servir no Reino (Parte 1 da Aula 1).
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

      {/* 4. Coração & Paixões (5 Reflexões) */}
      <div className="flex flex-col gap-3 pt-1">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-rose-500 fill-current" />
            <h2 className="text-sm font-extrabold text-[#1E113F]">
              Coração & Paixões Ministeriais
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
                placeholder="Escreva com sinceridade o que queima em seu coração..."
                value={heartAnswers[`q${idx}`] || ''}
                onChange={(e) => onHeartChange(idx, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* 5. Aviso de Salvamento para ir aos Dons Espirituais */}
      <div className="p-4 bg-[#EDE8F5]/60 rounded-2xl border border-[#523A8C]/15 flex items-start gap-3 mt-1">
        <div className="w-8 h-8 rounded-xl bg-[#523A8C] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
          <BookmarkCheck className="w-4 h-4" />
        </div>
        <div className="flex flex-col">
          <h4 className="text-xs font-black text-[#1E113F]">
            Próximo Passo da Aula 1: Inventário de Dons Espirituais
          </h4>
          <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
            Ao clicar em <strong>&ldquo;Salvar Coração e Avançar&rdquo;</strong>, suas reflexões serão salvas e iniciaremos a avaliação dos 19 dons bíblicos (dividida em 3 partes leves).
          </p>
        </div>
      </div>
    </div>
  );
}
