
'use client';

import React, { useState } from 'react';
import { CoursesManagement } from '@/components/teaching/courses-management';
import { TeachingOverviewDashboard } from '@/components/teaching/teaching-overview-dashboard';
import { VolunteeringProvider } from '@/contexts/volunteering-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, BookOpen } from 'lucide-react';

export default function CoursesPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <VolunteeringProvider>
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="dashboard" className="font-bold">
              <LayoutDashboard className="mr-2 size-4" />
              Dashboard Geral
            </TabsTrigger>
            <TabsTrigger value="catalog" className="font-bold">
              <BookOpen className="mr-2 size-4" />
              Catálogo de Cursos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-6 animate-in fade-in-50 duration-500">
            <TeachingOverviewDashboard />
          </TabsContent>

          <TabsContent value="catalog" className="mt-6 animate-in slide-in-from-left-4 duration-500">
            <CoursesManagement />
          </TabsContent>
        </Tabs>
      </div>
    </VolunteeringProvider>
  );
}
