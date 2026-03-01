
'use client';

import React from 'react';
import { Logo } from '@/components/icons';
import Link from 'next/link';

export function PublicFooter() {
  return (
    <footer className="w-full border-t bg-slate-50 py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <Logo className="size-6 text-primary" />
              <span className="text-lg font-bold tracking-tighter">OikoApp</span>
            </div>
            <p className="text-sm text-muted-foreground max-w-xs">
              O sistema operacional da Igreja Batista da Manhã. Garantindo que a Organização sirva ao Organismo.
            </p>
          </div>
          
          <div>
            <h4 className="font-bold mb-4">Links Úteis</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/public/enrollment" className="hover:text-primary transition-colors">Inscrições</Link></li>
              <li><Link href="/dashboard/gc/map" className="hover:text-primary transition-colors">Mapa de GCs</Link></li>
              <li><Link href="/login" className="hover:text-primary transition-colors">Acesso Membro</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4">Contato</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>suporte@oikoapp.com.br</li>
              <li>São Gonçalo, RJ</li>
            </ul>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Igreja Batista da Manhã. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}
