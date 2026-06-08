'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, PlusCircle, Users, Loader2, Search, UserCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useVolunteering } from '@/contexts/volunteering-context';

type FamilyLink = {
    name: string;
    relation: string;
    userId?: string;
};

const relationOptions = [
    "Cônjuge", "Filho(a)", "Pai", "Mãe", "Irmão(ã)", "Avô/Avó", "Neto(a)", "Tio(a)", "Primo(a)", "Enteado(a)", "Outro"
];

interface FamilyManagementProps {
    user: any;
}

export function FamilyManagement({ user }: FamilyManagementProps) {
    const { firestore } = useFirebase();
    const { users } = useVolunteering();
    const { toast } = useToast();
    const [isAdding, setIsAdding] = useState(false);
    
    const [mode, setMode] = useState<'system' | 'external'>('system');
    const [newRelation, setNewRelation] = useState('');
    const [externalName, setExternalName] = useState('');
    
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [selectedSystemUser, setSelectedSystemUser] = useState<{id: string, name: string} | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const familyLinks: FamilyLink[] = user.familyMembers || [];

    const filteredUsers = useMemo(() => {
        if (!searchTerm.trim()) return [];
        const lowerSearch = searchTerm.toLowerCase();
        return users.filter(u => u.id !== user.id && u.name.toLowerCase().includes(lowerSearch)).slice(0, 15);
    }, [users, searchTerm, user.id]);

    const handleAddLink = () => {
        if (!newRelation) {
            toast({ variant: 'destructive', title: 'Atenção', description: 'Selecione o parentesco.' });
            return;
        }

        let newLink: FamilyLink;

        if (mode === 'system') {
            if (!selectedSystemUser) {
                toast({ variant: 'destructive', title: 'Atenção', description: 'Selecione um membro do sistema.' });
                return;
            }
            newLink = {
                name: selectedSystemUser.name,
                relation: newRelation,
                userId: selectedSystemUser.id
            };
        } else {
            if (!externalName.trim()) {
                toast({ variant: 'destructive', title: 'Atenção', description: 'Digite o nome do parente.' });
                return;
            }
            newLink = {
                name: externalName.trim(),
                relation: newRelation
            };
        }

        const updatedLinks = [...familyLinks, newLink];
        const updateData: any = { familyMembers: updatedLinks };
        if (newRelation === 'Cônjuge') {
            updateData.conjuge = newLink.name;
        }
        updateDocumentNonBlocking(doc(firestore!, 'users', user.id), updateData);
        
        toast({ title: 'Vínculo familiar adicionado!' });
        resetForm();
    };

    const handleRemoveLink = (index: number) => {
        const removedLink = familyLinks[index];
        const updatedLinks = familyLinks.filter((_, i) => i !== index);
        const updateData: any = { familyMembers: updatedLinks };
        if (removedLink && removedLink.relation === 'Cônjuge') {
            updateData.conjuge = null;
        }
        updateDocumentNonBlocking(doc(firestore!, 'users', user.id), updateData);
        toast({ title: 'Vínculo removido.' });
    };

    const resetForm = () => {
        setExternalName('');
        setNewRelation('');
        setSelectedSystemUser(null);
        setSearchTerm('');
        setIsAdding(false);
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
                        <div className="p-4 border-2 border-primary/20 rounded-xl bg-primary/5 mb-6 space-y-5 animate-in slide-in-from-top-2">
                            
                            <div className="flex gap-2 p-1 bg-white rounded-lg border w-fit">
                                <button 
                                    onClick={() => setMode('system')}
                                    className={cn("text-xs font-bold py-1.5 px-3 rounded-md transition-colors", mode === 'system' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground')}
                                >
                                    Localizar no Sistema
                                </button>
                                <button 
                                    onClick={() => setMode('external')}
                                    className={cn("text-xs font-bold py-1.5 px-3 rounded-md transition-colors", mode === 'external' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground')}
                                >
                                    Nome Externo (Sem Cadastro)
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {mode === 'system' ? (
                                    <div className="space-y-2">
                                        <Label className="text-xs uppercase font-black text-muted-foreground">Buscar Parente no Sistema</Label>
                                        <Popover open={isSearchOpen} onOpenChange={setIsSearchOpen}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={isSearchOpen}
                                                    className={cn("w-full justify-between bg-white", !selectedSystemUser && "text-muted-foreground")}
                                                >
                                                    <span className="truncate">{selectedSystemUser ? selectedSystemUser.name : "Clique para buscar..."}</span>
                                                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[300px] p-0" align="start">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center border-b px-3">
                                                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                                                        <input 
                                                            className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50" 
                                                            placeholder="Digite o nome..." 
                                                            value={searchTerm}
                                                            onChange={(e) => setSearchTerm(e.target.value)}
                                                            autoFocus
                                                        />
                                                    </div>
                                                    <div className="max-h-[300px] overflow-y-auto p-1">
                                                        {filteredUsers.length === 0 ? (
                                                            <div className="p-4 text-center text-sm text-muted-foreground">
                                                                Nenhum membro encontrado.
                                                            </div>
                                                        ) : (
                                                            filteredUsers.map((u) => (
                                                                <button
                                                                    key={u.id}
                                                                    className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                                                                    onClick={() => {
                                                                        setSelectedSystemUser({ id: u.id, name: u.name });
                                                                        setIsSearchOpen(false);
                                                                    }}
                                                                >
                                                                    <UserCheck className={cn("mr-2 h-4 w-4", selectedSystemUser?.id === u.id ? "text-primary" : "text-transparent")} />
                                                                    <span>{u.name}</span>
                                                                </button>
                                                            ))
                                                        )}
                                                    </div>
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <Label className="text-xs uppercase font-black text-muted-foreground">Nome Completo</Label>
                                        <Input 
                                            value={externalName} 
                                            onChange={e => setExternalName(e.target.value)} 
                                            placeholder="Digite o nome do parente..."
                                            className="bg-white"
                                        />
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label className="text-xs uppercase font-black text-muted-foreground">Qual o Parentesco?</Label>
                                    <Select value={newRelation} onValueChange={setNewRelation}>
                                        <SelectTrigger className="bg-white"><SelectValue placeholder="Ex: Pai, Mãe, Filho..." /></SelectTrigger>
                                        <SelectContent>
                                            {relationOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t border-primary/10">
                                <Button variant="ghost" onClick={resetForm}>Cancelar</Button>
                                <Button onClick={handleAddLink} className="font-bold">Adicionar ao Núcleo</Button>
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
                                            <TableCell className="font-bold">{link.name}</TableCell>
                                            <TableCell className="font-medium text-muted-foreground">{link.relation}</TableCell>
                                            <TableCell>
                                                {link.userId ? (
                                                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-black uppercase">
                                                        <UserCheck className="size-3 mr-1"/> Cadastrado
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 text-[10px] font-bold uppercase">
                                                        Nome Externo
                                                    </Badge>
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
