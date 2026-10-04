'use client';

import React, { useState } from 'react';
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
  Heart
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
}

const CATEGORY_META: Record<string, { icon: React.ElementType; subtitle: string; color: string; bg: string }> = {
  'Comunicação e ensino': { 
    icon: MessageSquare, 
    subtitle: 'Voz, escrita, clareza e ensino bíblico',
    color: 'text-[#523A8C]',
    bg: 'bg-[#EDE8F5]'
  },
  'Música e artes': { 
    icon: Music, 
    subtitle: 'Expressão estética, adoração e visual',
    color: 'text-purple-600',
    bg: 'bg-purple-50'
  },
  'Tecnologia e produção': { 
    icon: Cpu, 
    subtitle: 'Bastidores técnicos, áudio e mídias',
    color: 'text-indigo-600',
    bg: 'bg-indigo-50'
  },
  'Organização e gestão': { 
    icon: Layers, 
    subtitle: 'Logística, finanças e processos',
    color: 'text-blue-600',
    bg: 'bg-blue-50'
  },
  'Cuidado e relacionamento': { 
    icon: HeartHandshake, 
    subtitle: 'Acolhimento, oração e atenção pastoral',
    color: 'text-rose-600',
    bg: 'bg-rose-50'
  },
  'Trabalho manual e construção': { 
    icon: Wrench, 
    subtitle: 'Manutenção, culinária e suporte prático',
    color: 'text-amber-600',
    bg: 'bg-amber-50'
  },
  'Saúde e bem-estar': { 
    icon: Activity, 
    subtitle: 'Cuidado físico, esportes e saúde integral',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50'
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
}: Step2AbilitiesProps) {
  // Inicialmente abre a primeira categoria para guiar o usuário
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    'Comunicação e ensino': true,
    'Música e artes': true,
  });

  const toggleCategory = (area: string) => {
    setOpenCategories((prev) => ({ ...prev, [area]: !prev[area] }));
  };

  return (
    <div className="flex flex-col gap-5 pb-4">
      {/* 1. Header Badges */}
      <div className="flex items-center justify-between">
        <span className="px-2.5 py-1 bg-[#EDE8F5] text-[#523A8C] rounded-full text-[10px] font-black uppercase tracking-wider">
          • SEÇÃO 1 DE 4
        </span>
        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold">
          ✓ {selectedAbilities.length} selecionada{selectedAbilities.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* 2. Título da Seção */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl sm:text-3xl font-black text-[#1E113F] tracking-tight">
          Habilidades & Trajetória
        </h1>
        <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
          Deus capacitou cada um com dons singulares para edificar a comunidade. Escolha com carinho as áreas em que você se sente mais à vontade servindo.
        </p>
      </div>

      {/* 3. Clusters de Habilidades com Accordion e Pílulas '+' */}
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
          const selectedInThisCategory = cat.items.filter((item) => selectedAbilities.includes(item)).length;

          return (
            <div
              key={cat.area}
              className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden transition-all"
            >
              {/* Header do Accordion */}
              <button
                type="button"
                onClick={() => toggleCategory(cat.area)}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/80 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl ${meta.bg} ${meta.color} flex items-center justify-center shrink-0`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-extrabold text-[#1E113F]">
                        {cat.area}
                      </h3>
                      {selectedInThisCategory > 0 && (
                        <span className="w-4 h-4 rounded-full bg-[#523A8C] text-white text-[9px] font-bold flex items-center justify-center">
                          {selectedInThisCategory}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-1">
                      {meta.subtitle}
                    </p>
                  </div>
                </div>

                <div className="p-1 rounded-lg text-slate-400">
                  {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {/* Itens do Cluster */}
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
                          {isSelected ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Plus className="w-3.5 h-3.5" />}
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

      {/* 4. Experiência de Vida & Disponibilidade */}
      <div className="flex flex-col gap-3 pt-4 border-t border-slate-200 mt-2">
        <h2 className="text-base font-extrabold text-[#1E113F]">
          Experiência de Vida & Disponibilidade
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
              const isChecked = (experiences['availability'] || '').includes(slot) || availability.includes(slot);
              return (
                <button
                  type="button"
                  key={slot}
                  onClick={() => {
                    if (onToggleAvailability) onToggleAvailability(slot);
                    const cur = (experiences['availability'] || '').split(',').map(s => s.trim()).filter(Boolean);
                    const next = cur.includes(slot) ? cur.filter(s => s !== slot) : [...cur, slot];
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
