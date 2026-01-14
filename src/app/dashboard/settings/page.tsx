
'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Users } from "lucide-react";
import { UserRoleAssignment } from '@/components/settings/user-role-assignment';
import { AccessProfileManager } from '@/components/settings/access-profile-manager';

// The source of truth for initial roles, now managed by the parent page.
const initialRoles = [
    { id: 'admin', name: 'Admin', description: 'Acesso total ao sistema.' },
    { id: 'pastor_senior', name: 'Pastor Sênior', description: 'Acesso de liderança sênior.' },
    { id: 'lider_rede', name: 'Líder de Rede', description: 'Gerencia áreas e líderes de área.' },
    { id: 'lider_area', name: 'Líder de Área', description: 'Supervisiona líderes de célula.' },
    { id: 'lider_gc', name: 'Líder de GC', description: 'Gerencia uma célula e seus membros.' },
    { id: 'member', name: 'Membro', description: 'Acesso padrão de membro da igreja.' },
    { id: 'volunteer', name: 'Voluntário', description: 'Membro que serve em alguma área.' },
];


export default function SettingsPage() {
  const [roles, setRoles] = useState(initialRoles);

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
                <AccessProfileManager roles={roles} setRoles={setRoles} />
            </TabsContent>
            <TabsContent value="users" className="mt-6">
                <UserRoleAssignment roles={roles} />
            </TabsContent>
          </Tabs>
        </CardContent>
    </Card>
  );
}
