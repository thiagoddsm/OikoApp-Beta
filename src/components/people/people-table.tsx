
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
import { Loader2, Plus, Search } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { EditUserDialog } from '@/components/users/edit-user-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, differenceInYears, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type User = {
    id: string;
    name: string;
    avatar?: string;
    dataNascimento?: string;
    email?: string;
    phone?: string;
    integrationStatus?: string;
    serviceStatus?: 'serving' | 'not_serving';
    hierarchy?: {
        celulaId?: string;
    };
    serviceAreaId?: string;
    lastServedDate?: {
      seconds: number;
      nanoseconds: number;
    } | string;
};

type Cell = {
  id: string;
  nome: string;
};

type AreaOfService = {
  id: string;
  name: string;
};

const journeyStatusLabels: { [key: string]: string } = {
    'nao_alcancado': 'Não Alcançado',
    'novo_convertido': 'Novo Convertido',
    'reconciliado': 'Reconciliado',
    'transferido': 'Transferido',
    'membro': 'Membro',
    'consolidado': 'Consolidado',
    'lider_treinamento': 'Líder em Treinamento',
    'lider_gc': 'Líder de GC',
    'lider_area': 'Líder de Área',
    'lider_rede': 'Líder de Rede',
    'pastor': 'Pastor',
};

export function PeopleTable() {
    const { firestore } = useFirebase();
    const [searchTerm, setSearchTerm] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);

    const usersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'users')) : null, [firestore]);
    const cellsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'cells')) : null, [firestore]);
    const areasQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'areas_of_service')) : null, [firestore]);
    
    const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);
    const { data: cells, isLoading: isLoadingCells } = useCollection<Cell>(cellsQuery);
    const { data: areas, isLoading: isLoadingAreas } = useCollection<AreaOfService>(areasQuery);

    const cellMap = useMemo(() => new Map(cells?.map(c => [c.id, c.nome]) || []), [cells]);
    const areaMap = useMemo(() => new Map(areas?.map(a => [a.id, a.name]) || []), [areas]);

    const filteredUsers = useMemo(() => {
        if (!users) return [];
        return users.filter(user => 
            user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [users, searchTerm]);
    
    const formatLastServed = (lastServed?: User['lastServedDate']) => {
        if (!lastServed) return '-';
        try {
            if (typeof lastServed === 'string') {
                return format(parseISO(lastServed), "dd/MM/yyyy");
            }
            const date = new Date(lastServed.seconds * 1000);
            return format(date, "dd/MM/yyyy");
        } catch {
            return 'Data inválida';
        }
    };
    
    const isLoading = isLoadingUsers || isLoadingCells || isLoadingAreas;

    if (isLoading) {
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
                                <TableHead>Contatos</TableHead>
                                <TableHead>Etapa da Jornada</TableHead>
                                <TableHead>Status Serviço</TableHead>
                                <TableHead>GC</TableHead>
                                <TableHead>Voluntariado</TableHead>
                                <TableHead>Último Serviço</TableHead>
                                <TableHead className="w-[80px]">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredUsers.map(user => {
                                const avatar = PlaceHolderImages.find(p => p.id === user.avatar) || PlaceHolderImages[1];
                                const userCell = user.hierarchy?.celulaId ? cellMap.get(user.hierarchy.celulaId) : '-';
                                const userServiceArea = user.serviceAreaId ? areaMap.get(user.serviceAreaId) : '-';
                                const isServing = user.serviceStatus === 'serving';

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
                                        <div className="text-sm">{user.phone || '-'}</div>
                                        <div className="text-xs text-muted-foreground">{user.email || '-'}</div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{journeyStatusLabels[user.integrationStatus || 'nao_alcancado'] || 'Não definido'}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={isServing ? 'default' : 'secondary'} className={isServing ? 'bg-green-100 text-green-800' : ''}>
                                            {isServing ? 'Servindo' : 'Não Servindo'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{userCell}</TableCell>
                                    <TableCell className="text-muted-foreground">{userServiceArea}</TableCell>
                                    <TableCell className="text-muted-foreground">{formatLastServed(user.lastServedDate)}</TableCell>
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

    