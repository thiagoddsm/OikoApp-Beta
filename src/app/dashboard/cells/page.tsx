'use client';

import React, { useMemo } from 'react';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, Building, User, Shield } from "lucide-react";
import { PlaceHolderImages } from '@/lib/placeholder-images';

type User = {
  id: string;
  name: string;
  avatar?: string;
};

type Cell = {
  id: string;
  nome: string;
  liderId: string;
  supervisorId: string;
  membros: string[];
};

export default function CellsPage() {
  const { firestore } = useFirebase();

  // Fetch all users and cells
  const usersQuery = useMemo(() => query(collection(firestore, 'users')), [firestore]);
  const cellsQuery = useMemo(() => query(collection(firestore, 'cells')), [firestore]);

  const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);
  const { data: cells, isLoading: isLoadingCells } = useCollection<Cell>(cellsQuery);

  // Create a map for quick user lookup
  const userMap = useMemo(() => {
    if (!users) return new Map();
    return new Map(users.map(user => [user.id, user]));
  }, [users]);
  
  const isLoading = isLoadingUsers || isLoadingCells;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestão de Células</CardTitle>
        <CardDescription>
          Visualize e gerencie as células, líderes e supervisores.
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
                  <TableHead><Building className="inline-block mr-2 h-4 w-4" />Célula</TableHead>
                  <TableHead><User className="inline-block mr-2 h-4 w-4" />Líder</TableHead>
                  <TableHead><Shield className="inline-block mr-2 h-4 w-4" />Supervisor</TableHead>
                  <TableHead className="text-center">Membros</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cells?.map((cell) => {
                  const leader = userMap.get(cell.liderId);
                  const supervisor = userMap.get(cell.supervisorId);
                  const leaderAvatar = PlaceHolderImages.find(p => p.id === (leader?.avatar || 'avatar-4'));

                  return (
                    <TableRow key={cell.id}>
                      <TableCell className="font-medium">{cell.nome}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            {leaderAvatar && <AvatarImage src={leaderAvatar.imageUrl} alt={leader?.name} />}
                            <AvatarFallback>{leader?.name?.charAt(0) || 'L'}</AvatarFallback>
                          </Avatar>
                          <span>{leader?.name || 'Não definido'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{supervisor?.name || 'Não definido'}</TableCell>
                      <TableCell className="text-center">
                         <Badge variant="secondary">{cell.membros?.length || 0}</Badge>
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
