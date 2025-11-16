'use client';

import React from 'react';
import { useFirebase, useMemoFirebase } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Loader2, Shield } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useMemo } from 'react';

type User = {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
};

type AdminRole = {
  id: string;
};

export default function SettingsPage() {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();

  const usersQuery = useMemoFirebase(() => 
    user ? collection(firestore, 'users') : null,
    [firestore, user]
  );
  
  const adminsQuery = useMemoFirebase(() =>
    user ? collection(firestore, 'roles_admin') : null,
    [firestore, user]
  );

  const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);
  const { data: admins, isLoading: isLoadingAdmins } = useCollection<AdminRole>(adminsQuery);

  const adminIds = useMemo(() => new Set(admins?.map(admin => admin.id)), [admins]);

  const isLoading = isLoadingUsers || isLoadingAdmins || !user;

  const handleAdminToggle = async (targetUser: User, isAdmin: boolean) => {
    if (!firestore || !user) return;

    // Prohibit a user from removing their own admin rights
    if (user.uid === targetUser.id && !isAdmin) {
      toast({
        variant: "destructive",
        title: "Ação não permitida",
        description: "Você não pode remover seu próprio acesso de administrador.",
      });
      return;
    }

    const adminDocRef = doc(firestore, 'roles_admin', targetUser.id);
    
    try {
      if (isAdmin) {
        await setDoc(adminDocRef, {});
        toast({
          title: "Sucesso!",
          description: `${targetUser.name} agora é um administrador.`,
        });
      } else {
        await deleteDoc(adminDocRef);
        toast({
          title: "Sucesso!",
          description: `O acesso de administrador de ${targetUser.name} foi removido.`,
        });
      }
    } catch (error) {
        console.error("Error updating admin status:", error);
        toast({
            variant: "destructive",
            title: "Erro",
            description: "Não foi possível atualizar o perfil de acesso.",
        });
    }
  };

  return (
     <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Perfis de Acesso
            </CardTitle>
            <CardDescription>
                Gerencie quais usuários têm permissão de administrador no sistema.
            </CardDescription>
        </CardHeader>
        <CardContent>
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
                                <TableHead className="text-right">Administrador</TableHead>
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
                                        <Switch
                                            checked={adminIds.has(targetUser.id)}
                                            onCheckedChange={(isChecked) => handleAdminToggle(targetUser, isChecked)}
                                            aria-label={`Tornar ${targetUser.name} administrador`}
                                            disabled={targetUser.id === user.uid}
                                        />
                                    </TableCell>
                                </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}
        </CardContent>
    </Card>
  );
}
