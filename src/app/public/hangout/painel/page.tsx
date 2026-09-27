'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageCircle, CheckCircle2, User, Loader2, Star, Trash2 } from 'lucide-react';
import { toggleQuestionAnswered, toggleQuestionStarred, deleteHangoutQuestion } from '../actions';
import { fetchHangoutQuestions } from './actions';
import { useToast } from '@/hooks/use-toast';

interface Question {
    id: string;
    text: string;
    author: string;
    answered: boolean;
    starred: boolean;
    createdAt: string;
}

export default function HangoutPanelPage() {
    const { toast } = useToast();
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);

    const loadQuestions = async () => {
        const res = await fetchHangoutQuestions();
        if (res.success && res.questions) {
            setQuestions(res.questions);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadQuestions();
        const interval = setInterval(loadQuestions, 3000);
        return () => clearInterval(interval);
    }, []);

    const handleToggle = async (id: string, currentStatus: boolean) => {
        setQuestions(prev => prev.map(q => q.id === id ? { ...q, answered: !currentStatus } : q));
        const result = await toggleQuestionAnswered(id, !currentStatus);
        if (!result.success) {
            setQuestions(prev => prev.map(q => q.id === id ? { ...q, answered: currentStatus } : q));
            toast({ title: 'Erro', description: 'Não foi possível atualizar.', variant: 'destructive' });
        }
    };

    const handleToggleStar = async (id: string, currentStatus: boolean) => {
        setQuestions(prev => prev.map(q => q.id === id ? { ...q, starred: !currentStatus } : q));
        const result = await toggleQuestionStarred(id, !currentStatus);
        if (!result.success) {
            setQuestions(prev => prev.map(q => q.id === id ? { ...q, starred: currentStatus } : q));
            toast({ title: 'Erro', description: 'Não foi possível favoritar.', variant: 'destructive' });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir esta pergunta permanentemente?')) return;
        
        const backup = [...questions];
        setQuestions(prev => prev.filter(q => q.id !== id));
        
        const result = await deleteHangoutQuestion(id);
        if (!result.success) {
            setQuestions(backup);
            toast({ title: 'Erro', description: 'Não foi possível excluir.', variant: 'destructive' });
        }
    };

    const pendingQuestions = questions
        .filter(q => !q.answered)
        .sort((a, b) => {
            if (a.starred === b.starred) return 0;
            return a.starred ? -1 : 1;
        });
        
    const answeredQuestions = questions.filter(q => q.answered);

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="size-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                            <MessageCircle className="size-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight text-slate-900">
                                Painel do Mediador
                            </h1>
                            <p className="text-slate-500 text-sm font-medium">
                                Conferência Missão de Casa
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 bg-slate-100 px-4 py-2 rounded-xl">
                        <div className="flex flex-col items-center justify-center px-2">
                            <span className="text-2xl font-black text-primary leading-none">{pendingQuestions.length}</span>
                            <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Pendentes</span>
                        </div>
                        <div className="w-px h-8 bg-slate-200" />
                        <div className="flex flex-col items-center justify-center px-2">
                            <span className="text-2xl font-black text-emerald-500 leading-none">{answeredQuestions.length}</span>
                            <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Lidas</span>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <Loader2 className="size-8 animate-spin mb-4" />
                        <p className="font-medium">Conectando ao painel...</p>
                    </div>
                ) : questions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white border border-slate-200 rounded-3xl border-dashed">
                        <MessageCircle className="size-12 mb-4 opacity-20" />
                        <p className="font-medium">Nenhuma pergunta foi enviada ainda.</p>
                        <p className="text-sm">As perguntas aparecerão aqui automaticamente.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                        {/* Coluna Pendentes */}
                        <div className="space-y-4">
                            <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                <span className="size-2 rounded-full bg-primary animate-pulse" />
                                Fila de Perguntas
                            </h2>
                            {pendingQuestions.length === 0 && (
                                <p className="text-slate-500 italic text-sm p-4 bg-white/50 rounded-2xl border border-slate-100 text-center">
                                    Fila limpa! Nenhuma pergunta pendente.
                                </p>
                            )}
                            {pendingQuestions.map(q => (
                                <Card 
                                    key={q.id} 
                                    className={`border-slate-200 shadow-md rounded-2xl overflow-hidden transition-all hover:shadow-lg \${q.starred ? 'ring-2 ring-amber-400 shadow-amber-400/20' : ''}`}
                                >
                                    <CardContent className="p-0">
                                        <div className={`p-5 \${q.starred ? 'bg-amber-50/50' : ''}`}>
                                            <p className="text-lg font-medium text-slate-900 leading-relaxed">
                                                "{q.text}"
                                            </p>
                                        </div>
                                        <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                                            <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                                                <User className="size-4" />
                                                {q.author}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleToggleStar(q.id, q.starred)}
                                                    className={`h-8 w-8 p-0 rounded-full \${q.starred ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-100 bg-amber-50' : 'text-slate-400 hover:text-amber-500'}`}
                                                    title={q.starred ? "Remover favorito" : "Favoritar"}
                                                >
                                                    <Star className="size-4" fill={q.starred ? "currentColor" : "none"} />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleDelete(q.id)}
                                                    className="h-8 w-8 p-0 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50"
                                                    title="Excluir pergunta"
                                                >
                                                    <Trash2 className="size-4" />
                                                </Button>
                                                <Button 
                                                    size="sm"
                                                    onClick={() => handleToggle(q.id, q.answered)}
                                                    className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg shadow-sm h-8 ml-1"
                                                >
                                                    <CheckCircle2 className="size-4 sm:mr-1.5" />
                                                    <span className="hidden sm:inline">Lida</span>
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {/* Coluna Lidas */}
                        <div className="space-y-4 opacity-60">
                            <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                <CheckCircle2 className="size-4" />
                                Já Respondidas
                            </h2>
                            {answeredQuestions.map(q => (
                                <Card key={q.id} className="border-slate-200 bg-slate-50 rounded-2xl overflow-hidden">
                                    <CardContent className="p-0">
                                        <div className="p-5">
                                            <p className="text-base text-slate-600">
                                                "{q.text}"
                                            </p>
                                        </div>
                                        <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                                                <User className="size-3" />
                                                {q.author}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleDelete(q.id)}
                                                    className="h-7 w-7 p-0 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50"
                                                    title="Excluir permanentemente"
                                                >
                                                    <Trash2 className="size-3" />
                                                </Button>
                                                <Button 
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleToggle(q.id, q.answered)}
                                                    className="text-xs h-7 px-2 border-slate-300 text-slate-500"
                                                >
                                                    Desfazer
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
