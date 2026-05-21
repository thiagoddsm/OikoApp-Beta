
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { collection, doc, query, deleteDoc } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Building, User, Pencil, Trash2, Network, MapPin, AreaChart, Calendar, Clock, PlusCircle, Droplets, ChevronRight, Users } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useToast } from '@/hooks/use-toast';
import { GooglePlacesAutocomplete } from '@/components/common/google-places-autocomplete';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';


type UserType = {
  id: string;
  name: string;
  avatar?: string;
  photoURL?: string;
  hierarchy?: { role?: string; };
  churchData?: { baptismDate?: any; };
};

type CoLider = { id: string; casalId?: string };

type Cell = {
  id: string;
  nome: string;
  liderId: string;
  liderCasalId?: string;
  coLiderIds?: string[];
  coLideres?: CoLider[];
  anfitriaoId?: string;
  anfitriãoCasalId?: string;
  secretariaId?: string;
  supervisorId: string;
  areaId: string;
  redeId: string;
  membros: string[];
  meetingDay?: string;
  meetingTime?: string;
  status?: 'active' | 'inactive' | 'growing';
  address?: { street: string; lat?: number; lng?: number; };
  anfitriaoElegiveiIds?: string[];
};

type Area = { id: string; nome: string; liderId: string; redeId: string; };
type Rede = { id: string; nome: string; liderId: string; pastorId: string; };

const cellStatusConfig = {
  active:   { label: 'Ativa',          className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  growing:  { label: 'Em Crescimento', className: 'bg-sky-100 text-sky-800 border-sky-200' },
  inactive: { label: 'Inativa',        className: 'bg-slate-100 text-slate-500 border-slate-200' },
};

// ─── PersonSearchInput ────────────────────────────────────────────────────────
function PersonSearchInput({
  value, onChange, users, excludeIds = [], placeholder = 'Buscar...', optional = false,
}: {
  value: string; onChange: (id: string) => void; users: UserType[];
  excludeIds?: string[]; placeholder?: string; optional?: boolean;
}) {
  const [search, setSearch] = useState('');
  const selected = users.find(u => u.id === value);

  const results = useMemo(() => {
    if (!search.trim()) return [];
    const term = search.toLowerCase();
    return users.filter(u => !excludeIds.includes(u.id) && u.name?.toLowerCase().includes(term)).slice(0, 10);
  }, [search, users, excludeIds]);

  if (selected) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-muted/30">
        <Avatar className="h-6 w-6 flex-shrink-0">
          {selected.photoURL && <img src={selected.photoURL} className="h-full w-full object-cover rounded-full" />}
          <AvatarFallback className="text-[10px] font-bold">{selected.name?.charAt(0)}</AvatarFallback>
        </Avatar>
        <span className="text-sm font-semibold flex-1 truncate">{selected.name}</span>
        <button type="button" onClick={() => { onChange(''); setSearch(''); }} className="text-muted-foreground hover:text-destructive ml-1 text-xs font-bold">✕</button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Input
        placeholder={placeholder}
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="h-9"
      />
      {search.trim() && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 border rounded-lg bg-background shadow-lg overflow-hidden">
          {results.map(u => (
            <button key={u.id} type="button"
              onClick={() => { onChange(u.id); setSearch(''); }}
              className="flex items-center gap-2 w-full px-3 py-2 hover:bg-muted text-left text-sm"
            >
              <Avatar className="h-5 w-5 flex-shrink-0">
                {u.photoURL && <img src={u.photoURL} className="h-full w-full object-cover rounded-full" />}
                <AvatarFallback className="text-[10px] font-bold">{u.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="truncate">{u.name}</span>
            </button>
          ))}
        </div>
      )}
      {search.trim() && results.length === 0 && (
        <p className="text-xs text-muted-foreground mt-1 px-1">Nenhum resultado para "{search}"</p>
      )}
      {!search.trim() && <p className="text-[11px] text-muted-foreground mt-1 px-1">Digite para buscar{optional ? ' (opcional)' : ''}</p>}
    </div>
  );
}

