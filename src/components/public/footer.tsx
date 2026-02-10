import React from 'react';
import Link from 'next/link';
import { Logo } from "@/components/icons";
import { Facebook, Instagram, Youtube, MapPin, Phone, Mail } from 'lucide-react';

export function PublicFooter() {
  return (
    <footer className="bg-slate-900 text-slate-300 py-16 border-t border-slate-800">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="space-y-6">
            <Link href="/" className="flex items-center gap-2">
              <Logo className="size-10 text-primary" />
              <span className="text-2xl font-black tracking-tighter text-white">IBM</span>
            </Link>
            <p className="text-sm leading-relaxed">
              Uma igreja feita de pessoas para pessoas. Vivendo a missão de Jesus Cristo em São Gonçalo e no mundo.
            </p>
            <div className="flex gap-4">
              <Link href="#" className="hover:text-primary transition-colors"><Instagram size={20}/></Link>
              <Link href="#" className="hover:text-primary transition-colors"><Facebook size={20}/></Link>
              <Link href="#" className="hover:text-primary transition-colors"><Youtube size={20}/></Link>
            </div>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6 uppercase tracking-widest text-sm">Links Rápidos</h4>
            <ul className="space-y-4 text-sm">
              <li><Link href="/" className="hover:text-white">Início</Link></li>
              <li><Link href="/public/enrollment" className="hover:text-white">Inscrição em GCs</Link></li>
              <li><Link href="/dashboard/teaching/calendar" className="hover:text-white">Agenda de Cursos</Link></li>
              <li><Link href="/login" className="hover:text-white">Portal do Membro</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6 uppercase tracking-widest text-sm">Escolas</h4>
            <ul className="space-y-4 text-sm">
              <li><Link href="/dashboard/teaching/wave" className="hover:text-white">Wave Music School</Link></li>
              <li><Link href="/dashboard/teaching/dis" className="hover:text-white">Escola DIS</Link></li>
              <li><Link href="/dashboard/teaching/theoflix" className="hover:text-white">TheoFlix (EAD)</Link></li>
              <li><Link href="/leader/new-member" className="hover:text-white">Sou Visitante</Link></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="text-white font-bold mb-6 uppercase tracking-widest text-sm">Contato</h4>
            <div className="flex items-start gap-3 text-sm">
              <MapPin size={18} className="text-primary shrink-0" />
              <p>Rua da Igreja, 123 - Centro, São Gonçalo - RJ</p>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Phone size={18} className="text-primary shrink-0" />
              <p>(21) 99999-8888</p>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Mail size={18} className="text-primary shrink-0" />
              <p>contato@ibm.org.br</p>
            </div>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-slate-800 text-center text-xs opacity-50">
          <p>© {new Date().getFullYear()} Igreja Batista da Manhã. Todos os direitos reservados. Operado por OikoApp.</p>
        </div>
      </div>
    </footer>
  );
}
