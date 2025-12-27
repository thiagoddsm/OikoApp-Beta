
'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useDoc, useCollection } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, User, ArrowLeft, Pencil, MapPin, Phone, Mail, Calendar, UserSquare, VenetianMask, Building, Users, Footprints } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Link from 'next/link';
import { EditUserDialog } from '@/components/users/edit-user-dialog';
import { DiscipleshipNotes } from '@/components/users/discipleship-notes';
import { DiscipleshipTrail } from '@/components/users/discipleship-trail';

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
  };
};

type Cell = {
    id: string;
    nome: string;
}

type Supervisor = {
  id: string;
  name: string;
}

function UserInfoItem({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <Icon className="size-4 text-muted-foreground mt-1 shrink-0" />
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-sm font-medium">{value}</span>
      </div>
    </div>
  );
}

const statusLabels: { [key: string]: string } = {
  visitante_nao_crente: "Visitante (Não Crente)",
  novo_convertido: "Novo Convertido",
  recem_chegado: "Recém Chegado",
  em_discipulado_td: "Em Discipulado (TD)",
  batizado_transferido: "Batizado / Transferido",
  em_gc: "Em GC",
  curso_membros: "Curso de Membros",
  servindo: "Servindo",
  lider_gc: "Líder de GC",
};

export default function UserProfilePage() {
  const params = useParams();
  const userId = params.userId as string;

  const [isEditDialogOpen, setEditDialogOpen] = useState(false);

  const { data: userProfile, isLoading: isLoadingUser } = useDoc<UserProfile>(`users/${userId}`);
  
  const { data: cell, isLoading: isLoadingCell } = useDoc<Cell>(
    userProfile?.hierarchy?.celulaId ? `cells/${userProfile.hierarchy.celulaId}` : null
  );
  
  const { data: supervisor, isLoading: isLoadingSupervisor } = useDoc<Supervisor>(
    userProfile?.hierarchy?.supervisorId ? `users/${userProfile.hierarchy.supervisorId}` : null
  );

  const { data: allUsers, isLoading: isLoadingAllUsers } = useCollection<UserProfile>('users');


  const avatar = PlaceHolderImages.find(p => p.id === (userProfile?.avatar || 'avatar-1'));
  const isLoading = isLoadingUser || isLoadingCell || isLoadingSupervisor || isLoadingAllUsers;

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
            <Link href="/dashboard/users"><ArrowLeft className="mr-2 h-4 w-4" />Voltar para Usuários</Link>
          </Button>
        </Card>
      </div>
    );
  }
  
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
        {/* Coluna do Perfil */}
        <div className="md:col-span-1">
           <Card className="w-full">
            <CardHeader className="items-center text-center">
              <Avatar className="h-24 w-24 mb-4">
                {avatar && <AvatarImage src={avatar.imageUrl} alt={avatar.description} />}
                <AvatarFallback className="text-3xl">{userProfile.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <CardTitle>{userProfile.name}</CardTitle>
              <CardDescription className="capitalize">
                {statusLabels[userProfile.integrationStatus || ''] || 'Não definido'}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm">
               <div className="space-y-4">
                  <UserInfoItem icon={Mail} label="Email" value={userProfile.email} />
                  <UserInfoItem icon={Phone} label="Telefone" value={userProfile.phone} />
                  <UserInfoItem icon={Calendar} label="Data de Nascimento" value={userProfile.dataNascimento} />
                  <UserInfoItem icon={UserSquare} label="Sexo" value={userProfile.sexo} />
                  <UserInfoItem icon={VenetianMask} label="Estado Civil" value={userProfile.estadoCivil} />
                  <UserInfoItem icon={MapPin} label="Endereço" value={userProfile.address?.street} />
                  <UserInfoItem icon={Building} label="Célula" value={cell?.nome} />
                  <UserInfoItem icon={Users} label="Responsável" value={supervisor?.name} />
               </div>
            </CardContent>
          </Card>
           <div className="flex flex-col gap-2 mt-4">
              <Button className="w-full" onClick={() => setEditDialogOpen(true)}>
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

        {/* Coluna das Abas */}
        <div className="md:col-span-2">
            <Tabs defaultValue="discipleship" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="discipleship">Discipulado</TabsTrigger>
                    <TabsTrigger value="trail">Trilha de Discipulado</TabsTrigger>
                    <TabsTrigger value="history">Histórico</TabsTrigger>
                </TabsList>
                <TabsContent value="discipleship">
                    <DiscipleshipNotes memberId={userId} allUsers={allUsers || []} />
                </TabsContent>
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
                <TabsContent value="history">
                     <Card>
                        <CardHeader>
                            <CardTitle>Histórico</CardTitle>
                            <CardDescription>Histórico de interações e mudanças de status do membro.</CardDescription>
                        </CardHeader>
                        <CardContent>
                           <div className="flex items-center justify-center h-48 border-2 border-dashed rounded-lg">
                                <p className="text-muted-foreground">Em construção...</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
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
