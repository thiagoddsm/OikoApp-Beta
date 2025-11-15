// src/app/dashboard/attendance/page.tsx
'use client';

import React, { useState } from 'react';
import { useFirebase } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AttendanceDashboard } from '@/components/attendance/attendance-dashboard';
import { RecordsList } from '@/components/attendance/records-list';
import { RegisterForm } from '@/components/attendance/register-form';

export default function AttendancePage() {
  const { firestore, user } = useFirebase();
  const [activeTab, setActiveTab] = useState('register');

  const cultosCollectionPath = user ? `cultos/${user.uid}/registros` : null;
  const cultosQuery = cultosCollectionPath ? query(collection(firestore, cultosCollectionPath)) : null;
  
  // Custom hook usage with memoization handled inside or by ensuring stable query object
  const { data: registros, isLoading } = useCollection(cultosQuery);
  
  return (
    <div className="space-y-6">
       <Card>
          <CardHeader>
              <CardTitle>Registro de Presença nos Cultos</CardTitle>
              <CardDescription>
                  Alterne entre registrar uma nova frequência e visualizar o painel de dados.
              </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="register">Registrar</TabsTrigger>
                <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              </TabsList>
              <TabsContent value="register">
                <RegisterForm />
                <div className="mt-8">
                  <RecordsList registros={registros || []} loading={isLoading} />
                </div>
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
