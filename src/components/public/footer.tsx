
'use client';

import React from 'react';
import Link from 'next/link';
import { Logo } from '@/components/icons';
import { Instagram, Youtube, Facebook, MapPin, Phone, Mail } from 'lucide-react';

export function PublicFooter() {
  return (
    <footer className="bg-slate-900 text-slate-300 py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="space-y-6">
            <Link href="/" className="flex items-center gap-2 text-white">
              <Logo className="size-8" />
              <span className="text-2xl font-bold tracking-tighter">OikoApp</span>
            </Link>
            <p className="text-sm leading-relaxed">
              Igreja Batista da Manhã - Uma igreja feita de pessoas cuidando de pessoas. Onde o organismo é servido pela organização.
            </p>
            <div className="flex gap-4">
              <Link href="#" className="hover:text-white transition-colors"><Instagram size={20} /></Link>
              <Link href="#" className="hover:text-white transition-colors"><Youtube size={20} /></Link>
              <Link href="#" className="hover:text-white transition-colors"><Facebook size={20} /></Link>
            </div>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6 uppercase tracking-widest text-sm">Links Rápidos</h4>
            <ul className="space-y-4 text-sm font-medium">
              <li><Link href="/public/enrollment" className="hover:text-primary transition-colors">Trilha de Crescimento</Link></li>
              <li><Link href="/dashboard/gc/map" className="hover:text-primary transition-colors">Encontrar um GC</Link></li>
              <li><Link href="/public/finance-request" className="hover:text-primary transition-colors">Solicitações Financeiras</Link></li>
              <li><Link href="/login" className="hover:text-primary transition-colors">Portal do Membro</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6 uppercase tracking-widest text-sm">Escolas & Projetos</h4>
            <ul className="space-y-4 text-sm font-medium">
              <li><Link href="/dashboard/teaching/wave" className="hover:text-primary transition-colors">Escola Wave</Link></li>
              <li><Link href="/dashboard/teaching/dis" className="hover:text-primary transition-colors">Escola DIS</Link></li>
              <li><Link href="/dashboard/social" className="hover:text-primary transition-colors">Ação Social</Link></li>
              <li><Link href="/dashboard/teaching/theoflix" className="hover:text-primary transition-colors">TheoFlix</Link></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="text-white font-bold mb-6 uppercase tracking-widest text-sm">Localização</h4>
            <div className="flex items-start gap-3 text-sm">
              <MapPin className="size-5 shrink-0 text-primary" />
              <p>São Gonçalo, Rio de Janeiro - Brasil</p>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Phone className="size-5 shrink-0 text-primary" />
              <p>(21) 99999-9999</p>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Mail className="size-5 shrink-0 text-primary" />
              <p>contato@igreja.com</p>
            </div>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-slate-800 text-center text-xs">
          <p>&copy; {new Date().getFullYear()} OikoApp. Todos os direitos reservados à Igreja Batista da Manhã.</p>
        </div>
      </div>
    </footer>
  );
}
