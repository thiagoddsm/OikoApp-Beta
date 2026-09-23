'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { MapPin, Clock, Users, ArrowRight, X, Baby, Search, CheckCircle2 } from 'lucide-react';

const SQUADS = [
  { 
    id: 1, 
    name: "Anton N.", 
    type: "Homens", 
    day: "Terça", 
    time: "20:00",
    neighborhood: "Alcântara", 
    image: "https://images.unsplash.com/photo-1537511446984-935f663eb1f4?w=500&auto=format&fit=crop&q=80", 
    hasKids: false, 
    bio: "Tempo exclusivo para homens forjarem caráter e compartilharem a vida. Sem máscaras, com muita Palavra." 
  },
  { 
    id: 2, 
    name: "Lucas & Ana", 
    type: "Casais", 
    day: "Quarta", 
    time: "19:30",
    neighborhood: "Boaçu", 
    image: "https://images.unsplash.com/photo-1522529599102-193c0d76b5b6?w=500&auto=format&fit=crop&q=80", 
    hasKids: true, 
    bio: "Casados há 5 anos, amamos receber pessoas com um bom café, bolo e conselhos reais sobre casamento." 
  },
  { 
    id: 3, 
    name: "Sarah & Gabi", 
    type: "Jovens", 
    day: "Sábado", 
    time: "18:00",
    neighborhood: "Trindade", 
    image: "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=500&auto=format&fit=crop&q=80", 
    hasKids: false, 
    bio: "Uma galera autêntica. Muita risada, pizza pós-encontro e papo profundo sobre quem Jesus é na nossa geração." 
  },
  { 
    id: 4, 
    name: "Pr. Marcos", 
    type: "Misto", 
    day: "Quinta", 
    time: "20:00",
    neighborhood: "Colubandê", 
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&auto=format&fit=crop&q=80", 
    hasKids: true, 
    bio: "Um lugar de ensino sólido, oração intensa e cuidado familiar. Todos são bem-vindos." 
  },
];

