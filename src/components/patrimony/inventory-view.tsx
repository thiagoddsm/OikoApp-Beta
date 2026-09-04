'use client';
import React, { useState, useMemo } from 'react';
import { useCollection, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase';
import { useFirebase } from '@/firebase/provider';
import { collection, query, doc } from 'firebase/firestore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Loader2, PlusCircle, MoreHorizontal, Pencil, Trash2, Search } from 'lucide-react';
import { DeleteConfirmationDialog } from '@/components/structure/delete-confirmation-dialog';
import { PatrimonyFormDialog } from './patrimony-form-dialog';
import { cn } from '@/lib/utils';

type PatrimonioItem = {
    id: string;
    name: string;
    category: string;
    location: string;
    status: 'Disponível' | 'Emprestado' | 'Manutenção';
    purchaseDate?: string;
    purchaseValue?: number;
    qrCodeValue?: string;
};

const statusColors: Record<string, string> = {
    'Disponível': 'bg-green-100 text-green-700',
    'Emprestado': 'bg-amber-100 text-amber-700',
    'Manutenção': 'bg-red-100 text-red-700',
};

export function InventoryView() {
    const { firestore } = useFirebase();
    const patrimonioQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'patrimonio')) : null, [firestore]);
    const { data: items, isLoading } = useCollection<PatrimonioItem>(patrimonioQuery);

    const [isFormOpen, setFormOpen] = useState(false);
    const [isDeleteOpen, setDeleteOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<PatrimonioItem | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredItems = useMemo(() => {
        if (!items) return [];
        return items.filter(item => 
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.location.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [items, searchTerm]);

    const handleDelete = (item: PatrimonioItem) => {
        setSelectedItem(item);
        setDeleteOpen(true);
    };

    const handleEdit = (item: PatrimonioItem) => {
        setSelectedItem(item);
        setFormOpen(true);
    };

    const handleAdd = () => {
        setSelectedItem(null);
        setFormOpen(true);
    };

    const confirmDelete = () => {
        if (selectedItem?.id && firestore) {
            deleteDocumentNonBlocking(doc(firestore, 'patrimonio', selectedItem.id));
        }
        setDeleteOpen(false);
    };

    return (
        <>
            <div className="mb-4 flex items-center justify-between gap-4">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Buscar por nome, ID, local..." 
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button onClick={handleAdd}>
                    <PlusCircle className="mr-2 size-4" /> Novo Item
                </Button>
            </div>

            <div className="rounded-lg border">
                <div className="overflow-x-auto w-full">
<Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Item</TableHead>
                            <TableHead>Localização</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                                </TableCell>
                            </TableRow>
                        ) : filteredItems.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    Nenhum item encontrado.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredItems.map(item => (
                                <TableRow key={item.id} className="hover:bg-muted/50">
                                    <TableCell className="font-mono text-xs">{item.qrCodeValue || item.id.substring(0, 6)}</TableCell>
                                    <TableCell>
                                        <div className="font-medium">{item.name}</div>
                                        <div className="text-xs text-muted-foreground">{item.category}</div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{item.location}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={cn("font-bold", statusColors[item.status])}>
                                            {item.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleEdit(item)}>
                                                    <Pencil className="mr-2 h-4 w-4" /> Editar
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleDelete(item)} className="text-destructive">
                                                    <Trash2 className="mr-2 h-4 w-4" /> Excluir
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
</div>
            </div>
            
            <PatrimonyFormDialog 
                open={isFormOpen}
                onOpenChange={setFormOpen}
                existingItem={selectedItem}
            />

            {selectedItem && (
                 <DeleteConfirmationDialog
                    open={isDeleteOpen}
                    onOpenChange={setDeleteOpen}
                    onConfirm={confirmDelete}
                    itemName={selectedItem.name}
                    itemType="Item de Patrimônio"
                />
            )}
        </>
    );
}