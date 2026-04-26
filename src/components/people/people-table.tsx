'use client';
import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useCollection, deleteDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { query, collection, doc } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, Search, Trash2, Wand2, Tag, FilterX, X } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { EditUserDialog } from '@/components/users/edit-user-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn, formatPhone } from '@/lib/utils';
import { DeleteConfirmationDialog } from '@/components/structure/delete-confirmation-dialog';
// import { MergeToolDialog } from './merge-tool-dialog';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type User = {
    id: string;
    name: string;
    avatar?: string;
    email?: string;
    phone?: string | number;
    integrationStatus?: string;
    serviceStatus?: 'serving' | 'not_serving';
    tags?: string[];
    hierarchy?: {
        celulaId?: string;
        role?: string;
    };
};

const journeyStatusLabels: { [key: string]: string } = {
    'nao_alcancado': 'Cidade (Não Alcançado)',
    'novo_convertido': 'Novo Convertido',
    'reconciliado': 'Reconciliado',
    'transferido': 'Transferido',
    'membro': 'Membro',
    'consolidated': 'Consolidado',
    'lider_treinamento': 'Líder em treinamento',
    'lider_gc': 'Líder de GC',
    'lider_area': 'Líder de Área',
    'lider_rede': 'Líder de Rede',
    'pastor': 'Pastor',
};

