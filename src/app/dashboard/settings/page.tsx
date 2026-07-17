'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Shield, Users, Loader2, AlertTriangle, Activity, ExternalLink } from "lucide-react";
import { AccessProfileManager } from '@/components/settings/access-profile-manager';
import { UserRoleAssignment } from '@/components/settings/user-role-assignment';
import { IntegrationsManager } from '@/components/settings/integrations-manager';
import { FinancialSettings } from '@/components/settings/financial-settings';
import { CertificateSettings } from '@/components/settings/certificate-settings';
import { VolunteeringRulesSettings } from '@/components/settings/volunteering-rules-settings';
import { useFirebase, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query } from 'firebase/firestore';

export type AccessProfile = {
  id: string;
  name: string;
  description: string;
  permissions?: Record<string, Record<string, boolean>>;
};

export default function SettingsPage() {
  const router = useRouter();
  const { firestore, user, isUserLoading } = useFirebase();
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
     <div className="space-y-8">
        <Card>
            <CardHeader>
                <div className="flex items-center gap-4">
                    <Shield className="size-6 text-primary" />
                    <CardTitle>Integrações Financeiras</CardTitle>
                </div>
                <CardDescription>Gerencie as conexões com o Asaas e o Conta Azul ERP.</CardDescription>
            </CardHeader>
            <CardContent>
                <IntegrationsManager />
            </CardContent>
        </Card>

        <Separator />

        <Card>
            <CardHeader>
                <div className="flex items-center gap-4">
                    <Shield className="size-6 text-primary" />
                    <CardTitle>Configurações Financeiras</CardTitle>
                </div>
                <CardDescription>Defina prazos úteis e simule webhooks de teste.</CardDescription>
            </CardHeader>
            <CardContent>
                <FinancialSettings />
            </CardContent>
        </Card>

        <Separator />

        <Card>
            <CardHeader>
                <div className="flex items-center gap-4">
                    <Shield className="size-6 text-primary" />
                    <CardTitle>Perfis de Acesso</CardTitle>
                </div>
                <CardDescription>Gerencie os perfis de acesso do sistema.</CardDescription>
            </CardHeader>
            <CardContent>
                <AccessProfileManager roles={roles || []} />
            </CardContent>
        </Card>

        <Separator />

        <Card>
            <CardHeader>
                 <div className="flex items-center gap-4">
                    <Users className="size-6 text-primary" />
                    <CardTitle>Usuários</CardTitle>
                </div>
                <CardDescription>Atribua perfis e permissões aos usuários.</CardDescription>
            </CardHeader>
            <CardContent>
                <UserRoleAssignment roles={roles || []} />
            </CardContent>
        </Card>
        
        <Separator />

        <Card>
            <CardHeader>
                <div className="flex items-center gap-4">
                    <Shield className="size-6 text-primary" />
                    <CardTitle>Configurações de Certificados</CardTitle>
                </div>
                <CardDescription>Configure a assinatura global do pastor e o nome do signatário para a emissão de certificados.</CardDescription>
            </CardHeader>
            <CardContent>
                <CertificateSettings />
            </CardContent>
        </Card>

        <Separator />

        <Card>
            <CardHeader>
                <div className="flex items-center gap-4">
                    <Users className="size-6 text-primary" />
                    <CardTitle>Regras de Voluntariado</CardTitle>
                </div>
                <CardDescription>Configure regras e validações para as escalas de serviço.</CardDescription>
            </CardHeader>
            <CardContent>
                <VolunteeringRulesSettings />
            </CardContent>
        </Card>

        <Separator />

        <Card>
            <CardHeader>
                <div className="flex items-center gap-4">
                    <Activity className="size-6 text-primary" />
                    <CardTitle>Diagnóstico do Sistema</CardTitle>
                </div>
                <CardDescription>Verifique a conectividade com serviços essenciais como o Firebase Storage em uma página isolada.</CardDescription>
            </CardHeader>
            <CardContent>
                <Link href="/dashboard/settings/storage-diagnostic" passHref>
                    <Button variant="outline">
                        Abrir Página de Diagnóstico
                        <ExternalLink className="ml-2 size-4" />
                    </Button>
                </Link>
            </CardContent>
        </Card>
    </div>
  );
}
