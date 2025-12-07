
'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useFirebase, useMemoFirebase } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, Users, Search } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { ScrollArea } from '@/components/ui/scroll-area';

type User = {
  id: string;
  name: string;
  avatar?: string;
  integrationStatus?: string;
};

const integrationStatusColumns = [
    { id: 'visitante_culto', title: 'Sala Vip' },
    { id: 'visitante_celula', title: 'Visitante em GC' },
    { id: 'contatado', title: 'Participante em GC' },
    { id: 'em_discipulado', title: 'Em Discipulado' },
    { id: 'membro', title: 'Membro' },
    { id: 'lider_treinamento', title: 'Líder em Treinamento' },
    { id: 'lider_gc', title: 'Líder de GC' },
    { id: 'lider_area', title: 'Líder de Área' },
    { id: 'lider_rede', title: 'Líder de Rede' },
];

const statusLabels: { [key: string]: string } = {
  visitante_culto: "Sala Vip",
  visitante_celula: "Visitante em GC",
  contatado: "Participante em GC",
  em_discipulado: "Em Discipulado",
  membro: "Membro",
  lider_treinamento: "Líder em Treinamento",
  lider_gc: "Líder de GC",
  lider_area: "Líder de Área",
  lider_rede: "Líder de Rede",
};

function UserCard({ user }: { user: User }) {
    const avatar = PlaceHolderImages.find(p => p.id === (user.avatar || 'avatar-1'));
    return (
        <Link href={`/dashboard/users/${user.id}`} className="w-full text-left">
            <Card className="mb-2 transition-all hover:shadow-md hover:border-primary/50">
                <CardContent className="p-3 flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                        {avatar && <AvatarImage src={avatar.imageUrl} alt={avatar.description} />}
                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-semibold text-sm">{user.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                            {statusLabels[user.integrationStatus || ''] || 'Não definido'}
                        </p>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}

export default function UsersKanbanPage() {
    const { firestore, user } = useFirebase();
    const [searchTerm, setSearchTerm] = useState('');

    const usersQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, 'users'));
    }, [firestore, user]);

    const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);
    
    const usersByStatus = useMemo(() => {
        const initialColumns: { [key: string]: User[] } = {};
        integrationStatusColumns.forEach(col => initialColumns[col.id] = []);

        if (!users) return initialColumns;

        return users.reduce((acc, user) => {
            const status = user.integrationStatus || 'membro'; // Default to 'membro' if undefined
            if (acc[status] === undefined) {
                 acc[status] = []; // Initialize if status is not in the predefined columns, though it should be.
            }
            if (user.name.toLowerCase().includes(searchTerm.toLowerCase())) {
                acc[status].push(user);
            }
            return acc;
        }, initialColumns);
    }, [users, searchTerm]);

    if (isLoadingUsers || !user) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col">
            <header className="flex items-center justify-between px-2 py-2 border-b">
                 <div>
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <Users className="size-5" /> Pipeline de Integração
                    </h1>
                     <p className="text-sm text-muted-foreground">Arraste e solte os usuários para atualizar seu status na jornada.</p>
                 </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar usuários..."
                            className="pl-8 w-full"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button asChild size="sm">
                        <Link href="/dashboard/new-member">
                            <Plus className="mr-2 h-4 w-4" />
                            Adicionar Usuário
                        </Link>
                    </Button>
                </div>
            </header>

            <div className="flex-1 overflow-x-auto">
                <div className="flex h-full space-x-4 p-4">
                    {integrationStatusColumns.map(column => (
                        <div key={column.id} className="w-72 flex-shrink-0">
                            <Card className="h-full flex flex-col bg-muted/50">
                                <CardHeader className="p-4">
                                    <CardTitle className="text-base font-medium">{column.title} ({usersByStatus[column.id]?.length || 0})</CardTitle>
                                </CardHeader>
                                <CardContent className="flex-1 overflow-y-auto px-2 pt-0 pb-2">
                                     <ScrollArea className="h-full">
                                        <div className="space-y-2 p-2">
                                        {(usersByStatus[column.id] || []).map(userItem => (
                                            <UserCard key={userItem.id} user={userItem} />
                                        ))}
                                        </div>
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
