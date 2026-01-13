
'use client';

import React, { useMemo } from 'react';
import { useDoc, useCollection, useMemoFirebase, useFirebase } from '@/firebase';
import { useParams } from 'next/navigation';
import { Loader2, Cake, Phone, Mail, User, Network, Building2, Users, HandHelping, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DiscipleshipTrail } from '@/components/users/discipleship-trail';
import { DiscipleshipNotes } from '@/components/users/discipleship-notes';
import { VolunteerServiceForm } from '@/components/volunteering/volunteer-service-form';
import { VolunteeringProvider } from '@/contexts/volunteering-context';
import { FollowUpTimeline } from '@/components/users/follow-up-timeline';
import { differenceInYears, parseISO } from 'date-fns';
import { userRoles } from '@/app/dashboard/layout';
import { collection, query } from 'firebase/firestore';

type UserProfile = {
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
        supervisorId?: string;
    };
    serviceAreaId?: string;
    serviceTeamId?: string;
    lastServedDate?: {
      seconds: number;
      nanoseconds: number;
    } | string;
    roles?: string[];
    dizimista?: 'sim' | 'nao';
};

type Cell = { id: string; nome: string; areaId: string; };
type Area = { id: string; nome: string; redeId: string; };
type Rede = { id: string; nome: string; };
type ServiceArea = { id: string; name: string; };
type Team = { id: string; name: string; };

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
    
    // --- Data Fetching ---
    const { data: user, isLoading: isLoadingUser } = useDoc<UserProfile>(`users/${userId}`);
    const { firestore } = useFirebase();

    // Queries for hierarchical data
    const usersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'users')) : null, [firestore]);
    const cellsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'cells')) : null, [firestore]);
    const areasQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'areas')) : null, [firestore]);
    const redesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'redes')) : null, [firestore]);
    const serviceAreasQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'areas_of_service')) : null, [firestore]);
    const teamsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'teams')) : null, [firestore]);

    const { data: allUsers, isLoading: isLoadingUsers } = useCollection<UserProfile>(usersQuery);
    const { data: cells, isLoading: isLoadingCells } = useCollection<Cell>(cellsQuery);
    const { data: areas, isLoading: isLoadingAreas } = useCollection<Area>(areasQuery);
    const { data: redes, isLoading: isLoadingRedes } = useCollection<Rede>(redesQuery);
    const { data: serviceAreas, isLoading: isLoadingServiceAreas } = useCollection<ServiceArea>(serviceAreasQuery);
    const { data: teams, isLoading: isLoadingTeams } = useCollection<Team>(teamsQuery);
    
    const isLoading = isLoadingUser || isLoadingUsers || isLoadingCells || isLoadingAreas || isLoadingRedes || isLoadingServiceAreas || isLoadingTeams;

    // --- Data Mapping for easy lookup ---
    const userMap = useMemo(() => new Map(allUsers?.map(u => [u.id, u.name]) || []), [allUsers]);
    const cellMap = useMemo(() => new Map(cells?.map(c => [c.id, c]) || []), [cells]);
    const areaMap = useMemo(() => new Map(areas?.map(a => [a.id, a]) || []), [areas]);
    const redeMap = useMemo(() => new Map(redes?.map(r => [r.id, r.nome]) || []), [redes]);
    const serviceAreaMap = useMemo(() => new Map(serviceAreas?.map(sa => [sa.id, sa.name]) || []), [serviceAreas]);
    const teamMap = useMemo(() => new Map(teams?.map(t => [t.id, t.name]) || []), [teams]);

    // --- Derived Data ---
    const hierarchyInfo = useMemo(() => {
        if (!user || !user.hierarchy) return {};
        const cell = user.hierarchy.celulaId ? cellMap.get(user.hierarchy.celulaId) : null;
        const area = cell?.areaId ? areaMap.get(cell.areaId) : null;
        const rede = area?.redeId ? redeMap.get(area.redeId) : null;
        const supervisor = user.hierarchy.supervisorId ? userMap.get(user.hierarchy.supervisorId) : null;
        const serviceArea = user.serviceAreaId ? serviceAreaMap.get(user.serviceAreaId) : null;
        const team = user.serviceTeamId ? teamMap.get(user.serviceTeamId) : null;

        return { supervisor, rede, area, cell, serviceArea, team };
    }, [user, cellMap, areaMap, redeMap, userMap, serviceAreaMap, teamMap]);
    

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
    const primaryRole = user.roles?.[0] || 'member';

    return (
        <VolunteeringProvider>
            <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column */}
                    <div className="lg:col-span-2 space-y-6">
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
                                       <CardTitle className="text-sm font-medium text-muted-foreground">Perfil</CardTitle>
                                       <p className="text-lg font-semibold capitalize">{userRoles[primaryRole] || primaryRole.replace('_', ' ')}</p>
                                   </Card>
                                    <Card className={`p-4 ${isDizimista ? 'bg-green-50' : 'bg-red-50'}`}>
                                       <CardTitle className="text-sm font-medium text-muted-foreground">Dizimista</CardTitle>
                                       <p className={`text-lg font-semibold ${isDizimista ? 'text-green-700' : 'text-red-700'}`}>{isDizimista ? 'Sim' : 'Não'}</p>
                                   </Card>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column */}
                    <div className="lg:col-span-1">
                         <Card>
                            <CardHeader>
                                <CardTitle>Hierarquia e Grupos</CardTitle>
                                <CardDescription>Estrutura de liderança e serviço.</CardDescription>
                            </CardHeader>
                             <CardContent className="space-y-3 text-sm">
                                <div className="flex items-center"><User className="mr-3 size-4 text-muted-foreground"/><strong className="w-24 shrink-0">Discipulador:</strong> <span className="truncate">{hierarchyInfo.supervisor || '-'}</span></div>
                                <div className="flex items-center"><Network className="mr-3 size-4 text-muted-foreground"/><strong className="w-24 shrink-0">Rede:</strong> <span className="truncate">{hierarchyInfo.rede || '-'}</span></div>
                                <div className="flex items-center"><Building2 className="mr-3 size-4 text-muted-foreground"/><strong className="w-24 shrink-0">Área:</strong> <span className="truncate">{hierarchyInfo.area?.nome || '-'}</span></div>
                                <div className="flex items-center"><Users className="mr-3 size-4 text-muted-foreground"/><strong className="w-24 shrink-0">GC:</strong> <span className="truncate">{hierarchyInfo.cell?.nome || '-'}</span></div>
                                <div className="flex items-center"><HandHelping className="mr-3 size-4 text-muted-foreground"/><strong className="w-24 shrink-0">Voluntariado:</strong> <span className="truncate">{hierarchyInfo.serviceArea || '-'}</span></div>
                                <div className="flex items-center"><Shield className="mr-3 size-4 text-muted-foreground"/><strong className="w-24 shrink-0">Equipe:</strong> <span className="truncate">{hierarchyInfo.team || '-'}</span></div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

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

