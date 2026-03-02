'use client';

import React from 'react';
import Link from 'next/link'; // Importado para navegação interna
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
            {/* Adicionadas as tags <a> para torná-los clicáveis e acessíveis */}
            <a href="https://instagram.com/ibmanha" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="hover:text-white transition-colors">
              <Instagram className="size-5" />
            </a>
            <a href="https://youtube.com/@ibmanha" target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="hover:text-white transition-colors">
              <Youtube className="size-5" />
            </a>
            <a href="https://facebook.com/ibmanha" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="hover:text-white transition-colors">
              <Facebook className="size-5" />
            </a>
          </div>
        </div>

        <div className="space-y-6">
          <h4 className="text-white font-black uppercase tracking-widest text-sm">Contatos</h4>
          <ul className="space-y-4 text-sm">
            <li className="flex items-center gap-3"><Phone className="size-4 text-primary" /> (21) 99755-8801</li>
            <li className="flex items-center gap-3"><Mail className="size-4 text-primary" /> thiagomoura@ibmanha.com.br</li>
            <li className="flex items-start gap-3"><MapPin className="size-4 text-primary shrink-0" /> Travessa Maria Alice, 121 - Mutondo, São Gonçalo - RJ</li>
          </ul>
        </div>

        <div className="space-y-6">
          <h4 className="text-white font-black uppercase tracking-widest text-sm">Links Úteis</h4>
          <ul className="space-y-3 text-sm">
            {/* Trocado <a> por <Link> do Next.js e caminhos atualizados */}
            <li><Link href="/public/horarios" className="hover:text-white transition-colors">Horários de Culto</Link></li>
            <li><Link href="/public/localizacao" className="hover:text-white transition-colors">Localização</Link></li>
            <li><Link href="/public/oracao" className="hover:text-white transition-colors">Pedidos de Oração</Link></li>
            <li><Link href="/public/contribuicoes" className="hover:text-white transition-colors">Contribuições</Link></li>
          </ul>
        </div>

        <div className="space-y-6">
          <h4 className="text-white font-black uppercase tracking-widest text-sm">Lumina & Wave</h4>
          <p className="text-sm italic">Onde a teoria encontra a prática ministerial.</p>
          {/* No futuro, este bloco pode ser um componente que busca do Firebase Studio! */}
          <div className="bg-white/5 p-4 rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
             <p className="text-xs text-center text-slate-500 italic">Em breve novidades...</p>
          </div>
        </div>
      </div>
      <div className="container mx-auto px-4 mt-16 pt-8 border-t border-white/5 text-center text-[10px] uppercase font-bold tracking-[0.2em]">
        © {new Date().getFullYear()} Igreja Batista da Manhã. Todos os direitos reservados.
      </div>
    </footer>
  );
}