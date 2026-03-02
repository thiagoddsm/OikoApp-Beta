'use client';

import React from 'react';
import { PublicNavbar } from '@/components/public/navbar';
import { PublicFooter } from '@/components/public/footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, Landmark, QrCode, Copy, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ContribuicoesPage() {
    const { toast } = useToast();
    const pixChave = '12.345.678/0001-99'; // Substitua pelo CNPJ real

    const copyToClipboard = () => {
        navigator.clipboard.writeText(pixChave);
        toast({
            title: "Chave PIX copiada!",
            description: "A chave CNPJ foi copiada para a sua área de transferência.",
        });
    };

    return (
        <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
            <PublicNavbar />
            <main className="flex-1 container mx-auto px-4 py-16 max-w-4xl">
                <header className="text-center space-y-4 mb-16 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="mx-auto bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                        <Heart className="size-8 text-emerald-600" />
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">
                        Dízimos & Ofertas
                    </h1>
                    <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                        "Cada um dê conforme determinou em seu coração, não com pesar ou por obrigação, pois Deus ama quem dá com alegria." (2 Coríntios 9:7)
                    </p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Card do PIX */}
                    <Card className="border-2 border-[#6A52A3] shadow-lg bg-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-[#6A52A3] text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-lg">
                            Recomendado
                        </div>
                        <CardContent className="p-8 flex flex-col items-center text-center space-y-6">
                            <QrCode className="size-12 text-[#6A52A3]" />
                            <div>
                                <h3 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900">Transferência via PIX</h3>
                                <p className="text-sm text-muted-foreground mt-2">Rápido, seguro e cai na hora.</p>
                            </div>
                            
                            <div className="bg-slate-50 w-full p-4 rounded-xl border border-dashed border-slate-300">
                                <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">Chave PIX (CNPJ)</p>
                                <p className="text-xl font-bold text-slate-800 tracking-wider">{pixChave}</p>
                            </div>

                            <Button 
                                onClick={copyToClipboard}
                                className="w-full font-bold uppercase tracking-widest bg-[#6A52A3] hover:bg-[#584289] rounded-full"
                            >
                                <Copy className="mr-2 size-4" />
                                Copiar Chave PIX
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Card de Transferência Bancária */}
                    <Card className="border-2 shadow-sm bg-white">
                        <CardContent className="p-8 space-y-6">
                            <div className="flex flex-col items-center text-center">
                                <Landmark className="size-12 text-slate-400 mb-4" />
                                <h3 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900">Conta Bancária</h3>
                                <p className="text-sm text-muted-foreground mt-2">Para TED, DOC ou depósitos na boca do caixa.</p>
                            </div>

                            <div className="space-y-4 pt-6 border-t border-dashed">
                                <div>
                                    <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Banco</p>
                                    <p className="font-bold text-slate-700">Banco Itaú (341)</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Agência</p>
                                        <p className="font-bold text-slate-700">1234</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Conta Corrente</p>
                                        <p className="font-bold text-slate-700">12345-6</p>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Favorecido</p>
                                    <p className="font-bold text-slate-700">Igreja Batista da Manhã</p>
                                    <p className="text-sm text-slate-500">CNPJ: {pixChave}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
            <PublicFooter />
        </div>
    );
}