
'use client';

import React from 'react';
import { TeachersManagement } from '@/components/teaching/teachers-management';
import { TeacherDashboard } from '@/components/teaching/teacher-dashboard';
import { VolunteeringProvider, useVolunteering } from '@/contexts/volunteering-context';
import { useFirebase } from '@/firebase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Shield, GraduationCap, Loader2 } from 'lucide-react';
import { useMembersData } from "@/hooks/useDomainData";

function TeachersPageContent() {
  const { user } = useFirebase();
    const { users } = useMembersData();

  const { isLoading } = useVolunteering();

  const currentUserData = users.find(u => u.id === user?.uid);
  const isAdmin = currentUserData?.hierarchy?.role === 'admin' || currentUserData?.hierarchy?.role === 'pastor_senior';
  const isTeacher = currentUserData?.isTeacher === true;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Se não for admin nem professor, mostra apenas um aviso (ou redireciona)
  if (!isAdmin && !isTeacher) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <GraduationCap className="size-12 text-muted-foreground mb-4" />
        <h3 className="text-xl font-bold">Área do Professor</h3>
        <p className="text-muted-foreground">Você ainda não está habilitado como professor no sistema.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue={isTeacher ? "my-area" : "management"} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          {isTeacher && (
            <TabsTrigger value="my-area">
              <User className="mr-2 size-4" />
              Minha Área
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="management">
              <Shield className="mr-2 size-4" />
              Gestão Geral
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="my-area" className="mt-6">
          <TeacherDashboard />
        </TabsContent>

        <TabsContent value="management" className="mt-6">
          <TeachersManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function TeachersPage() {
  return (
    <VolunteeringProvider>
      <TeachersPageContent />
    </VolunteeringProvider>
  );
}
