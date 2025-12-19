
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Building, User, Pencil, Network, MapPin, AreaChart, Calendar, Clock, PlusCircle } from "lucide-react";
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useToast } from '@/hooks/use-toast';
import { GooglePlacesAutocomplete } from '@/components/common/google-places-autocomplete';
import { Input } from '@/components/ui/input';
import { MultiSelect } from '@/components/ui/multi-select';


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
  meetingDay?: string;
  meetingTime?: string;
  address?: {
      street: string;
      lat?: number;
      lng?: number;
  }
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
  const [isSaving, setIsSaving] = useState(false);
  
  // Form state
  const [nome, setNome] = useState('');
  const [liderId, setLiderId] = useState('');
  const [redeId, setRedeId] = useState('');
  const [areaId, setAreaId] = useState('');
  const [street, setStreet] = useState('');
  const [lat, setLat] = useState<number | undefined>(undefined);
  const [lng, setLng] = useState<number | undefined>(undefined);
  const [meetingDay, setMeetingDay] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const userOptions = useMemo(() => 
    users.map(user => ({ value: user.id, label: user.name })), 
  [users]);

  const availableAreas = useMemo(() => {
    if (!redeId || !areas) return [];
    return areas.filter(a => a.redeId === redeId);
  }, [redeId, areas]);

  const areaMap = useMemo(() => new Map(areas?.map(a => [a.id, a]) || []), [areas]);

  useEffect(() => {
    if (existingCell) {
      setNome(existingCell.nome || '');
      setLiderId(existingCell.liderId || '');
      setRedeId(existingCell.redeId || '');
      setAreaId(existingCell.areaId || '');
      setStreet(existingCell.address?.street || '');
      setLat(existingCell.address?.lat);
      setLng(existingCell.address?.lng);
      setMeetingDay(existingCell.meetingDay || '');
      setMeetingTime(existingCell.meetingTime || '');
      setSelectedMembers(existingCell.membros || []);
    } else {
      // Reset form
      setNome('');
      setLiderId('');
      setAreaId('');
      setRedeId('');
      setStreet('');
      setLat(undefined);
      setLng(undefined);
      setMeetingDay('');
      setMeetingTime('');
      setSelectedMembers([]);
    }
  }, [existingCell, open]);
  
  useEffect(() => {
    // Reset area if network changes and the selected area is not in the new network
    if (areaId && !availableAreas.find(a => a.id === areaId)) {
      setAreaId('');
    }
  }, [redeId, availableAreas, areaId]);

  useEffect(() => {
    // Auto-add leader to members if not already there, and prevent removal
    if (liderId && !selectedMembers.includes(liderId)) {
        setSelectedMembers(prev => [...prev, liderId]);
    }
  }, [liderId, selectedMembers]);


  const handleAddressSelect = (place: google.maps.places.PlaceResult | null) => {
    if (place) {
        setStreet(place.formatted_address || '');
        if (place.geometry?.location) {
            setLat(place.geometry.location.lat());
            setLng(place.geometry.location.lng());
        }
    }
  };

  const handleSave = async () => {
    const selectedArea = areaMap.get(areaId);
    const supervisorId = selectedArea?.liderId;

    if (!nome || !liderId || !areaId || !redeId || !supervisorId) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos, incluindo Rede e Área.",
      });
      return;
    }
    setIsSaving(true);

    const finalMembers = [...new Set([liderId, ...selectedMembers])];
    
    const cellData = {
      nome,
      liderId,
      supervisorId,
      areaId,
      redeId,
      membros: finalMembers,
      address: {
        street,
        lat,
        lng,
      },
      meetingDay,
      meetingTime
    };

    if (existingCell) {
      const cellDocRef = doc(firestore, 'cells', existingCell.id);
      updateDocumentNonBlocking(cellDocRef, cellData);
      toast({
          title: "Sucesso!",
          description: `A célula "${nome}" foi atualizada.`,
      });
    } else {
      const cellsCollection = collection(firestore, 'cells');
      addDocumentNonBlocking(cellsCollection, cellData);
      toast({
          title: "Sucesso!",
          description: `A célula "${nome}" foi criada.`,
      });
    }
    
    setIsSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{existingCell ? 'Editar Célula' : 'Criar Nova Célula'}</DialogTitle>
          <DialogDescription>
            {existingCell ? 'Altere as informações da célula abaixo.' : 'Preencha as informações abaixo para criar uma nova célula.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
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
           <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="members" className="text-right pt-2">
              Membros
            </Label>
            <div className="col-span-3">
                <MultiSelect
                    options={userOptions.filter(u => u.value !== liderId)} // Leader can't be removed from members list
                    selected={selectedMembers.filter(m => m !== liderId)} // Don't show leader in the badge list, as they are implicitly a member
                    onChange={newMembers => setSelectedMembers([...newMembers, liderId])}
                    placeholder="Selecione os membros..."
                />
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="street" className="text-right">
              Endereço
            </Label>
            <div className="col-span-3">
                <GooglePlacesAutocomplete
                    defaultValue={street}
                    onAddressSelect={handleAddressSelect}
                />
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="meetingDay" className="text-right">
              Dia
            </Label>
             <Select value={meetingDay} onValueChange={setMeetingDay}>
                <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Selecione o dia da reunião" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="Segunda-feira">Segunda-feira</SelectItem>
                    <SelectItem value="Terça-feira">Terça-feira</SelectItem>
                    <SelectItem value="Quarta-feira">Quarta-feira</SelectItem>
                    <SelectItem value="Quinta-feira">Quinta-feira</SelectItem>
                    <SelectItem value="Sexta-feira">Sexta-feira</SelectItem>
                    <SelectItem value="Sábado">Sábado</SelectItem>
                    <SelectItem value="Domingo">Domingo</SelectItem>
                </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="meetingTime" className="text-right">
              Horário
            </Label>
            <Input id="meetingTime" type="time" value={meetingTime} onChange={(e) => setMeetingTime(e.target.value)} className="col-span-3"/>
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
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [editingCell, setEditingCell] = useState<Cell | null>(null);

  const { data: users, isLoading: isLoadingUsers } = useCollection<UserType>('users');
  const { data: cells, isLoading: isLoadingCells } = useCollection<Cell>('cells');
  const { data: areas, isLoading: isLoadingAreas } = useCollection<Area>('areas');
  const { data: redes, isLoading: isLoadingRedes } = useCollection<Rede>('redes');

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
  
  const isLoading = isLoadingUsers || isLoadingCells || isLoadingAreas || isLoadingRedes;

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
                  <TableHead><AreaChart className="inline-block mr-2 h-4 w-4" />Área</TableHead>
                  <TableHead><Network className="inline-block mr-2 h-4 w-4" />Rede</TableHead>
                  <TableHead><MapPin className="inline-block mr-2 h-4 w-4" />Endereço</TableHead>
                  <TableHead><Calendar className="inline-block mr-2 h-4 w-4" />Dia</TableHead>
                  <TableHead><Clock className="inline-block mr-2 h-4 w-4" />Horário</TableHead>
                  <TableHead className="text-center">Membros</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cells?.map((cell) => {
                  const leader = userMap.get(cell.liderId);
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
                      <TableCell className="text-muted-foreground">{area?.nome || 'Não definida'}</TableCell>
                      <TableCell className="text-muted-foreground">{rede?.nome || 'Não definida'}</TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate">
                        {cell.address?.street ? (
                            <a 
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cell.address.street)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline"
                                title={cell.address.street}
                            >
                                {cell.address.street}
                            </a>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{cell.meetingDay || '-'}</TableCell>
                      <TableCell className="text-muted-foreground">{cell.meetingTime || '-'}</TableCell>
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
    
