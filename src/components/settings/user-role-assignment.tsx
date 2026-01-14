
'use client';

import React, { useMemo } from 'react';
import { useFirebase, updateDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import { doc, query, collection } from 'firebase/firestore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { PlaceHolderImages } from '@/lib/placeholder-images';

type User = {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  hierarchy?: {
    role?: string;
  }
};

export function UserRoleAssignment({ roles }) {
  const { firestore, user: currentUser } = useFirebase();
  const { toast } = useToast();

  const usersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'users')) : null, [firestore]);
  const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);

  const isLoading = isLoadingUsers || !currentUser;

  const handleRoleChange = (targetUser: User, newRole: string) => {
    if (!firestore || !currentUser) return;

    // Prevent a user from demoting themselves if they are the only admin/pastor
    const admins = users?.filter(u => u.hierarchy?.role === 'pastor_senior' || u.hierarchy?.role === 'admin');
    if (currentUser.uid === targetUser.id && (targetUser.hierarchy?.role === 'pastor_senior' || targetUser.hierarchy?.role === 'admin') && admins?.length === 1) {
       toast({
        variant: "destructive",
        title: "Ação não permitida",
        description: "Você não pode remover seu próprio acesso de administrador, pois é o único.",
      });
      return;
    }


    const userDocRef = doc(firestore, 'users', targetUser.id);
    const updateData = { 'hierarchy.role': newRole };
    
    updateDocumentNonBlocking(userDocRef, updateData);

    toast({
        title: "Atualização Iniciada!",
        description: `O perfil de ${targetUser.name} será atualizado para ${newRole}.`,
    });
  };

  return (
    <>
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
                          const isSelf = currentUser && currentUser.uid === targetUser.id;
                          const isOnlyAdmin = isSelf && (targetUser.hierarchy?.role === 'admin' || targetUser.hierarchy?.role === 'pastor_senior') && users.filter(u => u.hierarchy?.role === 'admin' || u.hierarchy?.role === 'pastor_senior').length === 1;

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
                                      disabled={isOnlyAdmin}
                                  >
                                      <SelectTrigger>
                                          <SelectValue placeholder="Selecione um perfil" />
                                      </SelectTrigger>
                                      <SelectContent>
                                          {roles.map(role => (
                                              <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                                          ))}
                                      </SelectContent>
                                  </Select>
                                   {isOnlyAdmin && <p className="text-xs text-destructive text-right mt-1">Não pode alterar o único admin.</p>}
                              </TableCell>
                          </TableRow>
                          );
                      })}
                  </TableBody>
              </Table>
          </div>
      )}
    </>
  );
}
