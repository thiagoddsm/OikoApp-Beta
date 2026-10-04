'use client';

import React, { useState, useMemo } from 'react';
import { Zap, CheckCircle2, Search, Sparkles, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SHAPE_DATA } from '@/lib/shape-complete-data';

interface Step4GiftsProps {
  giftAnswers: Record<string, number>;
  onGiftAnswer: (questionId: string, value: number) => void;
}

const SCALE_OPTIONS = [
  { val: 0, label: 'Nunca', desc: 'Raramente / Incomum' },
  { val: 1, label: 'Às vezes', desc: 'Ocasionalmente' },
  { val: 2, label: 'Na maioria', desc: 'Com frequência' },
  { val: 3, label: 'Sempre', desc: 'Traço constante' },
];

export default function Step4Gifts({
  giftAnswers = {},
  onGiftAnswer,
}: Step4GiftsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPending, setFilterPending] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 25; // 25 perguntas por bloco para fluidez máxima

  const totalQuestions = SHAPE_DATA.giftQuestions.length; // 133
  const answeredCount = Object.keys(giftAnswers).length;
  const progressPercent = Math.round((answeredCount / totalQuestions) * 100);

  const filteredQuestions = useMemo(() => {
    return SHAPE_DATA.giftQuestions.filter((q) => {
      if (filterPending && giftAnswers[q.id] !== undefined) return false;
      if (searchTerm) {
        return q.text.toLowerCase().includes(searchTerm.toLowerCase()) || q.id.toLowerCase().includes(searchTerm.toLowerCase());
      }
      return true;
    });
  }, [giftAnswers, filterPending, searchTerm]);

  const totalPages = Math.ceil(filteredQuestions.length / pageSize) || 1;
  const currentQuestions = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredQuestions.slice(start, start + pageSize);
  }, [filteredQuestions, page]);

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
          <Zap className="w-3.5 h-3.5" /> Etapa 4 • Inventário de Dons Espirituais (S)
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
          Avaliação de Dons Espirituais
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base mt-1.5 leading-relaxed max-w-2xl">
          Avalie 133 declarações práticas sobre como Deus capacita você para ministrar na igreja e no mundo.
        </p>
      </div>

      {/* Sticky Progress Bar */}
      <div className="sticky top-16 z-30 bg-card/95 backdrop-blur border rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-sm shrink-0">
            {progressPercent}%
          </div>
          <div>
            <span className="text-xs font-bold uppercase text-muted-foreground">Progresso do Inventário</span>
            <p className="text-sm font-black text-foreground">
              {answeredCount} de {totalQuestions} respondidas
            </p>
          </div>
        </div>

        {/* Filtros rápidos */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <div className="relative flex-1 sm:w-48">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              className="h-10 pl-9 text-xs rounded-xl"
              placeholder="Buscar pergunta..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <Button
            type="button"
            variant={filterPending ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setFilterPending(!filterPending);
              setPage(1);
            }}
            className="h-10 text-xs font-bold rounded-xl gap-1.5 shrink-0"
          >
            <Filter className="w-3.5 h-3.5" />
            {filterPending ? 'Ver Todas' : 'Só Pendentes'}
          </Button>
        </div>
      </div>

      {/* Lista de Questões */}
      <div className="space-y-4">
        {currentQuestions.map((q, idx) => {
          const globalIdx = SHAPE_DATA.giftQuestions.findIndex((item) => item.id === q.id) + 1;
          const currentAnswer = giftAnswers[q.id];
          const isAnswered = currentAnswer !== undefined;

          return (
            <div
              key={q.id}
              className={`p-5 rounded-2xl border transition-all ${
                isAnswered
                  ? 'bg-card border-border shadow-sm'
                  : 'bg-card/70 border-dashed border-border'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-start gap-2.5">
                  <span className={`text-[11px] font-black uppercase px-2 py-0.5 rounded-md mt-0.5 ${
                    isAnswered ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                  }`}>
                    #{String(globalIdx).padStart(3, '0')}
                  </span>
                  <h3 className="text-sm sm:text-base font-semibold text-foreground leading-snug">
                    {q.text}
                  </h3>
                </div>

                {isAnswered && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-1" />
                )}
              </div>

              {/* Opções de Escala (0 a 3) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                {SCALE_OPTIONS.map((opt) => {
                  const isSelected = currentAnswer === opt.val;
                  return (
                    <button
                      type="button"
                      key={opt.val}
                      onClick={() => onGiftAnswer(q.id, opt.val)}
                      className={`flex items-center gap-2.5 p-2.5 sm:p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-primary text-primary-foreground border-primary font-bold shadow-sm'
                          : 'bg-muted/20 hover:bg-muted/60 border-border text-foreground'
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-background border text-muted-foreground'
                        }`}
                      >
                        {opt.val}
                      </div>
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-xs sm:text-sm font-bold truncate">
                          {opt.label}
                        </span>
                        <span className={`text-[10px] hidden sm:block truncate ${isSelected ? 'text-white/80' : 'text-muted-foreground'}`}>
                          {opt.desc}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Paginação do Inventário */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => {
              setPage((p) => Math.max(p - 1, 1));
              window.scrollTo({ top: 250, behavior: 'smooth' });
            }}
            className="gap-1 rounded-xl text-xs font-bold"
          >
            <ChevronLeft className="w-4 h-4" /> Anterior
          </Button>

          <span className="text-xs font-bold text-muted-foreground">
            Bloco {page} de {totalPages} ({filteredQuestions.length} perguntas)
          </span>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page === totalPages}
            onClick={() => {
              setPage((p) => Math.min(p + 1, totalPages));
              window.scrollTo({ top: 250, behavior: 'smooth' });
            }}
            className="gap-1 rounded-xl text-xs font-bold"
          >
            Próximo <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
