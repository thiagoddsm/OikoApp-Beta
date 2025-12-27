
'use client';

import React, { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useDoc, useCollection } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, User, ArrowLeft, Pencil, MapPin, Phone, Mail, Calendar, Users, Footprints, Church, MessageSquare, Award, TrendingUp, UserCheck, HeartHandshake, GraduationCap, HandHelping, UserPlus } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Link from 'next/link';
import { EditUserDialog } from '@/components/users/edit-user-dialog';
import { DiscipleshipNotes } from '@/components/users/discipleship-notes';
import { DiscipleshipTrail } from '@/components/users/discipleship-trail';
import { Progress } from "@/components/ui/progress";
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type UserProfile = {
  id: string;
  name: string;
  avatar?: string;
  integrationStatus?: string;
  email?: string;
  phone?: string;
  dataNascimento?: string;
  sexo?: string;
  estadoCivil?: string;
  address?: {
    street?: string;
  };
  hierarchy?: {
    celulaId?: string;
    supervisorId?: string;
    role?: string;
  };
  createdAt?: any;
};

type Cell = {
    id: string;
    nome: string;
}

type Supervisor = {
  id: string;
  name: string;
}

const statusConfig: { [key: string]: { label: string; level: number; icon: React.ElementType } } = {
  visitante_nao_crente: { label: "Visitante", level: 1, icon: UserPlus },
  novo_convertido: { label: "Novo Convertido", level: 2, icon: HeartHandshake },
  recem_chegado: { label: "Recém Chegado", level: 2, icon: UserCheck },
  em_discipulado_td: { label: "Em Discipulado (TD)", level: 3, icon: Users },
  batizado_transferido: { label: "Batizado / Transferido", level: 4, icon: Church },
  em_gc: { label: "Em GC", level: 5, icon: Users },
  curso_membros: { label: "Curso de Membros", level: 6, icon: GraduationCap },
  servindo: { label: "Servindo", level: 7, icon: HandHelping },
  lider_gc: { label: "Líder de GC", level: 8, icon: Award },
};
const totalLevels = Object.keys(statusConfig).length;


function KpiCard({ icon: Icon, title, value, footer }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-2 text-xs">
          <Icon className="size-4" /> {title}
        </CardDescription>
        <CardTitle className="text-xl">{value}</CardTitle>
      </CardHeader>
      {footer && (
        <CardContent>
          <p className="text-xs text-muted-foreground">{footer}</p>
        </CardContent>
      )}
    </Card>
  );
}

