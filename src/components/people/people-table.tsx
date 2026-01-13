
'use client';
import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useCollection, useMemoFirebase } from '@/firebase';
import { doc, query, collection } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, Users, Search, Footprints, Settings } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { EditUserDialog } from '@/components/users/edit-user-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { format, differenceInYears } from 'date-fns';

type User = {
    id: string;
    name: string;
    avatar?: string;
    dataNascimento?: string;
    email?: string;
    phone?: string;
    // Add other fields from your user schema as needed
  };

export function PeopleTable() {
    const { firestore } = useFirebase();
    const [searchTerm, setSearchTerm] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);

    const usersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'users')) : null, [firestore]);
    const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);

    const filteredUsers = useMemo(() => {
        if (!users) return [];
        return users.filter(user => 
            user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [users, searchTerm]);
    
    const calculateAge = (birthDate?: string) => {
        if (!birthDate) return '';
        try {
            return `${differenceInYears(new Date(), new Date(birthDate))} anos`;
        } catch {
            return '';
        }
    }

    if (isLoadingUsers) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    
    return (
         <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Lista Geral de Pessoas</CardTitle>
                    <CardDescription>Visualize e gerencie todos os cadastros do sistema.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nome ou email..."
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
                       <DialogContent className="max-w-4xl">
                          <DialogHeader>
                            <DialogTitle>Adicionar Nova Pessoa</DialogTitle>
                            <DialogDescription>
                              Preencha os dados para adicionar uma nova pessoa à Jornada do Membro.
                            </DialogDescription>
                          </DialogHeader>
                           <EditUserDialog 
                                user={null}
                                open={isFormOpen}
                                onOpenChange={setIsFormOpen}
                           />
                       </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[80px]">Foto</TableHead>
                                <TableHead>Nome</TableHead>
                                <TableHead className="w-[150px]">Nascimento</TableHead>
                                <TableHead>Contatos</TableHead>
                                <TableHead className="w-[150px]">Cadastro</TableHead>
                                <TableHead className="w-[80px]">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredUsers.map(user => {
                                const avatar = PlaceHolderImages.find(p => p.id === user.avatar) || PlaceHolderImages[1];
                                const age = calculateAge(user.dataNascimento);
                                return (
                                <TableRow key={user.id}>
                                    <TableCell>
                                        <Avatar>
                                            <AvatarImage src={avatar.imageUrl} alt={user.name} />
                                            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                    </TableCell>
                                    <TableCell>
                                        <Link href={`/dashboard/people/${user.id}`} className="font-medium hover:underline">
                                            {user.name}
                                        </Link>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm">{user.dataNascimento ? format(new Date(user.dataNascimento+'T12:00:00'), 'dd/MM/yyyy') : '-'}</div>
                                        <div className="text-xs text-muted-foreground">{age}</div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm">{user.phone || '-'}</div>
                                        <div className="text-xs text-muted-foreground">{user.email || '-'}</div>
                                    </TableCell>
                                    <TableCell>
                                        <Progress value={85} className="h-2" />
                                        <span className="text-xs text-muted-foreground">85%</span>
                                    </TableCell>
                                     <TableCell>
                                        <Button variant="ghost" size="icon" asChild>
                                            <Link href={`/dashboard/people/${user.id}`}>
                                                <Search className="h-4 w-4" />
                                            </Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )})}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}

