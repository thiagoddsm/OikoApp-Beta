
'use client';

import React from 'react';
import Link from 'next/link';
import { Logo } from "@/components/icons";
import { Instagram, Youtube, Facebook, Mail, MapPin, Phone } from 'lucide-react';

export function PublicFooter() {
  return (
    <footer className="bg-slate-900 text-slate-300 py-16 border-t border-slate-800">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Logo className="size-10 text-primary" />
              <span className="text-2xl font-black tracking-tighter text-white">IBM</span>
            </div>
            <p className="text-sm leading-relaxed">
              Uma igreja feita de pessoas, cuidando de pessoas. Nossa missão é viver o evangelho de forma prática e relevante em nossa cidade.
            </p>
            <div className="flex gap-4">
              <Link href="#" className="hover:text-primary transition-colors"><Instagram size={20}/></Link>
              <Link href="#" className="hover:text-primary transition-colors"><Youtube size={20}/></Link>
              <Link href="#" className="hover:text-primary transition-colors"><Facebook size={20}/></Link>
            </div>
          </div>

          <div className="space-y-6">
            <h4 className="text-white font-bold uppercase tracking-widest text-sm">Links Úteis</h4>
            <nav className="flex flex-col gap-3 text-sm font-medium">
              <Link href="/public/enrollment" className="hover:text-white transition-colors">Inscrições em Cursos</Link>
              <Link href="/public/enrollment?tab=lumine" className="hover:text-white transition-colors">Trilha de Crescimento</Link>
              <Link href="/public/event-planning" className="hover:text-white transition-colors">Protocolar Evento</Link>
              <Link href="/login" className="hover:text-white transition-colors">Portal do Membro</Link>
            </nav>
          </div>

          <div className="space-y-6">
            <h4 className="text-white font-bold uppercase tracking-widest text-sm">Ministérios</h4>
            <nav className="flex flex-col gap-3 text-sm font-medium">
              <Link href="#" className="hover:text-white transition-colors">Células (GCs)</Link>
              <Link href="/dashboard/teaching/wave" className="hover:text-white transition-colors">Wave Music School</Link>
              <Link href="/dashboard/teaching/dis" className="hover:text-white transition-colors">Escola DIS</Link>
              <Link href="#" className="hover:text-white transition-colors">Ação Social</Link>
            </nav>
          </div>

          <div className="space-y-6">
            <h4 className="text-white font-bold uppercase tracking-widest text-sm">Contato</h4>
            <div className="flex flex-col gap-4 text-sm">
              <div className="flex items-start gap-3">
                <MapPin className="size-5 text-primary shrink-0" />
                <span>Rua Dr. Feliciano Sodré, São Gonçalo - RJ</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="size-5 text-primary shrink-0" />
                <span>(21) 9999-9999</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="size-5 text-primary shrink-0" />
                <span>contato@ibm.com.br</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-16 pt-8 border-t border-slate-800 text-center text-xs opacity-50">
          <p>© {new Date().getFullYear()} Igreja Batista da Manhã. Todos os direitos reservados.</p>
          <p className="mt-2 text-primary font-bold">O organismo servido pela organização.</p>
        </div>
      </div>
    </footer>
  );
}
