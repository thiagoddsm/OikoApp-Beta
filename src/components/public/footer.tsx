
'use client';

import React from 'react';
import { Logo } from '@/components/icons';
import { Instagram, Youtube, Facebook, Mail, MapPin, Phone } from 'lucide-react';

export function PublicFooter() {
    return (
        <footer className="bg-slate-950 text-slate-400 py-16">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 text-white">
                            <Logo className="size-8 text-primary" />
                            <span className="text-2xl font-black italic tracking-tighter uppercase">OikoApp</span>
                        </div>
                        <p className="text-sm leading-relaxed">
                            Organizando a estrutura para servir ao organismo. Somos a Igreja Batista da Manhã em São Gonçalo.
                        </p>
                        <div className="flex gap-4">
                            <Instagram className="size-5 hover:text-white cursor-pointer transition-colors" />
                            <Youtube className="size-5 hover:text-white cursor-pointer transition-colors" />
                            <Facebook className="size-5 hover:text-white cursor-pointer transition-colors" />
                        </div>
                    </div>

                    <div>
                        <h4 className="text-white font-black uppercase tracking-widest text-xs mb-6">Ministérios</h4>
                        <ul className="space-y-4 text-sm font-medium">
                            <li className="hover:text-white cursor-pointer transition-colors">Rede de Células (GCs)</li>
                            <li className="hover:text-white cursor-pointer transition-colors">Escola Wave (Música)</li>
                            <li className="hover:text-white cursor-pointer transition-colors">Escola DIS (Inclusão)</li>
                            <li className="hover:text-white cursor-pointer transition-colors">Lumine (Discipulado)</li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-black uppercase tracking-widest text-xs mb-6">Portal IBM</h4>
                        <ul className="space-y-4 text-sm font-medium">
                            <li className="hover:text-white cursor-pointer transition-colors">Encontrar Célula</li>
                            <li className="hover:text-white cursor-pointer transition-colors">Inscrição em Cursos</li>
                            <li className="hover:text-white cursor-pointer transition-colors">Solicitar Oração</li>
                            <li className="hover:text-white cursor-pointer transition-colors">Fazer Doação</li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-black uppercase tracking-widest text-xs mb-6">Contato</h4>
                        <ul className="space-y-4 text-sm font-medium">
                            <li className="flex items-start gap-3">
                                <MapPin className="size-4 shrink-0 text-primary" />
                                <span>Rua Cel. Moreira César, 123, Centro, São Gonçalo - RJ</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <Phone className="size-4 shrink-0 text-primary" />
                                <span>(21) 99999-9999</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <Mail className="size-4 shrink-0 text-primary" />
                                <span>contato@igrejabatistadamanha.com.br</span>
                            </li>
                        </ul>
                    </div>
                </div>
                
                <div className="pt-8 border-t border-slate-900 text-center text-xs">
                    <p>© {new Date().getFullYear()} Igreja Batista da Manhã. Todos os direitos reservados.</p>
                    <p className="mt-2 text-slate-600 uppercase font-black tracking-widest">Organização a serviço do organismo</p>
                </div>
            </div>
        </footer>
    );
}
