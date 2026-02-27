
'use client';

import React from 'react';
import Link from 'next/link';
import { Logo } from '@/components/icons';
import { Instagram, Youtube, Facebook, Mail, MapPin, Phone } from 'lucide-react';

export function PublicFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-8 border-t border-white/5">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Logo e Missão */}
          <div className="md:col-span-1 space-y-6">
            <Link href="/" className="flex items-center gap-2 text-white">
              <Logo className="h-8 w-8 text-primary" />
              <span className="text-xl font-black uppercase italic tracking-tighter">OikoApp</span>
            </Link>
            <p className="text-sm leading-relaxed opacity-80">
              Uma igreja feita de pessoas, cuidando de pessoas. Nossa missão é servir ao organismo através de uma organização excelente.
            </p>
            <div className="flex gap-4">
              <Link href="#" className="hover:text-primary transition-colors"><Instagram size={20}/></Link>
              <Link href="#" className="hover:text-primary transition-colors"><Youtube size={20}/></Link>
              <Link href="#" className="hover:text-primary transition-colors"><Facebook size={20}/></Link>
            </div>
          </div>

          {/* Links Rápidos */}
          <div>
            <h4 className="text-white font-bold uppercase tracking-widest text-xs mb-6">Institucional</h4>
            <ul className="space-y-4 text-sm">
              <li><Link href="/" className="hover:text-primary transition-colors">Nossa Visão</Link></li>
              <li><Link href="/public/enrollment" className="hover:text-primary transition-colors">Cursos & Escolas</Link></li>
              <li><Link href="/dashboard/gc/map" className="hover:text-primary transition-colors">Encontrar um GC</Link></li>
              <li><Link href="/login" className="hover:text-primary transition-colors">Portal do Membro</Link></li>
            </ul>
          </div>

          {/* Escolas */}
          <div>
            <h4 className="text-white font-bold uppercase tracking-widest text-xs mb-6">Ministérios</h4>
            <ul className="space-y-4 text-sm">
              <li><Link href="/dashboard/teaching/wave" className="hover:text-primary transition-colors">Wave Music School</Link></li>
              <li><Link href="/dashboard/teaching/dis" className="hover:text-primary transition-colors">DIS Inclusão</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Ação Social</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Ministério Infantil</Link></li>
            </ul>
          </div>

          {/* Contato */}
          <div>
            <h4 className="text-white font-bold uppercase tracking-widest text-xs mb-6">Fale Conosco</h4>
            <ul className="space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <MapPin size={18} className="text-primary shrink-0"/>
                <span>Rua das Oliveiras, 123 - Centro, São Gonçalo - RJ</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={18} className="text-primary shrink-0"/>
                <span>(21) 99999-8888</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail size={18} className="text-primary shrink-0"/>
                <span>contato@ibm.com.br</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/5 text-center text-xs opacity-50">
          <p>© {currentYear} Igreja Batista da Manhã. Desenvolvido com excelência para o Reino.</p>
        </div>
      </div>
    </footer>
  );
}
