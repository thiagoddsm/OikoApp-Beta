'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/icons';

export function PublicFooter() {
  const [year, setYear] = useState(2025);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="bg-slate-950 text-slate-400 py-12 border-t border-white/5">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="md:col-span-2 space-y-6">
            <div className="flex items-center gap-2 text-white">
              <Logo className="size-8 text-primary" />
              <span className="text-xl font-black italic tracking-tighter uppercase">OikoApp</span>
            </div>
            <p className="max-w-md leading-relaxed text-sm">
              Um sistema ministerial desenvolvido para garantir que a organização sirva ao organismo. 
              Focado em pessoas, cuidado mútuo e excelência operacional.
            </p>
          </div>
          
          <div>
            <h4 className="text-white font-bold uppercase tracking-widest text-xs mb-6">Links Úteis</h4>
            <ul className="space-y-4 text-sm">
              <li><Link href="/public/enrollment" className="hover:text-white transition-colors">Inscrições Abertas</Link></li>
              <li><Link href="/login" className="hover:text-white transition-colors">Portal do Membro</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold uppercase tracking-widest text-xs mb-6">Contato</h4>
            <ul className="space-y-4 text-sm">
              <li>São Gonçalo, RJ</li>
              <li>contato@oikoapp.com.br</li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] uppercase font-bold tracking-widest">
          <p>© {year} OikoApp - Igreja Batista da Manhã</p>
          <p>Feito para o Reino</p>
        </div>
      </div>
    </footer>
  );
}
