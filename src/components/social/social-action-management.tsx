'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useFirebase, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, doc, Timestamp } from 'firebase/firestore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, PlusCircle, Search, Pencil, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { DeleteConfirmationDialog } from '@/components/structure/delete-confirmation-dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { format } from 'date-fns';

type SocialAction = {
    id: string;
    beneficiaryId: string;
    date: Timestamp;
    type: string;
    description: string;
};

type Beneficiary = {
    id: string;
    name: string;
};

interface ActionFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    existingAction: SocialAction | null;
    beneficiaries: Beneficiary[];
}

function ActionFormDialog({ open, onOpenChange, existingAction, beneficiaries }: ActionFormDialogProps) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [beneficiaryId, setBeneficiaryId] = useState('');
    const [date, setDate] = useState('');
    const [type, setType] = useState('');
    const [description, setDescription] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (open) {
            setBeneficiaryId(existingAction?.beneficiaryId || '');
            setDate(existingAction?.date ? format(existingAction.date.toDate(), 'yyyy-MM-dd') : new Date().toISOString().split('T')[0]);
            setType(existingAction?.type || '');
            setDescription(existingAction?.description || '');
        }
    }, [open, existingAction]);

    const handleSave = async () => {
        if (!beneficiaryId || !date || !type) {
            toast({ variant: 'destructive', title: 'Campos obrigatórios: Beneficiário, Data e Tipo.' });
            return;
        }
        setIsSaving(true);

        const dataToSave = {
            beneficiaryId,
            date: Timestamp.fromDate(new Date(`${date}T12:00:00`)),
            type,
            description,
        };

        if (existingAction) {
            const docRef = doc(firestore!, 'social_actions', existingAction.id);
            updateDocumentNonBlocking(docRef, dataToSave);
            toast({ title: 'Ação social atualizada.' });
        } else {
            const collectionRef = collection(firestore!, 'social_actions');
            addDocumentNonBlocking(collectionRef, dataToSave);
            toast({ title: 'Ação social registrada.' });
        }
        setIsSaving(false);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{existingAction ? 'Editar Ação' : 'Registrar Nova Ação'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div>
                        <Label htmlFor="beneficiaryId">Beneficiário</Label>
                        <Select value={beneficiaryId} onValueChange={setBeneficiaryId}>
                            <SelectTrigger><SelectValue placeholder="Selecione..."/></SelectTrigger>
                            <SelectContent>
                                {beneficiaries.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="date">Data da Ação</Label>
                            <Input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} />
                        </div>
                        <div>
                            <Label htmlFor="type">Tipo de Ação</Label>
                            <Input id="type" value={type} onChange={e => setType(e.target.value)} placeholder="Ex: Cesta Básica" />
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="description">Descrição/Detalhes</Label>
                        <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Itens entregues, observações, etc."/>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 size-4 animate-spin"/>}
                        Salvar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function SocialActionManagement() {
    const { firestore } = useFirebase();
    const actionsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'social_actions')) : null, [firestore]);
    const beneficiariesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'beneficiaries')) : null, [firestore]);

    const { data: actions, isLoading: isLoadingActions } = useCollection<SocialAction>(actionsQuery);
    const { data: beneficiaries, isLoading: isLoadingBeneficiaries } = useCollection<Beneficiary>(beneficiariesQuery);
    
    const [isFormOpen, setFormOpen] = useState(false);
    const [isDeleteOpen, setDeleteOpen] = useState(false);
    const [selectedAction, setSelectedAction] = useState<SocialAction | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const beneficiaryMap = useMemo(() => new Map(beneficiaries?.map(b => [b.id, b.name]) || []), [beneficiaries]);

    const sortedActions = useMemo(() => {
        if (!actions) return [];
        return [...actions].sort((a,b) => b.date.toMillis() - a.date.toMillis());
    }, [actions]);
    
    const filteredItems = useMemo(() => {
        if (!sortedActions) return [];
        return sortedActions.filter(item => {
            const beneficiaryName = beneficiaryMap.get(item.beneficiaryId) || '';
            return beneficiaryName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                   item.type.toLowerCase().includes(searchTerm.toLowerCase());
        });
    }, [sortedActions, searchTerm, beneficiaryMap]);
    
    const handleEdit = (item: SocialAction) => {
        setSelectedAction(item);
        setFormOpen(true);
    };

    const handleAdd = () => {
        setSelectedAction(null);
        setFormOpen(true);
    };
    
    const handleDelete = (item: SocialAction) => {
        setSelectedAction(item);
        setDeleteOpen(true);
    };

    const confirmDelete = () => {
        if (selectedAction?.id && firestore) {
            deleteDocumentNonBlocking(doc(firestore, 'social_actions', selectedAction.id));
        }
        setDeleteOpen(false);
    };

    const isLoading = isLoadingActions || isLoadingBeneficiaries;

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
    }
    
    return (
        <>
            <div className="flex justify-between items-center mb-4">
                 <div>
                    <h3 className="text-lg font-semibold">Registros de Ações Sociais</h3>
                    <p className="text-sm text-muted-foreground">Acompanhe todas as ações realizadas pelo ministério.</p>
                </div>
                <div className="flex gap-2">
                    <Input placeholder="Buscar por nome ou tipo..." className="w-64" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    <Button onClick={handleAdd}><PlusCircle className="mr-2 size-4"/>Nova Ação</Button>
                </div>
            </div>
             <div className="rounded-lg border">
                <div className="overflow-x-auto w-full">
<Table>
                    <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Beneficiário</TableHead><TableHead>Tipo</TableHead><TableHead>Descrição</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {filteredItems.length === 0 ? (
                            <TableRow><TableCell colSpan={5} className="text-center h-24">Nenhuma ação registrada.</TableCell></TableRow>
                        ) : (
                            filteredItems.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell>{format(item.date.toDate(), 'dd/MM/yyyy')}</TableCell>
                                    <TableCell className="font-medium">{beneficiaryMap.get(item.beneficiaryId) || 'Não encontrado'}</TableCell>
                                    <TableCell>{item.type}</TableCell>
                                    <TableCell>{item.description}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}><Pencil className="h-4 w-4"/></Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(item)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
</div>
            </div>
            <ActionFormDialog open={isFormOpen} onOpenChange={setFormOpen} existingAction={selectedAction} beneficiaries={beneficiaries || []} />
            {selectedAction && <DeleteConfirmationDialog open={isDeleteOpen} onOpenChange={setDeleteOpen} onConfirm={confirmDelete} itemName={`Ação para ${beneficiaryMap.get(selectedAction.beneficiaryId)}`} itemType="Ação Social" />}
        </>
    );
}
