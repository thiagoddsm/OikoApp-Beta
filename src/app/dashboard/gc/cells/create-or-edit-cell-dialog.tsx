'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc, deleteDoc, writeBatch } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, PlusCircle, Trash2, UploadCloud, Users, UserCheck, Droplets } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { GooglePlacesAutocomplete } from '@/components/common/google-places-autocomplete';
import { PersonSearchInput } from '@/components/common/person-search-input';
import { cn } from '@/lib/utils';

type UserType = {
  id: string;
  name: string;
  avatar?: string;
  photoURL?: string;
  hierarchy?: { role?: string; };
  churchData?: { baptismDate?: any; };
  batizado?: string;
  dataBatismo?: string;
};

export type CoLider = { id: string; casalId?: string };

export type Cell = {
  id: string;
  nome: string; imageUrl?: string; coverImage?: string; bio?: string; description?: string;
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
  multiplicationDate?: string;
  liderEAnfitriao?: boolean;
  targetAudience?: string;
  tags?: string[];
};

interface CreateOrEditCellDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: any[];
  supervisors: any[];
  areas: any[];
  redes: any[];
  existingCell: Cell | null;
  isSupervisor: boolean;
}

export function CreateOrEditCellDialog({ open, onOpenChange, users, supervisors, areas, redes, existingCell, isSupervisor }: CreateOrEditCellDialogProps) {
  const { firestore, storage } = useFirebase();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [nome, setNome] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [bio, setBio] = useState('');
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
  const [multiplicationDate, setMultiplicationDate] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [status, setStatus] = useState<'active' | 'inactive' | 'growing'>('active');
  const [memberSearch, setMemberSearch] = useState('');
  const [anfitriaoElegiveiIds, setAnfitriaoElegiveiIds] = useState<string[]>([]);
  const [addingSpouseFor, setAddingSpouseFor] = useState<number | null>(null);
  const [addingHostSpouse, setAddingHostSpouse] = useState(false);
  const [liderEAnfitriao, setLiderEAnfitriao] = useState(false);
  const [targetAudience, setTargetAudience] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: 'destructive', title: 'Arquivo muito grande', description: 'A imagem deve ter no mximo 5MB.' });
      return;
    }

    try {
      setIsUploadingImage(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `gc-covers/gc_${Date.now()}.${fileExt}`;
      const fileRef = ref(storage, fileName);
      
      await uploadBytes(fileRef, file);
      const downloadUrl = await getDownloadURL(fileRef);
      
      setImageUrl(downloadUrl);
      toast({ title: 'Sucesso', description: 'Foto de capa atualizada com sucesso!' });
    } catch (err: any) {
      console.error("Upload error:", err);
      toast({ variant: 'destructive', title: 'Erro no upload', description: 'No foi possvel enviar a imagem.' });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const availableAreas = useMemo(() => {
    if (!redeId || !areas) return [];
    return areas.filter((a: any) => a.redeId === redeId);
  }, [redeId, areas]);

  const areaMap = useMemo(() => new Map(areas?.map((a: any) => [a.id, a]) || []), [areas]);

  useEffect(() => {
    if (existingCell) {
      setNome(existingCell.nome || '');
      setImageUrl(existingCell.imageUrl || existingCell.coverImage || '');
      setBio(existingCell.bio || existingCell.description || '');
      setLiderId(existingCell.liderId || '');
      setLiderCasalId(existingCell.liderCasalId || '');
      setCoLideres(existingCell.coLideres || (existingCell.coLiderIds || []).map((id: any) => ({ id })));
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
      setMultiplicationDate(existingCell.multiplicationDate || '');
      const computedMembers = Array.from(new Set([
        ...(existingCell.membros || []),
        ...(users || []).filter((u: any) => u.hierarchy?.celulaId === existingCell.id).map((u: any) => u.id)
      ]));
      setSelectedMembers(computedMembers);
      setStatus(existingCell.status || 'active');
      setAnfitriaoElegiveiIds(existingCell.anfitriaoElegiveiIds || []);
      setLiderEAnfitriao(existingCell.liderEAnfitriao === true || (!!existingCell.anfitriaoId && existingCell.anfitriaoId === existingCell.liderId));
      setTargetAudience(existingCell.targetAudience || '');
      setTags(existingCell.tags || []);
    } else {
      setNome(''); setImageUrl(''); setBio(''); setLiderId(''); setLiderCasalId(''); setCoLideres([]); setAnfitriaoId('');
      setAnfitriãoCasalId(''); setSecretariaId(''); setAreaId(''); setRedeId('');
      setStreet(''); setLat(undefined); setLng(undefined);
      setMeetingDay(''); setMeetingTime(''); setMultiplicationDate(''); setSelectedMembers([]);
      setStatus('active'); setAnfitriaoElegiveiIds([]); setLiderEAnfitriao(false);
      setTargetAudience(''); setTags([]);
    }
    setMemberSearch(''); setAddingSpouseFor(null); setAddingHostSpouse(false);
  }, [existingCell, open]);
  
  useEffect(() => {
    if (areaId && !availableAreas.find((a: any) => a.id === areaId)) setAreaId('');
  }, [redeId, availableAreas, areaId]);

  const handleAddressSelect = (place: any) => {
    if (place) {
      setStreet(place.formatted_address || '');
      if (place.geometry?.location) {
        setLat(place.geometry.location.lat());
        setLng(place.geometry.location.lng());
      }
    }
  };

  const handleSave = async () => {
    const selectedArea = areaMap.get(areaId) as any;
    const supervisorId = selectedArea?.liderId;
    if (!nome || !liderId || !areaId || !redeId || !supervisorId) {
      toast({ variant: "destructive", title: "Campos obrigatórios", description: "Preencha todos os campos incluindo Rede e Área." });
      return;
    }
    setIsSaving(true);
    // Deriva coLiderIds flat (todos os IDs de co-líderes, incluindo cônjuges)
    const flatCoLiderIds = [...new Set(coLideres.flatMap(c => [c.id, c.casalId].filter(Boolean) as string[]))]
      .filter(id => id && id !== '__adding' && id !== '__none');
    
    // Se líder é anfitrião, usa liderId; senão usa o campo manual
    const resolvedAnfitriaoId = liderEAnfitriao ? liderId : (anfitriaoId === '__adding' ? '' : anfitriaoId);
    const resolvedAnfitriãoCasalId = liderEAnfitriao ? liderCasalId : (anfitriãoCasalId === '__adding' ? '' : anfitriãoCasalId);
    
    // Membros finais: líder + casal líder + co-líderes + anfitrião + casal anfitrião + secretaria + selecionados
    const finalMembers = [...new Set([
      liderId, liderCasalId,
      ...flatCoLiderIds,
      resolvedAnfitriaoId, resolvedAnfitriãoCasalId,
      secretariaId,
      ...selectedMembers,
      ...anfitriaoElegiveiIds,
    ].filter(Boolean) as string[])].filter(id => id && id !== '__adding' && id !== '__none');

    const cellData = {
      nome, liderId, liderCasalId: liderCasalId || null,
      coLideres: coLideres.map(c => ({
        id: c.id,
        ...(c.casalId && c.casalId !== '__adding' ? { casalId: c.casalId } : {})
      })),
      coLiderIds: flatCoLiderIds,
      anfitriaoId: resolvedAnfitriaoId || null,
      anfitriãoCasalId: resolvedAnfitriãoCasalId || null,
      liderEAnfitriao,
      secretariaId: (secretariaId && secretariaId !== '__adding') ? secretariaId : null,
      supervisorId, areaId, redeId,
      status,
      address: { street, lat, lng },
      anfitriaoElegiveiIds: anfitriaoElegiveiIds.filter(id => id && id !== '__adding'),
      membros: finalMembers,
      targetAudience,
      tags,
      meetingDay: meetingDay || null,
      meetingTime: meetingTime || null,
      multiplicationDate: multiplicationDate || null,
    };
    try {
      const validUserIds = new Set((users || []).map((u: any) => u.id));

      if (existingCell) {
        updateDocumentNonBlocking(doc(firestore, 'cells', existingCell.id), cellData);

        const currentMembers = (users || []).filter((u: any) => u.hierarchy?.celulaId === existingCell.id).map((u: any) => u.id);
        const removedMembers = currentMembers.filter((uid: string) => !finalMembers.includes(uid));
        const newMembers = finalMembers.filter(uid => !currentMembers.includes(uid));

        if (newMembers.length > 0 || removedMembers.length > 0) {
          const batch = writeBatch(firestore);
          newMembers.forEach(uid => {
            if (validUserIds.has(uid)) {
              batch.set(doc(firestore, 'users', uid), { hierarchy: { celulaId: existingCell.id } }, { merge: true });
            }
          });
          removedMembers.forEach(uid => {
            if (validUserIds.has(uid)) {
              batch.set(doc(firestore, 'users', uid), { hierarchy: { celulaId: null } }, { merge: true });
            }
          });
          await batch.commit();
        }

        toast({ title: "Sucesso!", description: `A célula "${nome}" foi atualizada.` });
      } else {
        const docRef = await addDocumentNonBlocking(collection(firestore, 'cells'), cellData);
        
        if (docRef && finalMembers.length > 0) {
          const batch = writeBatch(firestore);
          finalMembers.forEach(uid => {
            if (validUserIds.has(uid)) {
              batch.set(doc(firestore, 'users', uid), { hierarchy: { celulaId: docRef.id } }, { merge: true });
            }
          });
          await batch.commit();
        }

        toast({ title: "Sucesso!", description: `A célula "${nome}" foi criada.` });
      }
      onOpenChange(false);
    } catch (err: any) {
      console.error('[CreateOrEditCellDialog] Erro ao salvar célula:', err);
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: err?.message || "Ocorreu um erro ao salvar as alterações da célula."
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
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

          
          {/* FOTO E BIO */}
          <div className="grid grid-cols-4 items-start gap-4">
            <Label className="text-right mt-3">Foto de Capa</Label>
            <div className="col-span-3 space-y-2">
              <div className="flex items-center gap-2">
                <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="Ex: https://... ou /uploads/foto.jpg" className="flex-1" />
                <div className="relative">
                  <Input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageUpload} 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                    disabled={isUploadingImage}
                  />
                  <Button type="button" variant="outline" disabled={isUploadingImage} className="w-full flex items-center gap-2">
                    {isUploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                    Upload
                  </Button>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                A foto ser exibida no carto da clula. <strong>Formato ideal: Paisagem (16:9). Tamanho mximo: 5MB.</strong>
              </p>
            </div>
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label className="text-right mt-3">Descrição / Bio</Label>
            <Textarea value={bio} onChange={e => setBio(e.target.value)} className="col-span-3" placeholder="Breve descrição da célula..." />
          </div>

          {/* PÚBLICO E TAGS */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Público-alvo</Label>
            <Select value={targetAudience} onValueChange={setTargetAudience}>
              <SelectTrigger className="col-span-3"><SelectValue placeholder="Selecione o público" /></SelectTrigger>
              <SelectContent>
                {['Kids', 'Adolescentes', 'Jovens', 'Mulheres', 'Bem vividos', 'Geral'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Tags</Label>
            <Input 
              value={tags.join(', ')} 
              onChange={e => setTags(e.target.value.split(',').map(t => t.trim()).filter(Boolean))} 
              className="col-span-3" 
              placeholder="Ex: Casais, Universitários (separados por vírgula)"
            />
          </div>

          {/* REDE + ÁREA */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Rede</Label>
            <Select value={redeId} onValueChange={setRedeId} disabled={!isSupervisor}>
              <SelectTrigger className="col-span-3"><SelectValue placeholder="Selecione a Rede" /></SelectTrigger>
              <SelectContent>{redes.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Área</Label>
            <Select value={areaId} onValueChange={setAreaId} disabled={!isSupervisor || !redeId || availableAreas.length === 0}>
              <SelectTrigger className="col-span-3"><SelectValue placeholder={!redeId ? "Selecione uma rede primeiro" : "Selecione a Área"} /></SelectTrigger>
              <SelectContent>{availableAreas.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}</SelectContent>
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

          {/* LÍDERES EM TREINAMENTO com suporte a casal */}
          <div className="grid grid-cols-4 items-start gap-4">
            <div className="text-right pt-2">
              <Label>Líderes em Treinamento</Label>
              {coLideres.length > 0 && <p className="text-[10px] text-muted-foreground mt-0.5">{coLideres.length} unidade(s)</p>}
            </div>
            <div className="col-span-3 space-y-2">
              {coLideres.map((cl, idx) => {
                const clUser = users.find((u: any) => u.id === cl.id);
                const spouseUser = cl.casalId ? users.find((u: any) => u.id === cl.casalId) : null;
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
                          placeholder="Buscar cônjuge do líder em treinamento..." optional
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
                placeholder="Adicionar líder em treinamento..." optional
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
                    {users.find((u: any) => u.id === liderId)?.name || '—'}
                    {liderCasalId && ` & ${users.find((u: any) => u.id === liderCasalId)?.name || ''}`}
                  </span>
                )}
              </div>

              {/* Campo manual — só exibe se não for líder */}
              {!liderEAnfitriao && (
                <>
                  <PersonSearchInput 
                    value={anfitriaoId} 
                    onChange={id => { 
                      setAnfitriaoId(id); 
                      if (!id) {
                        setAnfitriãoCasalId(''); 
                        setAddingHostSpouse(false);
                      }
                    }} 
                    users={users} 
                    excludeIds={[liderId, liderCasalId].filter(Boolean)} 
                    placeholder="Buscar anfitrião..." 
                    optional 
                  />
                  {anfitriaoId && !anfitriãoCasalId && !addingHostSpouse && (
                    <button 
                      type="button" 
                      onClick={() => setAddingHostSpouse(true)} 
                      className="text-xs text-primary font-semibold hover:underline"
                    >
                      + É casal? Adicionar cônjuge
                    </button>
                  )}
                  {(addingHostSpouse || anfitriãoCasalId) && anfitriaoId && (
                    <div className="space-y-1">
                      <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wide">Cônjuge do Anfitrião</p>
                      <PersonSearchInput
                        value={anfitriãoCasalId}
                        onChange={id => {
                          setAnfitriãoCasalId(id || '');
                          if (!id) setAddingHostSpouse(false);
                        }}
                        users={users} 
                        excludeIds={[anfitriaoId, liderId, liderCasalId].filter(Boolean)} 
                        placeholder="Buscar cônjuge..." 
                        optional
                      />
                      {anfitriãoCasalId && (
                        <button 
                          type="button" 
                          onClick={() => {
                            setAnfitriãoCasalId('');
                            setAddingHostSpouse(false);
                          }} 
                          className="text-[11px] text-destructive hover:underline"
                        >
                          Remover cônjuge
                        </button>
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

          {/* MEMBROS — busca com lista de selecionados */}
          <div className="grid grid-cols-4 items-start gap-4">
            <Label className="text-right pt-2">Membros</Label>
            <div className="col-span-3 space-y-2">
              <Input 
                placeholder="Buscar membro por nome..." 
                value={memberSearch} 
                onChange={e => setMemberSearch(e.target.value)} 
              />
              
              {/* Resultados da busca filtrados */}
              {memberSearch.trim() && (
                <ScrollArea className="h-44 w-full rounded-md border p-2 bg-slate-50/50">
                  <div className="space-y-1">
                    {(() => {
                      const term = memberSearch.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                      const filtered = (users || []).filter((u: any) => {
                        if (!u?.name || u.id === liderId || u.id === liderCasalId) return false;
                        const uName = u.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                        return uName.includes(term);
                      }).slice(0, 15);

                      if (filtered.length === 0) {
                        return <p className="text-xs text-muted-foreground text-center py-3">Nenhum membro encontrado com esse nome.</p>;
                      }

                      return filtered.map((user: any) => {
                        const isChecked = selectedMembers.includes(user.id);
                        return (
                          <div 
                            key={user.id} 
                            onClick={() => setSelectedMembers(prev => {
                              const currentSet = new Set(prev);
                              if (currentSet.has(user.id)) {
                                currentSet.delete(user.id);
                              } else {
                                currentSet.add(user.id);
                              }
                              return Array.from(currentSet);
                            })}
                            className="flex items-center gap-2 py-1 px-2 rounded-md hover:bg-muted cursor-pointer transition-colors"
                          >
                            <Checkbox 
                              id={`member-${user.id}`} 
                              checked={isChecked}
                              onCheckedChange={checked => setSelectedMembers(prev => {
                                const currentSet = new Set(prev);
                                if (checked) {
                                  currentSet.add(user.id);
                                } else {
                                  currentSet.delete(user.id);
                                }
                                return Array.from(currentSet);
                              })} 
                            />
                            <Label htmlFor={`member-${user.id}`} className="font-normal cursor-pointer text-sm flex-1">{user.name}</Label>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </ScrollArea>
              )}

              {/* Lista dos membros atualmente selecionados no GC */}
              {(() => {
                const uniqueSelected = Array.from(new Set(selectedMembers));
                const additionalSelected = uniqueSelected.filter(id => id && id !== liderId && id !== liderCasalId);
                return (
                  <div className="space-y-1.5 pt-1">
                    <p className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
                      <span>{additionalSelected.length} membro(s) adicional(is)</span>
                      {additionalSelected.length > 0 && (
                        <button 
                          type="button" 
                          onClick={() => setSelectedMembers([])} 
                          className="text-destructive hover:underline text-[10px]"
                        >
                          Limpar adicionais
                        </button>
                      )}
                    </p>
                    {additionalSelected.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1.5 rounded-lg border bg-muted/20">
                        {additionalSelected.map((id, idx) => {
                          const u = (users || []).find((x: any) => x.id === id);
                          return (
                            <div key={`${id}-${idx}`} className="flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 rounded-full px-2.5 py-0.5 text-xs font-medium">
                              <span>{u?.name || id}</span>
                              <button 
                                type="button" 
                                onClick={() => setSelectedMembers(prev => prev.filter(x => x !== id))}
                                className="hover:text-destructive text-xs ml-0.5"
                                title="Remover"
                              >
                                ✕
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
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
                    const u = users.find((x: any) => x.id === id);
                    return u ? (
                      <div key={id} className="flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full px-2 py-0.5 text-[11px] font-semibold">
                        {u.name}
                        <button type="button" onClick={() => setAnfitriaoElegiveiIds(prev => prev.filter((x: any) => x !== id))} className="hover:text-destructive ml-0.5">✕</button>
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
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right text-xs">Multiplicação</Label>
            <Input type="date" value={multiplicationDate} onChange={e => setMultiplicationDate(e.target.value)} className="col-span-3"/>
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
