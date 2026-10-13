'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CoursesManagement } from '@/components/teaching/courses-management';
import { TeachingOverviewDashboard } from '@/components/teaching/teaching-overview-dashboard';
import { StudentsManagement } from '@/components/teaching/students-management';
import { VolunteeringProvider } from '@/contexts/volunteering-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, BookOpen, Users2, Clock, ShieldCheck, UserPlus, Loader2 } from 'lucide-react';

import { EnrollmentRequestsList } from '@/components/teaching/enrollment-requests-list';
import { OnlineExceptionsRequestsList } from '@/components/teaching/online-exceptions-list';
import { useCoursesData } from '@/hooks/useDomainData';
import { Badge } from '@/components/ui/badge';

function CoursesPageContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'dashboard';
  const initialSubtab = searchParams.get('subtab') || 'enrollments';

  const [activeTab, setActiveTab] = useState(initialTab);
  const [activeSubTab, setActiveSubTab] = useState(initialSubtab);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) setActiveTab(tabParam);

    const subtabParam = searchParams.get('subtab');
    if (subtabParam) setActiveSubTab(subtabParam);
  }, [searchParams]);

  const { enrollmentRequests, classes } = useCoursesData();

  // Contagem de inscrições pendentes
  const pendingEnrollmentCount = React.useMemo(() => {
    return (enrollmentRequests || []).filter(r => r.status === 'pending').length;
  }, [enrollmentRequests]);

  // Contagem de exceções online pendentes
  const pendingExceptionsCount = React.useMemo(() => {
    if (!classes) return 0;
    let count = 0;
    classes.forEach(c => {
      if (!c.onlineExceptions) return;
      Object.values(c.onlineExceptions).forEach(ex => {
        if ((ex as any)?.status === 'pending') count++;
      });
    });
    return count;
  }, [classes]);

  // Total combinado para o badge da aba principal
  const totalPendingCount = pendingEnrollmentCount + pendingExceptionsCount;

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-3xl bg-muted/50 p-1">
          <TabsTrigger value="dashboard" className="font-bold">
            <LayoutDashboard className="mr-2 size-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="requests" className="font-bold relative">
            <Clock className="mr-2 size-4" />
            Solicitações
            {totalPendingCount > 0 && (
              <Badge variant="destructive" className="ml-2 px-1.5 py-0 text-[10px] font-black animate-pulse">
                {totalPendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="catalog" className="font-bold">
            <BookOpen className="mr-2 size-4" />
            Catálogo
          </TabsTrigger>
          <TabsTrigger value="students" className="font-bold">
            <Users2 className="mr-2 size-4" />
            Matrículas Ativas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6 animate-in fade-in-50 duration-500">
          <TeachingOverviewDashboard onNavigateToRequests={() => setActiveTab('requests')} />
        </TabsContent>

        {/* ── Hub Central de Solicitações do Ensino ─────────────────── */}
        <TabsContent value="requests" className="mt-6 animate-in fade-in-50 duration-500">
          <div className="bg-card rounded-xl border shadow-sm p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
              <div>
                <h2 className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Clock className="size-6 text-amber-500" />
                  Central de Solicitações do Ensino
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Gerencie inscrições públicas e pedidos de exceção de aulas online no TheoFlix.
                </p>
              </div>

              {/* Sub-abas de Navegação */}
              <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setActiveSubTab('enrollments')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeSubTab === 'enrollments'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <UserPlus className="size-3.5" />
                  Inscrições em Cursos
                  {pendingEnrollmentCount > 0 && (
                    <Badge variant="destructive" className="px-1.5 py-0 text-[10px] font-black ml-1">
                      {pendingEnrollmentCount}
                    </Badge>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSubTab('exceptions')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeSubTab === 'exceptions'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <ShieldCheck className="size-3.5" />
                  Exceções Online (TheoFlix)
                  {pendingExceptionsCount > 0 && (
                    <Badge variant="destructive" className="px-1.5 py-0 text-[10px] font-black ml-1 animate-pulse">
                      {pendingExceptionsCount}
                    </Badge>
                  )}
                </button>
              </div>
            </div>

            {/* Conteúdo da Sub-aba Selecionada */}
            {activeSubTab === 'enrollments' ? (
              <EnrollmentRequestsList />
            ) : (
              <OnlineExceptionsRequestsList />
            )}
          </div>
        </TabsContent>

        <TabsContent value="catalog" className="mt-6 animate-in fade-in-50 duration-500">
          <CoursesManagement />
        </TabsContent>

        <TabsContent value="students" className="mt-6 animate-in fade-in-50 duration-500">
          <div className="bg-card rounded-xl border shadow-sm p-6">
            <div className="mb-6">
              <h2 className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Users2 className="size-6 text-primary" />
                Central de Matrículas
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Visualize, busque e gerencie todos os alunos matriculados em todos cursos da IBM.
              </p>
            </div>
            <StudentsManagement />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function CoursesPage() {
  return (
    <VolunteeringProvider>
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      }>
        <CoursesPageContent />
      </Suspense>
    </VolunteeringProvider>
  );
}
