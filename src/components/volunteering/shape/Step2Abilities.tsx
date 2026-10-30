'use client';

import React, { useState, useMemo } from 'react';
import {
  Check,
  Plus,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Briefcase,
  Clock,
  Sparkles,
  MessageSquare,
  Music,
  Cpu,
  Layers,
  HeartHandshake,
  Wrench,
  Activity,
  Heart,
  Sliders,
  Award,
  BookOpen,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SHAPE_DATA } from '@/lib/shape-complete-data';

interface Step2AbilitiesProps {
  selectedAbilities: string[];
  onToggleAbility: (ability: string) => void;
  experiences: Record<string, string>;
  onExperienceChange: (id: string, value: string) => void;
  availability?: string[];
  onToggleAvailability?: (slot: string) => void;
  personalityAnswers?: Record<string, number>;
  onPersonalityChange?: (id: string, value: number) => void;
  giftAnswers?: Record<string, number>;
}

const CATEGORY_META: Record<
  string,
  { icon: React.ElementType; subtitle: string; color: string; bg: string }
> = {
  'Comunicação e ensino': {
    icon: MessageSquare,
    subtitle: 'Voz, escrita, clareza e ensino bíblico',
    color: 'text-[#523A8C]',
    bg: 'bg-[#EDE8F5]',
  },
  'Música e artes': {
    icon: Music,
    subtitle: 'Expressão estética, adoração e visual',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
  },
  'Tecnologia e produção': {
    icon: Cpu,
    subtitle: 'Bastidores técnicos, áudio e mídias',
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
  },
  'Organização e gestão': {
    icon: Layers,
    subtitle: 'Logística, finanças e processos',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  'Cuidado e relacionamento': {
    icon: HeartHandshake,
    subtitle: 'Acolhimento, oração e atenção pastoral',
    color: 'text-rose-600',
    bg: 'bg-rose-50',
  },
  'Trabalho manual e construção': {
    icon: Wrench,
    subtitle: 'Manutenção, culinária e suporte prático',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
  'Saúde e bem-estar': {
    icon: Activity,
    subtitle: 'Cuidado físico, esportes e saúde integral',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
};

const WEEKDAYS = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
  'Domingo',
];

const PERIODS = ['Manhã', 'Tarde', 'Noite'];

export default function Step2Abilities({
  selectedAbilities = [],
  onToggleAbility,
  experiences = {},
  onExperienceChange,
  availability = [],
  onToggleAvailability,
  personalityAnswers = {},
  onPersonalityChange,
  giftAnswers = {},
}: Step2AbilitiesProps) {
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    'Comunicação e ensino': true,
    'Música e artes': true,
  });

  const toggleCategory = (area: string) => {
    setOpenCategories((prev) => ({ ...prev, [area]: !prev[area] }));
  };

  // Resumo do Top 3 Dons calculados na Aula 1
  const top3GiftsAula1 = useMemo(() => {
    const answeredCount = Object.keys(giftAnswers).length;
    if (answeredCount === 0) return [];
    const scores: Record<string, number> = {};
    SHAPE_DATA.gifts.forEach((g) => (scores[g.id] = 0));
    SHAPE_DATA.giftQuestions.forEach((q) => {
      if (giftAnswers[q.id] !== undefined) {
        scores[q.domId] += giftAnswers[q.id];
      }
    });
    return SHAPE_DATA.gifts
      .map((g) => ({ id: g.id, name: g.name, score: scores[g.id] || 0 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [giftAnswers]);

  // Cálculo do Feedback Imediato da Personalidade (Os 4 Quadrantes da Aula 2)
  const { quadTitle, quadDesc, motLabel, orgLabel, quadrantName, orgScore, motScore } = useMemo(() => {
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
      title = '🎯 Tarefa / Formal';
      desc = 'Prefere saber exatamente os alvos e como realizar a tarefa com processos claros.';
    } else if (motRes === 'Tarefas' && orgRes === 'Informal') {
      title = '⚡ Tarefa / Informal';
      desc = 'Prefere cumprir uma ampla variedade de responsabilidades com flexibilidade.';
    } else if (motRes === 'Pessoas' && orgRes === 'Formal') {
      title = '❤️ Pessoas / Formal';
      desc = 'Prefere interagir com pessoas em situações e ambientes mais estáveis e definidos.';
    } else {
      title = '🤝 Pessoas / Informal';
      desc = 'Prefere responder e relacionar-se com as pessoas de forma espontânea.';
    }

    return {
      quadTitle: title,
      quadDesc: desc,
      quadrantName: `${motRes} / ${orgRes}`,
      orgScore: Number(orgAvg.toFixed(1)),
      motScore: Number(motAvg.toFixed(1)),
      motLabel: motRes === 'Pessoas' ? 'Foco em Pessoas' : 'Foco em Tarefas',
      orgLabel: orgRes === 'Formal' ? 'Formal / Estruturado' : 'Informal / Espontâneo',
    };
  }, [personalityAnswers]);

  // Manipulação da matriz de disponibilidade
  const currentAvailabilityList = useMemo(() => {
    const raw = experiences['availability'] || '';
    const fromExp = raw.split(',').map((s) => s.trim()).filter(Boolean);
    return Array.from(new Set([...availability, ...fromExp]));
  }, [experiences, availability]);

  const toggleSlot = (day: string, period: string) => {
    const slot = `${day} - ${period}`;
    if (onToggleAvailability) onToggleAvailability(slot);

    let next: string[];
    if (currentAvailabilityList.includes(slot)) {
      next = currentAvailabilityList.filter((s) => s !== slot);
    } else {
      next = [...currentAvailabilityList, slot];
    }
    onExperienceChange('availability', next.join(', '));
  };

  return (
    <div className="flex flex-col gap-5 pb-4">
      {/* 1. Header Badges da Aula 2 */}
      <div className="flex items-center justify-between">
        <span className="px-3 py-1 bg-emerald-100 text-emerald-900 rounded-full text-[10px] font-black uppercase tracking-wider">
          📗 Aula 2 • Passo 6 de 7 • Personalidade & Habilidades
        </span>
        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold">
          ✓ {selectedAbilities.length} habilidade{selectedAbilities.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* 2. Card de Recapitulação dos Dons da Aula 1 */}
      {top3GiftsAula1.length > 0 && (
        <div className="p-4 bg-gradient-to-br from-[#2B1B54] to-[#523A8C] text-white rounded-2xl shadow-md flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-300">
              <Award className="w-4 h-4" />
              <span>Resumo da sua Aula 1 • Top 3 Dons Espirituais</span>
            </div>
            <span className="text-[10px] bg-white/15 px-2 py-0.5 rounded-full font-semibold">
              Salvo ✓
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-0.5">
            {top3GiftsAula1.map((g, idx) => (
              <div
                key={g.id}
                className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl p-2.5 flex flex-col justify-between"
              >
                <span className="text-[9px] font-bold text-amber-300 uppercase">
                  #{idx + 1} Dom
                </span>
                <span className="text-xs font-extrabold leading-tight truncate mt-0.5" title={g.name}>
                  {g.name}
                </span>
                <span className="text-[10px] text-white/80 font-medium mt-1">
                  {g.score} pts
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Título Principal da Aula 2 */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl sm:text-3xl font-black text-[#1E113F] tracking-tight">
          Personalidade & Habilidades
        </h1>
        <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
          Agora na <strong>Aula 2</strong>, vamos alinhar o seu temperamento (os 4 Quadrantes) e as suas habilidades práticas para fechar o seu Cartão do Servo.
        </p>
      </div>

      {/* 4. Versículo Salmo 139:14 */}
      <div className="p-4 bg-white rounded-2xl border-l-4 border-l-[#523A8C] border-y border-r border-slate-150 shadow-sm flex flex-col gap-1">
        <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase text-[#523A8C] tracking-wider">
          <BookOpen className="w-3.5 h-3.5" /> SALMOS 139:14
        </div>
        <p className="text-xs sm:text-sm text-slate-700 italic font-medium leading-relaxed">
          “Eu te louvo porque me fizeste de modo especial e admirável. Tuas obras são maravilhosas!”
        </p>
      </div>

      {/* =========================================================
          PARTE A DA AULA 2: PERSONALIDADE VOCACIONAL (2 EIXOS)
         ========================================================= */}
      <div className="flex flex-col gap-4 pt-1">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#523A8C]" />
            <h2 className="text-sm sm:text-base font-extrabold text-[#1E113F]">
              Personalidade Vocacional
            </h2>
          </div>
          <span className="text-[11px] font-bold text-slate-400">2 Escalas • 14 Questões</span>
        </div>

        {/* 1. ESCALA DE ORGANIZAÇÃO (ESCALA O) */}
        <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-150 shadow-sm flex flex-col gap-3.5">
          <div className="border-b border-slate-100 pb-3">
            <span className="text-[10px] font-black uppercase text-[#523A8C] tracking-wider">
              1. ESCALA DE ORGANIZAÇÃO (ESCALA O)
            </span>
            <h3 className="text-sm font-extrabold text-slate-900 mt-0.5">
              Como eu gostaria de me organizar?
            </h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Avalia a tendência entre um estilo <strong>Informal (1)</strong> e um estilo <strong>Formal (5)</strong>.
            </p>
          </div>

          <div className="space-y-3.5 pt-1">
            {SHAPE_DATA.personality.eixo_org.items.map((item, idx) => {
              const currentVal = personalityAnswers[item.id] ?? 3;
              return (
                <div
                  key={item.id}
                  className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-100 flex flex-col gap-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-800">
                      <span className="text-[#523A8C] font-black mr-1">{idx + 1}.</span> {item.ctx}
                    </span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[#523A8C] shrink-0">
                      Nota: {currentVal}
                    </span>
                  </div>

                  {/* Legenda Esquerda vs Direita */}
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 px-1">
                    <span className="text-slate-700 text-left max-w-[45%]">
                      {item.esq} <span className="text-slate-400 font-normal">(1)</span>
                    </span>
                    <span className="text-slate-700 text-right max-w-[45%]">
                      <span className="text-slate-400 font-normal">(5)</span> {item.dir}
                    </span>
                  </div>

                  {/* 5 Botões de Escolha */}
                  <div className="grid grid-cols-5 gap-1.5 pt-0.5">
                    {[1, 2, 3, 4, 5].map((val) => {
                      const isSelected = currentVal === val;
                      return (
                        <button
                          type="button"
                          key={val}
                          onClick={() => onPersonalityChange && onPersonalityChange(item.id, val)}
                          className={`py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center ${
                            isSelected
                              ? 'bg-[#523A8C] text-white shadow-md shadow-[#523A8C]/25 ring-2 ring-[#523A8C]'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
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

        {/* 2. ESCALA DE MOTIVAÇÃO (ESCALA E) */}
        <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-150 shadow-sm flex flex-col gap-3.5">
          <div className="border-b border-slate-100 pb-3">
            <span className="text-[10px] font-black uppercase text-[#523A8C] tracking-wider">
              2. ESCALA DE MOTIVAÇÃO (ESCALA E)
            </span>
            <h3 className="text-sm font-extrabold text-slate-900 mt-0.5">
              Como me motivo?
            </h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Avalia a motivação principal entre <strong>Foco em Tarefas (1)</strong> e <strong>Foco em Pessoas (5)</strong>.
            </p>
          </div>

          <div className="space-y-3.5 pt-1">
            {SHAPE_DATA.personality.eixo_mot.items.map((item, idx) => {
              const currentVal = personalityAnswers[item.id] ?? 3;
              return (
                <div
                  key={item.id}
                  className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-100 flex flex-col gap-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-800">
                      <span className="text-[#523A8C] font-black mr-1">{idx + 1}.</span> {item.ctx}
                    </span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[#523A8C] shrink-0">
                      Nota: {currentVal}
                    </span>
                  </div>

                  {/* Legenda Esquerda vs Direita */}
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 px-1">
                    <span className="text-slate-700 text-left max-w-[45%]">
                      {item.esq} <span className="text-slate-400 font-normal">(1)</span>
                    </span>
                    <span className="text-slate-700 text-right max-w-[45%]">
                      <span className="text-slate-400 font-normal">(5)</span> {item.dir}
                    </span>
                  </div>

                  {/* 5 Botões de Escolha */}
                  <div className="grid grid-cols-5 gap-1.5 pt-0.5">
                    {[1, 2, 3, 4, 5].map((val) => {
                      const isSelected = currentVal === val;
                      return (
                        <button
                          type="button"
                          key={val}
                          onClick={() => onPersonalityChange && onPersonalityChange(item.id, val)}
                          className={`py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center ${
                            isSelected
                              ? 'bg-[#523A8C] text-white shadow-md shadow-[#523A8C]/25 ring-2 ring-[#523A8C]'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
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

        {/* RESULTADO E ENCAIXE NOS QUADRANTES */}
        <div className="p-5 bg-gradient-to-br from-[#EDE8F5] to-white rounded-2xl border border-[#523A8C]/30 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-[#523A8C] tracking-wider">
              <span className="w-2.5 h-2.5 rounded-full bg-[#523A8C]" />
              RESULTADO E ENCAIXE NOS QUADRANTES
            </div>
            <span className="text-xs font-black text-[#523A8C] bg-white px-2.5 py-1 rounded-full border border-[#523A8C]/30 shadow-xs">
              {quadrantName}
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            O cruzamento das pontuações das duas escalas define a posição do aluno em um dos <strong>Quatro Quadrantes da Personalidade</strong>:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <div
              className={`p-3 rounded-xl border text-left transition-all ${
                quadrantName === 'Tarefas / Formal'
                  ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-300 shadow-xs'
                  : 'bg-white/80 border-slate-200 opacity-75'
              }`}
            >
              <h4 className="text-xs font-extrabold text-blue-900 flex items-center gap-1.5">
                <span>🎯</span> Tarefa / Formal
              </h4>
              <p className="text-[11px] text-blue-950/80 mt-1 leading-snug">
                Prefere saber exatamente os alvos e como realizar a tarefa com processos claros.
              </p>
            </div>

            <div
              className={`p-3 rounded-xl border text-left transition-all ${
                quadrantName === 'Tarefas / Informal'
                  ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-300 shadow-xs'
                  : 'bg-white/80 border-slate-200 opacity-75'
              }`}
            >
              <h4 className="text-xs font-extrabold text-amber-900 flex items-center gap-1.5">
                <span>⚡</span> Tarefa / Informal
              </h4>
              <p className="text-[11px] text-amber-950/80 mt-1 leading-snug">
                Prefere cumprir uma ampla variedade de responsabilidades com flexibilidade.
              </p>
            </div>

            <div
              className={`p-3 rounded-xl border text-left transition-all ${
                quadrantName === 'Pessoas / Formal'
                  ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-300 shadow-xs'
                  : 'bg-white/80 border-slate-200 opacity-75'
              }`}
            >
              <h4 className="text-xs font-extrabold text-rose-900 flex items-center gap-1.5">
                <span>❤️</span> Pessoas / Formal
              </h4>
              <p className="text-[11px] text-rose-950/80 mt-1 leading-snug">
                Prefere interagir com pessoas em situações e ambientes mais estáveis e definidos.
              </p>
            </div>

            <div
              className={`p-3 rounded-xl border text-left transition-all ${
                quadrantName === 'Pessoas / Informal'
                  ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-300 shadow-xs'
                  : 'bg-white/80 border-slate-200 opacity-75'
              }`}
            >
              <h4 className="text-xs font-extrabold text-emerald-900 flex items-center gap-1.5">
                <span>🤝</span> Pessoas / Informal
              </h4>
              <p className="text-[11px] text-emerald-950/80 mt-1 leading-snug">
                Prefere responder e relacionar-se com as pessoas de forma espontânea.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 pt-1 border-t border-slate-200/60">
            <span>Organização: <strong>{orgScore}/5.0</strong> ({orgLabel})</span>
            <span>Motivação: <strong>{motScore}/5.0</strong> ({motLabel})</span>
          </div>
        </div>
      </div>

      {/* =========================================================
          PARTE B DA AULA 2: HABILIDADES TÉCNICAS & DISPONIBILIDADE
         ========================================================= */}
      <div className="flex flex-col gap-3 pt-4 border-t border-slate-200 mt-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-[#523A8C]" />
            <h2 className="text-sm font-extrabold text-[#1E113F]">
              2. Habilidades & Talentos Práticos
            </h2>
          </div>
          <span className="text-[11px] font-bold text-[#523A8C]">
            {selectedAbilities.length} selecionada{selectedAbilities.length !== 1 ? 's' : ''}
          </span>
        </div>
        <p className="text-xs text-slate-500 px-1 -mt-1">
          Selecione pelo menos 1 habilidade técnica, artística ou prática que você possui:
        </p>

        <div className="flex flex-col gap-3">
          {SHAPE_DATA.abilities.map((cat) => {
            const meta = CATEGORY_META[cat.area] || {
              icon: Sparkles,
              subtitle: 'Competências e talentos práticos',
              color: 'text-[#523A8C]',
              bg: 'bg-[#EDE8F5]',
            };
            const Icon = meta.icon;
            const isOpen = !!openCategories[cat.area];
            const selectedInCat = cat.items.filter((item) => selectedAbilities.includes(item));

            return (
              <div
                key={cat.area}
                className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggleCategory(cat.area)}
                  className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl ${meta.bg} ${meta.color} flex items-center justify-center shrink-0`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 leading-tight">
                        {cat.area}
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">{meta.subtitle}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedInCat.length > 0 && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#EDE8F5] text-[#523A8C]">
                        {selectedInCat.length}
                      </span>
                    )}
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </button>

                {isOpen && (
                  <div className="p-4 pt-1 border-t border-slate-100 flex flex-wrap gap-2">
                    {cat.items.map((item) => {
                      const isSelected = selectedAbilities.includes(item);
                      return (
                        <button
                          type="button"
                          key={item}
                          onClick={() => onToggleAbility(item)}
                          className={`text-xs font-bold px-3 py-2 rounded-xl border transition-all text-left flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-[#523A8C] text-white border-[#523A8C] shadow-sm'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {isSelected ? (
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          ) : (
                            <Plus className="w-3.5 h-3.5 text-slate-400" />
                          )}
                          <span>{item}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* =========================================================
          PARTE C DA AULA 2: EXPERIÊNCIAS & DISPONIBILIDADE
         ========================================================= */}
      <div className="flex flex-col gap-3 pt-4 border-t border-slate-200 mt-2">
        <div className="flex items-center gap-2 px-1">
          <Briefcase className="w-4 h-4 text-[#523A8C]" />
          <h2 className="text-sm font-extrabold text-[#1E113F]">
            3. Experiência de Vida & Disponibilidade
          </h2>
        </div>

        {/* Formação e Atuação Profissional */}
        <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-sm flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-[#523A8C]" />
            <span className="text-xs font-bold text-slate-800">
              Formação e Atuação Profissional
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Sua profissão ou estudos atuais (ex: Educação, Engenharia, Saúde, Comércio...)
          </p>
          <Input
            className="h-10 text-xs rounded-xl bg-slate-50 border-slate-200"
            placeholder="Ex: Psicólogo, Professor, Autônomo..."
            value={experiences['exp1'] || ''}
            onChange={(e) => onExperienceChange('exp1', e.target.value)}
          />
        </div>

        {/* Experiência Anterior em Ministério */}
        <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-sm flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-[#523A8C]" />
            <span className="text-xs font-bold text-slate-800">
              Experiência Anterior em Ministério
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Já serviu nesta ou em outra comunidade? Se sim, em quais áreas?
          </p>
          <Textarea
            rows={2}
            className="text-xs rounded-xl bg-slate-50 border-slate-200 resize-none"
            placeholder="Compartilhe brevemente onde serviu ou se esta é sua primeira oportunidade..."
            value={experiences['exp2'] || ''}
            onChange={(e) => onExperienceChange('exp2', e.target.value)}
          />
        </div>

        {/* Disponibilidade Semanal de Serviço (Matriz Dias da Semana x 3 Turnos) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#523A8C]" />
              <span className="text-xs font-bold text-slate-800">
                Disponibilidade Semanal de Serviço
              </span>
            </div>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#EDE8F5] text-[#523A8C]">
              {currentAvailabilityList.length} horário{currentAvailabilityList.length !== 1 ? 's' : ''}
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Marque os dias da semana e os turnos em que sua agenda está livre para servir:
          </p>

          <div className="overflow-x-auto -mx-1 px-1">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="py-2 px-2 text-[11px] font-extrabold text-slate-700">Dia da Semana</th>
                  {PERIODS.map((p) => (
                    <th key={p} className="py-2 px-2 text-center text-[11px] font-extrabold text-slate-700">
                      {p}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {WEEKDAYS.map((day) => (
                  <tr key={day} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-2 font-bold text-slate-800 text-xs">
                      {day}
                    </td>
                    {PERIODS.map((period) => {
                      const slotKey = `${day} - ${period}`;
                      const isChecked = currentAvailabilityList.includes(slotKey);
                      return (
                        <td key={period} className="py-2.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => toggleSlot(day, period)}
                            className={`w-full py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all flex items-center justify-center gap-1 ${
                              isChecked
                                ? 'bg-[#523A8C] text-white border-[#523A8C] shadow-xs'
                                : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {isChecked ? (
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            ) : (
                              <span className="text-[10px] text-slate-400">+</span>
                            )}
                            <span className="hidden sm:inline">{period}</span>
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Frase Inspiradora Final */}
        <div className="p-3.5 bg-[#EDE8F5]/60 rounded-2xl border border-[#523A8C]/15 flex items-center gap-2.5 mt-2">
          <Heart className="w-4 h-4 text-[#523A8C] shrink-0" />
          <p className="text-[11px] text-[#2B1B54] italic font-medium leading-relaxed">
            “Cada um exerça o dom que recebeu na edificação uns dos outros, como bons despenseiros da multiforme graça de Deus.”
          </p>
        </div>
      </div>
    </div>
  );
}
