
'use client';

import React from 'react';
import { useDoc, useFirebase } from '@/firebase';
import { useParams } from 'next/navigation';
import { Loader2, Cake, Hash, Phone, Mail, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DiscipleshipTrail } from '@/components/users/discipleship-trail';
import { DiscipleshipNotes } from '@/components/users/discipleship-notes';
import { VolunteerServiceForm } from '@/components/volunteering/volunteer-service-form';
import { VolunteeringProvider } from '@/contexts/volunteering-context';
import { FollowUpTimeline } from '@/components/users/follow-up-timeline';
import { differenceInYears, parseISO } from 'date-fns';


type User = {
    id: string;
    name: string;
    avatar?: string;
    dataNascimento?: string;
    email?: string;
    phone?: string;
    integrationStatus?: string;
    serviceStatus?: 'serving' | 'not_serving';
    hierarchy?: {
        celulaId?: string;
    };
    serviceAreaId?: string;
    lastServedDate?: {
      seconds: number;
      nanoseconds: number;
    } | string;
    roles?: string[];
    dizimista?: 'sim' | 'nao';
};


const journeyStatusLabels: { [key: string]: string } = {
    'nao_alcancado': 'Não Alcançado',
    'novo_convertido': 'Novo Convertido',
    'reconciliado': 'Reconciliado',
    'transferido': 'Transferido',
    'membro': 'Membro',
    'consolidado': 'Consolidado',
    'lider_treinamento': 'Líder em Treinamento',
    'lider_gc': 'Líder de GC',
    'lider_area': 'Líder de Área',
    'lider_rede': 'Líder de Rede',
    'pastor': 'Pastor',
};


export default function MemberProfilePage() {
    const params = useParams();
    const userId = params.userId as string;
    
    const { data: user, isLoading } = useDoc<User>(`users/${userId}`);

    if (isLoading) {
        return (
            <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!user) {
        return <p>Usuário não encontrado.</p>;
    }
    
    const avatar = PlaceHolderImages.find(p => p.id === (user.avatar || 'avatar-2'));
    const age = user.dataNascimento ? differenceInYears(new Date(), parseISO(user.dataNascimento)) : null;
    const isDizimista = user.dizimista === 'sim';
    const primaryRole = user.roles?.[0] || 'membro';

    return (
        <VolunteeringProvider>
            <div className="space-y-6">
                <Card>
                    <CardHeader className="flex flex-col md:flex-row items-start md:items-center gap-6">
                         <Avatar className="h-24 w-24 border-4 border-background shadow-md">
                            {avatar && <AvatarImage src={avatar.imageUrl} alt={user.name} />}
                            <AvatarFallback className="text-3xl">{user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold">{user.name}</h1>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mt-2">
                                {age && <span className="flex items-center gap-1.5"><Cake className="size-4"/> {age} anos</span>}
                                {user.phone && <span className="flex items-center gap-1.5"><Phone className="size-4"/> {user.phone}</span>}
                                {user.email && <span className="flex items-center gap-1.5"><Mail className="size-4"/> {user.email}</span>}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                           <Card className="p-4">
                               <CardTitle className="text-sm font-medium text-muted-foreground">ID Membro</CardTitle>
                               <p className="text-lg font-semibold truncate" title={user.id}>{user.id.substring(0, 6)}...</p>
                           </Card>
                             <Card className="p-4">
                               <CardTitle className="text-sm font-medium text-muted-foreground">Jornada</CardTitle>
                               <p className="text-lg font-semibold">{journeyStatusLabels[user.integrationStatus || ''] || '-'}</p>
                           </Card>
                           <Card className="p-4">
                               <CardTitle className="text-sm font-medium text-muted-foreground">Perfil de Acesso</CardTitle>
                               <p className="text-lg font-semibold capitalize">{primaryRole.replace('_', ' ')}</p>
                           </Card>
                            <Card className={`p-4 ${isDizimista ? 'bg-green-50' : 'bg-red-50'}`}>
                               <CardTitle className="text-sm font-medium text-muted-foreground">Dizimista</CardTitle>
                               <p className={`text-lg font-semibold ${isDizimista ? 'text-green-700' : 'text-red-700'}`}>{isDizimista ? 'Sim' : 'Não'}</p>
                           </Card>
                        </div>
                    </CardContent>
                </Card>
                
                <Tabs defaultValue="overview">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                        <TabsTrigger value="service">Serviço</TabsTrigger>
                        <TabsTrigger value="discipleship">Discipulado</TabsTrigger>
                         <TabsTrigger value="followup">Follow Up</TabsTrigger>
                    </TabsList>
                    <TabsContent value="overview" className="mt-6">
                        <DiscipleshipTrail currentStatusId={user.integrationStatus} />
                    </TabsContent>
                    <TabsContent value="service" className="mt-6">
                         <Card>
                            <CardHeader>
                                <CardTitle>Configurações de Serviço Voluntário</CardTitle>
                                <CardDescription>Gerencie a disponibilidade e as áreas de atuação deste membro.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <VolunteerServiceForm user={user} />
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="discipleship" className="mt-6">
                        <DiscipleshipNotes memberId={userId} memberName={user.name} />
                    </TabsContent>
                     <TabsContent value="followup" className="mt-6">
                        <FollowUpTimeline memberId={userId} memberName={user.name} />
                    </TabsContent>
                </Tabs>
            </div>
        </VolunteeringProvider>
    );
}

