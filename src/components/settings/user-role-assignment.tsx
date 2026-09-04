'use client';

import React, { useMemo } from 'react';
import { useFirebase, updateDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import { doc, query, collection } from 'firebase/firestore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Search, ChevronLeft, ChevronRight } from "lucide-react";
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

interface UserRoleAssignmentProps {
    roles: any[];
}

export function UserRoleAssignment({ roles }: UserRoleAssignmentProps) {
  const { firestore, user: currentUser } = useFirebase();
  const { toast } = useToast();

  const usersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'users')) : null, [firestore]);
  const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);

  const handleRoleChange = (targetUser: User, newRole: string) => {
    if (!firestore || !currentUser) return;

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
    toast({ title: "Perfil de acesso alterado." });
  };

  const [searchQuery, setSearchQuery] = React.useState('');
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 15;

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (!searchQuery) return users;
    const lowerQuery = searchQuery.toLowerCase();
    return users.filter(u => 
      (u.name && u.name.toLowerCase().includes(lowerQuery)) || 
      (u.email && u.email.toLowerCase().includes(lowerQuery))
    );
  }, [users, searchQuery]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1;
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (isLoadingUsers) {
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
  }

  return (
      <div className="space-y-4">
        <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
                placeholder="Buscar usuário por nome ou email..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
            />
        </div>
        <div className="rounded-lg border">
          <div className="overflow-x-auto w-full">
<Table>
              <TableHeader>
                  <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead className="text-right w-[250px]">Perfil de Acesso</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                  {paginatedUsers.length === 0 ? (
                      <TableRow>
                          <TableCell colSpan={2} className="text-center text-muted-foreground p-4">
                              Nenhum usuário encontrado.
                          </TableCell>
                      </TableRow>
                  ) : paginatedUsers.map((targetUser) => {
                      const avatar = PlaceHolderImages.find(p => p.id === (targetUser.avatar || 'avatar-1'));
                      return (
                      <TableRow key={targetUser.id}>
                          <TableCell>
                              <div className="flex items-center gap-3">
                                  <Avatar className="h-10 w-10">
                                      {avatar && <AvatarImage src={avatar.imageUrl} alt={targetUser.name} />}
                                      <AvatarFallback>{(targetUser.name || '?').charAt(0)}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                      <p className="font-medium">{targetUser.name || '(sem nome)'}</p>
                                      <p className="text-sm text-muted-foreground">{targetUser.email}</p>
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
                                      {roles.map(role => (
                                          <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
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
        </div>

        {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                <p className="text-sm text-muted-foreground">
                    Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filteredUsers.length)} de {filteredUsers.length} usuários
                </p>
                <div className="flex gap-2">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                    >
                        <ChevronLeft className="size-4 mr-1" /> Anterior
                    </Button>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                    >
                        Próxima <ChevronRight className="size-4 ml-1" />
                    </Button>
                </div>
            </div>
        )}
      </div>
  );
}
