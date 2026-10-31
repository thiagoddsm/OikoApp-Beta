'use client';

import React, { useState } from 'react';
import { Check, ArrowUp, ArrowDown, GripVertical, Sparkles } from 'lucide-react';
import { getShuffledOptions, type DiscQuestion, type DiscLetter, type DiscOption } from '@/lib/disc-questions';
import { normalizeDiscOrder } from '@/lib/disc';

interface DiscQuestionCardProps {
  question: DiscQuestion;
  number: number;
  value?: DiscLetter[];
  onOrderChange: (questionId: string, order: DiscLetter[]) => void;
}

const RANK_CONFIG = [
  {
    rank: 1,
    points: 4,
    badge: '1º',
    label: 'Mais me define',
    emoji: '🥇',
    border: 'border-emerald-300 ring-1 ring-emerald-400/30',
    bg: 'bg-emerald-50/70',
    badgeBg: 'bg-emerald-600 text-white',
    ptsClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  },
  {
    rank: 2,
    points: 3,
    badge: '2º',
    label: 'Bastante a ver',
    emoji: '🥈',
    border: 'border-blue-200',
    bg: 'bg-blue-50/50',
    badgeBg: 'bg-blue-600 text-white',
    ptsClass: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  {
    rank: 3,
    points: 2,
    badge: '3º',
    label: 'Pouco a ver',
    emoji: '🥉',
    border: 'border-amber-200',
    bg: 'bg-amber-50/40',
    badgeBg: 'bg-amber-600 text-white',
    ptsClass: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  {
    rank: 4,
    points: 1,
    badge: '4º',
    label: 'Menos me define',
    emoji: '⚪',
    border: 'border-slate-200',
    bg: 'bg-slate-50',
    badgeBg: 'bg-slate-400 text-white',
    ptsClass: 'bg-slate-200 text-slate-700 border-slate-300',
  },
];

export default function DiscQuestionCard({
  question,
  number,
  value,
  onOrderChange,
}: DiscQuestionCardProps) {
  const defaultOptions = React.useMemo(() => getShuffledOptions(question), [question]);
  const defaultLetters = React.useMemo(() => defaultOptions.map((o) => o.l), [defaultOptions]);

  // Se o aluno já ordenou/confirmou esta questão
  const isAnswered = !!value && value.length === 4;
  const currentLetters = isAnswered ? normalizeDiscOrder(value) : defaultLetters;

  // Mapa de texto por letra para reconstruir a lista na ordem atual
  const textByLetter = React.useMemo(() => {
    const map: Record<DiscLetter, string> = {} as any;
    question.options.forEach((opt) => {
      map[opt.l] = opt.text;
    });
    return map;
  }, [question]);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentLetters.length) return;

    const newOrder = [...currentLetters];
    const [moved] = newOrder.splice(index, 1);
    newOrder.splice(targetIndex, 0, moved);
    onOrderChange(question.id, newOrder);
  };

  const handleConfirmDefault = () => {
    onOrderChange(question.id, [...currentLetters]);
  };

  // Drag & drop nativo (desktop)
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newOrder = [...currentLetters];
    const [moved] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(index, 0, moved);
    setDraggedIndex(index);
    onOrderChange(question.id, newOrder);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <div
      id={`disc-question-${question.id}`}
      className={`p-4 sm:p-5 rounded-3xl border bg-white shadow-sm flex flex-col gap-3.5 transition-all ${
        isAnswered ? 'border-[#523A8C]/35 ring-1 ring-[#523A8C]/15' : 'border-slate-200'
      }`}
    >
      {/* Topo da Questão */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <span
            className={`w-7 h-7 rounded-xl text-xs font-black flex items-center justify-center shrink-0 mt-0.5 shadow-sm transition-colors ${
              isAnswered ? 'bg-[#523A8C] text-white' : 'bg-[#EDE8F5] text-[#523A8C]'
            }`}
          >
            {isAnswered ? <Check className="w-4 h-4 stroke-[3]" /> : number}
          </span>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-extrabold text-[#1E113F] leading-snug">
              {question.text}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Ordene as 4 alternativas da mais parecida (1º lugar) à menos parecida (4º lugar).
            </p>
          </div>
        </div>

        {isAnswered ? (
          <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
            <Check className="w-3 h-3" /> Ordenada
          </span>
        ) : (
          <button
            type="button"
            onClick={handleConfirmDefault}
            className="text-[10px] font-bold px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-[#523A8C] text-slate-700 hover:text-white transition-colors shrink-0 flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3" />
            <span>Confirmar ordem</span>
          </button>
        )}
      </div>

      {/* Lista das 4 alternativas reordenáveis */}
      <div className="flex flex-col gap-2 pt-1">
        {currentLetters.map((letter, index) => {
          const cfg = RANK_CONFIG[index];
          const text = textByLetter[letter];
          const isFirst = index === 0;
          const isLast = index === currentLetters.length - 1;

          return (
            <div
              key={letter}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`group relative p-3 sm:p-3.5 rounded-2xl border transition-all duration-200 flex items-center gap-2.5 sm:gap-3 ${
                cfg.border
              } ${cfg.bg} ${draggedIndex === index ? 'opacity-50 scale-98' : 'hover:shadow-sm'}`}
            >
              {/* Crachá de Posição & Peso */}
              <div className="flex flex-col items-center justify-center shrink-0 w-12 sm:w-14">
                <span
                  className={`w-full py-1 px-1.5 rounded-lg text-[10px] sm:text-[11px] font-black uppercase text-center flex items-center justify-center gap-1 shadow-xs ${cfg.badgeBg}`}
                >
                  <span>{cfg.emoji}</span>
                  <span>{cfg.badge}</span>
                </span>
                <span className="text-[9px] font-extrabold text-slate-500 mt-0.5 whitespace-nowrap">
                  {cfg.points} {cfg.points === 1 ? 'pt' : 'pts'}
                </span>
              </div>

              {/* Grip Handle para drag visual */}
              <div className="hidden sm:flex text-slate-400 group-hover:text-slate-600 cursor-grab active:cursor-grabbing shrink-0">
                <GripVertical className="w-4 h-4" />
              </div>

              {/* Texto da alternativa */}
              <div className="flex-1 min-w-0 pr-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                  {cfg.label}
                </span>
                <p className="text-xs sm:text-[13px] font-semibold text-slate-900 leading-snug">
                  {text}
                </p>
              </div>

              {/* Botões Acessíveis de Subir e Descer (Alta ergonomia mobile) */}
              <div className="flex flex-col gap-1 shrink-0 ml-auto">
                <button
                  type="button"
                  disabled={isFirst}
                  onClick={() => handleMove(index, 'up')}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                    isFirst
                      ? 'text-slate-300 bg-slate-100/50 cursor-not-allowed'
                      : 'text-slate-700 bg-white hover:bg-[#523A8C] hover:text-white border border-slate-200 active:scale-95 shadow-xs'
                  }`}
                  title="Subir de posição (aumentar prioridade)"
                  aria-label="Subir alternativa"
                >
                  <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
                <button
                  type="button"
                  disabled={isLast}
                  onClick={() => handleMove(index, 'down')}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                    isLast
                      ? 'text-slate-300 bg-slate-100/50 cursor-not-allowed'
                      : 'text-slate-700 bg-white hover:bg-[#523A8C] hover:text-white border border-slate-200 active:scale-95 shadow-xs'
                  }`}
                  title="Descer de posição (diminuir prioridade)"
                  aria-label="Descer alternativa"
                >
                  <ArrowDown className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
