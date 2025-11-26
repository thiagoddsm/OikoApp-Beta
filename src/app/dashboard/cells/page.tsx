
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query, addDoc, updateDoc, doc } from 'firebase/firestore';
import { useFirebase, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Building, User, Shield, PlusCircle, Pencil, Network, Map as MapIcon, AreaChart } from "lucide-react";
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useToast } from '@/hooks/use-toast';

type UserType = {
  id: string;
  name: string;
  avatar?: string;
  hierarchy?: {
    role?: string;
  }
};

type Cell = {
  id: string;
  nome: string;
  liderId: string;
  supervisorId: string; // Area Leader
  areaId: string;
  redeId: string;
  membros: string[];
};

type Area = {
  id: string;
  nome: string;
  liderId: string;
  redeId: string;
};

type Rede = {
  id: string;
  nome: string;
  liderId: string;
  pastorId: string;
};


function CreateOrEditCellDialog({ open, onOpenChange, users, supervisors, areas, redes, existingCell }) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [nome, setNome] = useState('');
  const [liderId, setLiderId] = useState('');
  const [supervisorId, setSupervisorId] = useState(''); // Area leader
  const [areaId, setAreaId] = useState('');
  const [redeId, setRedeId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const availableAreas = useMemo(() => {
    if (!redeId || !areas) return [];
    return areas.filter(a => a.redeId === redeId);
  }, [redeId, areas]);


  useEffect(() => {
    if (existingCell) {
      setNome(existingCell.nome || '');
      setLiderId(existingCell.liderId || '');
      setSupervisorId(existingCell.supervisorId || '');
      setRedeId(existingCell.redeId || '');
      setAreaId(existingCell.areaId || '');
    } else {
      // Reset form
      setNome('');
      setLiderId('');
      setSupervisorId('');
      setAreaId('');
      setRedeId('');
    }
  }, [existingCell, open]);
  
  useEffect(() => {
    // Reset area if network changes and the selected area is not in the new network
    if (areaId && !availableAreas.find(a => a.id === areaId)) {
      setAreaId('');
    }
  }, [redeId, availableAreas, areaId]);


  const handleSave = async () => {
    if (!nome || !liderId || !supervisorId || !areaId || !redeId) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos, incluindo Rede e Área.",
      });
      return;
    }
    setIsSaving(true);
    
    const cellData = {
      nome,
      liderId,
      supervisorId,
      areaId,
      redeId
    };

    if (existingCell) {
      const cellDocRef = doc(firestore, 'cells', existingCell.id);
      updateDocumentNonBlocking(cellDocRef, cellData).then(() => {
        toast({
          title: "Sucesso!",
          description: `A célula "${nome}" foi atualizada.`,
        });
        onOpenChange(false);
      }).catch(error => {
        console.error("Error updating cell:", error);
      }).finally(() => {
        setIsSaving(false);
      });
    } else {
      const cellsCollection = collection(firestore, 'cells');
      addDocumentNonBlocking(cellsCollection, {
        ...cellData,
        membros: [liderId], // Leader is a member by default
      }).then(() => {
        toast({
          title: "Sucesso!",
          description: `A célula "${nome}" foi criada.`,
        });
        onOpenChange(false);
      }).catch(error => {
        console.error("Error creating cell:", error);
      }).finally(() => {
        setIsSaving(false);
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{existingCell ? 'Editar Célula' : 'Criar Nova Célula'}</DialogTitle>
          <DialogDescription>
            {existingCell ? 'Altere as informações da célula abaixo.' : 'Preencha as informações abaixo para criar uma nova célula.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Nome
            </Label>
            <Input id="name" value={nome} onChange={(e) => setNome(e.target.value)} className="col-span-3" placeholder="Nome da Célula"/>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="rede" className="text-right">
              Rede
            </Label>
            <Select value={redeId} onValueChange={setRedeId}>
                <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Selecione a Rede" />
                </SelectTrigger>
                <SelectContent>
                    {redes.map(rede => (
                        <SelectItem key={rede.id} value={rede.id}>{rede.nome}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="area" className="text-right">
              Área
            </Label>
            <Select value={areaId} onValueChange={setAreaId} disabled={!redeId || availableAreas.length === 0}>
                <SelectTrigger className="col-span-3">
                    <SelectValue placeholder={!redeId ? "Selecione uma rede primeiro" : "Selecione a Área"} />
                </SelectTrigger>
                <SelectContent>
                    {availableAreas.map(area => (
                        <SelectItem key={area.id} value={area.id}>{area.nome}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="leader" className="text-right">
              Líder (GC)
            </Label>
            <Select value={liderId} onValueChange={setLiderId}>
                <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Selecione um líder" />
                </SelectTrigger>
                <SelectContent>
                    {users.map(user => (
                        <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>
           <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="supervisor" className="text-right">
              Líder (Área)
            </Label>
            <Select value={supervisorId} onValueChange={setSupervisorId}>
                <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Selecione um líder de área" />
                </SelectTrigger>
                <SelectContent>
                    {supervisors.map(user => (
                        <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">Cancelar</Button>
          </DialogClose>
          <Button type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


export default function CellsPage() {
  const { firestore, user } = useFirebase();
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [editingCell, setEditingCell] = useState<Cell | null>(null);

  const usersQuery = useMemoFirebase(() => user && firestore ? query(collection(firestore, 'users')) : null, [firestore, user]);
  const cellsQuery = useMemoFirebase(() => user && firestore ? query(collection(firestore, 'cells')) : null, [firestore, user]);
  const areasQuery = useMemoFirebase(() => user && firestore ? query(collection(firestore, 'areas')) : null, [firestore, user]);
  const redesQuery = useMemoFirebase(() => user && firestore ? query(collection(firestore, 'redes')) : null, [firestore, user]);

  const { data: users, isLoading: isLoadingUsers } = useCollection<UserType>(usersQuery);
  const { data: cells, isLoading: isLoadingCells } = useCollection<Cell>(cellsQuery);
  const { data: areas, isLoading: isLoadingAreas } = useCollection<Area>(areasQuery);
  const { data: redes, isLoading: isLoadingRedes } = useCollection<Rede>(redesQuery);

  const userMap = useMemo(() => new Map(users?.map(u => [u.id, u]) || []), [users]);
  const areaMap = useMemo(() => new Map(areas?.map(a => [a.id, a]) || []), [areas]);
  const redeMap = useMemo(() => new Map(redes?.map(r => [r.id, r]) || []), [redes]);

  const supervisors = useMemo(() => {
    if (!users) return [];
    const supervisorRoles = ['lider_area', 'lider_rede', 'pastor_senior', 'admin'];
    return users.filter(u => u.hierarchy?.role && supervisorRoles.includes(u.hierarchy.role));
  }, [users]);

  const handleOpenCreateDialog = () => {
    setEditingCell(null);
    setDialogOpen(true);
  };

  const handleOpenEditDialog = (cell: Cell) => {
    setEditingCell(cell);
    setDialogOpen(true);
  };
  
  const isLoading = isLoadingUsers || isLoadingCells || isLoadingAreas || isLoadingRedes || !user;

  return (
    <>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Gestão de Células</CardTitle>
            <CardDescription>
              Visualize, crie e edite as células e sua estrutura hierárquica.
            </CardDescription>
          </div>
          <Button onClick={handleOpenCreateDialog}>
             <PlusCircle className="mr-2 h-4 w-4"/>
             Criar Célula
          </Button>
        </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead><Building className="inline-block mr-2 h-4 w-4" />Célula</TableHead>
                  <TableHead><User className="inline-block mr-2 h-4 w-4" />Líder (GC)</TableHead>
                  <TableHead><Shield className="inline-block mr-2 h-4 w-4" />Líder (Área)</TableHead>
                  <TableHead><AreaChart className="inline-block mr-2 h-4 w-4" />Área</TableHead>
                  <TableHead><Network className="inline-block mr-2 h-4 w-4" />Rede</TableHead>
                  <TableHead className="text-center">Membros</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cells?.map((cell) => {
                  const leader = userMap.get(cell.liderId);
                  const supervisor = userMap.get(cell.supervisorId);
                  const area = areaMap.get(cell.areaId);
                  const rede = redeMap.get(cell.redeId);
                  const leaderAvatar = PlaceHolderImages.find(p => p.id === (leader?.avatar || 'avatar-4'));

                  return (
                    <TableRow key={cell.id}>
                      <TableCell className="font-medium">
                        <Link href={`/dashboard/cells/${cell.id}`} className="hover:underline">
                          {cell.nome}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            {leaderAvatar && <AvatarImage src={leaderAvatar.imageUrl} alt={leader?.name} />}
                            <AvatarFallback>{leader?.name?.charAt(0) || 'L'}</AvatarFallback>
                          </Avatar>
                          <span>{leader?.name || 'Não definido'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{supervisor?.name || 'Não definido'}</TableCell>
                      <TableCell className="text-muted-foreground">{area?.nome || 'Não definida'}</TableCell>
                      <TableCell className="text-muted-foreground">{rede?.nome || 'Não definida'}</TableCell>
                      <TableCell className="text-center">
                         <Badge variant="secondary">{cell.membros?.length || 0}</Badge>
                      </TableCell>
                       <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenEditDialog(cell)}>
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">Editar</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>

    {users && supervisors && areas && redes &&(
      <CreateOrEditCellDialog 
        open={isDialogOpen}
        onOpenChange={setDialogOpen}
        users={users}
        supervisors={supervisors}
        areas={areas}
        redes={redes}
        existingCell={editingCell}
      />
    )}
    </>
  );
}