export default function UserProfilePage() {
  const params = useParams();
  const userId = params.userId as string;

  const [isEditDialogOpen, setEditDialogOpen] = useState(false);

  const { data: userProfile, isLoading: isLoadingUser } = useDoc<UserProfile>(`users/${userId}`);
  
  const cellId = userProfile?.hierarchy?.celulaId;
  const supervisorId = userProfile?.hierarchy?.supervisorId;

  const { data: cell, isLoading: isLoadingCell } = useDoc<Cell>(
    cellId ? `cells/${cellId}` : null
  );
  
  const { data: supervisor, isLoading: isLoadingSupervisor } = useDoc<Supervisor>(
    supervisorId ? `users/${supervisorId}` : null
  );

  const { data: allUsers, isLoading: isLoadingAllUsers } = useCollection<UserProfile>('users');
  const { data: notes, isLoading: isLoadingNotes } = useCollection('member_notes', [{ field: 'memberId', operator: '==', value: userId }]);


  const avatar = PlaceHolderImages.find(p => p.id === (userProfile?.avatar || 'avatar-1'));
  const isLoading = isLoadingUser || isLoadingCell || isLoadingSupervisor || isLoadingAllUsers || isLoadingNotes;

  const statusInfo = statusConfig[userProfile?.integrationStatus || 'visitante_nao_crente'] || statusConfig.visitante_nao_crente;
  const progressPercentage = (statusInfo.level / totalLevels) * 100;
  
  const memberSince = useMemo(() => {
    if (userProfile?.createdAt) {
      const date = userProfile.createdAt.toDate();
      return `Membro desde ${format(date, 'dd/MM/yyyy')}`;
    }
    return 'Data de entrada não registrada';
  }, [userProfile?.createdAt]);

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <Card className="w-full max-w-md text-center p-8">
          <User className="h-12 w-12 mx-auto text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">Usuário não encontrado</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            O usuário que você está procurando não foi encontrado ou você não tem permissão para visualizá-lo.
          </p>
          <Button asChild className="mt-6">
            <Link href="/dashboard/users"><ArrowLeft className="mr-2 h-4" />Voltar para Usuários</Link>
          </Button>
        </Card>
      </div>
    );
  }
  
  return (
    <>
      <div className="space-y-6">
        {/* Profile Header */}
        <Card className="w-full overflow-hidden">
          <div className="bg-muted/30 p-8 flex flex-col md:flex-row items-center gap-6">
             <div className="relative">
                <Avatar className="h-28 w-28 border-4 border-background ring-2 ring-primary">
                    {avatar && <AvatarImage src={avatar.imageUrl} alt={avatar.description} />}
                    <AvatarFallback className="text-3xl">{userProfile.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground rounded-full h-8 w-8 flex items-center justify-center text-xs font-bold ring-4 ring-background">
                    {statusInfo.level}
                </div>
            </div>

            <div className="flex-1 text-center md:text-left">
                <CardTitle className="text-2xl">{userProfile.name}</CardTitle>
                <CardDescription className="flex items-center justify-center md:justify-start gap-2 mt-1">
                    <statusInfo.icon className="size-4" /> {statusInfo.label}
                </CardDescription>

                 <div className="mt-4 space-y-2">
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <span>Progresso na Trilha</span>
                        <span>Nível {statusInfo.level} de {totalLevels}</span>
                    </div>
                    <Progress value={progressPercentage} className="h-2" />
                </div>
            </div>
            <div className="flex-shrink-0 flex flex-col gap-2">
                <Button onClick={() => setEditDialogOpen(true)} className="w-full">
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar Perfil
                </Button>
                 <Button asChild variant="outline" className="w-full">
                    <Link href="/dashboard/users">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Voltar para lista
                    </Link>
                </Button>
            </div>
          </div>
        </Card>
        
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KpiCard icon={Church} title="Célula" value={cell?.nome || "N/A"} footer="Grupo Pequeno do membro." />
            <KpiCard icon={UserCheck} title="Responsável" value={supervisor?.name || "N/A"} footer="Líder que acompanha este membro." />
            <KpiCard icon={MessageSquare} title="Anotações" value={notes?.length || 0} footer="Registros de discipulado." />
            <KpiCard icon={Calendar} title="Na Jornada" value={userProfile.createdAt ? formatDistanceToNow(userProfile.createdAt.toDate(), { locale: ptBR }) : 'N/A'} footer={memberSince} />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="trail" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="trail"><Footprints className="mr-2 size-4" />Trilha</TabsTrigger>
                <TabsTrigger value="notes"><MessageSquare className="mr-2 size-4" />Anotações</TabsTrigger>
                <TabsTrigger value="journey"><TrendingUp className="mr-2 size-4" />Jornada</TabsTrigger>
                <TabsTrigger value="details"><User className="mr-2 size-4" />Detalhes</TabsTrigger>
            </TabsList>

            <TabsContent value="trail">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Footprints/>Trilha de Discipulado</CardTitle>
                    <CardDescription>Acompanhe e gerencie o progresso individual na jornada de crescimento.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DiscipleshipTrail />
                  </CardContent>
                </Card>
            </TabsContent>

             <TabsContent value="notes">
                <DiscipleshipNotes memberId={userId} allUsers={allUsers || []} />
            </TabsContent>

            <TabsContent value="journey">
                 <Card>
                    <CardHeader>
                        <CardTitle>Linha do Tempo (Jornada)</CardTitle>
                        <CardDescription>Histórico de eventos e mudanças de status do membro.</CardDescription>
                    </CardHeader>
                    <CardContent>
                       <div className="flex items-center justify-center h-48 border-2 border-dashed rounded-lg">
                            <p className="text-muted-foreground">Em construção...</p>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="details">
                 <Card>
                    <CardHeader>
                        <CardTitle>Dados Pessoais</CardTitle>
                        <CardDescription>Informações de contato e detalhes do perfil.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-2 gap-x-8 gap-y-4">
                        <div className="flex items-start gap-3">
                            <Mail className="size-4 text-muted-foreground mt-1 shrink-0" />
                            <div><span className="text-xs text-muted-foreground">Email</span><p className="text-sm font-medium">{userProfile.email || 'Não informado'}</p></div>
                        </div>
                        <div className="flex items-start gap-3">
                            <Phone className="size-4 text-muted-foreground mt-1 shrink-0" />
                            <div><span className="text-xs text-muted-foreground">Telefone</span><p className="text-sm font-medium">{userProfile.phone || 'Não informado'}</p></div>
                        </div>
                         <div className="flex items-start gap-3">
                            <Calendar className="size-4 text-muted-foreground mt-1 shrink-0" />
                            <div><span className="text-xs text-muted-foreground">Nascimento</span><p className="text-sm font-medium">{userProfile.dataNascimento ? format(new Date(userProfile.dataNascimento+'T12:00:00'), 'dd/MM/yyyy') : 'Não informado'}</p></div>
                        </div>
                         <div className="flex items-start gap-3">
                            <Users className="size-4 text-muted-foreground mt-1 shrink-0" />
                            <div><span className="text-xs text-muted-foreground">Estado Civil</span><p className="text-sm font-medium">{userProfile.estadoCivil || 'Não informado'}</p></div>
                        </div>
                         <div className="flex items-start gap-3">
                            <MapPin className="size-4 text-muted-foreground mt-1 shrink-0" />
                            <div><span className="text-xs text-muted-foreground">Endereço</span><p className="text-sm font-medium">{userProfile.address?.street || 'Não informado'}</p></div>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
      </div>
      
      {userProfile && (
        <EditUserDialog 
          user={userProfile}
          open={isEditDialogOpen}
          onOpenChange={setEditDialogOpen}
        />
      )}
    </>
  );
}
