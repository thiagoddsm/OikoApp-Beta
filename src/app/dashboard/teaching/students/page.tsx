
'use client';

import React from 'react';
import { StudentsManagement } from '@/components/teaching/students-management';
import { StudentDashboard } from '@/components/teaching/student-dashboard';
import { VolunteeringProvider, useVolunteering } from '@/contexts/volunteering-context';
import { useFirebase } from '@/firebase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Shield, Users, Loader2 } from 'lucide-react';
import { useMembersData, useCoursesData } from "@/hooks/useDomainData";

function StudentsPageContent() {
  const { user } = useFirebase();
    const { users } = useMembersData();
    const { courses, classes, enrollmentRequests, pedagogicalLogs, theoflixCourses } = useCoursesData();

  const { isLoading } = useVolunteering();

  const currentUserData = users.find(u => u.id === user?.uid);
  const isAdmin = currentUserData?.hierarchy?.role === 'admin' || currentUserData?.hierarchy?.role === 'pastor_senior';
  const isStudent = classes.some(cls => cls.students?.includes(user?.uid || ''));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Se não for admin nem aluno, mostra aviso
  if (!isAdmin && !isStudent) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <Users className="size-12 text-muted-foreground mb-4" />
        <h3 className="text-xl font-bold">Área do Aluno</h3>
        <p className="text-muted-foreground">Você não possui matrículas ativas em cursos no momento.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue={isStudent ? "my-area" : "management"} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          {isStudent && (
            <TabsTrigger value="my-area">
              <User className="mr-2 size-4" />
              Meu Painel
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="management">
              <Shield className="mr-2 size-4" />
              Gestão de Alunos
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="my-area" className="mt-6">
          <StudentDashboard />
        </TabsContent>

        <TabsContent value="management" className="mt-6">
          <StudentsManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function StudentsPage() {
  return (
    <VolunteeringProvider>
      <StudentsPageContent />
    </VolunteeringProvider>
  );
}
