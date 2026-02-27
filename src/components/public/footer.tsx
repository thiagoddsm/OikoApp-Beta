
'use client';

import React from 'react';
import { Logo } from '@/components/icons';
import { Instagram, Youtube, Facebook, Mail, MapPin, Phone } from 'lucide-react';

export function PublicFooter() {
  return (
    <footer className="bg-slate-900 text-slate-300 py-16 border-t border-white/5">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-white">
              <Logo className="size-8 text-primary" />
              <span className="text-2xl font-bold tracking-tighter">OikoApp</span>
            </div>
            <p className="text-sm leading-relaxed opacity-70">
              Igreja Batista da Manhã. <br/>
              Um organismo vivo servindo à cidade de São Gonçalo através do amor e da inclusão.
            </p>
            <div className="flex gap-4">
              <Instagram className="size-5 hover:text-white cursor-pointer transition-colors" />
              <Youtube className="size-5 hover:text-white cursor-pointer transition-colors" />
              <Facebook className="size-5 hover:text-white cursor-pointer transition-colors" />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-white font-bold uppercase tracking-widest text-sm">Escolas</h4>
            <ul className="space-y-2 text-sm opacity-70">
              <li className="hover:text-white transition-colors cursor-pointer">Lumine (Teologia)</li>
              <li className="hover:text-white transition-colors cursor-pointer">Wave (Música)</li>
              <li className="hover:text-white transition-colors cursor-pointer">DIS (Inclusão)</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="text-white font-bold uppercase tracking-widest text-sm">Comunhão</h4>
            <ul className="space-y-2 text-sm opacity-70">
              <li className="hover:text-white transition-colors cursor-pointer">Encontre um GC</li>
              <li className="hover:text-white transition-colors cursor-pointer">Seja um Voluntário</li>
              <li className="hover:text-white transition-colors cursor-pointer">Agenda de Cultos</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="text-white font-bold uppercase tracking-widest text-sm">Contato</h4>
            <div className="space-y-3 text-sm opacity-70">
              <div className="flex items-start gap-3">
                <MapPin className="size-4 mt-1 shrink-0" />
                <span>Rua Dr. Feliciano Sodré, 123, <br/> Centro, São Gonçalo - RJ</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="size-4 shrink-0" />
                <span>(21) 99999-9999</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="size-4 shrink-0" />
                <span>contato@igreja.com.br</span>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-16 pt-8 border-t border-white/5 text-center text-xs opacity-40">
          <p>© {new Date().getFullYear()} Igreja Batista da Manhã. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
