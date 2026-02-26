
'use client';

import React, { useState, useMemo } from 'react';
import { useFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc, collection, query, where, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, PlusCircle, Users, Loader2, UserPlus, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

type FamilyLink = {
    name: string;
    relation: string;
    userId?: string;
};

const relationOptions = [
    "Cônjuge", "Filho(a)", "Pai", "Mãe", "Irmão(ã)", "Avô/Avó", "Neto(a)", "Tio(a)", "Primo(a)", "Enteado(a)", "Outro"
];

export function FamilyManagement({ user }) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isAdding, setIsAdding] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    
    const [newName, setNewName] = useState('');
    const [newRelation, setNewRelation] = useState('');
    const [foundUser, setFoundUser] = useState<{id: string, name: string} | null>(null);

    const familyLinks: FamilyLink[] = user.familyMembers || [];

    const handleSearchUser = async () => {
        if (!newName.trim() || !firestore) return;
        setIsSearching(true);
        try {
            const q = query(collection(firestore, 'users'), where('name', '==', newName.trim()));
            const snap = await getDocs(q);
            if (!snap.empty) {
                const u = snap.docs[0];
                setFoundUser({ id: u.id, name: u.data().name });
                toast({ title: "Membro encontrado!", description: "Vínculo será criado com o perfil existente." });
            } else {
                setFoundUser(null);
                toast({ title: "Membro não encontrado", description: "O vínculo será salvo apenas como nome texto." });
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsSearching(false);
        }
    };

    const handleAddLink = () => {
        if (!newName.trim() || !newRelation) {
            toast({ variant: 'destructive', title: 'Preencha o nome e o parentesco.' });
            return;
        }

        const newLink: FamilyLink = {
            name: foundUser?.name || newName.trim(),
            relation: newRelation,
            userId: foundUser?.id
        };

        const updatedLinks = [...familyLinks, newLink];
        updateDocumentNonBlocking(doc(firestore!, 'users', user.id), { familyMembers: updatedLinks });
        
        toast({ title: 'Vínculo adicionado!' });
        setNewName('');
        setNewRelation('');
        setFoundUser(null);
        setIsAdding(false);
    };

    const handleRemoveLink = (index: number) => {
        const updatedLinks = familyLinks.filter((_, i) => i !== index);
        updateDocumentNonBlocking(doc(firestore!, 'users', user.id), { familyMembers: updatedLinks });
        toast({ title: 'Vínculo removido.' });
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="size-5 text-primary" />
                            Núcleo Familiar
                        </CardTitle>
                        <CardDescription>Gerencie as conexões de parentesco deste membro.</CardDescription>
                    </div>
                    {!isAdding && (
                        <Button onClick={() => setIsAdding(true)} size="sm">
                            <PlusCircle className="mr-2 size-4" /> Adicionar Parente
                        </Button>
                    )}
                </CardHeader>
                <CardContent>
                    {isAdding && (
                        <div className="p-4 border rounded-lg bg-muted/20 mb-6 space-y-4 animate-in slide-in-from-top-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Nome do Parente</Label>
                                    <div className="flex gap-2">
                                        <Input 
                                            value={newName} 
                                            onChange={e => setNewName(e.target.value)} 
                                            placeholder="Digite o nome completo..."
                                        />
                                        <Button variant="outline" size="icon" onClick={handleSearchUser} disabled={isSearching}>
                                            {isSearching ? <Loader2 className="size-4 animate-spin"/> : <Search className="size-4"/>}
                                        </Button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Parentesco</Label>
                                    <Select value={newRelation} onValueChange={setNewRelation}>
                                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                        <SelectContent>
                                            {relationOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button variant="ghost" onClick={() => { setIsAdding(false); setFoundUser(null); }}>Cancelar</Button>
                                <Button onClick={handleAddLink}>Salvar Vínculo</Button>
                            </div>
                        </div>
                    )}

                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Parente</TableHead>
                                    <TableHead>Vínculo</TableHead>
                                    <TableHead>Status no Sistema</TableHead>
                                    <TableHead className="text-right w-16">Ação</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {familyLinks.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground italic">
                                            Nenhum vínculo familiar registrado.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    familyLinks.map((link, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell className="font-medium">{link.name}</TableCell>
                                            <TableCell>{link.relation}</TableCell>
                                            <TableCell>
                                                {link.userId ? (
                                                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                                        Cadastrado
                                                    </Badge>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">Nome Externo</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => handleRemoveLink(idx)}>
                                                    <Trash2 className="size-4 text-destructive" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
