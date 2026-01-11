
'use client';
import React from 'react';
import { useFirebase, useDoc } from '@/firebase';
import { Loader2 } from 'lucide-react';

const BRIEFING_DOC_ID = 'current_briefing'; // Using a fixed ID for the single briefing document

export default function BackstagePage() {
    const { data: state, isLoading: isBriefingLoading } = useDoc<any>(`briefings/${BRIEFING_DOC_ID}`);

    if (isBriefingLoading) {
        return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin" /></div>;
    }

    if (!state) {
        return <div className="flex items-center justify-center h-screen">Nenhum briefing ativo.</div>;
    }
    
    const currentItem = state.items?.[state.liveState?.currentItemIndex];
    const nextItem = state.items?.[state.liveState?.currentItemIndex + 1];

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 p-8 flex flex-col gap-8">
            <h1 className="text-3xl font-bold text-center">Visão de Backstage</h1>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1">
                {/* Item Atual */}
                <div className="bg-slate-800/50 border border-primary/50 rounded-2xl p-6 shadow-2xl flex flex-col">
                    <h2 className="text-sm font-bold uppercase text-primary tracking-widest mb-4">AGORA</h2>
                    <div className="flex-1 space-y-4">
                        <h3 className="text-4xl font-bold">{currentItem?.title || 'FIM DO EVENTO'}</h3>
                        <p className="text-lg text-slate-400 italic">"{currentItem?.description || '-'}"</p>
                        <div className="space-y-3 pt-4">
                            <p><strong className="text-slate-500">Projeção:</strong> {currentItem?.technical?.projection || '-'}</p>
                            <p><strong className="text-slate-500">Sonoplastia:</strong> {currentItem?.technical?.sound || '-'}</p>
                            <p><strong className="text-slate-500">Iluminação:</strong> {currentItem?.technical?.lighting || '-'}</p>
                        </div>
                    </div>
                </div>

                {/* Próximo Item */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 flex flex-col">
                    <h2 className="text-sm font-bold uppercase text-slate-500 tracking-widest mb-4">A SEGUIR</h2>
                    {nextItem ? (
                        <div className="flex-1 space-y-4">
                            <h3 className="text-3xl font-bold">{nextItem.title}</h3>
                             <p className="text-md text-slate-400 italic">"{nextItem.description || '-'}"</p>
                            <div className="space-y-3 pt-4">
                                <p><strong className="text-slate-500">Projeção:</strong> {nextItem.technical?.projection || '-'}</p>
                                <p><strong className="text-slate-500">Sonoplastia:</strong> {nextItem.technical?.sound || '-'}</p>
                                <p><strong className="text-slate-500">Iluminação:</strong> {nextItem.technical?.lighting || '-'}</p>
                            </div>
                        </div>
                    ) : (
                         <div className="flex-1 flex items-center justify-center">
                            <p className="text-slate-500">Fim do evento.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
