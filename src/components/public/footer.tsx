import React from 'react';
import { Logo } from '@/components/icons';

export function PublicFooter() {
  return (
    <footer className="bg-slate-900 text-white py-12 border-t border-white/10">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col items-center md:items-start gap-4">
            <div className="flex items-center gap-2">
              <Logo className="size-8 text-primary" />
              <span className="text-2xl font-black tracking-tighter">OikoApp</span>
            </div>
            <p className="text-slate-400 text-sm max-w-xs text-center md:text-left">
              Garantindo que a organização sirva ao organismo. Uma solução completa para gestão eclesiástica moderna.
            </p>
          </div>
          
          <div className="text-center md:text-right text-slate-500 text-sm">
            <p>© {new Date().getFullYear()} Igreja Batista da Manhã.</p>
            <p className="mt-1">Desenvolvido com excelência para o Reino.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}