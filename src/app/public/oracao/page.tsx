'use client';

import React, { useState } from 'react';
import { PublicNavbar } from '@/components/public/navbar';
import { PublicFooter } from '@/components/public/footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { HandHeart, Loader2, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { submitPrayerRequest } from './actions';

export default function OracaoPage() {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    
    // Form state
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [request, setRequest] = useState('');
    const [wantsContact, setWantsContact] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!request.trim()) {
            toast({ variant: 'destructive', title: 'Atenção', description: 'Por favor, escreva o seu pedido de oração.' });
            return;
        }

        setIsSubmitting(true);
        
        // Chamada à Server Action do Firebase
        const result = await submitPrayerRequest({
            name,
            phone,
            request,
            wantsContact
        });

        setIsSubmitting(false);

        if (result.success) {
            setIsSuccess(true);
        } else {
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível enviar seu pedido. Tente novamente.' });
        }
    };

    return (
        <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
            <PublicNavbar />
            <main className="flex-1 container mx-auto px-4 py-16 max-w-3xl">
                <header className="text-center space-y-4 mb-12 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="mx-auto bg-amber-100 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                        <HandHeart className="size-8 text-amber-600" />
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">
                        Pedidos de Oração
                    </h1>
                    <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                        Nossa equipe pastoral e ministério de intercessão estão prontos para orar por você. Compartilhe o seu pedido.
                    </p>
                </header>

                <Card className="border-2 shadow-xl bg-white overflow-hidden">
                    <CardContent className="p-0">
                        {isSuccess ? (
                            <div className="p-16 text-center space-y-6 animate-in zoom-in-95 duration-500">
                                <div className="size-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                                    <CheckCircle size={40} />
                                </div>
                                <h2 className="text-2xl font-black italic tracking-tighter uppercase text-slate-900">Recebemos o seu pedido!</h2>
                                <p className="text-muted-foreground">
                                    Nossa igreja estará orando por você. Que a paz de Deus, que excede todo o entendimento, guarde o seu coração.
                                </p>
                                <Button 
                                    onClick={() => { setIsSuccess(false); setRequest(''); }} 
                                    variant="outline" 
                                    className="mt-4 rounded-full font-bold text-[#6A52A3] border-[#6A52A3] hover:bg-[#6A52A3]/10"
                                >
                                    Enviar outro pedido
                                </Button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="p-8 md:p-12 space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] uppercase font-black text-muted-foreground">Seu Nome (Opcional)</Label>
                                        <Input 
                                            placeholder="Como gostaria de ser chamado?" 
                                            className="h-12 bg-slate-50"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] uppercase font-black text-muted-foreground">WhatsApp (Opcional)</Label>
                                        <Input 
                                            placeholder="(21) 9..." 
                                            className="h-12 bg-slate-50"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-[10px] uppercase font-black text-muted-foreground">Seu Pedido de Oração <span className="text-red-500">*</span></Label>
                                    <Textarea 
                                        placeholder="Escreva aqui o seu pedido ou agradecimento..." 
                                        className="min-h-[150px] resize-none bg-slate-50 text-base"
                                        value={request}
                                        onChange={(e) => setRequest(e.target.value)}
                                    />
                                </div>

                                <label className="flex items-center gap-3 p-4 border rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                                    <input 
                                        type="checkbox" 
                                        className="size-5 rounded border-slate-300 text-[#6A52A3] focus:ring-[#6A52A3]"
                                        checked={wantsContact}
                                        onChange={(e) => setWantsContact(e.target.checked)}
                                    />
                                    <div>
                                        <p className="font-bold text-sm text-slate-800">Gostaria de receber contato pastoral</p>
                                        <p className="text-xs text-muted-foreground">Marque esta opção se deseja que um líder entre em contato com você.</p>
                                    </div>
                                </label>

                                <Button 
                                    type="submit" 
                                    disabled={isSubmitting || !request.trim()}
                                    className="w-full h-14 font-black text-base uppercase tracking-[0.1em] bg-[#6A52A3] hover:bg-[#584289] text-white rounded-full shadow-lg"
                                >
                                    {isSubmitting ? (
                                        <><Loader2 className="animate-spin size-5 mr-2" /> Enviando...</>
                                    ) : "Enviar Pedido de Oração"}
                                </Button>
                            </form>
                        )}
                    </CardContent>
                </Card>
            </main>
            <PublicFooter />
        </div>
    );
}