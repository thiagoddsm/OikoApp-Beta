
'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Users, Loader2, AlertTriangle } from "lucide-react";
import { AccessProfileManager } from '@/components/settings/access-profile-manager';
import { UserRoleAssignment } from '@/components/settings/user-role-assignment';
import { useFirebase, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query } from 'firebase/firestore';

export type AccessProfile = {
  id: string;
  name: string;
  description: string;
  permissions?: Record<string, Record<string, boolean>>;
};

export default function SettingsPage() {
  const { firestore, user, isUserLoading } = useFirebase();
  const router = useRouter();
  
  const { data: userData, isLoading: isUserDataLoading } = useDoc<{ hierarchy?: { role?: string }; }>(user ? `users/${user.uid}`: null);
  const userRole = userData?.hierarchy?.role;

  const profilesQuery = useMemoFirebase(
    () => firestore ? query(collection(firestore, 'access_profiles')) : null,
    [firestore]
  );
  const { data: roles, isLoading: isLoadingProfiles } = useCollection<AccessProfile>(profilesQuery);
  
  const isLoading = isLoadingProfiles || isUserLoading || isUserDataLoading;

  const isAdmin = userRole === 'admin' || userRole === 'pastor_senior';

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      router.replace('/dashboard');
    }
  }, [isLoading, isAdmin, router]);
  
  if (isLoading) {
      return (
          <div className="flex h-64 w-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
      )
  }

  if (!isAdmin) {
      return (
        <Card className="w-full max-w-lg mx-auto">
            <CardHeader className="text-center">
                <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
                <CardTitle className="mt-4">Acesso Negado</CardTitle>
             </CardHeader>
            <CardContent>
                <p className="text-center text-muted-foreground">
                    Você não tem permissão para acessar esta página.
                </p>
            </CardContent>
        </Card>
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
