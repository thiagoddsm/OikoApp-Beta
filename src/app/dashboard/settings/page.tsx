
'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Users } from "lucide-react";
import { UserRoleAssignment } from '@/components/settings/user-role-assignment';
import { AccessProfileManager } from '@/components/settings/access-profile-manager';

export default function SettingsPage() {
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
                <AccessProfileManager />
            </TabsContent>
            <TabsContent value="users" className="mt-6">
                <UserRoleAssignment />
            </TabsContent>
          </Tabs>
        </CardContent>
    </Card>
  );
}