export function PeopleTable() {
    const { firestore, user: currentUser } = useFirebase();
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTag, setSelectedTag] = useState<string>('all');
    const [isFormOpen, setFormOpen] = useState(false);
    const [isMergeOpen, setIsMergeOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);

    // Queries: Gate by firestore && currentUser to prevent unnecessary public execution
    const usersQuery = useMemoFirebase(() => (firestore && currentUser) ? query(collection(firestore, 'users')) : null, [firestore, currentUser]);
    const cellsQuery = useMemoFirebase(() => (firestore && currentUser) ? query(collection(firestore, 'cells')) : null, [firestore, currentUser]);
    
    const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);
    const { data: cells, isLoading: isLoadingCells } = useCollection<any>(cellsQuery);

    const cellMap = useMemo(() => new Map(cells?.map(c => [c.id, c.nome]) || []), [cells]);

    const availableTags = useMemo(() => {
        if (!users) return [];
        const tags = new Set<string>();
        users.forEach(u => u.tags?.forEach(t => tags.add(t)));
        return Array.from(tags).sort();
    }, [users]);

    const filteredUsers = useMemo(() => {
        if (!users) return [];
        const term = String(searchTerm || '').toLowerCase().trim();
        
        return users.filter(user => {
            if (!user) return false;
            
            const name = String(user.name || '').toLowerCase();
            const email = String(user.email || '').toLowerCase();
            const phone = String(user.phone || '').toLowerCase();
            const matchesSearch = name.includes(term) || email.includes(term) || phone.includes(term);
            const matchesTag = selectedTag === 'all' || user.tags?.includes(selectedTag);
            
            return matchesSearch && matchesTag;
        });
    }, [users, searchTerm, selectedTag]);
    
    const handleDelete = () => {
        if (!userToDelete || !firestore) return;
        if (currentUser?.uid === userToDelete.id) {
            toast({ variant: 'destructive', title: 'Ação Bloqueada', description: 'Você não pode excluir seu próprio cadastro.' });
            setUserToDelete(null);
            return;
        }
        deleteDocumentNonBlocking(doc(firestore, 'users', userToDelete.id));
        toast({ title: 'Exclusão Iniciada', description: `O cadastro de ${userToDelete.name} será removido.` });
        setUserToDelete(null);
    };
    
    const isLoading = isLoadingUsers || isLoadingCells;

    if (isLoading) {
        return <div className="flex h-full items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    const hasActiveFilters = searchTerm !== '' || selectedTag !== 'all';
    
    return (
         <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 px-0">
                <div>
                    <CardTitle className="text-2xl font-black uppercase italic tracking-tighter text-slate-900">Membros & Frequentadores</CardTitle>
                    <CardDescription>Visualize e gerencie todos os cadastros do sistema IBM.</CardDescription>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {/* <Button variant="outline" onClick={() => setIsMergeOpen(true)} className="font-bold">
                        <Wand2 className="mr-2 h-4 w-4 text-indigo-500" /> Unificar
                    </Button> */}
                    <Button onClick={() => setFormOpen(true)} className="font-bold">
                        <Plus className="mr-2 h-4 w-4" /> Novo Cadastro
                    </Button>
                </div>
            </CardHeader>

            <div className="flex flex-col md:flex-row items-center gap-3 bg-white p-3 rounded-xl border shadow-sm mb-6">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nome, email ou fone..."
                        className="pl-8 w-full bg-transparent border-none shadow-none focus-visible:ring-0"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg border w-full md:w-auto">
                    <Tag className="size-3 text-muted-foreground ml-2" />
                    <Select value={selectedTag} onValueChange={setSelectedTag}>
                        <SelectTrigger className="h-8 border-none shadow-none bg-transparent w-full md:w-40 text-xs font-bold focus:ring-0">
                            <SelectValue placeholder="Tags" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas as Tags</SelectItem>
                            {availableTags.map(tag => (
                                <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {hasActiveFilters && (
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => { setSearchTerm(''); setSelectedTag('all'); }} 
                        className="text-muted-foreground hover:text-destructive shrink-0 h-9"
                    >
                        <FilterX className="size-4 mr-2" /> Limpar
                    </Button>
                )}
            </div>

            <CardContent className="px-0">
                <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="w-[60px]"></TableHead>
                                <TableHead>Nome</TableHead>
                                <TableHead>Contatos</TableHead>
                                <TableHead>Jornada</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Tags</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredUsers.length === 0 ? (
                                <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground italic">Nenhum registro encontrado.</TableCell></TableRow>
                            ) : (
                                filteredUsers.map(user => {
                                    const avatar = PlaceHolderImages.find(p => p.id === user.avatar) || PlaceHolderImages[1];
                                    const isServing = user.serviceStatus === 'serving';

                                    return (
                                        <TableRow key={user.id} className="hover:bg-slate-50 transition-colors">
                                            <TableCell>
                                                <Avatar className="size-9 border shadow-sm">
                                                    <AvatarImage src={avatar.imageUrl} alt={user.name} />
                                                    <AvatarFallback>{String(user.name || '?').charAt(0)}</AvatarFallback>
                                                </Avatar>
                                            </TableCell>
                                            <TableCell>
                                                <Link href={`/dashboard/people/${user.id}`} className="font-bold text-slate-900 hover:underline hover:text-primary">
                                                    {user.name}
                                                </Link>
                                                <div className="text-[10px] uppercase font-black text-muted-foreground">ID: {user.id.substring(0, 8)}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm font-medium">{formatPhone(user.phone)}</div>
                                                <div className="text-xs text-muted-foreground lowercase">{user.email || '-'}</div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-[10px] font-black uppercase">
                                                    {journeyStatusLabels[user.integrationStatus || 'nao_alcancado'] || 'Não definido'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={cn("text-[9px] font-black uppercase border-none", isServing ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500")}>
                                                    {isServing ? 'Servindo' : 'Inativo'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1 max-w-[150px]">
                                                    {user.tags?.slice(0, 2).map(tag => (
                                                        <Badge key={tag} variant="secondary" className="text-[8px] h-4 px-1.5 font-bold bg-primary/5 text-primary border-none">
                                                            {tag}
                                                        </Badge>
                                                    ))}
                                                    {(user.tags?.length || 0) > 2 && <span className="text-[8px] text-muted-foreground">+{(user.tags?.length || 0) - 2}</span>}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                                        <Link href={`/dashboard/people/${user.id}`}><Search className="h-4 w-4" /></Link>
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setUserToDelete(user)}><Trash2 className="h-4 w-4" /></Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
            <EditUserDialog user={null} open={isFormOpen} onOpenChange={setFormOpen} />
            {/* <MergeToolDialog open={isMergeOpen} onOpenChange={setIsMergeOpen} users={users || []} /> */}
            {userToDelete && <DeleteConfirmationDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)} onConfirm={handleDelete} itemName={userToDelete.name} itemType="Cadastro de Pessoa" />}
        </Card>
    );
}
