'use client';

import React from 'react';
import Link from 'next/link';
import { Logo } from "@/components/icons";
import { Instagram, Youtube, Facebook } from 'lucide-react';

export function PublicFooter() {
  return (
    <footer className="border-t bg-slate-50">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Logo className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold tracking-tighter">OikoApp</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Sistema Operacional da Igreja Batista da Manhã. Garantindo que a Organização sirva ao Organismo.
            </p>
            <div className="flex gap-4">
              <Link href="#" className="text-muted-foreground hover:text-primary"><Instagram size={20}/></Link>
              <Link href="#" className="text-muted-foreground hover:text-primary"><Youtube size={20}/></Link>
              <Link href="#" className="text-muted-foreground hover:text-primary"><Facebook size={20}/></Link>
            </div>
          </div>

          <div>
            <h4 className="font-bold mb-4 uppercase text-xs tracking-widest text-slate-900">Institucional</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/" className="hover:text-primary transition-colors">Início</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Nossa História</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">O que cremos</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Fale Conosco</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4 uppercase text-xs tracking-widest text-slate-900">Ministérios</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/public/enrollment" className="hover:text-primary transition-colors">Lumine (Escola Bíblica)</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Wave (Música)</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">DIS (Inclusão)</Link></li>
              <li><Link href="/dashboard/gc/map" className="hover:text-primary transition-colors">Mapa de GCs</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4 uppercase text-xs tracking-widest text-slate-900">Endereço</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Rua Dr. Feliciano Sodré, 123<br />
              Centro, São Gonçalo - RJ<br />
              CEP: 24440-440
            </p>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t text-center text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Igreja Batista da Manhã. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
