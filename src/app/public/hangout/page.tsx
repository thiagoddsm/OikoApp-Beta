'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MessageCircle, Loader2, CheckCircle, Sparkles, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { submitHangoutQuestion } from './actions';

export default function HangoutQuestionsPage() {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    
    const [formData, setFormData] = useState({
        text: '',
        author: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.text.trim()) {
            toast({
                title: 'Escreva algo',
                description: 'Por favor, digite a sua pergunta antes de enviar.',
                variant: 'destructive'
            });
            return;
        }

        setIsSubmitting(true);
        const result = await submitHangoutQuestion({
            text: formData.text.trim(),
            author: formData.author.trim()
        });

        setIsSubmitting(false);

        if (result.success) {
            setIsSuccess(true);
            setFormData({ text: '', author: '' });
        } else {
            toast({
                title: 'Erro',
                description: result.error || 'Ocorreu um erro ao enviar.',
                variant: 'destructive'
            });
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col items-center justify-center p-4 selection:bg-primary/30">
            {/* Background Effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-[400px] bg-primary/20 blur-[120px] rounded-full opacity-50" />
            </div>

            <div className="w-full max-w-md relative z-10 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                
                {/* Header */}
                <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-white/5 border border-white/10 text-primary mb-2 shadow-xl shadow-primary/20">
                        <MessageCircle className="size-8" />
                    </div>
                    <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white">
                        Caixa de Perguntas
                    </h1>
                    <p className="text-slate-400 text-sm font-medium">
                        Conferência Missão de Casa
                    </p>
                </div>

                <Card className="border-white/10 bg-white/5 backdrop-blur-md shadow-2xl rounded-3xl overflow-hidden">
                    <CardContent className="p-6 sm:p-8">
                        {isSuccess ? (
                            <div className="py-8 text-center space-y-4 animate-in zoom-in-95 duration-500">
                                <div className="size-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                                    <CheckCircle className="size-8" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-xl font-bold text-white">Pergunta enviada!</h3>
                                    <p className="text-slate-400 text-sm">
                                        Sua pergunta foi enviada para o mediador no palco.
                                    </p>
                                </div>
                                <Button 
                                    onClick={() => setIsSuccess(false)}
                                    className="mt-4 bg-white/10 hover:bg-white/20 text-white border-none rounded-xl"
                                    variant="outline"
                                >
                                    Fazer nova pergunta
                                </Button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                                        Sua Pergunta <span className="text-primary">*</span>
                                    </Label>
                                    <Textarea
                                        value={formData.text}
                                        onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                                        placeholder="O que você quer saber?"
                                        className="min-h-[120px] bg-black/40 border-white/10 text-white rounded-xl placeholder:text-slate-600 focus-visible:ring-primary focus-visible:border-primary resize-none text-base p-4"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                                        <span>Seu Nome</span>
                                        <span className="text-[10px] text-slate-500 normal-case bg-white/5 px-2 py-0.5 rounded-full">Opcional</span>
                                    </Label>
                                    <Input
                                        value={formData.author}
                                        onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                                        placeholder="Anônimo"
                                        className="h-12 bg-black/40 border-white/10 text-white rounded-xl placeholder:text-slate-600 focus-visible:ring-primary focus-visible:border-primary px-4"
                                    />
                                </div>

                                <Button 
                                    type="submit" 
                                    disabled={isSubmitting}
                                    className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-base font-bold shadow-lg shadow-primary/25 transition-all group"
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="size-5 animate-spin" />
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            Enviar Pergunta
                                            <Sparkles className="size-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                                        </span>
                                    )}
                                </Button>
                            </form>
                        )}
                    </CardContent>
                </Card>

                {/* Footer Link */}
                <div className="text-center">
                    <Link 
                        href="/public/hangout/painel" 
                        className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 font-medium transition-colors"
                    >
                        Painel do Mediador
                        <ArrowRight className="size-3" />
                    </Link>
                </div>
            </div>
        </div>
    );
}
