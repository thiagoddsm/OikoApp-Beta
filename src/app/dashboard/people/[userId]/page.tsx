
'use client';

import React, { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useMemoFirebase, useFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, User, ArrowLeft, Pencil, MapPin, Phone, Mail, Calendar, Users, Footprints, Church, MessageSquare, Award, TrendingUp, UserCheck, HeartHandshake, GraduationCap, HandHelping, UserPlus, Target, Info, CheckCircle, Smartphone, Clock, BadgeHelp, Network, Building2, UserX, Briefcase, MapIcon, HandCoins } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { EditUserDialog } from '@/components/users/edit-user-dialog';
import { DiscipleshipTrail } from '@/components/users/discipleship-trail';
import { Progress } from "@/components/ui/progress";
import { format } from 'date-fns';
import { DiscipleshipNotes } from '@/components/users/discipleship-notes';
import { MemberDetails } from '@/components/users/member-details';
import { VolunteerServiceForm } from '@/components/volunteering/volunteer-service-form';
import { VolunteeringProvider } from '@/contexts/volunteering-context';


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
  batizado?: 'sim' | 'nao';
  igrejaBatismo?: string;
  membroAntigo?: 'sim' | 'nao';
  igrejaAntiga?: string;
  decisao?: string[];
  dataDecisao?: string;
  temFilhos?: 'sim' | 'nao';
  idadeFilhos?: string;
  comoConheceu?: string;
  nomeConvidou?: string;
  contatoPreferencia?: string[];
  contatoTurno?: string[];
  dizimista?: 'sim' | 'nao';
};


type Cell = {
    id: string;
    nome: string;
    areaId?: string;
    redeId?: string;
}

type Area = {
    id: string;
    nome: string;
}

type Rede = {
    id: string;
    nome: string;
}

type Supervisor = {
  id: string;
  name: string;
}

const statusConfig: { [key: string]: { label: string; level: number; icon: React.ElementType } } = {
  nao_alcancado: { label: "Não Alcançado", level: 1, icon: UserX },
  novo_convertido: { label: "Novo Convertido", level: 2, icon: UserPlus },
  reconciliado: { label: "Reconciliado", level: 3, icon: HeartHandshake },
  transferido: { label: "Transferido", level: 4, icon: Church },
  membro: { label: "Membro", level: 5, icon: Award },
  consolidado: { label: "Consolidado", level: 6, icon: UserCheck },
  lider_treinamento: { label: "Líder em Treinamento", level: 7, icon: GraduationCap },
  lider_gc: { label: "Líder de GC", level: 8, icon: Users },
  lider_area: { label: "Líder de Área", level: 9, icon: MapIcon },
  lider_rede: { label: "Líder de Rede", level: 10, icon: Network },
  pastor: { label: "Pastor", level: 11, icon: Briefcase },
};

const totalLevels = Object.keys(statusConfig).length;


function KpiCard({ icon: Icon, title, value, footer }) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardDescription className="flex items-center gap-2 text-xs">
          <Icon className="size-4" /> {title}
        </CardDescription>
        <CardTitle className="text-xl truncate">{value}</CardTitle>
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
  const router = useRouter();
  const userId = params.userId as string;
  const { firestore } = useFirebase();
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);

  const { data: userProfile, isLoading: isLoadingUser } = useDoc<UserProfile>(`users/${userId}`);
  
  const cellId = userProfile?.hierarchy?.celulaId;
  const { data: cell, isLoading: isLoadingCell } = useDoc<Cell>(
    cellId ? `cells/${cellId}` : null
  );

  const areaId = cell?.areaId;
  const { data: area, isLoading: isLoadingArea } = useDoc<Area>(
    areaId ? `areas/${areaId}` : null
  );

  const redeId = area?.redeId;
  const { data: rede, isLoading: isLoadingRede } = useDoc<Rede>(
    redeId ? `redes/${redeId}` : null
  );

  const supervisorId = userProfile?.hierarchy?.supervisorId;
  const { data: supervisor, isLoading: isLoadingSupervisor } = useDoc<Supervisor>(
    supervisorId ? `users/${supervisorId}` : null
  );

  const avatar = PlaceHolderImages.find(p => p.id === (userProfile?.avatar || 'avatar-1'));
  const isLoading = isLoadingUser || isLoadingCell || isLoadingSupervisor || isLoadingArea || isLoadingRede;

  const statusInfo = statusConfig[userProfile?.integrationStatus || 'nao_alcancado'] || statusConfig.nao_alcancado;
  const progressPercentage = (statusInfo.level / totalLevels) * 100;
  

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
            <Link href="/dashboard/people/list"><ArrowLeft className="mr-2 h-4" />Voltar para Lista</Link>
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
          <div className="bg-muted/30 p-6 flex flex-col md:flex-row items-center gap-6">
             <div className="relative">
                <Avatar className="h-24 w-24 border-4 border-background ring-2 ring-primary">
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
                 <Button onClick={() => router.back()} variant="outline" className="w-full">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar
                </Button>
            </div>
          </div>
        </Card>
        
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KpiCard icon={Church} title="Célula (GC)" value={cell?.nome || "N/A"} footer="Grupo Pequeno do membro." />
            <KpiCard icon={UserCheck} title="Discipulador" value={supervisor?.name || "N/A"} footer="Líder que acompanha este membro." />
            <KpiCard icon={Building2} title="Área" value={area?.nome || "N/A"} footer="Área de supervisão do GC." />
            <KpiCard icon={Network} title="Rede" value={rede?.nome || "N/A"} footer="Rede de supervisão da Área." />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="trail" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="trail"><Footprints className="mr-2 size-4" />Trilha</TabsTrigger>
                <TabsTrigger value="discipleship"><HandHelping className="mr-2 size-4" />Discipulado</TabsTrigger>
                <TabsTrigger value="details"><User className="mr-2 size-4" />Detalhes</TabsTrigger>
                <TabsTrigger value="service"><HandCoins className="mr-2 size-4"/>Serviço</TabsTrigger>
            </TabsList>

            <TabsContent value="trail">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Footprints/>Trilha de Discipulado</CardTitle>
                    <CardDescription>Acompanhe e gerencie o progresso individual na jornada de crescimento.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DiscipleshipTrail currentStatusId={userProfile.integrationStatus} />
                  </CardContent>
                </Card>
            </TabsContent>
            
            <TabsContent value="discipleship">
              <DiscipleshipNotes 
                memberId={userId}
                memberName={userProfile.name}
                currentStatusId={userProfile.integrationStatus || 'nao_alcancado'}
              />
            </TabsContent>

            <TabsContent value="details">
                 <MemberDetails user={userProfile} />
            </TabsContent>
            <TabsContent value="service">
                <VolunteeringProvider>
                    <Card>
                        <CardHeader>
                            <CardTitle>Configurações de Serviço Voluntário</CardTitle>
                            <CardDescription>Gerencie a disponibilidade e as áreas de atuação deste membro.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <VolunteerServiceForm user={userProfile} />
                        </CardContent>
                    </Card>
                </VolunteeringProvider>
            </TabsContent>
        </Tabs>
      </div>
      
      <Dialog open={isEditDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl">
            <DialogHeader>
            <DialogTitle>Editar Perfil de {userProfile.name}</DialogTitle>
            <DialogDescription>
                Atualize as informações do membro. As alterações serão salvas no banco de dados.
            </DialogDescription>
            </DialogHeader>
            <EditUserDialog 
                user={userProfile}
                open={isEditDialogOpen}
                onOpenChange={setEditDialogOpen}
            />
        </DialogContent>
      </Dialog>
    </>
  );
}

    
