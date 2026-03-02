'use client';

import React from 'react';
import { PublicNavbar } from '@/components/public/navbar';
import { PublicFooter } from '@/components/public/footer';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, Calendar, Sun, Moon, Users } from 'lucide-react';

export default function HorariosPage() {
    const cultos = [
        {
            dia: 'Domingo',
            horario: '09:00',
            nome: 'Culto da Família & Lumine',
            descricao: 'Comece o seu domingo buscando a Deus em família. Simultaneamente, ocorrem as nossas escolas bíblicas (Lumine).',
            icon: Sun
        },
        {
            dia: 'Domingo',
            horario: '18:30',
            nome: 'Culto de Celebração',
            descricao: 'Encerramento do fim de semana com muito louvor, adoração e uma palavra poderosa para a sua semana.',
            icon: Moon
        },
        {
            dia: 'Quarta-feira',
            horario: '20:00',
            nome: 'Culto de Oração e Ensino',
            descricao: 'No meio da semana, paramos para recarregar as energias, aprender mais da Palavra e orar juntos.',
            icon: Users
        }
    ];

    return (
        <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
            <PublicNavbar />
            <main className="flex-1 container mx-auto px-4 py-16 max-w-5xl">
                <header className="text-center space-y-4 mb-16 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="mx-auto bg-[#6A52A3]/10 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                        <Clock className="size-8 text-[#6A52A3]" />
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">
                        Horários de Culto
                    </h1>
                    <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                        Reserve um tempo na sua agenda para adorar a Deus em comunhão com a igreja. Será uma alegria receber você e sua família!
                    </p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {cultos.map((culto, index) => {
                        const Icon = culto.icon;
                        return (
                            <Card key={index} className="border-2 hover:border-[#6A52A3]/30 transition-all shadow-sm hover:shadow-md bg-white">
                                <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
                                    <div className="p-4 bg-slate-50 rounded-full">
                                        <Icon className="size-8 text-[#6A52A3]" />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#6A52A3]/10 text-[#6A52A3] rounded-full text-xs font-black uppercase tracking-widest">
                                            <Calendar className="size-3" /> {culto.dia}
                                        </div>
                                        <h3 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900">
                                            {culto.horario}
                                        </h3>
                                        <h4 className="font-bold text-slate-700">{culto.nome}</h4>
                                    </div>
                                    <p className="text-sm text-muted-foreground leading-relaxed pt-4 border-t border-dashed w-full">
                                        {culto.descricao}
                                    </p>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </main>
            <PublicFooter />
        </div>
    );
}