function CreateOrEditCellDialog({ open, onOpenChange, users, supervisors, areas, redes, existingCell }) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [nome, setNome] = useState('');
  const [liderId, setLiderId] = useState('');
  const [liderCasalId, setLiderCasalId] = useState('');
  const [coLideres, setCoLideres] = useState<CoLider[]>([]);
  const [anfitriaoId, setAnfitriaoId] = useState('');
  const [anfitriãoCasalId, setAnfitriãoCasalId] = useState('');
  const [secretariaId, setSecretariaId] = useState('');
  const [redeId, setRedeId] = useState('');
  const [areaId, setAreaId] = useState('');
  const [street, setStreet] = useState('');
  const [lat, setLat] = useState<number | undefined>(undefined);
  const [lng, setLng] = useState<number | undefined>(undefined);
  const [meetingDay, setMeetingDay] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [status, setStatus] = useState<'active' | 'inactive' | 'growing'>('active');
  const [memberSearch, setMemberSearch] = useState('');
  const [anfitriaoElegiveiIds, setAnfitriaoElegiveiIds] = useState<string[]>([]);
  const [addingSpouseFor, setAddingSpouseFor] = useState<number | null>(null);
  const [liderEAnfitriao, setLiderEAnfitriao] = useState(false);

  const availableAreas = useMemo(() => {
    if (!redeId || !areas) return [];
    return areas.filter(a => a.redeId === redeId);
  }, [redeId, areas]);

  const areaMap = useMemo(() => new Map(areas?.map(a => [a.id, a]) || []), [areas]);

  useEffect(() => {
    if (existingCell) {
      setNome(existingCell.nome || '');
      setLiderId(existingCell.liderId || '');
      setLiderCasalId(existingCell.liderCasalId || '');
      setCoLideres(existingCell.coLideres || (existingCell.coLiderIds || []).map(id => ({ id })));
      setAnfitriaoId(existingCell.anfitriaoId || '');
      setAnfitriãoCasalId(existingCell.anfitriãoCasalId || '');
      setSecretariaId(existingCell.secretariaId || '');
      setRedeId(existingCell.redeId || '');
      setAreaId(existingCell.areaId || '');
      setStreet(existingCell.address?.street || '');
      setLat(existingCell.address?.lat);
      setLng(existingCell.address?.lng);
      setMeetingDay(existingCell.meetingDay || '');
      setMeetingTime(existingCell.meetingTime || '');
      setSelectedMembers(existingCell.membros || []);
      setStatus(existingCell.status || 'active');
      setAnfitriaoElegiveiIds(existingCell.anfitriaoElegiveiIds || []);
      setLiderEAnfitriao(existingCell.liderEAnfitriao === true || (!!existingCell.anfitriaoId && existingCell.anfitriaoId === existingCell.liderId));
    } else {
      setNome(''); setLiderId(''); setLiderCasalId(''); setCoLideres([]); setAnfitriaoId('');
      setAnfitriãoCasalId(''); setSecretariaId(''); setAreaId(''); setRedeId('');
      setStreet(''); setLat(undefined); setLng(undefined);
      setMeetingDay(''); setMeetingTime(''); setSelectedMembers([]);
      setStatus('active'); setAnfitriaoElegiveiIds([]); setLiderEAnfitriao(false);
    }
    setMemberSearch(''); setAddingSpouseFor(null);
  }, [existingCell, open]);
  
  useEffect(() => {
    if (areaId && !availableAreas.find(a => a.id === areaId)) setAreaId('');
  }, [redeId, availableAreas, areaId]);

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
      toast({ variant: "destructive", title: "Campos obrigatórios", description: "Preencha todos os campos incluindo Rede e Área." });
      return;
    }
    setIsSaving(true);
    // Deriva coLiderIds flat (todos os IDs de co-líderes, incluindo cônjuges)
    const flatCoLiderIds = [...new Set(coLideres.flatMap(c => [c.id, c.casalId].filter(Boolean) as string[]))];
    // Se líder é anfitrião, usa liderId; senão usa o campo manual
    const resolvedAnfitriaoId = liderEAnfitriao ? liderId : anfitriaoId;
    const resolvedAnfitriãoCasalId = liderEAnfitriao ? liderCasalId : anfitriãoCasalId;
    // Membros finais: líder + casal líder + co-líderes + anfitrião + casal anfitrião + secretaria + selecionados
    const finalMembers = [...new Set([
      liderId, liderCasalId,
      ...flatCoLiderIds,
      resolvedAnfitriaoId, resolvedAnfitriãoCasalId,
      secretariaId,
      ...selectedMembers,
      ...anfitriaoElegiveiIds,
    ].filter(Boolean) as string[])];
    const cellData = {
      nome, liderId, liderCasalId: liderCasalId || null,
      coLideres, coLiderIds: flatCoLiderIds,
      anfitriaoId: resolvedAnfitriaoId || null,
      anfitriãoCasalId: resolvedAnfitriãoCasalId || null,
      liderEAnfitriao,
      secretariaId: secretariaId || null,
      supervisorId, areaId, redeId,
      membros: finalMembers, status,
      address: { street, lat, lng },
      meetingDay, meetingTime,
      anfitriaoElegiveiIds,
    };
    if (existingCell) {
      updateDocumentNonBlocking(doc(firestore, 'cells', existingCell.id), cellData);
      toast({ title: "Sucesso!", description: `A célula "${nome}" foi atualizada.` });
    } else {
      addDocumentNonBlocking(collection(firestore, 'cells'), cellData);
      toast({ title: "Sucesso!", description: `A célula "${nome}" foi criada.` });
    }
    setIsSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{existingCell ? 'Editar Célula' : 'Criar Nova Célula'}</DialogTitle>
          <DialogDescription>{existingCell ? 'Altere as informações da célula.' : 'Preencha as informações para criar uma nova célula.'}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-5 py-4 max-h-[70vh] overflow-y-auto pr-2">

          {/* NOME + STATUS */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Nome</Label>
            <Input value={nome} onChange={e => setNome(e.target.value)} className="col-span-3" placeholder="Nome da Célula"/>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Status</Label>
            <Select value={status} onValueChange={(v: any) => setStatus(v)}>
              <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativa</SelectItem>
                <SelectItem value="growing">Em Crescimento</SelectItem>
                <SelectItem value="inactive">Inativa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* REDE + ÁREA */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Rede</Label>
            <Select value={redeId} onValueChange={setRedeId}>
              <SelectTrigger className="col-span-3"><SelectValue placeholder="Selecione a Rede" /></SelectTrigger>
              <SelectContent>{redes.map(r => <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Área</Label>
            <Select value={areaId} onValueChange={setAreaId} disabled={!redeId || availableAreas.length === 0}>
              <SelectTrigger className="col-span-3"><SelectValue placeholder={!redeId ? "Selecione uma rede primeiro" : "Selecione a Área"} /></SelectTrigger>
              <SelectContent>{availableAreas.map(a => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          {/* LÍDER + CASAL */}
          <div className="grid grid-cols-4 items-start gap-4">
            <Label className="text-right pt-2">Líder (GC)</Label>
            <div className="col-span-3 space-y-2">
              <PersonSearchInput value={liderId} onChange={setLiderId} users={users} excludeIds={[liderCasalId].filter(Boolean)} placeholder="Buscar líder..." />
              {liderId && !liderCasalId && (
                <button type="button" onClick={() => setLiderCasalId('__adding')} className="text-xs text-primary font-semibold hover:underline">+ É casal? Adicionar cônjuge</button>
              )}
              {(liderCasalId === '__adding' || liderCasalId) && (
                <div className="space-y-1">
                  <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wide">Cônjuge do Líder</p>
                  <PersonSearchInput
                    value={liderCasalId === '__adding' ? '' : liderCasalId}
                    onChange={id => setLiderCasalId(id || '')}
                    users={users} excludeIds={[liderId].filter(Boolean)}
                    placeholder="Buscar cônjuge..." optional
                  />
                  {liderCasalId && liderCasalId !== '__adding' && (
                    <button type="button" onClick={() => setLiderCasalId('')} className="text-[11px] text-destructive hover:underline">Remover cônjuge</button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* CO-LÍDERES com suporte a casal */}
          <div className="grid grid-cols-4 items-start gap-4">
            <div className="text-right pt-2">
              <Label>Colíderes</Label>
              {coLideres.length > 0 && <p className="text-[10px] text-muted-foreground mt-0.5">{coLideres.length} unidade(s)</p>}
            </div>
            <div className="col-span-3 space-y-2">
              {coLideres.map((cl, idx) => {
                const clUser = users.find(u => u.id === cl.id);
                const spouseUser = cl.casalId ? users.find(u => u.id === cl.casalId) : null;
                return (
                  <div key={cl.id} className="border rounded-lg p-2.5 space-y-2 bg-muted/20">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6 flex-shrink-0">
                        {clUser?.photoURL && <img src={clUser.photoURL} className="h-full w-full object-cover rounded-full"/>}
                        <AvatarFallback className="text-[10px] font-bold">{clUser?.name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-semibold flex-1">{clUser?.name}</span>
                      {cl.casalId && <Badge className="text-[10px] px-1.5 h-4 bg-rose-100 text-rose-700 border-rose-200">CASAL</Badge>}
                      <button type="button" onClick={() => setCoLideres(prev => prev.filter((_, i) => i !== idx))} className="text-muted-foreground hover:text-destructive text-xs font-bold">✕</button>
                    </div>
                    {spouseUser && (
                      <div className="flex items-center gap-2 pl-8">
                        <Avatar className="h-5 w-5 flex-shrink-0">
                          {spouseUser.photoURL && <img src={spouseUser.photoURL} className="h-full w-full object-cover rounded-full"/>}
                          <AvatarFallback className="text-[10px]">{spouseUser.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground flex-1">{spouseUser.name}</span>
                        <button type="button" onClick={() => setCoLideres(prev => prev.map((c, i) => i === idx ? { ...c, casalId: undefined } : c))} className="text-[10px] text-destructive hover:underline">remover</button>
                      </div>
                    )}
                    {!cl.casalId && addingSpouseFor !== idx && (
                      <button type="button" onClick={() => setAddingSpouseFor(idx)} className="text-[11px] text-primary hover:underline pl-8">+ É casal? Adicionar cônjuge</button>
                    )}
                    {addingSpouseFor === idx && (
                      <div className="pl-8">
                        <PersonSearchInput
                          value="" onChange={id => { setCoLideres(prev => prev.map((c, i) => i === idx ? { ...c, casalId: id } : c)); setAddingSpouseFor(null); }}
                          users={users} excludeIds={coLideres.flatMap(c => [c.id, c.casalId].filter(Boolean) as string[])}
                          placeholder="Buscar cônjuge do co-líder..." optional
                        />
                      </div>
                    )}
                  </div>
                );
              })}
              <PersonSearchInput
                value="" onChange={id => { if (!coLideres.find(c => c.id === id)) setCoLideres(prev => [...prev, { id }]); }}
                users={users}
                excludeIds={[liderId, liderCasalId, ...coLideres.flatMap(c => [c.id, c.casalId].filter(Boolean) as string[])].filter(Boolean)}
                placeholder="Adicionar co-líder..." optional
              />
            </div>
          </div>

          {/* ANFITRIÃO + CASAL */}
          <div className="grid grid-cols-4 items-start gap-4">
            <Label className="text-right pt-2">Anfitrião</Label>
            <div className="col-span-3 space-y-2">
              {/* Checkbox: líder é o anfitrião */}
              <div className="flex items-center gap-2 py-1 px-3 rounded-lg border bg-muted/20">
                <Checkbox
                  id="lider-e-anfitriao"
                  checked={liderEAnfitriao}
                  onCheckedChange={checked => {
                    setLiderEAnfitriao(!!checked);
                    if (checked) { setAnfitriaoId(''); setAnfitriãoCasalId(''); }
                  }}
                />
                <Label htmlFor="lider-e-anfitriao" className="font-semibold text-sm cursor-pointer flex-1">
                  O líder do GC é o anfitrião
                </Label>
                {liderEAnfitriao && liderId && (
                  <span className="text-xs text-primary font-bold">
                    {users.find(u => u.id === liderId)?.name || '—'}
                    {liderCasalId && ` & ${users.find(u => u.id === liderCasalId)?.name || ''}`}
                  </span>
                )}
              </div>

              {/* Campo manual — só exibe se não for líder */}
              {!liderEAnfitriao && (
                <>
                  <PersonSearchInput value={anfitriaoId} onChange={id => { setAnfitriaoId(id); if (!id) setAnfitriãoCasalId(''); }} users={users} excludeIds={[liderId, liderCasalId].filter(Boolean)} placeholder="Buscar anfitrião..." optional />
                  {anfitriaoId && !anfitriãoCasalId && (
                    <button type="button" onClick={() => setAnfitriãoCasalId('__adding')} className="text-xs text-primary font-semibold hover:underline">+ É casal? Adicionar cônjuge</button>
                  )}
                  {(anfitriãoCasalId === '__adding' || anfitriãoCasalId) && anfitriaoId && (
                    <div className="space-y-1">
                      <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wide">Cônjuge do Anfitrião</p>
                      <PersonSearchInput
                        value={anfitriãoCasalId === '__adding' ? '' : anfitriãoCasalId}
                        onChange={id => setAnfitriãoCasalId(id || '')}
                        users={users} excludeIds={[anfitriaoId].filter(Boolean)} placeholder="Buscar cônjuge..." optional
                      />
                      {anfitriãoCasalId && anfitriãoCasalId !== '__adding' && (
                        <button type="button" onClick={() => setAnfitriãoCasalId('')} className="text-[11px] text-destructive hover:underline">Remover cônjuge</button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* SECRETARIA */}
          <div className="grid grid-cols-4 items-start gap-4">
            <Label className="text-right pt-2">Secretaria</Label>
            <div className="col-span-3">
              <PersonSearchInput value={secretariaId} onChange={setSecretariaId} users={users} excludeIds={[liderId, liderCasalId].filter(Boolean)} placeholder="Buscar secretaria..." optional />
            </div>
          </div>

          {/* MEMBROS — lazy search, max 10 */}
          <div className="grid grid-cols-4 items-start gap-4">
            <Label className="text-right pt-2">Membros</Label>
            <div className="col-span-3 space-y-2">
              <Input placeholder="Buscar membro por nome..." value={memberSearch} onChange={e => setMemberSearch(e.target.value)} />
              {memberSearch.trim() && (
                <ScrollArea className="h-40 w-full rounded-md border p-2">
                  <div className="space-y-1">
                    {users.filter(u => u.id !== liderId && u.name?.toLowerCase().includes(memberSearch.toLowerCase())).slice(0, 10).map(user => (
                      <div key={user.id} className="flex items-center gap-2 py-0.5">
                        <Checkbox id={`member-${user.id}`} checked={selectedMembers.includes(user.id)}
                          onCheckedChange={checked => setSelectedMembers(prev => checked ? [...prev, user.id] : prev.filter(id => id !== user.id))} />
                        <Label htmlFor={`member-${user.id}`} className="font-normal cursor-pointer text-sm">{user.name}</Label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
              {selectedMembers.filter(id => id !== liderId && id !== liderCasalId).length > 0 && (
                <p className="text-[11px] text-muted-foreground">{selectedMembers.filter(id => id !== liderId && id !== liderCasalId).length} membro(s) adicional(is)</p>
              )}
            </div>
          </div>

          {/* ELEGÍVEIS PARA ANFITRIÃO */}
          <div className="grid grid-cols-4 items-start gap-4">
            <div className="text-right pt-2">
              <Label>Elegíveis p/ Anfitrião</Label>
              <p className="text-[10px] text-muted-foreground mt-0.5">Multiplicação</p>
            </div>
            <div className="col-span-3 space-y-2">
              <PersonSearchInput
                value="" onChange={id => { if (!anfitriaoElegiveiIds.includes(id)) setAnfitriaoElegiveiIds(prev => [...prev, id]); }}
                users={users} excludeIds={anfitriaoElegiveiIds} placeholder="Adicionar elegível..." optional
              />
              {anfitriaoElegiveiIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {anfitriaoElegiveiIds.map(id => {
                    const u = users.find(x => x.id === id);
                    return u ? (
                      <div key={id} className="flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full px-2 py-0.5 text-[11px] font-semibold">
                        {u.name}
                        <button type="button" onClick={() => setAnfitriaoElegiveiIds(prev => prev.filter(x => x !== id))} className="hover:text-destructive ml-0.5">✕</button>
                      </div>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ENDEREÇO + DIA + HORÁRIO */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Endereço</Label>
            <div className="col-span-3"><GooglePlacesAutocomplete defaultValue={street} onAddressSelect={handleAddressSelect} /></div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Dia</Label>
            <Select value={meetingDay} onValueChange={setMeetingDay}>
              <SelectTrigger className="col-span-3"><SelectValue placeholder="Selecione o dia" /></SelectTrigger>
              <SelectContent>
                {['Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado','Domingo'].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Horário</Label>
            <Input type="time" value={meetingTime} onChange={e => setMeetingTime(e.target.value)} className="col-span-3"/>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button type="button" variant="secondary">Cancelar</Button></DialogClose>
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
  const { firestore } = useFirebase();
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [editingCell, setEditingCell] = useState<Cell | null>(null);
  const [deletingCell, setDeletingCell] = useState<Cell | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Filtros ──────────────────────────────────────────────────────────────
  const [filterName, setFilterName] = useState('');
  const [filterRedeId, setFilterRedeId] = useState('');
  const [filterAreaId, setFilterAreaId] = useState('');
  const [filterLiderId, setFilterLiderId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const usersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'users')) : null, [firestore]);
  const cellsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'cells')) : null, [firestore]);
  const areasQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'areas')) : null, [firestore]);
  const redesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'redes')) : null, [firestore]);
  
  const { data: users, isLoading: isLoadingUsers } = useCollection<UserType>(usersQuery);
  const { data: cells, isLoading: isLoadingCells } = useCollection<Cell>(cellsQuery);
  const { data: areas, isLoading: isLoadingAreas } = useCollection<Area>(areasQuery);
  const { data: redes, isLoading: isLoadingRedes } = useCollection<Rede>(redesQuery);

  const userMap = useMemo(() => new Map(users?.map(u => [u.id, u]) || []), [users]);
  const areaMap = useMemo(() => new Map(areas?.map(a => [a.id, a]) || []), [areas]);
  const redeMap = useMemo(() => new Map(redes?.map(r => [r.id, r]) || []), [redes]);

  const supervisors = useMemo(() => {
    if (!users) return [];
    return users.filter(u => u.hierarchy?.role && ['lider_area','lider_rede','pastor_senior','admin'].includes(u.hierarchy.role));
  }, [users]);

  // Áreas filtradas pela rede selecionada
  const filteredAreas = useMemo(() =>
    filterRedeId ? (areas || []).filter(a => a.redeId === filterRedeId) : (areas || []),
    [filterRedeId, areas]
  );

  // Líderes únicos presentes nas células
  const lideresNasCelulas = useMemo(() => {
    const ids = new Set((cells || []).map(c => c.liderId).filter(Boolean));
    return (users || []).filter(u => ids.has(u.id)).sort((a, b) => a.name.localeCompare(b.name));
  }, [cells, users]);

  // Células filtradas
  const filteredCells = useMemo(() => {
    if (!cells) return [];
    return cells.filter(cell => {
      if (filterName && !cell.nome?.toLowerCase().includes(filterName.toLowerCase())) return false;
      if (filterRedeId && cell.redeId !== filterRedeId) return false;
      if (filterAreaId && cell.areaId !== filterAreaId) return false;
      if (filterLiderId && cell.liderId !== filterLiderId) return false;
      if (filterStatus && (cell.status || 'active') !== filterStatus) return false;
      return true;
    });
  }, [cells, filterName, filterRedeId, filterAreaId, filterLiderId, filterStatus]);

  const hasActiveFilters = filterName || filterRedeId || filterAreaId || filterLiderId || filterStatus;
  const clearFilters = () => { setFilterName(''); setFilterRedeId(''); setFilterAreaId(''); setFilterLiderId(''); setFilterStatus(''); };

  const isLoading = isLoadingUsers || isLoadingCells || isLoadingAreas || isLoadingRedes;

  const handleDeleteCell = async () => {
    if (!deletingCell || !firestore) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(firestore, 'cells', deletingCell.id));
    } finally {
      setIsDeleting(false);
      setDeletingCell(null);
    }
  };

  return (
    <>
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
        <div>
          <CardTitle className="text-lg font-black">Gestão de Células</CardTitle>
          <CardDescription>Visualize, crie e edite as células e sua estrutura hierárquica.</CardDescription>
        </div>
        <Button onClick={() => { setEditingCell(null); setDialogOpen(true); }}>
          <PlusCircle className="mr-2 h-4 w-4"/>
          Criar Célula
        </Button>
      </CardHeader>

      {/* ── BARRA DE FILTROS ─────────────────────────────────────────────── */}
      <div className="px-6 py-3 border-b bg-muted/20 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[160px]">
          <Users className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar GC..."
            value={filterName}
            onChange={e => setFilterName(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>

        <Select value={filterRedeId || '__all'} onValueChange={v => { setFilterRedeId(v === '__all' ? '' : v); setFilterAreaId(''); }}>
          <SelectTrigger className="h-8 text-sm w-[150px]"><SelectValue placeholder="Rede" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">Todas as Redes</SelectItem>
            {(redes || []).map(r => <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterAreaId || '__all'} onValueChange={v => setFilterAreaId(v === '__all' ? '' : v)} disabled={filteredAreas.length === 0}>
          <SelectTrigger className="h-8 text-sm w-[150px]"><SelectValue placeholder="Área" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">Todas as Áreas</SelectItem>
            {filteredAreas.map(a => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterLiderId || '__all'} onValueChange={v => setFilterLiderId(v === '__all' ? '' : v)}>
          <SelectTrigger className="h-8 text-sm w-[160px]"><SelectValue placeholder="Líder" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">Todos os Líderes</SelectItem>
            {lideresNasCelulas.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterStatus || '__all'} onValueChange={v => setFilterStatus(v === '__all' ? '' : v)}>
          <SelectTrigger className="h-8 text-sm w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">Todos os Status</SelectItem>
            <SelectItem value="active">Ativa</SelectItem>
            <SelectItem value="growing">Em Crescimento</SelectItem>
            <SelectItem value="inactive">Inativa</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2 ml-auto">
          {hasActiveFilters && (
            <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-destructive font-semibold underline-offset-2 hover:underline transition-colors">
              Limpar filtros
            </button>
          )}
          <span className="text-xs text-muted-foreground font-medium">
            {filteredCells.length} de {cells?.length || 0} GC{cells?.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="rounded-b-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="pl-6">Célula</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Líder</TableHead>
                  <TableHead>Área / Rede</TableHead>
                  <TableHead>Reunião</TableHead>
                  <TableHead className="text-center">Membros</TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Droplets className="h-3.5 w-3.5 text-amber-500" />
                      Não Batizados
                    </div>
                  </TableHead>
                  <TableHead className="text-right pr-6">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCells.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="h-32 text-center text-muted-foreground italic text-sm">
                    {hasActiveFilters ? 'Nenhum GC encontrado com esses filtros.' : 'Nenhuma célula cadastrada.'}
                  </TableCell></TableRow>
                )}
                {filteredCells.map((cell) => {
                  const leader = userMap.get(cell.liderId);
                  const area = areaMap.get(cell.areaId);
                  const rede = redeMap.get(cell.redeId);
                  const statusCfg = cellStatusConfig[cell.status || 'active'];
                  
                  // Enriquecer membros
                  const memberUsers = (cell.membros || []).map(id => userMap.get(id)).filter(Boolean) as UserType[];
                  const naoBatizadosCount = memberUsers.filter(u => !u.churchData?.baptismDate).length;
                  const previewMembers = memberUsers.slice(0, 4);
                  const extraCount = memberUsers.length - previewMembers.length;

                  return (
                    <TableRow key={cell.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="pl-6">
                        <Link href={`/dashboard/gc/cells/${cell.id}`} className="font-bold text-foreground hover:text-primary hover:underline flex items-center gap-1 group">
                          {cell.nome}
                          <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                        {cell.address?.street && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[200px]">{cell.address.street}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-[10px] font-bold border", statusCfg.className)}>
                          {statusCfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7 border">
                            {leader?.photoURL && <img src={leader.photoURL} alt={leader.name} className="h-full w-full object-cover rounded-full" />}
                            <AvatarFallback className="text-[10px] font-bold">{leader?.name?.charAt(0) || 'L'}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{leader?.name || 'Não definido'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">{area?.nome || '—'}</p>
                        <p className="text-[10px] text-muted-foreground">{rede?.nome || '—'}</p>
                      </TableCell>
                      <TableCell>
                        {cell.meetingDay ? (
                          <div>
                            <p className="text-sm">{cell.meetingDay}</p>
                            <p className="text-[10px] text-muted-foreground">{cell.meetingTime || ''}</p>
                          </div>
                        ) : <span className="text-muted-foreground text-sm">—</span>}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center">
                          {previewMembers.length > 0 ? (
                            <div className="flex -space-x-2">
                              {previewMembers.map(u => (
                                <Avatar key={u.id} className="h-7 w-7 border-2 border-background">
                                  {u.photoURL && <img src={u.photoURL} className="h-full w-full object-cover rounded-full" />}
                                  <AvatarFallback className="text-[9px] font-bold bg-muted">{u.name?.charAt(0)}</AvatarFallback>
                                </Avatar>
                              ))}
                              {extraCount > 0 && (
                                <div className="h-7 w-7 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[9px] font-bold text-muted-foreground">
                                  +{extraCount}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">0</span>
                          )}
                        </div>
                        <p className="text-[9px] text-muted-foreground mt-1">{memberUsers.length} total</p>
                      </TableCell>
                      <TableCell className="text-center">
                        {memberUsers.length > 0 ? (
                          <div>
                            <p className={cn("font-bold text-sm", naoBatizadosCount > 0 ? "text-amber-600" : "text-emerald-600")}>{naoBatizadosCount}</p>
                            <p className="text-[9px] text-muted-foreground">de {memberUsers.length}</p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingCell(cell); setDialogOpen(true); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeletingCell(cell)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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

    {users && supervisors && areas && redes && (
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

    <AlertDialog open={!!deletingCell} onOpenChange={open => { if (!open) setDeletingCell(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir célula?</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir a célula <strong>&ldquo;{deletingCell?.nome}&rdquo;</strong>?
            Esta ação não pode ser desfeita. Os membros não serão excluídos.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeleteCell}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}