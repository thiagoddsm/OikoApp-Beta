'use client';
import { useState } from 'react';
import { CheckCircle2, Zap } from 'lucide-react';

export default function Step4Gifts() {
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const handleSelect = (id: string, val: number) => {
    setAnswers(prev => ({ ...prev, [id]: val }));
  };

  const questions = [
    { id: 'q1', text: 'Gosto de organizar pessoas, processos, tarefas e eventos para que os projetos alcancem eficácia máxima.', axis: 'Administração & Planejamento' },
    { id: 'q2', text: 'Comunico a mensagem da fé com simplicidade, paixão e de modo persuasivo para quem ainda não a conhece.', axis: 'Evangelismo & Alcance' },
    { id: 'q3', text: 'Acho natural e fácil confiar em Deus perante obstáculos aparentemente impossíveis, inspirando os outros.', axis: 'Fé Extraordinária' }
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary w-max rounded-full text-xs font-bold uppercase tracking-wider">
          <Zap className="w-4 h-4" /> Passo Final
        </div>
        <h1 className="text-3xl font-bold text-foreground">Inventário de Dons Espirituais</h1>
        <p className="text-muted-foreground text-lg">Responda de acordo com sua realidade atual e ações espontâneas.</p>
      </div>

      <div className="flex flex-col gap-6">
        {questions.map((q, i) => (
          <div key={q.id} className="p-6 bg-card border rounded-2xl shadow-sm hover:shadow-md transition-all">
            <div className="mb-4">
              <span className="text-[11px] font-bold text-muted-foreground uppercase">#D04{i + 3} • {q.axis}</span>
              <h3 className="text-lg font-semibold mt-1">{q.text}</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { val: 0, label: 'Nunca', desc: 'Raramente ocorre' },
                { val: 1, label: 'Às vezes', desc: 'Ocasionalmente' },
                { val: 2, label: 'Maioria', desc: 'Com frequência' },
                { val: 3, label: 'Sempre', desc: 'Traço natural constante' }
              ].map(opt => {
                const isSelected = answers[q.id] === opt.val;
                return (
                  <button
                    key={opt.val}
                    onClick={() => handleSelect(q.id, opt.val)}
                    className={`flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-3 p-4 rounded-xl border transition-all ${isSelected ? 'bg-primary/5 border-primary ring-1 ring-primary' : 'bg-muted/20 hover:bg-muted/50 border-transparent'}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold transition-colors ${isSelected ? 'bg-primary text-white' : 'bg-background border'}`}>
                      {opt.val}
                    </div>
                    <div className="flex flex-col text-center sm:text-left">
                      <span className={`font-bold ${isSelected ? 'text-primary' : 'text-foreground'}`}>{opt.label}</span>
                      <span className="text-[10px] text-muted-foreground hidden sm:block">{opt.desc}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      
      <div className="bg-primary/5 p-6 rounded-2xl flex items-center gap-4 mt-4">
        <CheckCircle2 className="w-10 h-10 text-primary" />
        <div>
          <h3 className="font-bold text-lg">Cada dom aperfeiçoa a vocação</h3>
          <p className="text-sm text-muted-foreground">Ao concluir, calcularemos suas afinidades baseadas em todo o seu histórico preenchido.</p>
        </div>
      </div>
    </div>
  );
}
