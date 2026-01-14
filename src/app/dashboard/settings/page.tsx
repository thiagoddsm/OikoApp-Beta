
'use client';

import React, { useMemo } from 'react';
import { useFirebase, updateDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import { doc, query, collection } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Shield, Footprints } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DiscipleshipChecklistManager } from '@/components/settings/discipleship-checklist-manager';
import { userRoles } from '@/app/dashboard/layout';

type User = {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  hierarchy?: {
    role?: string;
  }
};

export default function SettingsPage() {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();

  const usersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'users')) : null, [firestore]);
  const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);

  const isLoading = isLoadingUsers || !user;

  const handleRoleChange = (targetUser: User, newRole: string) => {
    if (!firestore || !user) return;

    // Prevent a user from demoting themselves if they are the only admin/pastor
    const admins = users?.filter(u => u.hierarchy?.role === 'pastor_senior' || u.hierarchy?.role === 'admin');
    if (user.uid === targetUser.id && (targetUser.hierarchy?.role === 'pastor_senior' || targetUser.hierarchy?.role === 'admin') && admins?.length === 1) {
       toast({
        variant: "destructive",
        title: "Ação não permitida",
        description: "Você não pode remover seu próprio acesso de administrador, pois é o único.",
      });
      // Revert the select change visually if possible, or just return.
      // For a controlled component, this return would be enough if state isn't updated.
      // Since `onValueChange` is being used, a re-render might be needed to show the old value.
      return;
    }


    const userDocRef = doc(firestore, 'users', targetUser.id);
    const updateData = { 'hierarchy.role': newRole };
    
    updateDocumentNonBlocking(userDocRef, updateData);

    toast({
        title: "Atualização Iniciada!",
        description: `O perfil de ${targetUser.name} será atualizado para ${userRoles[newRole]}.`,
    });
  };

  return (
     <Card>
        <CardHeader>
            <CardTitle>Configurações</CardTitle>
            <CardDescription>
                Gerencie perfis de acesso, checklists e outras configurações do sistema.
            </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="access">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="access"><Shield className="mr-2 size-4" /> Perfis de Acesso</TabsTrigger>
              <TabsTrigger value="journey"><Footprints className="mr-2 size-4" /> Jornada</TabsTrigger>
            </TabsList>
            <TabsContent value="access" className="mt-6">
               {isLoading ? (
                  <div className="flex items-center justify-center h-48">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
              ) : (
                  <div className="rounded-lg border">
                      <Table>
                          <TableHeader>
                              <TableRow>
                                  <TableHead>Usuário</TableHead>
                                  <TableHead className="text-right w-[250px]">Perfil de Acesso</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {users?.map((targetUser) => {
                                  const avatar = PlaceHolderImages.find(p => p.id === (targetUser.avatar || 'avatar-1'));
                                  return (
                                  <TableRow key={targetUser.id}>
                                      <TableCell>
                                          <div className="flex items-center gap-3">
                                              <Avatar className="h-10 w-10">
                                                  {avatar && <AvatarImage src={avatar.imageUrl} alt={avatar.description} />}
                                                  <AvatarFallback>{targetUser.name.charAt(0)}</AvatarFallback>
                                              </Avatar>
                                              <div>
                                                  <p className="font-medium">{targetUser.name}</p>
                                                  <p className="text-sm text-muted-foreground">{targetUser.email || 'Sem email'}</p>
                                              </div>
                                          </div>
                                      </TableCell>
                                      <TableCell className="text-right">
                                          <Select
                                              value={targetUser.hierarchy?.role || ''}
                                              onValueChange={(newRole) => handleRoleChange(targetUser, newRole)}
                                              
                                          >
                                              <SelectTrigger>
                                                  <SelectValue placeholder="Selecione um perfil" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                  {Object.entries(userRoles).map(([value, label]) => (
                                                      <SelectItem key={value} value={value}>{label}</SelectItem>
                                                  ))}
                                              </SelectContent>
                                          </Select>
                                      </TableCell>
                                  </TableRow>
                                  );
                              })}
                          </TableBody>
                      </Table>
                  </div>
              )}
            </TabsContent>
            <TabsContent value="journey" className="mt-6">
                <DiscipleshipChecklistManager />
            </TabsContent>
          </Tabs>
        </CardContent>
    </Card>
  );
}
