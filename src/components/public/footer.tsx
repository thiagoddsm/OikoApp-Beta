'use client';

import React from 'react';
import { Logo } from '@/components/icons';

export function PublicFooter() {
  return (
    <footer className="border-t bg-slate-50 py-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <Logo className="size-6 text-primary" />
            <span className="text-lg font-bold tracking-tighter">OikoApp</span>
          </div>
          
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Igreja Batista da Manhã. Todos os direitos reservados.
          </p>
          
          <div className="flex gap-6 text-sm font-medium text-muted-foreground">
            <a href="#" className="hover:text-primary transition-colors">Privacidade</a>
            <a href="#" className="hover:text-primary transition-colors">Termos</a>
            <a href="#" className="hover:text-primary transition-colors">Contato</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
