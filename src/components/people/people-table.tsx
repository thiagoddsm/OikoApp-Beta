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
import { Loader2, Plus, Search, Trash2, Wand2, Tag, FilterX, X, Users, Briefcase, Compass } from 'lucide-react';
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
    serviceAreaId?: string;
    profilePicture?: string;
    photoURL?: string;
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
    const [selectedGcFilter, setSelectedGcFilter] = useState<string>('all');
    const [selectedServiceFilter, setSelectedServiceFilter] = useState<string>('all');
    const [selectedJourneyFilter, setSelectedJourneyFilter] = useState<string>('all');
    const [isFormOpen, setFormOpen] = useState(false);
    const [isMergeOpen, setIsMergeOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    // Queries: Gate by firestore && currentUser to prevent unnecessary public execution
    const usersQuery = useMemoFirebase(() => (firestore && currentUser) ? query(collection(firestore, 'users')) : null, [firestore, currentUser]);
    const cellsQuery = useMemoFirebase(() => (firestore && currentUser) ? query(collection(firestore, 'cells')) : null, [firestore, currentUser]);
    const areasQuery = useMemoFirebase(() => (firestore && currentUser) ? query(collection(firestore, 'areas_of_service')) : null, [firestore, currentUser]);
    
    const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);
    const { data: cells, isLoading: isLoadingCells } = useCollection<any>(cellsQuery);
    const { data: areas, isLoading: isLoadingAreas } = useCollection<any>(areasQuery);

    const cellMap = useMemo(() => new Map(cells?.map(c => [c.id, c.nome]) || []), [cells]);
    const areaMap = useMemo(() => new Map(areas?.map(a => [a.id, a.name]) || []), [areas]);

    const availableTags = useMemo(() => {
        if (!users) return [];
        const tags = new Set<string>();
        users.forEach(u => u.tags?.forEach(t => tags.add(t)));
        return Array.from(tags).sort();
    }, [users]);

    const filteredUsers = useMemo(() => {
        if (!users) return [];
        
        const normalize = (str: string) => 
            (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

        const term = normalize(searchTerm.trim());
        
        const filtered = users.filter(user => {
            if (!user) return false;
            
            const name = normalize(user.name);
            const email = normalize(user.email || '');
            const phone = normalize(String(user.phone || ''));
            const matchesSearch = name.includes(term) || email.includes(term) || phone.includes(term);
            const matchesTag = selectedTag === 'all' || user.tags?.includes(selectedTag);
            
            // GC Filter
            let matchesGc = true;
            const hasGc = !!(user.hierarchy?.celulaId);
            if (selectedGcFilter === 'with_gc') matchesGc = hasGc;
            else if (selectedGcFilter === 'without_gc') matchesGc = !hasGc;
            
            // Service Filter
            let matchesService = true;
            const hasService = !!(user.serviceAreaId || user.serviceStatus === 'serving');
            if (selectedServiceFilter === 'with_service') matchesService = hasService;
            else if (selectedServiceFilter === 'without_service') matchesService = !hasService;
            
            // Journey Filter
            let matchesJourney = true;
            if (selectedJourneyFilter !== 'all') {
                matchesJourney = (user.integrationStatus || 'nao_alcancado') === selectedJourneyFilter;
            }
            
            return matchesSearch && matchesTag && matchesGc && matchesService && matchesJourney;
        });

        return [...filtered].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'));
    }, [users, searchTerm, selectedTag, selectedGcFilter, selectedServiceFilter, selectedJourneyFilter]);

    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedTag, selectedGcFilter, selectedServiceFilter, selectedJourneyFilter]);

    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const paginatedUsers = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredUsers.slice(start, start + itemsPerPage);
    }, [filteredUsers, currentPage]);
    
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
    
    const isLoading = isLoadingUsers || isLoadingCells || isLoadingAreas;

    if (isLoading) {
        return <div className="flex h-full items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    const hasActiveFilters = searchTerm !== '' || selectedTag !== 'all' || selectedGcFilter !== 'all' || selectedServiceFilter !== 'all' || selectedJourneyFilter !== 'all';
    
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

            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 bg-white p-3 rounded-xl border shadow-sm mb-6 w-full flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nome, email ou fone..."
                        className="pl-8 w-full bg-transparent border-none shadow-none focus-visible:ring-0"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Tags Filter */}
                    <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg border">
                        <Tag className="size-3 text-muted-foreground ml-2" />
                        <Select value={selectedTag} onValueChange={setSelectedTag}>
                            <SelectTrigger className="h-8 border-none shadow-none bg-transparent w-[140px] text-xs font-bold focus:ring-0">
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

                    {/* GC Filter */}
                    <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg border">
                        <Users className="size-3 text-muted-foreground ml-2" />
                        <Select value={selectedGcFilter} onValueChange={setSelectedGcFilter}>
                            <SelectTrigger className="h-8 border-none shadow-none bg-transparent w-[140px] text-xs font-bold focus:ring-0">
                                <SelectValue placeholder="Filtro GC" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos os GCs</SelectItem>
                                <SelectItem value="with_gc">Em GC</SelectItem>
                                <SelectItem value="without_gc">Sem GC</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Service Area Filter */}
                    <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg border">
                        <Briefcase className="size-3 text-muted-foreground ml-2" />
                        <Select value={selectedServiceFilter} onValueChange={setSelectedServiceFilter}>
                            <SelectTrigger className="h-8 border-none shadow-none bg-transparent w-[150px] text-xs font-bold focus:ring-0">
                                <SelectValue placeholder="Área de Serviço" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Serviço: Todos</SelectItem>
                                <SelectItem value="with_service">Serve em Área</SelectItem>
                                <SelectItem value="without_service">Não Serve em Área</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Journey/Integration Status Filter */}
                    <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg border">
                        <Compass className="size-3 text-muted-foreground ml-2" />
                        <Select value={selectedJourneyFilter} onValueChange={setSelectedJourneyFilter}>
                            <SelectTrigger className="h-8 border-none shadow-none bg-transparent w-[160px] text-xs font-bold focus:ring-0">
                                <SelectValue placeholder="Jornada" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas as Jornadas</SelectItem>
                                {Object.entries(journeyStatusLabels).map(([key, label]) => (
                                    <SelectItem key={key} value={key}>{label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {hasActiveFilters && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => { 
                                setSearchTerm(''); 
                                setSelectedTag('all'); 
                                setSelectedGcFilter('all'); 
                                setSelectedServiceFilter('all'); 
                                setSelectedJourneyFilter('all'); 
                            }} 
                            className="text-muted-foreground hover:text-destructive shrink-0 h-9"
                        >
                            <FilterX className="size-4 mr-2" /> Limpar
                        </Button>
                    )}
                </div>
            </div>

            <CardContent className="px-0">
                <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="w-[60px]"></TableHead>
                                <TableHead>Nome</TableHead>
                                <TableHead>Jornada</TableHead>
                                <TableHead>Área de Serviço</TableHead>
                                <TableHead>GC</TableHead>
                                <TableHead>TAG</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredUsers.length === 0 ? (
                                <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground italic">Nenhum registro encontrado.</TableCell></TableRow>
                            ) : (
                                paginatedUsers.map(user => {
                                    const normalizePhone = (p: string | number) => {
                                        let phone = String(p || '').replace(/\D/g, '');
                                        if (phone.length === 10 || phone.length === 11) return '55' + phone;
                                        return phone;
                                    };

                                    const userImage = user.profilePicture?.includes('pps.whatsapp.net') && user.phone 
                                        ? `/api/contacts/profile-picture?phone=${normalizePhone(user.phone)}&proxy=true` 
                                        : user.profilePicture || user.photoURL;

                                    return (
                                        <TableRow key={user.id} className="hover:bg-slate-50 transition-colors">
                                            <TableCell>
                                                <Avatar className="size-9 border shadow-sm">
                                                    <AvatarImage src={userImage} alt={user.name} />
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
                                                <Badge variant="outline" className="text-[10px] font-black uppercase">
                                                    {journeyStatusLabels[user.integrationStatus || 'nao_alcancado'] || 'Não definido'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm font-medium text-slate-700">
                                                    {areaMap.get(user.serviceAreaId || '') || '-'}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm font-medium text-slate-700">
                                                    {cellMap.get(user.hierarchy?.celulaId || '') || '-'}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1 max-w-[150px]">
                                                    {user.tags?.slice(0, 3).map(tag => (
                                                        <Badge key={tag} variant="secondary" className="text-[8px] h-4 px-1.5 font-bold bg-primary/5 text-primary border-none">
                                                            {tag}
                                                        </Badge>
                                                    ))}
                                                    {(user.tags?.length || 0) > 3 && <span className="text-[8px] text-muted-foreground">+{(user.tags?.length || 0) - 3}</span>}
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
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between border-t px-4 py-3 bg-slate-50/50">
                            <div className="text-xs text-muted-foreground font-medium">
                                Mostrando {Math.min(filteredUsers.length, (currentPage - 1) * itemsPerPage + 1)} a {Math.min(filteredUsers.length, currentPage * itemsPerPage)} de {filteredUsers.length} membros
                            </div>
                            <div className="flex items-center gap-2">
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    className="h-8 font-bold"
                                >
                                    Anterior
                                </Button>
                                <div className="text-xs font-bold px-2">
                                    Página {currentPage} de {totalPages}
                                </div>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    className="h-8 font-bold"
                                >
                                    Próxima
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
            <EditUserDialog user={null} open={isFormOpen} onOpenChange={setFormOpen} />
            {/* <MergeToolDialog open={isMergeOpen} onOpenChange={setIsMergeOpen} users={users || []} /> */}
            {userToDelete && <DeleteConfirmationDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)} onConfirm={handleDelete} itemName={userToDelete.name} itemType="Cadastro de Pessoa" />}
        </Card>
    );
}
