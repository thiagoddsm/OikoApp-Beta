'use client';

import React from 'react';
import { Loader2, ShieldAlert, ArrowLeft } from 'lucide-react';
import { useFirebase, useDoc } from '@/firebase';
import { TheoflixWatchReport } from '@/components/teaching/theoflix/theoflix-watch-report';
import Link from 'next/link';

export default function WatchHistoryReportPage() {
    const { user } = useFirebase();

    const { data: userData, isLoading: loadingRole } = useDoc<{ hierarchy?: { role?: string }; }>(user ? `users/${user.uid}`: null);
    const userRole = userData?.hierarchy?.role;
    const isAdmin = userRole === 'admin' || userRole === 'pastor_senior';

    // Fetch the access profile to check permissions
    const { data: accessProfile, isLoading: loadingProfile } = useDoc<{ permissions?: Record<string, Record<string, boolean>> }>(
        userRole && !isAdmin ? `access_profiles/${userRole}` : null
    );

    const hasPedagogicalAccess = isAdmin || !!accessProfile?.permissions?.['teaching_courses']?.['view'];
    const isLoading = loadingRole || loadingProfile;

    if (isLoading) {
        return (
            <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }

    if (!hasPedagogicalAccess) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center max-w-md mx-auto space-y-4">
                <div className="p-4 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-full">
                    <ShieldAlert className="size-12" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50">Acesso Restrito</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                    Você não possui permissões administrativas pedagógicas necessárias para visualizar o histórico de aulas assistidas do TheoFlix.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto py-6">
            <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Link 
                            href="/dashboard/teaching/theoflix"
                            className="flex items-center text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors gap-1"
                        >
                            <ArrowLeft className="size-3" />
                            Voltar para o TheoFlix
                        </Link>
                    </div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-50 italic uppercase tracking-tighter">
                        Aulas Assistidas - TheoFlix
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                        Visualize o progresso detalhado de cada estudante, filtre por curso e exporte relatórios consolidados.
                    </p>
                </div>
            </header>

            <TheoflixWatchReport />
        </div>
    );
}
