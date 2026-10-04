'use client';
import { useState } from 'react';
import { Mic, Code, Brush, Users, Check, Banknote, ShieldQuestion, Briefcase, Clock, CalendarDays } from 'lucide-react';

export default function Step2Abilities() {
  const [selected, setSelected] = useState<string[]>([]);

  const toggleSkill = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const skills = [
    { id: 'com', title: 'Comunicação e Ensino', items: [
      { id: 's1', label: 'Falar em público', icon: Mic },
      { id: 's2', label: 'Explicar temas complexos', icon: ShieldQuestion }
    ]},
    { id: 'art', title: 'Música e Artes', items: [
      { id: 's3', label: 'Design / Fotografia', icon: Brush },
      { id: 's4', label: 'Cantar / Liderar Louvor', icon: Mic }
    ]},
    { id: 'tech', title: 'Tecnologia e Produção', items: [
      { id: 's5', label: 'Programação & Sistemas', icon: Code },
    ]},
    { id: 'org', title: 'Organização', items: [
      { id: 's6', label: 'Planejamento Financeiro', icon: Banknote },
      { id: 's7', label: 'Gestão de Eventos', icon: CalendarDays },
      { id: 's8', label: 'Gestão de Equipes', icon: Users }
    ]}
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="mb-4">
        <h1 className="text-3xl font-bold text-foreground">Habilidades & Experiências</h1>
        <p className="text-muted-foreground mt-2">Identifique suas aptidões inatas e a trajetória singular que Deus moldou.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {skills.map(category => (
          <div key={category.id} className="bg-card border rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-lg mb-4">{category.title}</h3>
            <div className="flex flex-col gap-2">
              {category.items.map(item => {
                const Icon = item.icon;
                const isSelected = selected.includes(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleSkill(item.id)}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all ${isSelected ? 'bg-primary/10 border-primary/30 shadow-sm' : 'bg-muted/30 hover:bg-muted'}`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-5 h-5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className={`font-medium ${isSelected ? 'text-primary' : 'text-foreground'}`}>{item.label}</span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 border-t pt-8">
        <h2 className="text-2xl font-bold mb-4">Experiência de Vida</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-card border rounded-2xl p-6">
            <div className="flex items-center gap-2 text-primary font-bold mb-4">
              <Briefcase className="w-5 h-5" /> Histórico
            </div>
            <textarea className="w-full bg-muted/50 rounded-xl p-4 text-sm h-32 focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="Compartilhe sua formação e experiência..." />
          </div>
          <div className="bg-card border rounded-2xl p-6">
            <div className="flex items-center gap-2 text-primary font-bold mb-4">
              <Users className="w-5 h-5" /> Voluntariado
            </div>
            <textarea className="w-full bg-muted/50 rounded-xl p-4 text-sm h-32 focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="Experiência prévia em ministérios..." />
          </div>
          <div className="bg-card border rounded-2xl p-6">
            <div className="flex items-center gap-2 text-primary font-bold mb-4">
              <Clock className="w-5 h-5" /> Compromisso
            </div>
            <textarea className="w-full bg-muted/50 rounded-xl p-4 text-sm h-32 focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="Sua disponibilidade de horários..." />
          </div>
        </div>
      </div>
    </div>
  );
}
