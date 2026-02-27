
'use client';

import React from 'react';
import { Logo } from '@/components/icons';
import { MapPin, Phone, Mail, Instagram, Youtube, Facebook } from 'lucide-react';

export function PublicFooter() {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-8 border-t border-white/5">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-white">
              <Logo className="size-10 text-primary" />
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-tighter leading-none uppercase">IBM</span>
                <span className="text-[9px] font-bold uppercase tracking-[0.2em] opacity-70">Batista da Manhã</span>
              </div>
            </div>
            <p className="text-sm leading-relaxed">
              Uma igreja feita de pessoas, cuidando de pessoas. Nossa missão é levar a mensagem do evangelho de forma prática e relevante para toda a nossa cidade.
            </p>
            <div className="flex gap-4">
              <Instagram className="size-5 hover:text-primary cursor-pointer transition-colors" />
              <Youtube className="size-5 hover:text-primary cursor-pointer transition-colors" />
              <Facebook className="size-5 hover:text-primary cursor-pointer transition-colors" />
            </div>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6 uppercase tracking-widest text-xs">Explore</h4>
            <ul className="space-y-4 text-sm font-medium">
              <li><a href="/" className="hover:text-primary transition-colors">Home</a></li>
              <li><a href="/public/enrollment" className="hover:text-primary transition-colors">Cursos & Escolas</a></li>
              <li><a href="/dashboard/gc/map" className="hover:text-primary transition-colors">Mapa de GCs</a></li>
              <li><a href="/login" className="hover:text-primary transition-colors">Portal do Membro</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6 uppercase tracking-widest text-xs">Escolas</h4>
            <ul className="space-y-4 text-sm font-medium">
              <li><a href="/dashboard/teaching/wave" className="hover:text-primary transition-colors">Wave Music School</a></li>
              <li><a href="/dashboard/teaching/dis" className="hover:text-primary transition-colors">DIS Inclusão</a></li>
              <li><a href="/public/enrollment" className="hover:text-primary transition-colors">Trilha Lumine</a></li>
              <li><a href="/dashboard/teaching/theoflix" className="hover:text-primary transition-colors">TheoFlix</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6 uppercase tracking-widest text-xs">Contato</h4>
            <ul className="space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <MapPin className="size-5 text-primary shrink-0" />
                <span>R. Dr. Feliciano Sodré, 123 - Centro, São Gonçalo - RJ</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="size-5 text-primary shrink-0" />
                <span>(21) 99999-9999</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="size-5 text-primary shrink-0" />
                <span>secretaria@igreja.com.br</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-bold uppercase tracking-[0.2em] opacity-50">
          <p>© 2025 OikoApp para Igreja Batista da Manhã.</p>
          <div className="flex gap-6">
            <span>Privacidade</span>
            <span>Termos de Uso</span>
            <span>Governança</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
