'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, Clock, ArrowRight, X, Baby, Search, CheckCircle2 } from 'lucide-react';
import { getPublicGCs } from '@/app/public/enrollment/actions';

const FILTERS_TYPE = ["Todos", "Homens", "Mulheres", "Jovens", "Casais", "Misto"];

export function GCFinder() {
  const [selectedType, setSelectedType] = useState("Todos");
  const [squads, setSquads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSquad, setSelectedSquad] = useState<any | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [formSent, setFormSent] = useState(false);

  useEffect(() => {
    async function loadGCs() {
      setIsLoading(true);
      try {
        const realGCs = await getPublicGCs();
        console.log("realGCs returned from action:", realGCs);
        setSquads(Array.isArray(realGCs) ? realGCs : []);
      } catch (error) {
        console.error("Erro ao buscar GCs na action:", error);
        setSquads([]);
      } finally {
        setIsLoading(false);
      }
    }
    loadGCs();
  }, []);

  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isDrawerOpen]);

  const handleOpenDrawer = (squad: any) => {
    setSelectedSquad(squad);
    setFormSent(false);
    setIsDrawerOpen(true);
  };

  const filteredSquads = squads.filter(s => {
    if (selectedType !== "Todos" && s.type !== selectedType) return false;
    return true;
  });

  if (isLoading) {
    console.log("GCFinder rendering Loading state");
    return (
      <div className="w-full flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  console.log("GCFinder rendering Grid, squads length:", filteredSquads.length);
  return (
    <div className="w-full">
      {/* Filtros */}
      <div className="flex justify-center mb-10">
        <div className="flex gap-2 overflow-x-auto w-full max-w-2xl pb-2 sm:pb-0 hide-scrollbar px-4 sm:px-0">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 self-center mr-2">Filtro:</span>
          {FILTERS_TYPE.map(t => (
            <button 
              key={t}
              onClick={() => setSelectedType(t)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold transition-all shadow-sm ${
                selectedType === t 
                  ? 'bg-primary text-white border-primary' 
                  : 'bg-white border border-outline-variant/40 text-on-surface-variant hover:border-primary/50'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-6xl mx-auto px-4">
        {filteredSquads.length === 0 ? (
          <div className="text-center py-20 glass-card rounded-3xl border border-outline-variant/20">
            <Search className="mx-auto h-12 w-12 text-slate-300 mb-4" />
            <h3 className="text-xl font-bold text-on-surface">Nenhum GC encontrado</h3>
            <p className="text-on-surface-variant mt-2">Tente mudar os filtros para ver outras opções.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSquads.map((squad) => (
              <div key={squad.id} className="bg-white rounded-3xl border border-outline-variant/30 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col apple-shadow">
                <div className="relative h-48 overflow-hidden bg-surface-container">
                  <img src={squad.image} alt={squad.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  <div className="absolute top-4 left-4 flex flex-col gap-2">
                    <span className="bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-on-surface shadow-sm">
                      {squad.type}
                    </span>
                    {squad.hasKids && (
                      <span className="bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-on-surface-variant shadow-sm flex items-center gap-1.5 w-fit">
                        <Baby className="w-3.5 h-3.5" /> Kids
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="p-6 flex flex-col flex-1">
                  <h3 className="text-2xl font-black text-on-surface font-display tracking-tight mb-4">{squad.name}</h3>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-3 text-on-surface-variant text-sm font-body font-medium">
                      <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center shrink-0">
                        <MapPin className="w-4 h-4 text-primary" />
                      </div>
                      {squad.neighborhood}
                    </div>
                    <div className="flex items-center gap-3 text-on-surface-variant text-sm font-body font-medium">
                      <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center shrink-0">
                        <Clock className="w-4 h-4 text-primary" />
                      </div>
                      {squad.day}s às {squad.time}
                    </div>
                  </div>

                  <div className="mt-auto pt-6 border-t border-outline-variant/10">
                    <button 
                      onClick={() => handleOpenDrawer(squad)}
                      className="w-full bg-primary hover:opacity-90 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98]"
                    >
                      Quero Participar <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Drawer */}
      {isDrawerOpen && selectedSquad && (
        <>
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] transition-opacity"
            onClick={() => setIsDrawerOpen(false)}
          />
          
          <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-surface shadow-2xl z-[10000] flex flex-col animate-in slide-in-from-right duration-300 border-l border-outline-variant/20">
            <div className="flex items-center justify-between p-6 border-b border-outline-variant/20 bg-white">
              <h2 className="font-display font-black text-xl tracking-tight text-on-surface">Solicitar Participação</h2>
              <button 
                onClick={() => setIsDrawerOpen(false)}
                className="p-2 hover:bg-surface-container rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-on-surface-variant" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6 bg-surface">
              {!formSent ? (
                <>
                  <div className="flex gap-4 items-center mb-6">
                    <img src={selectedSquad.image} alt={selectedSquad.name} className="w-16 h-16 rounded-full object-cover shadow-sm border border-outline-variant/20" />
                    <div>
                      <h3 className="font-bold text-lg text-on-surface font-display">{selectedSquad.name}</h3>
                      <p className="text-sm text-on-surface-variant font-body">{selectedSquad.day}s às {selectedSquad.time} · {selectedSquad.neighborhood}</p>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl mb-8 border border-outline-variant/20 apple-shadow">
                    <p className="text-sm text-on-surface-variant leading-relaxed italic font-body">
                      "{selectedSquad.bio}"
                    </p>
                  </div>

                  <form className="space-y-5" onSubmit={(e) => { 
                    e.preventDefault(); 
                    setFormSent(true);
                    if (selectedSquad?.whatsapp) {
                      const phone = selectedSquad.whatsapp.replace(/\D/g, '');
                      if (phone) {
                        const url = `https://wa.me/55${phone}?text=${encodeURIComponent(`Olá ${selectedSquad.name}! Encontrei o seu GC no site da igreja e gostaria de fazer uma visita!`)}`;
                        window.open(url, '_blank');
                      }
                    }
                  }}>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-on-surface">Seu Nome *</label>
                      <input 
                        type="text" 
                        required
                        className="w-full px-4 py-3 bg-white border border-outline-variant/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-on-surface"
                        placeholder="Como gostaria de ser chamado?"
                      />
                    </div>

                    <div className="pt-4">
                      <button 
                        type="submit"
                        className="w-full bg-primary hover:opacity-90 text-white font-black font-display py-4 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] flex justify-center items-center gap-2"
                      >
                        Chamar no WhatsApp
                      </button>
                      <p className="text-center text-xs text-on-surface-variant/70 mt-4 font-medium font-body">
                        Você será redirecionado para o WhatsApp do líder para combinar o endereço exato.
                      </p>
                    </div>
                  </form>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-4 animate-in fade-in duration-500">
                  <div className="w-20 h-20 bg-[#6bfe9c]/20 rounded-full flex items-center justify-center text-[#006d37] mb-4">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-black text-on-surface font-display tracking-tight">Redirecionando!</h3>
                  <p className="text-on-surface-variant max-w-[280px] font-body">
                    Incrível! Continue a conversa no seu WhatsApp e agende a sua primeira visita.
                  </p>
                  <button 
                    onClick={() => setIsDrawerOpen(false)}
                    className="mt-8 bg-surface-container hover:bg-surface-container-high text-on-surface font-bold px-8 py-3 rounded-full transition-colors"
                  >
                    Voltar para GCs
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}
