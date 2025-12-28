
'use client';
import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { VolunteeringProvider } from '@/contexts/volunteering-context';
import { AreasManagement } from '@/components/volunteering/areas-management';
import { HandHelping } from 'lucide-react';

export default function VolunteeringPage() {
    return (
        <VolunteeringProvider>
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3">
                            <HandHelping className="size-6 text-primary"/>
                            Gerenciar Áreas de Serviço
                        </CardTitle>
                        <CardDescription>
                            Adicione, visualize e gerencie as áreas de serviço.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <AreasManagement />
                    </CardContent>
                </Card>
            </div>
        </VolunteeringProvider>
    );
}

    