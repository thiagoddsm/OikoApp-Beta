
'use client';

import React from 'react';
import Link from 'next/link';
import { Logo } from '@/components/icons';
import { Instagram, Youtube, Facebook, MapPin, Phone, Mail } from 'lucide-react';

export function PublicFooter() {
  return (
    <footer className="bg-slate-900 text-white pt-16 pb-8 border-t border-white/5">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Logo className="size-8 text-primary" />
              <span className="text-2xl font-black tracking-tighter">IBM</span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">
              Uma igreja de pessoas cuidando de pessoas. Somos uma família que vive o evangelho de forma prática e relevante.
            </p>
            <div className="flex gap-4">
              <a href="#" className="p-2 bg-white/5 rounded-full hover:bg-primary transition-colors"><Instagram size={18} /></a>
              <a href="#" className="p-2 bg-white/5 rounded-full hover:bg-primary transition-colors"><Youtube size={18} /></a>
              <a href="#" className="p-2 bg-white/5 rounded-full hover:bg-primary transition-colors"><Facebook size={18} /></a>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-lg mb-6">Links Rápidos</h4>
            <ul className="space-y-4 text-slate-400 text-sm">
              <li><Link href="/" className="hover:text-primary transition-colors">Início</Link></li>
              <li><Link href="/public/enrollment" className="hover:text-primary transition-colors">Cursos e GCs</Link></li>
              <li><Link href="/login" className="hover:text-primary transition-colors">Portal do Membro</Link></li>
              <li><Link href="/leader/new-member" className="hover:text-primary transition-colors">Área do Líder</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-lg mb-6">Escolas</h4>
            <ul className="space-y-4 text-slate-400 text-sm">
              <li><Link href="/dashboard/teaching/wave" className="hover:text-primary transition-colors">Wave Music School</Link></li>
              <li><Link href="/dashboard/teaching/dis" className="hover:text-primary transition-colors">Escola DIS</Link></li>
              <li><Link href="/dashboard/teaching/theoflix" className="hover:text-primary transition-colors">TheoFlix</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-lg mb-6">Contato</h4>
            <ul className="space-y-4 text-slate-400 text-sm">
              <li className="flex items-start gap-3">
                <MapPin className="size-5 text-primary shrink-0" />
                <span>Rua Dr. Getúlio Vargas, 1234<br />São Gonçalo - RJ</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="size-5 text-primary shrink-0" />
                <span>(21) 99999-9999</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="size-5 text-primary shrink-0" />
                <span>contato@ibm.com.br</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/5 text-center text-slate-500 text-xs">
          <p>&copy; {new Date().getFullYear()} Igreja Batista da Manhã. Todos os direitos reservados. OikoApp System.</p>
        </div>
      </div>
    </footer>
  );
}
