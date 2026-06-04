'use client';
import React from 'react';
import { Loader2, GraduationCap } from 'lucide-react';
import { useFirebase, useDoc } from '@/firebase';
import { userRoles } from '@/lib/roles';
import { StudentDashboard } from '@/components/teaching/student-dashboard';
import { VolunteeringProvider } from '@/contexts/volunteering-context';
import { VolunteeringWidget } from '@/components/dashboard/volunteering-widget';
import { MinisterialDashboard } from './ministerial-dashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function DashboardPage() {
    const { user } = useFirebase();
    
    const { data: userData, isLoading: loadingRole } = useDoc<{ hierarchy?: { role?: string }; }>(user ? `users/${user.uid}`: null);
    const userRole = userData?.hierarchy?.role;
    const isAdmin = userRole === 'admin' || userRole === 'pastor_senior';

    // Carrega o perfil de acesso para verificar permissão de área do aluno
    const { data: accessProfile, isLoading: loadingProfile } = useDoc<{ permissions?: Record<string, Record<string, boolean>> }>(
        userRole && !isAdmin ? `access_profiles/${userRole}` : null
    );
    const hasStudentArea = isAdmin || !!accessProfile?.permissions?.['teaching_courses']?.['view_student_area'];

    const isLoading = loadingRole || loadingProfile;
    const userName = user?.displayName?.split(' ')[0] || 'Usuário';

    if (isLoading) {
        return (
            <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
            </div>
        );
    }

    const personalDashboard = (
        <VolunteeringProvider>
            <div className="space-y-8 animate-in fade-in duration-500 mt-6">
                <header>
                    <h1 className="text-3xl font-bold text-slate-800 italic uppercase tracking-tighter">Meu Painel</h1>
                    <p className="text-slate-500 text-sm">Bem-vindo à sua jornada ministerial, {userName}.</p>
                </header>
                {hasStudentArea ? (
                    <StudentDashboard />
                ) : (
                    <div className="flex h-64 items-center justify-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <div className="text-center space-y-2">
                            <GraduationCap className="mx-auto size-12 text-slate-300" />
                            <h2 className="text-lg font-semibold text-slate-600">Área não disponível</h2>
                            <p className="text-sm text-slate-400">Seu perfil de acesso não inclui a área do aluno.</p>
                        </div>
                    </div>
                )}
                <VolunteeringWidget />
            </div>
        </VolunteeringProvider>
    );

    if (!isAdmin) {
        return personalDashboard;
    }

    return (
        <Tabs defaultValue="ministerial" className="w-full">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Bom dia, {userName}!</h1>
                    <p className="text-slate-500 text-sm">Visão geral do sistema e indicadores principais.</p>
                </div>
                <TabsList className="bg-slate-100/80 p-1">
                    <TabsTrigger value="pessoal" className="font-semibold">Meu Painel</TabsTrigger>
                    <TabsTrigger value="ministerial" className="font-semibold">Painel Ministerial</TabsTrigger>
                </TabsList>
            </div>

            <TabsContent value="pessoal" className="m-0">
                {personalDashboard}
            </TabsContent>

            <TabsContent value="ministerial" className="m-0">
                <MinisterialDashboard />
            </TabsContent>
        </Tabs>
    );
}