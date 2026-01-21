
'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Users, Loader2 } from "lucide-react";
import { AccessProfileManager } from '@/components/settings/access-profile-manager';
import { UserRoleAssignment } from '@/components/settings/user-role-assignment';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';

export type AccessProfile = {
  id: string;
  name: string;
  description: string;
  permissions?: Record<string, Record<string, boolean>>;
};

export default function SettingsPage() {
  const { firestore } = useFirebase();

  const profilesQuery = useMemoFirebase(
    () => firestore ? query(collection(firestore, 'access_profiles')) : null,
    [firestore]
  );
  const { data: roles, isLoading } = useCollection<AccessProfile>(profilesQuery);
  
  if (isLoading) {
      return (
          <div className="flex h-64 w-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
      )
  }

  return (
     <Card>
        <CardHeader>
            <CardTitle>Configurações de Acesso</CardTitle>
            <CardDescription>
                Gerencie os perfis de acesso e atribua permissões aos usuários do sistema.
            </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="profiles">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="profiles"><Shield className="mr-2 size-4" /> Perfis de Acesso</TabsTrigger>
              <TabsTrigger value="users"><Users className="mr-2 size-4" /> Usuários</TabsTrigger>
            </TabsList>
            <TabsContent value="profiles" className="mt-6">
                <AccessProfileManager roles={roles || []} />
            </TabsContent>
            <TabsContent value="users" className="mt-6">
                <UserRoleAssignment roles={roles || []} />
            </TabsContent>
          </Tabs>
        </CardContent>
    </Card>
  );
}
