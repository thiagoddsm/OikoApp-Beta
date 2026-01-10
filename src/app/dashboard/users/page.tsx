'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useCollection, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, Users, Search } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { EditUserDialog } from '@/components/users/edit-user-dialog';


type User = {
  id: string;
  name: string;
  avatar?: string;
  integrationStatus?: string;
};

const journeyColumns = [
    { id: 'visitante_nao_crente', title: 'Entrada (Visitantes)' },
    { id: 'novo_convertido', title: 'Discipulado Inicial' },
    { id: 'recem_chegado', title: 'Fundamentos (Batismo)' },
    { id: 'em_discipulado_td', title: 'TD (Trilho do Crescimento)' },
    { id: 'batizado_transferido', title: 'Integração (Em GC)' },
    { id: 'em_gc', title: 'Curso de Membros' },
    { id: 'curso_membros', title: 'Consolidação (Servindo)' },
    { id: 'servindo', title: 'Liderança (Líder em Treinamento)' },
    { id: 'lider_gc', title: 'Líder de GC' },
];

const statusLabels: { [key: string]: string } = journeyColumns.reduce((acc, col) => {
    acc[col.id] = col.title;
    return acc;
}, {});

function UserCard({ user }: { user: User }) {
    const avatar = PlaceHolderImages.find(p => p.id === (user.avatar || 'avatar-1'));
    return (
        <Link href={`/dashboard/users/${user.id}`} className="w-full text-left">
            <Card 
              className="mb-2 transition-all hover:shadow-md hover:border-primary/50 cursor-grab active:cursor-grabbing"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("userId", user.id);
                e.dataTransfer.effectAllowed = "move";
              }}
            >
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
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [draggedOverColumn, setDraggedOverColumn] = useState<string | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);

    const { data: users, isLoading: isLoadingUsers } = useCollection<User>('users');
    
    const usersByStatus = useMemo(() => {
        const initialColumns: { [key: string]: User[] } = {};
        journeyColumns.forEach(col => initialColumns[col.id] = []);

        if (!users) return initialColumns;

        return users.reduce((acc, user) => {
            const status = user.integrationStatus || 'visitante_nao_crente'; 
            if (acc[status] === undefined) {
                 acc[status] = []; // Should not happen with initialization, but for safety
            }
            if (user.name.toLowerCase().includes(searchTerm.toLowerCase())) {
                acc[status].push(user);
            }
            return acc;
        }, initialColumns);
    }, [users, searchTerm]);

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>, columnId: string) => {
      e.preventDefault();
      setDraggedOverColumn(columnId);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, newStatus: string) => {
        e.preventDefault();
        const userId = e.dataTransfer.getData("userId");
        setDraggedOverColumn(null);

        if (!userId || !firestore) return;

        const userDocRef = doc(firestore, 'users', userId);
        updateDocumentNonBlocking(userDocRef, { integrationStatus: newStatus });
        
        toast({
            title: "Status Atualizado!",
            description: `O membro foi movido para "${statusLabels[newStatus]}".`,
        });
    };

    if (isLoadingUsers) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex h-[calc(100vh-8.5rem)] flex-col">
            <header className="flex items-center justify-between px-2 py-2 border-b">
                 <div>
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <Users className="size-5" /> Jornada do Membro (Trilha de Discipulado)
                    </h1>
                     <p className="text-sm text-muted-foreground">Digitalize a trilha e garanta que ninguém fique para trás.</p>
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
                    <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                            <Plus className="mr-2 h-4 w-4" />
                            Adicionar Pessoa
                        </Button>
                      </DialogTrigger>
                       <DialogContent className="sm:max-w-md">
                           <EditUserDialog 
                                user={null}
                                open={isFormOpen}
                                onOpenChange={setIsFormOpen}
                           />
                       </DialogContent>
                    </Dialog>
                </div>
            </header>

            <div className="flex-1 overflow-x-auto">
                <div className="flex h-full space-x-4 p-4">
                    {journeyColumns.map(column => (
                        <div 
                            key={column.id} 
                            className="w-72 flex-shrink-0"
                            onDragOver={(e) => handleDragOver(e, column.id)}
                            onDragLeave={() => setDraggedOverColumn(null)}
                            onDrop={(e) => handleDrop(e, column.id)}
                        >
                            <Card className={`h-full flex flex-col bg-muted/50 transition-colors ${draggedOverColumn === column.id ? 'border-primary ring-2 ring-primary' : ''}`}>
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
