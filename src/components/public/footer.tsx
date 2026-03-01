'use client';

import React from 'react';
import { Logo } from '@/components/icons';

export function PublicFooter() {
  return (
    <footer className="bg-slate-900 text-slate-400 py-12 px-6 border-t border-slate-800 mt-auto">
      <div className="container mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-white">
            <Logo className="size-6 text-primary" />
            <span className="text-lg font-black tracking-tighter uppercase italic">OikoApp</span>
          </div>
          <p className="text-sm leading-relaxed">
            Garantindo que a organização sirva ao organismo. Uma plataforma para gestão e cuidado ministerial.
          </p>
        </div>
        
        <div>
          <h4 className="text-white font-bold uppercase tracking-widest text-xs mb-4">Links Úteis</h4>
          <ul className="space-y-2 text-sm font-medium">
            <li><a href="/" className="hover:text-primary transition-colors">Home</a></li>
            <li><a href="/public/enrollment" className="hover:text-primary transition-colors">Portal de Inscrições</a></li>
            <li><a href="/login" className="hover:text-primary transition-colors">Portal do Membro</a></li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-bold uppercase tracking-widest text-xs mb-4">Contato</h4>
          <p className="text-sm">Igreja Batista da Manhã</p>
          <p className="text-sm mt-1">São Gonçalo, Rio de Janeiro</p>
          <p className="text-xs mt-4 opacity-50">Desenvolvido para fortalecer o organismo da igreja.</p>
        </div>
      </div>
      <div className="container mx-auto mt-12 pt-8 border-t border-slate-800 text-center text-[10px] uppercase tracking-widest font-bold">
        © {new Date().getFullYear()} OikoApp. Todos os direitos reservados.
      </div>
    </footer>
  );
}