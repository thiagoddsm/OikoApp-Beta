'use client';

import React from 'react';
import { PublicNavbar } from '@/components/public/navbar';
import { PublicFooter } from '@/components/public/footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation, Car, Bus } from 'lucide-react';

export default function LocalizacaoPage() {
    return (
        <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
            <PublicNavbar />
            <main className="flex-1 container mx-auto px-4 py-16 max-w-6xl">
                <header className="text-center space-y-4 mb-16 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="mx-auto bg-[#6A52A3]/10 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                        <MapPin className="size-8 text-[#6A52A3]" />
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">
                        Como Chegar
                    </h1>
                    <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                        Estamos localizados no coração de São Gonçalo. Venha nos fazer uma visita!
                    </p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    {/* Mapa (Placeholder que pode ser substituído por um iframe do Google Maps) */}
                    <Card className="border-2 shadow-sm overflow-hidden h-[400px] lg:h-[500px] relative bg-slate-200">
                        {/* Substitua a div abaixo por um <iframe src="URL_DO_MAPA"...> do Google Maps */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 bg-slate-100">
                            <MapPin className="size-16 mb-4 opacity-50" />
                            <p className="font-bold uppercase tracking-widest text-sm">Mapa Interativo (Google Maps)</p>
                            <p className="text-xs italic mt-2">Adicione o iframe do Google Maps aqui</p>
                        </div>
                    </Card>

                    <div className="space-y-6">
                        <Card className="border-2 shadow-sm bg-white">
                            <CardContent className="p-8 space-y-6">
                                <div>
                                    <h3 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-2">Nosso Endereço</h3>
                                    <p className="text-2xl font-black italic uppercase tracking-tighter text-slate-900 leading-none mb-2">
                                        Igreja Batista da Manhã
                                    </p>
                                    <p className="text-slate-600 text-lg">
                                        Rua das Palmeiras, 123<br />
                                        Centro - São Gonçalo, RJ<br />
                                        CEP: 24400-000
                                    </p>
                                </div>

                                <div className="pt-6 border-t border-dashed space-y-4">
                                    <h3 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Como chegar</h3>
                                    <div className="flex gap-4">
                                        <div className="flex-1 bg-slate-50 p-4 rounded-xl border flex flex-col items-center text-center gap-2">
                                            <Car className="size-6 text-[#6A52A3]" />
                                            <span className="text-xs font-bold text-slate-700">Temos estacionamento no local para visitantes.</span>
                                        </div>
                                        <div className="flex-1 bg-slate-50 p-4 rounded-xl border flex flex-col items-center text-center gap-2">
                                            <Bus className="size-6 text-[#6A52A3]" />
                                            <span className="text-xs font-bold text-slate-700">Fácil acesso por diversas linhas de ônibus no Centro.</span>
                                        </div>
                                    </div>
                                </div>

                                <Button 
                                    className="w-full h-14 font-black text-base uppercase tracking-[0.1em] bg-[#6A52A3] hover:bg-[#584289] text-white rounded-full mt-4"
                                    onClick={() => window.open('https://maps.google.com/?q=São+Gonçalo+RJ', '_blank')}
                                >
                                    <Navigation className="mr-2 size-5" />
                                    Abrir no Google Maps
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
            <PublicFooter />
        </div>
    );
}