'use client';

import React, { useState } from 'react';
import { useFirebase, useMemoFirebase } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AttendanceDashboard } from '@/components/attendance/attendance-dashboard';
import { RecordsList } from '@/components/attendance/records-list';
import { RegisterForm } from '@/components/attendance/register-form';

export default function AttendancePage() {
  const { firestore, user } = useFirebase();
  const [activeTab, setActiveTab] = useState('register');

  const cultosQuery = useMemoFirebase(() => 
    user && firestore ? query(collection(firestore, `cultos/${user.uid}/registros`)) : null,
    [user, firestore]
  );
  
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
