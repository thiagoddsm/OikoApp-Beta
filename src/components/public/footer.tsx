
'use client';

import React from 'react';
import Link from 'next/link';
import { Logo } from '@/components/icons';

export function PublicFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-slate-950 text-slate-400 py-16 border-t border-white/5">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-1 md:col-span-2 space-y-6">
            <Link href="/" className="flex items-center gap-2 text-white">
              <Logo className="size-8 text-primary" />
              <span className="text-2xl font-bold tracking-tighter">OikoApp</span>
            </Link>
            <p className="max-w-sm text-sm leading-relaxed">
              O sistema operacional da Igreja Batista da Manhã. Garantindo que a Organização sirva ao Organismo para a glória de Deus.
            </p>
          </div>
          
          <div>
            <h4 className="text-white font-bold mb-6 uppercase tracking-widest text-xs">Links Úteis</h4>
            <ul className="space-y-4 text-sm">
              <li><Link href="/public/enrollment" className="hover:text-white transition-colors">Inscrições abertas</Link></li>
              <li><Link href="/login" className="hover:text-white transition-colors">Portal do Membro</Link></li>
              <li><Link href="/dashboard/gc/map" className="hover:text-white transition-colors">Mapa de GCs</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6 uppercase tracking-widest text-xs">Escolas</h4>
            <ul className="space-y-4 text-sm">
              <li><Link href="/dashboard/teaching/theoflix" className="hover:text-white transition-colors">TheoFlix</Link></li>
              <li><Link href="/dashboard/teaching/wave" className="hover:text-white transition-colors">Escola Wave</Link></li>
              <li><Link href="/dashboard/teaching/dis" className="hover:text-white transition-colors">Escola DIS</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-xs">
            &copy; {year} Igreja Batista da Manhã. Todos os direitos reservados.
          </p>
          <div className="flex gap-6 text-xs">
            <Link href="#" className="hover:text-white transition-colors">Privacidade</Link>
            <Link href="#" className="hover:text-white transition-colors">Termos de Uso</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
