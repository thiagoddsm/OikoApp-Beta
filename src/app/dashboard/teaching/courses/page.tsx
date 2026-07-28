'use client';

import React, { useState } from 'react';
import { CoursesManagement } from '@/components/teaching/courses-management';
import { TeachingOverviewDashboard } from '@/components/teaching/teaching-overview-dashboard';
import { StudentsManagement } from '@/components/teaching/students-management';
import { VolunteeringProvider } from '@/contexts/volunteering-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, BookOpen, Users2 } from 'lucide-react';

import { EnrollmentRequestsList } from '@/components/teaching/enrollment-requests-list';
import { useCoursesData } from '@/hooks/useDomainData';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';

export default function CoursesPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { enrollmentRequests } = useCoursesData();

  const pendingCount = React.useMemo(() => {
    return enrollmentRequests.filter(r => r.status === 'pending').length;
  }, [enrollmentRequests]);

  return (
    <VolunteeringProvider>
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
              {pendingCount > 0 && (
                <Badge variant="destructive" className="ml-2 px-1.5 py-0 text-[10px] font-black animate-pulse">
                  {pendingCount}
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
            <TeachingOverviewDashboard />
          </TabsContent>

          <TabsContent value="requests" className="mt-6 animate-in fade-in-50 duration-500">
             <div className="bg-card rounded-xl border shadow-sm p-6">
                <div className="mb-6">
                    <h2 className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <Clock className="size-6 text-amber-500" />
                        Solicitações de Inscrição Pendentes
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Inscrições realizadas pelos interessados através do link público. Selecione a turma e clique em Aprovar.
                    </p>
                </div>
                <EnrollmentRequestsList />
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
    </VolunteeringProvider>
  );
}
