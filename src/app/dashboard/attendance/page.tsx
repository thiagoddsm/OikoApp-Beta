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
import { ImportTab } from '@/components/attendance/import-tab';

export default function AttendancePage() {
  const { firestore } = useFirebase();
  const [activeTab, setActiveTab] = useState('register');
  const [editingRecord, setEditingRecord] = useState<any>(null);

  const registrosQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, `registros_de_presenca`));
  }, [firestore]);

  const { data: registros, isLoading } = useCollection(registrosQuery);

  const handleEdit = (record: any) => {
    setEditingRecord(record);
    setActiveTab('register');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingRecord(null);
  };
  
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
                <RegisterForm 
                  editingRecord={editingRecord} 
                  onCancelEdit={handleCancelEdit} 
                />
                <div className="mt-8">
                  <RecordsList 
                    registros={registros || []} 
                    loading={isLoading} 
                    onEdit={handleEdit}
                  />
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
