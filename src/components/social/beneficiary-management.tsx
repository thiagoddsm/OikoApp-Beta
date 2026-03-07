'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useFirebase, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, PlusCircle, User, Search, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { DeleteConfirmationDialog } from '@/components/structure/delete-confirmation-dialog';

type Beneficiary = {
    id: string;
    name: string;
    socioeconomic_data?: {
        address?: string;
        phone?: string;
        notes?: string;
    }
};

interface BeneficiaryFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    existingBeneficiary: Beneficiary | null;
}

function BeneficiaryFormDialog({ open, onOpenChange, existingBeneficiary }: BeneficiaryFormDialogProps) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [phone, setPhone] = useState('');
    const [notes, setNotes] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (open) {
            setName(existingBeneficiary?.name || '');
            setAddress(existingBeneficiary?.socioeconomic_data?.address || '');
            setPhone(existingBeneficiary?.socioeconomic_data?.phone || '');
            setNotes(existingBeneficiary?.socioeconomic_data?.notes || '');
        }
    }, [open, existingBeneficiary]);

    const handleSave = async () => {
        if (!name.trim() || !firestore) {
            toast({ variant: 'destructive', title: 'Nome é obrigatório.' });
            return;
        }
        setIsSaving(true);

        const dataToSave = {
            name,
            socioeconomic_data: {
                address,
                phone,
                notes,
            }
        };

        if (existingBeneficiary) {
            const docRef = doc(firestore, 'beneficiaries', existingBeneficiary.id);
            updateDocumentNonBlocking(docRef, dataToSave);
            toast({ title: 'Beneficiário atualizado.' });
        } else {
            const collectionRef = collection(firestore, 'beneficiaries');
            addDocumentNonBlocking(collectionRef, dataToSave);
            toast({ title: 'Beneficiário adicionado.' });
        }
        setIsSaving(false);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{existingBeneficiary ? 'Editar Beneficiário' : 'Novo Beneficiário'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div>
                        <Label htmlFor="name">Nome Completo</Label>
                        <Input id="name" value={name} onChange={e => setName(e.target.value)} />
                    </div>
                    <div>
                        <Label htmlFor="phone">Telefone</Label>
                        <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} />
                    </div>
                    <div>
                        <Label htmlFor="address">Endereço</Label>
                        <Input id="address" value={address} onChange={e => setAddress(e.target.value)} />
                    </div>
                     <div>
                        <Label htmlFor="notes">Observações Socioeconômicas</Label>
                        <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Composição familiar, situação de trabalho, necessidades especiais, etc."/>
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

export function BeneficiaryManagement() {
    const { firestore } = useFirebase();
    const beneficiariesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'beneficiaries')) : null, [firestore]);
    const { data: beneficiaries, isLoading } = useCollection<Beneficiary>(beneficiariesQuery);
    
    const [isFormOpen, setFormOpen] = useState(false);
    const [isDeleteOpen, setDeleteOpen] = useState(false);
    const [selectedBeneficiary, setSelectedBeneficiary] = useState<Beneficiary | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    const filteredItems = useMemo(() => {
        if (!beneficiaries) return [];
        return beneficiaries.filter(item => 
            item.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [beneficiaries, searchTerm]);

    const handleEdit = (item: Beneficiary) => {
        setSelectedBeneficiary(item);
        setFormOpen(true);
    };

    const handleAdd = () => {
        setSelectedBeneficiary(null);
        setFormOpen(true);
    };
    
    const handleDelete = (item: Beneficiary) => {
        setSelectedBeneficiary(item);
        setDeleteOpen(true);
    };

    const confirmDelete = () => {
        if (selectedBeneficiary?.id && firestore) {
            deleteDocumentNonBlocking(doc(firestore, 'beneficiaries', selectedBeneficiary.id));
        }
        setDeleteOpen(false);
    };

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
    }
    
    return (
        <>
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h3 className="text-lg font-semibold">Gerenciar Beneficiários</h3>
                    <p className="text-sm text-muted-foreground">Adicione, edite ou remova famílias e pessoas beneficiadas.</p>
                </div>
                <div className="flex gap-2">
                    <Input placeholder="Buscar..." className="w-64" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    <Button onClick={handleAdd}><PlusCircle className="mr-2 size-4"/>Novo</Button>
                </div>
            </div>
            <div className="rounded-lg border">
                <Table>
                    <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Contato</TableHead><TableHead>Endereço</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {filteredItems.length === 0 ? (
                            <TableRow><TableCell colSpan={4} className="text-center h-24">Nenhum beneficiário encontrado.</TableCell></TableRow>
                        ) : (
                            filteredItems.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.name}</TableCell>
                                    <TableCell>{item.socioeconomic_data?.phone || '-'}</TableCell>
                                    <TableCell>{item.socioeconomic_data?.address || '-'}</TableCell>
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
            <BeneficiaryFormDialog open={isFormOpen} onOpenChange={setFormOpen} existingBeneficiary={selectedBeneficiary} />
            {selectedBeneficiary && <DeleteConfirmationDialog open={isDeleteOpen} onOpenChange={setDeleteOpen} onConfirm={confirmDelete} itemName={selectedBeneficiary.name} itemType="Beneficiário" />}
        </>
    );
}