const FILTERS_TYPE = ["Todos", "Homens", "Mulheres", "Jovens", "Casais", "Misto"];
const FILTERS_DAY = ["Qualquer dia", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

export default function GCPage() {
  const [selectedType, setSelectedType] = useState("Todos");
  const [selectedDay, setSelectedDay] = useState("Qualquer dia");
  const [selectedSquad, setSelectedSquad] = useState<typeof SQUADS[0] | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [formSent, setFormSent] = useState(false);

  useEffect(() => {
    // Basic body locking when drawer is open
    if (isDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isDrawerOpen]);

  const handleOpenDrawer = (squad: typeof SQUADS[0]) => {
    setSelectedSquad(squad);
    setFormSent(false);
    setIsDrawerOpen(true);
  };

  const filteredSquads = SQUADS.filter(s => {
    if (selectedType !== "Todos" && s.type !== selectedType) return false;
    if (selectedDay !== "Qualquer dia" && s.day !== selectedDay) return false;
    return true;
  });

  return (
    <div className="bg-[#fafafa] text-slate-900 min-h-screen font-sans">
      
      {/* 
        HEADER MINIMALISTA 
      */}
      <header className="fixed top-0 w-full z-40 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-black text-xl tracking-tighter text-slate-900">
            IB<span className="text-orange-600">MANHÃ</span>
          </Link>
          <div className="flex gap-4 items-center">
            <Link href="/" className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors hidden sm:block">Início</Link>
            <Link href="/login" className="bg-slate-900 text-white px-5 py-2 rounded-full text-sm font-bold hover:bg-slate-800 transition-all">
              Membros
            </Link>
          </div>
        </div>
      </header>

      {/* 
        HERO SECTION (Editorial / High Contrast) 
      */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <span className="inline-block px-3 py-1 mb-6 rounded-full bg-orange-100 text-orange-700 text-xs font-black uppercase tracking-widest">
            Encontre sua comunidade
          </span>
          <h1 className="text-5xl sm:text-7xl font-black tracking-tight text-slate-900 leading-[1.05] mb-6">
            Ninguém foi feito <br className="hidden sm:block" />
            para viver <span className="text-orange-600">sozinho.</span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
            Seja qual for a sua idade, fase da vida ou bairro em São Gonçalo, 
            existe um Grupo de Crescimento (GC) de portas abertas para você nesta semana.
          </p>
        </div>
        
        {/* Background Decorative Blur */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-orange-500/5 blur-[120px] rounded-full pointer-events-none -z-10" />
      </section>

      {/* 
        FILTROS ÁGEIS (Chips)
      */}
      <section className="sticky top-16 z-30 bg-[#fafafa]/90 backdrop-blur-xl border-b border-slate-200/50 py-4 px-6 shadow-sm">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            
            {/* Perfis */}
            <div className="flex gap-2 overflow-x-auto w-full pb-2 sm:pb-0 hide-scrollbar">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 self-center mr-2">Perfil:</span>
              {FILTERS_TYPE.map(t => (
                <button 
                  key={t}
                  onClick={() => setSelectedType(t)}
                  className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                    selectedType === t 
                      ? 'bg-slate-900 text-white' 
                      : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-400'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* 
        GRID DE SQUADS / GCs
      */}
      <section className="py-16 px-6 max-w-6xl mx-auto min-h-[50vh]">
        {filteredSquads.length === 0 ? (
          <div className="text-center py-20">
            <Search className="mx-auto h-12 w-12 text-slate-300 mb-4" />
            <h3 className="text-xl font-bold text-slate-900">Nenhum GC encontrado</h3>
            <p className="text-slate-500 mt-2">Tente mudar os filtros para ver outras opções.</p>
            <button onClick={() => { setSelectedType("Todos"); setSelectedDay("Qualquer dia"); }} className="mt-4 text-orange-600 font-bold hover:underline">
              Limpar filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSquads.map((squad) => (
              <div key={squad.id} className="bg-white rounded-3xl border border-slate-200/60 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col">
                <div className="relative h-48 overflow-hidden bg-slate-100">
                  <img src={squad.image} alt={squad.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  <div className="absolute top-4 left-4 flex flex-col gap-2">
                    <span className="bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider text-slate-900 shadow-sm">
                      {squad.type}
                    </span>
                    {squad.hasKids && (
                      <span className="bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-slate-600 shadow-sm flex items-center gap-1.5 w-fit">
                        <Baby className="w-3.5 h-3.5" /> Kids
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="p-6 flex flex-col flex-1">
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-4">{squad.name}</h3>
                  
                  <div className="space-y-2.5 mb-6">
                    <div className="flex items-center gap-3 text-slate-600 text-sm font-medium">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                        <MapPin className="w-4 h-4 text-slate-900" />
                      </div>
                      {squad.neighborhood}
                    </div>
                    <div className="flex items-center gap-3 text-slate-600 text-sm font-medium">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                        <Clock className="w-4 h-4 text-slate-900" />
                      </div>
                      {squad.day}s às {squad.time}
                    </div>
                  </div>

                  <div className="mt-auto pt-6 border-t border-slate-100">
                    <button 
                      onClick={() => handleOpenDrawer(squad)}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors active:scale-[0.98]"
                    >
                      Quero Participar <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* FOOTER MINIMALISTA */}
      <footer className="border-t border-slate-200 bg-white py-12 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <p className="text-slate-400 font-medium text-sm">
            © {new Date().getFullYear()} Igreja Batista da Manhã. Mudar a cidade através do discipulado.
          </p>
        </div>
      </footer>

      {/* 
        MODAL / DRAWER (Atrito Zero)
      */}
      {isDrawerOpen && selectedSquad && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 transition-opacity"
            onClick={() => setIsDrawerOpen(false)}
          />
          
          {/* Drawer Panel */}
          <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="font-black text-xl tracking-tight text-slate-900">Solicitar Participação</h2>
              <button 
                onClick={() => setIsDrawerOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6">
              {!formSent ? (
                <>
                  <div className="flex gap-4 items-center mb-6">
                    <img src={selectedSquad.image} alt={selectedSquad.name} className="w-16 h-16 rounded-full object-cover shadow-sm border border-slate-100" />
                    <div>
                      <h3 className="font-bold text-lg text-slate-900">{selectedSquad.name}</h3>
                      <p className="text-sm text-slate-500">{selectedSquad.day}s às {selectedSquad.time} · {selectedSquad.neighborhood}</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl mb-8 border border-slate-100">
                    <p className="text-sm text-slate-600 leading-relaxed italic">
                      "{selectedSquad.bio}"
                    </p>
                  </div>

                  <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); setFormSent(true); }}>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Seu Nome *</label>
                      <input 
                        type="text" 
                        required
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                        placeholder="Como gostaria de ser chamado?"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">WhatsApp *</label>
                      <input 
                        type="tel" 
                        required
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                        placeholder="(21) 99999-9999"
                      />
                    </div>

                    <div className="pt-4">
                      <button 
                        type="submit"
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black py-4 rounded-xl shadow-lg shadow-orange-600/20 transition-all active:scale-[0.98] flex justify-center items-center gap-2"
                      >
                        Enviar Solicitação
                      </button>
                      <p className="text-center text-xs text-slate-400 mt-4 font-medium">
                        O líder receberá seu contato e te chamará no WhatsApp com o endereço exato.
                      </p>
                    </div>
                  </form>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-4 animate-in fade-in duration-500">
                  <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center text-green-600 mb-4">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Solicitação Enviada!</h3>
                  <p className="text-slate-500 max-w-[280px]">
                    Incrível! O líder do GC foi notificado e entrará em contato pelo seu WhatsApp muito em breve.
                  </p>
                  <button 
                    onClick={() => setIsDrawerOpen(false)}
                    className="mt-8 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold px-8 py-3 rounded-full transition-colors"
                  >
                    Voltar para GCs
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Hide global scrollbars helper classes (if not in globals.css) */}
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}
