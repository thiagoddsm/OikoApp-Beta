
'use client';

import React from 'react';
import Link from 'next/link';
import { Logo } from '@/components/icons';

export function PublicFooter() {
  return (
    <footer className="bg-slate-950 text-white py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="md:col-span-2 space-y-6">
            <div className="flex items-center gap-2">
              <Logo className="size-10 text-primary" />
              <span className="text-2xl font-black tracking-tighter">OikoApp</span>
            </div>
            <p className="text-slate-400 max-w-sm leading-relaxed">
              O sistema operacional para igrejas que buscam excelência no cuidado pastoral e eficiência administrativa.
            </p>
          </div>
          
          <div>
            <h4 className="font-bold mb-6 uppercase text-xs tracking-widest text-slate-500">Recursos</h4>
            <ul className="space-y-4 text-sm font-medium">
              <li><Link href="/public/enrollment" className="hover:text-primary transition-colors">Inscrições</Link></li>
              <li><Link href="/dashboard/teaching/theoflix" className="hover:text-primary transition-colors">TheoFlix</Link></li>
              <li><Link href="/dashboard/gc/map" className="hover:text-primary transition-colors">Mapa de GCs</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-6 uppercase text-xs tracking-widest text-slate-500">Comunidade</h4>
            <ul className="space-y-4 text-sm font-medium">
              <li><Link href="/login" className="hover:text-primary transition-colors">Portal do Membro</Link></li>
              <li><Link href="/leader/new-member" className="hover:text-primary transition-colors">Novos Visitantes</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t border-slate-900 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500 font-bold uppercase tracking-widest">
          <p>© {new Date().getFullYear()} OikoApp - Igreja Batista da Manhã</p>
          <div className="flex gap-6">
            <Link href="#" className="hover:text-white transition-colors">Privacidade</Link>
            <Link href="#" className="hover:text-white transition-colors">Termos</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
