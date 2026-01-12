
'use client';

import React, { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useDoc, useMemoFirebase, useFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, User, ArrowLeft, Pencil, MapPin, Phone, Mail, Calendar, Users, Footprints, Church, MessageSquare, Award, TrendingUp, UserCheck, HeartHandshake, GraduationCap, HandHelping, UserPlus, Target, Info, CheckCircle, Smartphone, Clock, BadgeHelp, Network, AreaChart, Percent, HandCoins, UserX, Briefcase, MapIcon } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { EditUserDialog } from '@/components/users/edit-user-dialog';
import { DiscipleshipTrail } from '@/components/users/discipleship-trail';
import { Progress } from "@/components/ui/progress";
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FollowUpTimeline } from '@/components/users/follow-up-timeline';


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
  lider_gc: { label: "Líder de GC", level: 8, icon: Group },
  lider_area: { label: "Líder de Área", level: 9, icon: MapIcon },
  lider_rede: { label: "Líder de Rede", level: 10, icon: Network },
  pastor: { label: "Pastor", level: 11, icon: Briefcase },
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

function DetailItem({ icon: Icon, label, value, children }) {
    if (!value && !children) return null;
    return (
        <div className="flex items-start gap-3">
            <Icon className="size-4 text-muted-foreground mt-1 shrink-0" />
            <div>
                <span className="text-xs text-muted-foreground">{label}</span>
                {value && <p className="text-sm font-medium">{value}</p>}
                {children}
            </div>
        </div>
    );
}

export default function UserProfilePage() {
  const params = useParams();
  const userId = params.userId as string;
  const { firestore } = useFirebase();
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);

  const { data: userProfile, isLoading: isLoadingUser } = useDoc<UserProfile>(`users/${userId}`);
  
  const cellId = userProfile?.hierarchy?.celulaId;
  const { data: cell, isLoading: isLoadingCell } = useDoc<Cell>(
    cellId ? `cells/${cellId}` : null
  );

  const areaId = cell?.areaId;
  const redeId = cell?.redeId;

  const { data: area, isLoading: isLoadingArea } = useDoc<Area>(
    areaId ? `areas/${areaId}` : null
  );

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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            <KpiCard icon={Church} title="Célula (GC)" value={cell?.nome || "N/A"} footer="Grupo Pequeno do membro." />
            <KpiCard icon={AreaChart} title="Área" value={area?.nome || "N/A"} footer="Área de supervisão do GC." />
            <KpiCard icon={Network} title="Rede" value={rede?.nome || "N/A"} footer="Rede de supervisão da Área." />
            <KpiCard icon={Percent} title="Frequência no GC" value="85%" footer="Últimos 3 meses (simulado)." />
            <KpiCard icon={HandHelping} title="Serviço" value="Mídia" footer="Área de voluntariado (simulado)." />
            <KpiCard icon={Percent} title="Frequência (Serviço)" value="95%" footer="Últimos 3 meses (simulado)." />
            <KpiCard icon={HandCoins} title="Dizimista" value="Sim" footer="Fidelidade nos últimos 6 meses." />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="trail" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="trail"><Footprints className="mr-2 size-4" />Trilha</TabsTrigger>
                <TabsTrigger value="follow-up"><MessageSquare className="mr-2 size-4" />Follow Up</TabsTrigger>
                <TabsTrigger value="details"><User className="mr-2 size-4" />Detalhes</TabsTrigger>
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

            <TabsContent value="follow-up">
                <FollowUpTimeline memberId={userId} memberName={userProfile.name} />
            </TabsContent>

            <TabsContent value="details">
                 <Card>
                    <CardHeader>
                        <CardTitle>Dados do Perfil</CardTitle>
                        <CardDescription>Informações de contato, jornada espiritual e chegada na igreja.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                       <section>
                            <h4 className="font-semibold text-primary border-b pb-2 mb-4">Dados Pessoais</h4>
                            <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
                                <DetailItem icon={Mail} label="Email" value={userProfile.email || 'Não informado'} />
                                <DetailItem icon={Phone} label="Telefone" value={userProfile.phone || 'Não informado'} />
                                <DetailItem icon={Calendar} label="Nascimento" value={userProfile.dataNascimento ? format(new Date(userProfile.dataNascimento+'T12:00:00'), 'dd/MM/yyyy') : 'Não informado'} />
                                <DetailItem icon={Users} label="Estado Civil" value={userProfile.estadoCivil || 'Não informado'} />
                                <DetailItem icon={MapPin} label="Endereço" value={userProfile.address?.street || 'Não informado'} />
                                <DetailItem icon={Users} label="Filhos" value={`${userProfile.temFilhos === 'sim' ? 'Sim' : 'Não'} ${userProfile.idadeFilhos ? `(${userProfile.idadeFilhos})` : ''}`} />
                            </div>
                       </section>
                       <section>
                            <h4 className="font-semibold text-primary border-b pb-2 mb-4">Jornada Espiritual</h4>
                             <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
                                <DetailItem icon={CheckCircle} label="Batizado?" value={userProfile.batizado === 'sim' ? `Sim, na ${userProfile.igrejaBatismo || 'igreja'}` : 'Não'} />
                                <DetailItem icon={Church} label="Membro anterior?" value={userProfile.membroAntigo === 'sim' ? `Sim, da ${userProfile.igrejaAntiga || 'outra igreja'}` : 'Não'} />
                                <DetailItem icon={Target} label="Decisão" value={userProfile.decisao?.join(', ') || 'Não informado'} />
                                <DetailItem icon={Calendar} label="Data da Decisão" value={userProfile.dataDecisao ? format(new Date(userProfile.dataDecisao+'T12:00:00'), 'dd/MM/yyyy') : 'Não informado'} />
                            </div>
                       </section>
                        <section>
                            <h4 className="font-semibold text-primary border-b pb-2 mb-4">Chegada na IBM</h4>
                             <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
                                <DetailItem icon={BadgeHelp} label="Como conheceu a IBM" value={userProfile.comoConheceu || 'Não informado'} />
                                <DetailItem icon={UserPlus} label="Quem convidou" value={userProfile.nomeConvidou || 'Não informado'} />
                                <DetailItem icon={Smartphone} label="Preferência de Contato" value={userProfile.contatoPreferencia?.join(', ') || 'Não informado'} />
                                <DetailItem icon={Clock} label="Turno para Contato" value={userProfile.contatoTurno?.join(', ') || 'Não informado'} />
                            </div>
                       </section>
                    </CardContent>
                </Card>
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
