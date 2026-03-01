'use client';

import React from 'react';
import { Logo } from "@/components/icons";

export function PublicFooter() {
  return (
    <footer className="border-t bg-slate-50 py-12 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <Logo className="size-6 text-primary opacity-50" />
            <span className="text-lg font-bold text-slate-400 tracking-tighter">OikoApp</span>
          </div>
          <div className="text-center md:text-right">
            <p className="text-sm text-slate-500">© {new Date().getFullYear()} Igreja Batista da Manhã. Todos os direitos reservados.</p>
            <p className="text-xs text-slate-400 mt-1">Garantindo que a Organização sirva ao Organismo.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
