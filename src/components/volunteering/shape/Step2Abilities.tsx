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

const AVAILABILITY_OPTIONS = [
  'Domingo Manhã',
  'Domingo Noite',
  'Quarta-feira',
  'Sábados',
];

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
  const { quadTitle, quadDesc, motLabel, orgLabel, quadrantName } = useMemo(() => {
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
      title = '🎯 Executor Metódico (Tarefas / Formal)';
      desc =
        'Focado em processos, analítico e busca excelência organizando tarefas com início, meio e fim.';
    } else if (motRes === 'Tarefas' && orgRes === 'Informal') {
      title = '⚡ Resolutivo Dinâmico (Tarefas / Informal)';
      desc =
        'Pragmático, ágil e adaptável. Brilha resolvendo problemas na hora e montando estruturas práticas.';
    } else if (motRes === 'Pessoas' && orgRes === 'Formal') {
      title = '❤️ Facilitador Acolhedor & Estruturado (Pessoas / Formal)';
      desc =
        'Harmoniza processos organizados com profundo cuidado pessoal. Traz segurança metodológica com foco nas pessoas.';
    } else {
      title = '🤝 Conector Espontâneo (Pessoas / Informal)';
      desc =
        'Extrovertido, inspirador e criativo. Perfeito para integração, quebra-gelo e acolhimento vibrante.';
    }

    return {
      quadTitle: title,
      quadDesc: desc,
      quadrantName: `${motRes} / ${orgRes}`,
      motLabel: motRes === 'Pessoas' ? 'Relações & Pessoas' : 'Foco em Tarefas',
      orgLabel: orgRes === 'Formal' ? 'Formal & Estruturado' : 'Informal & Flexível',
    };
  }, [personalityAnswers]);

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
      <div className="flex flex-col gap-3 pt-1">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#523A8C]" />
            <h2 className="text-sm font-extrabold text-[#1E113F]">
              1. Personalidade Vocacional (Os 4 Quadrantes)
            </h2>
          </div>
          <span className="text-[11px] font-bold text-slate-400">2 Eixos</span>
        </div>

        {/* EIXO 1: COMO ME ORGANIZO (INFORMAL vs FORMAL) */}
        <div className="p-4 bg-white rounded-2xl border border-slate-150 shadow-sm flex flex-col gap-3">
          <div>
            <span className="text-[10px] font-black uppercase text-[#523A8C] tracking-wider">
              EIXO 1 • ESTRUTURA
            </span>
            <h3 className="text-sm font-extrabold text-slate-900">
              Como me organizo? (Informal vs. Formal)
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Defina seu ritmo entre adaptabilidade espontânea e segurança em rotinas estruturadas.
            </p>
          </div>

          <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 px-1 pt-1">
            <span className="text-[#523A8C]">✓ Informal / Espontâneo</span>
            <span>Formal / Estruturado 📅</span>
          </div>

          <div className="space-y-3 pt-1">
            {SHAPE_DATA.personality.eixo_org.items.slice(0, 3).map((item) => {
              const currentVal = personalityAnswers[item.id] ?? 3;
              const scalePills = [
                { val: 1, label: 'Fluido' },
                { val: 2, label: '-' },
                { val: 3, label: 'Misto' },
                { val: 4, label: '-' },
                { val: 5, label: 'Método' },
              ];

              return (
                <div
                  key={item.id}
                  className="p-3 bg-slate-50/70 rounded-xl border border-slate-100 flex flex-col gap-2"
                >
                  <span className="text-[11px] font-bold text-slate-700">{item.ctx}</span>
                  <div className="grid grid-cols-5 gap-1.5">
                    {scalePills.map((p) => {
                      const isSelected = currentVal === p.val;
                      return (
                        <button
                          type="button"
                          key={p.val}
                          onClick={() => onPersonalityChange && onPersonalityChange(item.id, p.val)}
                          className={`py-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center ${
                            isSelected
                              ? 'bg-[#523A8C] text-white shadow-sm'
                              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <span className="text-xs font-black">{p.val}</span>
                          <span
                            className={`text-[9px] ${
                              isSelected ? 'text-white/80' : 'text-slate-400'
                            }`}
                          >
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

        {/* EIXO 2: COMO ME MOTIVO (TAREFAS vs PESSOAS) */}
        <div className="p-4 bg-white rounded-2xl border border-slate-150 shadow-sm flex flex-col gap-3">
          <div>
            <span className="text-[10px] font-black uppercase text-[#523A8C] tracking-wider">
              EIXO 2 • FOCO
            </span>
            <h3 className="text-sm font-extrabold text-slate-900">
              Como me motivo? (Tarefas vs. Pessoas)
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Sua energia cresce na realização de metas concretas ou no cuidado e relações interpessoais?
            </p>
          </div>

          <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 px-1 pt-1">
            <span className="text-amber-600">⚡ Tarefas</span>
            <span className="text-[#523A8C]">Pessoas 👥</span>
          </div>

          <div className="space-y-3 pt-1">
            {SHAPE_DATA.personality.eixo_mot.items.slice(0, 3).map((item) => {
              const currentVal = personalityAnswers[item.id] ?? 3;
              const scalePills = [
                { val: 1, label: 'Execução' },
                { val: 2, label: '-' },
                { val: 3, label: 'Equilíbrio' },
                { val: 4, label: '-' },
                { val: 5, label: 'Vínculos' },
              ];

              return (
                <div
                  key={item.id}
                  className="p-3 bg-slate-50/70 rounded-xl border border-slate-100 flex flex-col gap-2"
                >
                  <span className="text-[11px] font-bold text-slate-700">{item.ctx}</span>
                  <div className="grid grid-cols-5 gap-1.5">
                    {scalePills.map((p) => {
                      const isSelected = currentVal === p.val;
                      return (
                        <button
                          type="button"
                          key={p.val}
                          onClick={() => onPersonalityChange && onPersonalityChange(item.id, p.val)}
                          className={`py-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center ${
                            isSelected
                              ? 'bg-[#523A8C] text-white shadow-sm'
                              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <span className="text-xs font-black">{p.val}</span>
                          <span
                            className={`text-[9px] ${
                              isSelected ? 'text-white/80' : 'text-slate-400'
                            }`}
                          >
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

        {/* SÍNTESE IMEDIATA DO QUADRANTE */}
        <div className="p-4 bg-[#EDE8F5]/70 rounded-2xl border border-[#523A8C]/20 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-[#523A8C] tracking-wider">
              <span className="w-2 h-2 rounded-full bg-[#523A8C]" />
              SEU QUADRANTE DE PERSONALIDADE
            </div>
            <span className="text-[10px] font-bold text-[#523A8C] bg-white px-2.5 py-0.5 rounded-full border border-[#523A8C]/20">
              {quadrantName}
            </span>
          </div>

          <h4 className="font-extrabold text-sm text-[#1E113F]">{quadTitle}</h4>
          <p className="text-xs text-slate-600 leading-relaxed">{quadDesc}</p>

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
            const selectedInThisCategory = cat.items.filter((item) =>
              selectedAbilities.includes(item)
            ).length;

            return (
              <div
                key={cat.area}
                className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => toggleCategory(cat.area)}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/80 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl ${meta.bg} ${meta.color} flex items-center justify-center shrink-0`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-extrabold text-[#1E113F]">{cat.area}</h3>
                        {selectedInThisCategory > 0 && (
                          <span className="w-4 h-4 rounded-full bg-[#523A8C] text-white text-[9px] font-bold flex items-center justify-center">
                            {selectedInThisCategory}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-1">{meta.subtitle}</p>
                    </div>
                  </div>

                  <div className="p-1 rounded-lg text-slate-400">
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </button>

                {isOpen && (
                  <div className="p-4 pt-1 border-t border-slate-100 flex flex-col gap-2 animate-in fade-in duration-200">
                    {cat.items.map((item) => {
                      const isSelected = selectedAbilities.includes(item);
                      return (
                        <button
                          type="button"
                          key={item}
                          onClick={() => onToggleAbility(item)}
                          className={`flex items-center justify-between text-left p-2.5 sm:p-3 rounded-xl border text-xs sm:text-sm font-medium transition-all ${
                            isSelected
                              ? 'bg-[#523A8C] text-white border-[#523A8C] shadow-sm font-bold'
                              : 'bg-slate-50/70 hover:bg-slate-100/80 border-slate-200/80 text-slate-700'
                          }`}
                        >
                          <span className="pr-2">{item}</span>
                          <div
                            className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                              isSelected
                                ? 'bg-white/25 text-white'
                                : 'bg-white border border-slate-200 text-slate-400'
                            }`}
                          >
                            {isSelected ? (
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            ) : (
                              <Plus className="w-3.5 h-3.5" />
                            )}
                          </div>
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

      {/* 5. Experiência de Vida & Disponibilidade */}
      <div className="flex flex-col gap-3 pt-4 border-t border-slate-200 mt-2">
        <h2 className="text-sm font-extrabold text-[#1E113F]">
          3. Experiência de Vida & Disponibilidade
        </h2>
        <p className="text-xs text-slate-500 -mt-1 mb-1">
          Conte-nos um pouco sobre a sua rotina e bagagem pessoal.
        </p>

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

        {/* Disponibilidade Semanal de Serviço */}
        <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-sm flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#523A8C]" />
            <span className="text-xs font-bold text-slate-800">
              Disponibilidade Semanal de Serviço
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Selecione os momentos em que seu coração e agenda estão livres para servir:
          </p>

          <div className="grid grid-cols-2 gap-2 pt-1">
            {AVAILABILITY_OPTIONS.map((slot) => {
              const isChecked =
                (experiences['availability'] || '').includes(slot) || availability.includes(slot);
              return (
                <button
                  type="button"
                  key={slot}
                  onClick={() => {
                    if (onToggleAvailability) onToggleAvailability(slot);
                    const cur = (experiences['availability'] || '')
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean);
                    const next = cur.includes(slot)
                      ? cur.filter((s) => s !== slot)
                      : [...cur, slot];
                    onExperienceChange('availability', next.join(', '));
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 text-left transition-all ${
                    isChecked
                      ? 'bg-[#EDE8F5] text-[#523A8C] border-[#523A8C]/40 shadow-sm'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded flex items-center justify-center text-[10px] shrink-0 ${
                      isChecked ? 'bg-[#523A8C] text-white' : 'border border-slate-300 bg-white'
                    }`}
                  >
                    {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span className="truncate">{slot}</span>
                </button>
              );
            })}
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
