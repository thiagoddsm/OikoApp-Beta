'use client';

import React, { useState } from 'react';
import { useFirebase } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AttendanceDashboard } from '@/components/attendance/attendance-dashboard';
import { RecordsList } from '@/components/attendance/records-list';
import { RegisterForm } from '@/components/attendance/register-form';
import { ImportTab } from '@/components/attendance/import-tab';

export default function AttendancePage() {
  const { user } = useFirebase();
  const [activeTab, setActiveTab] = useState('register');

  const { data: registros, isLoading } = useCollection(user ? `cultos/${user.uid}/registros` : null);
  
  return (
    <div className="space-y-6">
       <Card>
          <CardHeader>
              <CardTitle>Registro de Presença nos Cultos</CardTitle>
              <CardDescription>
                  Alterne entre registrar uma nova frequência, importar dados ou visualizar o painel.
              </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="register">Registrar</TabsTrigger>
                <TabsTrigger value="import">Importar</TabsTrigger>
                <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              </TabsList>
              <TabsContent value="register">
                <RegisterForm />
                <div className="mt-8">
                  <RecordsList registros={registros || []} loading={isLoading} />
                </div>
              </TabsContent>
               <TabsContent value="import">
                <ImportTab />
              </TabsContent>
              <TabsContent value="dashboard">
                <AttendanceDashboard registros={registros || []} loading={isLoading} />
              </TabsContent>
            </Tabs>
          </CardContent>
      </Card>
    </div>
  );
}
