
'use client';

import React from 'react';
import { Logo } from '@/components/icons';
import { Mail, Phone, MapPin, Instagram, Youtube, Facebook } from 'lucide-react';

export function PublicFooter() {
  return (
    <footer className="bg-slate-950 text-slate-400 py-16 border-t border-white/5">
      <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-white">
            <Logo className="size-8" />
            <span className="text-2xl font-black italic tracking-tighter uppercase">OikoApp</span>
          </div>
          <p className="text-sm leading-relaxed">
            A Igreja Batista da Manhã é um organismo vivo focado no cuidado de pessoas e na expansão do Reino através do serviço prático e do discipulado bíblico.
          </p>
          <div className="flex gap-4">
            <Instagram className="size-5 hover:text-white cursor-pointer transition-colors" />
            <Youtube className="size-5 hover:text-white cursor-pointer transition-colors" />
            <Facebook className="size-5 hover:text-white cursor-pointer transition-colors" />
          </div>
        </div>

        <div className="space-y-6">
          <h4 className="text-white font-black uppercase tracking-widest text-sm">Contatos</h4>
          <ul className="space-y-4 text-sm">
            <li className="flex items-center gap-3"><Phone className="size-4 text-primary" /> (21) 99999-9999</li>
            <li className="flex items-center gap-3"><Mail className="size-4 text-primary" /> contato@ibm.org.br</li>
            <li className="flex items-start gap-3"><MapPin className="size-4 text-primary shrink-0" /> Rua das Palmeiras, 123, São Gonçalo - RJ</li>
          </ul>
        </div>

        <div className="space-y-6">
          <h4 className="text-white font-black uppercase tracking-widest text-sm">Links Úteis</h4>
          <ul className="space-y-3 text-sm">
            <li><a href="#" className="hover:text-white transition-colors">Horários de Culto</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Localização</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Pedidos de Oração</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Contribuições</a></li>
          </ul>
        </div>

        <div className="space-y-6">
          <h4 className="text-white font-black uppercase tracking-widest text-sm">Lumina & Wave</h4>
          <p className="text-sm italic">Onde a teoria encontra a prática ministerial.</p>
          <div className="bg-white/5 p-4 rounded-xl border border-white/10">
            <p className="text-[10px] text-white font-bold uppercase mb-1">Próximo Módulo Lumine</p>
            <p className="text-xs">DNA & Visão - Domingo às 09h00</p>
          </div>
        </div>
      </div>
      <div className="container mx-auto px-4 mt-16 pt-8 border-t border-white/5 text-center text-[10px] uppercase font-bold tracking-[0.2em]">
        © {new Date().getFullYear()} Igreja Batista da Manhã. Todos os direitos reservados.
      </div>
    </footer>
  );
}
