'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HandHelping, Users } from 'lucide-react';
import { BeneficiaryManagement } from '@/components/social/beneficiary-management';
import { SocialActionManagement } from '@/components/social/social-action-management';

export default function SocialPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <HandHelping className="size-6 text-primary"/>
            Ação Social
        </CardTitle>
        <CardDescription>
            Gerencie os beneficiários, registre as ações sociais e acompanhe o impacto do seu ministério na comunidade.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="beneficiaries">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="beneficiaries"><Users className="mr-2 size-4"/>Beneficiários</TabsTrigger>
                <TabsTrigger value="actions"><HandHelping className="mr-2 size-4"/>Ações Sociais</TabsTrigger>
            </TabsList>
            <TabsContent value="beneficiaries" className="mt-6">
                <BeneficiaryManagement />
            </TabsContent>
            <TabsContent value="actions" className="mt-6">
                <SocialActionManagement />
            </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
