'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Briefcase } from 'lucide-react';
import TeamsManagement from '@/components/volunteering/teams-management';
import AreasManagement from '@/components/volunteering/areas-management';
import { VolunteeringProvider } from '@/contexts/volunteering-context';

export default function VolunteeringPage() {
  return (
    <VolunteeringProvider>
      <Card>
        <CardHeader>
          <CardTitle>Gestão de Voluntariado</CardTitle>
          <CardDescription>
            Gerencie as áreas de serviço e as equipes de voluntários que servem em sua igreja.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="teams">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="teams">
                <Users className="mr-2 size-4" />
                Equipes
              </TabsTrigger>
              <TabsTrigger value="areas">
                <Briefcase className="mr-2 size-4" />
                Áreas de Serviço
              </TabsTrigger>
            </TabsList>
            <TabsContent value="teams" className="mt-6">
              <TeamsManagement />
            </TabsContent>
            <TabsContent value="areas" className="mt-6">
              <AreasManagement />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </VolunteeringProvider>
  );
}
