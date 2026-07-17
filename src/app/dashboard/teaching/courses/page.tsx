'use client';

import React, { useState } from 'react';
import { CoursesManagement } from '@/components/teaching/courses-management';
import { TeachingOverviewDashboard } from '@/components/teaching/teaching-overview-dashboard';
import { StudentsManagement } from '@/components/teaching/students-management';
import { VolunteeringProvider } from '@/contexts/volunteering-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, BookOpen, Users2 } from 'lucide-react';

export default function CoursesPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <VolunteeringProvider>
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-2xl bg-muted/50 p-1">
            <TabsTrigger value="dashboard" className="font-bold">
              <LayoutDashboard className="mr-2 size-4" />
              Dashboard Geral
            </TabsTrigger>
            <TabsTrigger value="catalog" className="font-bold">
              <BookOpen className="mr-2 size-4" />
              Catálogo de Cursos
            </TabsTrigger>
            <TabsTrigger value="students" className="font-bold">
              <Users2 className="mr-2 size-4" />
              Matrículas Ativas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-6 animate-in fade-in-50 duration-500">
            <TeachingOverviewDashboard />
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
