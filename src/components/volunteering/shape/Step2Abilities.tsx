'use client';

import React from 'react';
import { 
  Check, 
  Sparkles, 
  Briefcase, 
  Clock, 
  MessageSquare, 
  Music, 
  Cpu, 
  CalendarCheck, 
  Wrench, 
  HeartHandshake, 
  Activity,
  Award
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SHAPE_DATA } from '@/lib/shape-complete-data';

interface Step2AbilitiesProps {
  selectedAbilities: string[];
  onToggleAbility: (ability: string) => void;
  experiences: Record<string, string>;
  onExperienceChange: (id: string, value: string) => void;
}

const AREA_ICONS: Record<string, React.ElementType> = {
  'Comunicação e ensino': MessageSquare,
  'Música e artes': Music,
  'Tecnologia e produção': Cpu,
  'Organização e gestão': CalendarCheck,
  'Trabalho manual e construção': Wrench,
  'Cuidado e relacionamento': HeartHandshake,
  'Saúde e bem-estar': Activity,
};

export default function Step2Abilities({
  selectedAbilities = [],
  onToggleAbility,
  experiences = {},
  onExperienceChange,
}: Step2AbilitiesProps) {
  return (
    <div className="flex flex-col gap-10">
      {/* Header da Seção */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold uppercase tracking-wider mb-2">
          <Award className="w-3.5 h-3.5" /> Etapa 2 • Habilidades (A) & Experiências (E)
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
          Habilidades Naturais & Experiências de Vida
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base mt-1.5 leading-relaxed max-w-2xl">
          Identifique suas aptidões adquiridas e os talentos práticos que Deus moldou através de sua trajetória.
        </p>
      </div>

      {/* PARTE 1: HABILIDADES NATURAIS (7 CLUSTERS) */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Habilidades Naturais & Técnicas
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Selecione quantas desejar (mínimo 1)
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-primary/10 text-primary rounded-full">
            {selectedAbilities.length} selecionada{selectedAbilities.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {SHAPE_DATA.abilities.map((cat) => {
            const Icon = AREA_ICONS[cat.area] || Sparkles;
            return (
              <div
                key={cat.area}
                className="bg-card border rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-2.5 mb-4 text-foreground font-bold text-base border-b pb-2.5">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span>{cat.area}</span>
                  </div>

                  <div className="flex flex-col gap-2">
                    {cat.items.map((item) => {
                      const isSelected = selectedAbilities.includes(item);
                      return (
                        <button
                          type="button"
                          key={item}
                          onClick={() => onToggleAbility(item)}
                          className={`flex items-center justify-between text-left p-3 rounded-xl border transition-all text-xs sm:text-sm font-medium ${
                            isSelected
                              ? 'bg-primary/10 border-primary text-primary font-semibold shadow-sm ring-1 ring-primary/30'
                              : 'bg-muted/20 hover:bg-muted/50 border-border text-foreground'
                          }`}
                        >
                          <span className="pr-2">{item}</span>
                          <div
                            className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                              isSelected
                                ? 'bg-primary text-white'
                                : 'border border-muted-foreground/30 bg-background'
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* PARTE 2: EXPERIÊNCIAS DE VIDA */}
      <div className="space-y-6 pt-6 border-t">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-accent text-white flex items-center justify-center shrink-0">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold">Experiências de Vida & Trajetória</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Como Deus usou seus estudos, carreira e vivências para te capacitar
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {SHAPE_DATA.experiences.map((exp) => (
            <div
              key={exp.id}
              className="p-5 bg-card border rounded-2xl shadow-sm focus-within:ring-2 focus-within:ring-primary/40 transition-all flex flex-col gap-2"
            >
              <Label className="text-xs sm:text-sm font-bold text-foreground">
                {exp.label}
              </Label>
              <Textarea
                rows={3}
                className="w-full p-3 text-xs sm:text-sm rounded-xl bg-muted/20 border-border resize-none focus-visible:ring-0 focus-visible:border-primary"
                placeholder="Descreva brevemente..."
                value={experiences[exp.id] || ''}
                onChange={(e) => onExperienceChange(exp.id, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
