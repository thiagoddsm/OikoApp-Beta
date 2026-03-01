'use client';

import React from 'react';
import { Logo } from "@/components/icons";

export function PublicFooter() {
  return (
    <footer className="bg-slate-900 text-slate-400 py-12 border-t border-white/5">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 items-start">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-white">
              <Logo className="size-6" />
              <span className="text-lg font-black tracking-tighter">OikoApp</span>
            </div>
            <p className="text-sm leading-relaxed max-w-xs">
              Garantindo que a organização sirva ao organismo. Gestão inteligente para o corpo de Cristo.
            </p>
          </div>
          
          <div className="space-y-4">
            <h4 className="text-white font-bold uppercase text-xs tracking-widest">Links Rápidos</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="/public/enrollment" className="hover:text-white transition-colors">Cursos e Trilhos</a></li>
              <li><a href="/login" className="hover:text-white transition-colors">Portal do Membro</a></li>
              <li><a href="/" className="hover:text-white transition-colors">Sobre a IBM</a></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="text-white font-bold uppercase text-xs tracking-widest">Localização</h4>
            <p className="text-sm">
              São Gonçalo, Rio de Janeiro<br />
              Brasil
            </p>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-white/5 text-center text-[10px] uppercase font-black tracking-widest">
          © {new Date().getFullYear()} OikoApp. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}
