
'use client';
import React, { useState, useEffect } from 'react';
import { useFirebase, useDoc } from '@/firebase';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const BRIEFING_DOC_ID = 'current_briefing'; // Using a fixed ID

export default function PalcoPage() {
    const { data: state, isLoading: isBriefingLoading } = useDoc<any>(`briefings/${BRIEFING_DOC_ID}`);
    const [elapsed, setElapsed] = useState(0);

    const liveState = state?.liveState;
    const currentItem = state?.items?.[liveState?.currentItemIndex];

    useEffect(() => {
        if (!liveState?.isRunning || !liveState?.itemStartTime) {
            setElapsed(liveState?.accumulatedTime || 0);
            return;
        }

        const interval = setInterval(() => {
            const accumulated = liveState.accumulatedTime || 0;
            const startTime = liveState.itemStartTime || Date.now();
            setElapsed(accumulated + (Date.now() - startTime) / 1000);
        }, 100);

        return () => clearInterval(interval);
    }, [liveState?.isRunning, liveState?.itemStartTime, liveState?.accumulatedTime]);

    if (isBriefingLoading) {
        return <div className="flex items-center justify-center h-screen bg-black"><Loader2 className="animate-spin text-white" /></div>;
    }
     if (!state) {
        return <div className="flex items-center justify-center h-screen bg-black text-white">Nenhum briefing ativo.</div>;
    }

    const durationInSeconds = (currentItem?.duration || 0) * 60;
    const remainingTime = durationInSeconds - elapsed;
    
    const formatTime = (s: number) => {
        const isNegative = s < 0;
        const absSeconds = Math.abs(s);
        const minutes = String(Math.floor(absSeconds / 60)).padStart(2, '0');
        const seconds = String(Math.floor(absSeconds % 60)).padStart(2, '0');
        return `${isNegative ? '-' : ''}${minutes}:${seconds}`;
    };

    const timeColor = remainingTime < 0 ? 'text-red-500' :
                      remainingTime < 60 ? 'text-yellow-400' :
                      'text-slate-100';

    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8 font-mono">
            <div className="text-center w-full max-w-4xl">
                 <h1 className="text-5xl md:text-7xl font-bold text-slate-400 uppercase tracking-wider mb-8">
                    {currentItem?.title || "FIM DO EVENTO"}
                </h1>

                <div className={cn("text-[10rem] md:text-[20rem] font-black leading-none", timeColor)}>
                    {formatTime(remainingTime)}
                </div>

                <p className="text-2xl md:text-4xl text-slate-500 mt-4">
                    Responsável: {currentItem?.responsible || "-"}
                </p>
            </div>
        </div>
    );
}
