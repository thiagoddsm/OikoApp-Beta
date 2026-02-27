'use client';

import React from 'react';
import Link from 'next/link';
import { Logo } from '@/components/icons';
import { Instagram, Youtube, Facebook, Mail, MapPin, Phone } from 'lucide-react';

export function PublicFooter() {
  return (
    <footer className="bg-slate-900 text-slate-300 py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-white">
              <Logo className="size-8 text-primary" />
              <span className="text-2xl font-bold tracking-tighter">OikoApp</span>
            </div>
            <p className="text-sm leading-relaxed">
              Igreja Batista da Manhã. <br/>
              Um organismo vivo servindo através de uma organização excelente.
            </p>
            <div className="flex gap-4">
              <Link href="#" className="hover:text-white transition-colors"><Instagram size={20}/></Link>
              <Link href="#" className="hover:text-white transition-colors"><Youtube size={20}/></Link>
              <Link href="#" className="hover:text-white transition-colors"><Facebook size={20}/></Link>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-white font-bold mb-6 uppercase text-xs tracking-widest">Atalhos</h4>
            <ul className="space-y-4 text-sm">
              <li><Link href="/" className="hover:text-white transition-colors">Início</Link></li>
              <li><Link href="/public/enrollment" className="hover:text-white transition-colors">Inscrições</Link></li>
              <li><Link href="/login" className="hover:text-white transition-colors">Portal do Membro</Link></li>
              <li><Link href="/public/enrollment" className="hover:text-white transition-colors">Encontrar um GC</Link></li>
            </ul>
          </div>

          {/* Contato */}
          <div>
            <h4 className="text-white font-bold mb-6 uppercase text-xs tracking-widest">Contato</h4>
            <ul className="space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <MapPin size={18} className="text-primary shrink-0" />
                <span>Rua Salvatori, São Gonçalo - RJ</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={18} className="text-primary shrink-0" />
                <span>(21) 99999-9999</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail size={18} className="text-primary shrink-0" />
                <span>contato@ibm.com.br</span>
              </li>
            </ul>
          </div>

          {/* Newsletter / CTA */}
          <div>
            <h4 className="text-white font-bold mb-6 uppercase text-xs tracking-widest">Inclusão</h4>
            <p className="text-xs leading-relaxed mb-4">
              Faça parte da nossa rede de voluntariado e ajude a transformar vidas através da Escola Wave e DIS.
            </p>
            <Link href="/public/enrollment" className="text-primary font-bold text-sm hover:underline">
              Saiba como servir &rarr;
            </Link>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-slate-800 text-center text-xs opacity-50">
          <p>&copy; {new Date().getFullYear()} Igreja Batista da Manhã. Todos os direitos reservados. OikoApp v1.0.</p>
        </div>
      </div>
    </footer>
  );
}
