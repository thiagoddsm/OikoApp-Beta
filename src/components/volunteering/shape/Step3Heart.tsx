'use client';
import { Heart, Activity } from 'lucide-react';

export default function Step3Heart() {
  const heartQuestions = [
    { id: 'h1', title: 'O que realmente quero fazer para Deus?', subtitle: 'Se não houvesse restrições de tempo/dinheiro.' },
    { id: 'h2', title: 'A que grupo ou faixa etária sinto que devo ministrar?', subtitle: 'Crianças, jovens, casais, idosos...' },
    { id: 'h3', title: 'Que causas fazem meu coração bater mais rápido?', subtitle: 'Justiça social, ensino, missões, etc.' }
  ];

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Coração & Personalidade</h1>
        <p className="text-muted-foreground mt-2">Descubra onde o seu propósito pulsa mais forte.</p>
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center">
            <Heart className="w-5 h-5" />
          </div>
          <h2 className="text-2xl font-bold">O Coração: Sonhos & Paixões Profundas</h2>
        </div>
        
        <div className="grid gap-4">
          {heartQuestions.map((q, idx) => (
            <div key={q.id} className="p-6 bg-card border rounded-2xl shadow-sm focus-within:shadow-md transition-all">
              <div className="flex items-center gap-3 mb-2">
                <span className="px-2 py-0.5 rounded font-bold text-[11px] bg-primary/10 text-primary">0{idx + 1}</span>
                <h3 className="font-bold text-lg">{q.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">{q.subtitle}</p>
              <textarea className="w-full p-4 rounded-xl bg-muted/30 border focus:outline-none focus:border-primary/50 resize-none h-24" placeholder="Escreva com sinceridade..." />
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-6 pt-6 border-t">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent text-white flex items-center justify-center">
            <Activity className="w-5 h-5" />
          </div>
          <h2 className="text-2xl font-bold">Sua Personalidade Vocacional</h2>
        </div>

        <div className="bg-muted/30 p-4 rounded-xl flex flex-col md:flex-row items-center gap-4 text-sm">
          <span className="font-semibold">Escala:</span>
          <span>1 (Forte à esquerda) a 5 (Forte à direita). 3 é Neutro.</span>
        </div>

        <div className="flex flex-col gap-4">
          {/* Example scale item */}
          <div className="p-6 rounded-2xl bg-card border shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="w-full md:w-1/3 text-left font-medium">Ser espontâneo</div>
            <div className="w-full md:w-1/3 flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map(v => (
                <button key={v} className="w-10 h-10 rounded-full border bg-muted/30 hover:bg-primary hover:text-white transition-colors flex items-center justify-center font-bold">
                  {v}
                </button>
              ))}
            </div>
            <div className="w-full md:w-1/3 text-right font-medium text-muted-foreground">Seguir um plano fixo</div>
          </div>
          
          <div className="p-6 rounded-2xl bg-card border shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="w-full md:w-1/3 text-left font-medium">Fazer algo para as pessoas</div>
            <div className="w-full md:w-1/3 flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map(v => (
                <button key={v} className="w-10 h-10 rounded-full border bg-muted/30 hover:bg-primary hover:text-white transition-colors flex items-center justify-center font-bold">
                  {v}
                </button>
              ))}
            </div>
            <div className="w-full md:w-1/3 text-right font-medium text-muted-foreground">Estar com as pessoas</div>
          </div>
        </div>
      </div>
    </div>
  );
}
