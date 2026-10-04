'use client';

import React from 'react';
import { Heart, Activity, Sliders, Sparkles } from 'lucide-react';
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
  return (
    <div className="flex flex-col gap-12">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-500/10 text-rose-600 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
          <Heart className="w-3.5 h-3.5" /> Etapa 3 • Coração (H) & Personalidade (P)
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
          O Coração & Sua Personalidade Vocacional
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base mt-1.5 leading-relaxed max-w-2xl">
          Mapeie as paixões que fazem seus olhos brilharem e compreenda como você prefere se organizar e se motivar no serviço.
        </p>
      </div>

      {/* PARTE 1: O CORAÇÃO (5 REFLEXÕES PROFUNDAS) */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-md shrink-0">
            <Heart className="w-5 h-5 fill-current" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold">O Coração: Sonhos, Paixões & Vocação</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Responda com o coração aberto e sincero
            </p>
          </div>
        </div>

        <div className="grid gap-5">
          {SHAPE_DATA.heart.map((questionText, idx) => (
            <div
              key={idx}
              className="p-5 sm:p-6 bg-card border rounded-2xl shadow-sm focus-within:ring-2 focus-within:ring-rose-500/30 transition-all"
            >
              <div className="flex items-start gap-3 mb-3">
                <span className="px-2.5 py-1 rounded-lg font-black text-xs bg-rose-500/10 text-rose-600 shrink-0 mt-0.5">
                  0{idx + 1}
                </span>
                <h3 className="font-bold text-sm sm:text-base text-foreground leading-snug">
                  {questionText}
                </h3>
              </div>
              <Textarea
                rows={3}
                className="w-full p-3.5 rounded-xl bg-muted/20 border-border text-sm resize-none focus-visible:ring-0 focus-visible:border-rose-500"
                placeholder="Escreva com suas próprias palavras..."
                value={heartAnswers[`q${idx}`] || ''}
                onChange={(e) => onHeartChange(idx, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* PARTE 2: PERSONALIDADE (MATRIZ DE 2 EIXOS) */}
      <div className="flex flex-col gap-8 pt-8 border-t">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-md shrink-0">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold">Personalidade Vocacional</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Escala de 1 a 5: Escolha o número que melhor expressa sua inclinação natural.
              </p>
            </div>
          </div>
        </div>

        {/* EIXO 1: COMO ME ORGANIZO */}
        <div className="space-y-4">
          <div className="p-4 bg-muted/40 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-black uppercase text-primary tracking-wider">Eixo 1</span>
              <h3 className="font-bold text-base text-foreground">
                {SHAPE_DATA.personality.eixo_org.title}
              </h3>
            </div>
            <span className="text-xs text-muted-foreground">
              1 = Forte à Esquerda • 3 = Neutro • 5 = Forte à Direita
            </span>
          </div>

          <div className="space-y-3">
            {SHAPE_DATA.personality.eixo_org.items.map((item) => {
              const currentVal = personalityAnswers[item.id] || 3;
              return (
                <div
                  key={item.id}
                  className="p-4 sm:p-5 rounded-2xl bg-card border shadow-sm flex flex-col gap-3"
                >
                  <span className="text-xs font-bold text-muted-foreground italic">
                    {item.ctx}
                  </span>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <span className={`w-full sm:w-1/3 text-center sm:text-left text-xs sm:text-sm font-bold transition-colors ${currentVal <= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
                      {item.esq}
                    </span>

                    <div className="flex items-center justify-center gap-2 sm:gap-3 shrink-0">
                      {[1, 2, 3, 4, 5].map((val) => {
                        const isSelected = currentVal === val;
                        return (
                          <button
                            type="button"
                            key={val}
                            onClick={() => onPersonalityChange(item.id, val)}
                            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl font-black text-sm transition-all flex items-center justify-center ${
                              isSelected
                                ? 'bg-primary text-white shadow-md scale-105'
                                : 'bg-muted/40 hover:bg-muted text-foreground border border-border'
                            }`}
                          >
                            {val}
                          </button>
                        );
                      })}
                    </div>

                    <span className={`w-full sm:w-1/3 text-center sm:text-right text-xs sm:text-sm font-bold transition-colors ${currentVal >= 4 ? 'text-primary' : 'text-muted-foreground'}`}>
                      {item.dir}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* EIXO 2: COMO ME MOTIVO */}
        <div className="space-y-4 pt-4">
          <div className="p-4 bg-muted/40 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-black uppercase text-primary tracking-wider">Eixo 2</span>
              <h3 className="font-bold text-base text-foreground">
                {SHAPE_DATA.personality.eixo_mot.title}
              </h3>
            </div>
            <span className="text-xs text-muted-foreground">
              1 = Forte à Esquerda • 3 = Neutro • 5 = Forte à Direita
            </span>
          </div>

          <div className="space-y-3">
            {SHAPE_DATA.personality.eixo_mot.items.map((item) => {
              const currentVal = personalityAnswers[item.id] || 3;
              return (
                <div
                  key={item.id}
                  className="p-4 sm:p-5 rounded-2xl bg-card border shadow-sm flex flex-col gap-3"
                >
                  <span className="text-xs font-bold text-muted-foreground italic">
                    {item.ctx}
                  </span>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <span className={`w-full sm:w-1/3 text-center sm:text-left text-xs sm:text-sm font-bold transition-colors ${currentVal <= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
                      {item.esq}
                    </span>

                    <div className="flex items-center justify-center gap-2 sm:gap-3 shrink-0">
                      {[1, 2, 3, 4, 5].map((val) => {
                        const isSelected = currentVal === val;
                        return (
                          <button
                            type="button"
                            key={val}
                            onClick={() => onPersonalityChange(item.id, val)}
                            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl font-black text-sm transition-all flex items-center justify-center ${
                              isSelected
                                ? 'bg-primary text-white shadow-md scale-105'
                                : 'bg-muted/40 hover:bg-muted text-foreground border border-border'
                            }`}
                          >
                            {val}
                          </button>
                        );
                      })}
                    </div>

                    <span className={`w-full sm:w-1/3 text-center sm:text-right text-xs sm:text-sm font-bold transition-colors ${currentVal >= 4 ? 'text-primary' : 'text-muted-foreground'}`}>
                      {item.dir}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
