'use client';

import React, { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirebase, useCollection, useMemoFirebase, updateDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, where, doc, orderBy, limit } from 'firebase/firestore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import {
  Loader2, ArrowLeft, Users, UserPlus, Info, Droplets, Pencil,
  Trash2, UserCheck, MapPin, Calendar, Clock, Network, AreaChart, Phone,
  History, AlertTriangle as AlertRed, HandHeart
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CreateOrEditCellDialog } from '../page';

type UserType = {
  id: string; name: string; photoURL?: string;
  contacts?: { cellPhone?: string; phone?: string };
  churchData?: { baptismDate?: any; membershipRoll?: string };
  hierarchy?: { role?: string; celulaId?: string };
  status?: string;
  batizado?: string;
  dataBatismo?: string;
};
type Cell = {
  id: string; nome: string; liderId: string; supervisorId?: string;
  coLiderIds?: string[]; anfitriaoId?: string;
  areaId: string; redeId: string; membros: string[];
  meetingDay?: string; meetingTime?: string; status?: string;
  address?: { street?: string };
  cellRoles?: Record<string, string>;
  visitors?: Visitor[];
  multiplicationDate?: string;
};
type Area = { id: string; nome: string; liderId: string; redeId: string };
type Rede = { id: string; nome: string };
type Visitor = {
  id: string; name: string; phone?: string;
  firstVisitDate?: string; origin?: string; consolidationStatus?: string;
};

const ROLES: Record<string, { label: string; color: string }> = {
  leader:   { label: 'Líder',               color: 'bg-indigo-100 text-indigo-800' },
  co_leader:{ label: 'Líder em Treinamento', color: 'bg-purple-100 text-purple-800' },
  member:   { label: 'Membro',              color: 'bg-slate-100 text-slate-700' },
};

const CONSOLIDATION: Record<string, string> = {
  new:       'Novo',
  contacted: 'Contatado',
  integrated:'Integrado',
};

export default function CellDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { firestore } = useFirebase();
  const cellId = params?.cellId as string;

  const { data: cell, isLoading: isLoadingCell } = useDoc<Cell>(`cells/${cellId}`);

  const usersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'users')) : null, [firestore]);
  const areasQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'areas')) : null, [firestore]);
  const redesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'redes')) : null, [firestore]);
  const presencasQuery = useMemoFirebase(() =>
    firestore && cellId
      ? query(collection(firestore, 'presencas_historico'), where('cellId', '==', cellId), orderBy('date', 'desc'), limit(200))
      : null,
    [firestore, cellId]
  );

  const { data: allUsers } = useCollection<UserType>(usersQuery);
  const { data: areas } = useCollection<Area>(areasQuery);
  const { data: redes } = useCollection<Rede>(redesQuery);
  const { data: presencas } = useCollection<any>(presencasQuery);

  const userMap = useMemo(() => new Map(allUsers?.map(u => [u.id, u]) || []), [allUsers]);
  const area = useMemo(() => areas?.find(a => a.id === cell?.areaId), [areas, cell]);
  const rede = useMemo(() => redes?.find(r => r.id === cell?.redeId), [redes, cell]);

  // Agrupa presenças por membro e calcula alertas
  const presencasPorMembro = useMemo(() => {
    if (!presencas) return {};
    const map: Record<string, any[]> = {};
    presencas.forEach((p: any) => {
      if (!map[p.membroId]) map[p.membroId] = [];
      map[p.membroId].push(p);
    });
    return map;
  }, [presencas]);

  const luzVermelha = useMemo(() => {
    const alerts = new Set<string>();
    Object.entries(presencasPorMembro).forEach(([membroId, registros]) => {
      const sorted = [...registros].sort((a, b) => b.date.localeCompare(a.date));
      const last2 = sorted.slice(0, 2);
      if (last2.length === 2 && last2.every(r => r.status === 'ausente_sem_justificativa')) {
        alerts.add(membroId);
      }
    });
    return alerts;
  }, [presencasPorMembro]);

  // Datas únicas (últimas 8 reuniões)
  const uniqueDates = useMemo(() => {
    if (!presencas) return [];
    const dates = [...new Set(presencas.map((p: any) => p.date as string))]
      .sort((a, b) => b.localeCompare(a))
      .slice(0, 8)
      .reverse();
    return dates;
  }, [presencas]);

  // Identifica membros da célula baseado exclusivamente na tabela de usuários.
  // (A lógica de ponte / dual read foi removida)
  const computedMembroIds = useMemo(() => {
    const rawIds = (allUsers || []).filter((u: any) => u.hierarchy?.celulaId === cellId).map(u => u.id);
    return Array.from(new Set(rawIds));
  }, [allUsers, cellId]);

  const members = useMemo(() => {
    const uniqueIds = Array.from(new Set(computedMembroIds));
    return uniqueIds.map(id => userMap.get(id)).filter(Boolean) as UserType[];
  }, [computedMembroIds, userMap]);

  const nonMembers = useMemo(() =>
    (allUsers || []).filter(u => !computedMembroIds.includes(u.id)),
    [allUsers, computedMembroIds]);

  // --- Visitor state ---
  const [isAddVisitorOpen, setAddVisitorOpen] = useState(false);
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [visitorOrigin, setVisitorOrigin] = useState('');

  // --- Add member state ---
  const [isAddMemberOpen, setAddMemberOpen] = useState(false);
  const [isEditCellOpen, setIsEditCellOpen] = useState(false);
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  const filteredNonMembers = useMemo(() => {
    const term = memberSearchTerm.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (!term) return nonMembers.slice(0, 8);
    return nonMembers.filter(u => {
      const uName = (u.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return uName.includes(term);
    }).slice(0, 15);
  }, [nonMembers, memberSearchTerm]);

  const updateCell = (data: Partial<Cell>) => {
    if (!firestore || !cellId) return;
    updateDocumentNonBlocking(doc(firestore, 'cells', cellId), data);
  };

  const handleAddMember = async (userId: string) => {
    if (!firestore || !cellId) return;
    
    await updateDocumentNonBlocking(doc(firestore, 'users', userId), {
      'hierarchy.celulaId': cellId
    });
    setAddMemberOpen(false);
    setMemberSearchTerm('');
    toast({ title: 'Membro adicionado!' });
  };

  const handleRemoveMember = async (userId: string) => {
    if (userId === cell?.liderId) { toast({ variant: 'destructive', title: 'Não é possível remover o líder.' }); return; }
    if (!firestore) return;
    
    await updateDocumentNonBlocking(doc(firestore, 'users', userId), {
      'hierarchy.celulaId': null
    });
    toast({ title: 'Membro removido.' });
  };

  const handleRoleChange = (userId: string, role: string) => {
    const newRoles = { ...(cell?.cellRoles || {}), [userId]: role };
    updateCell({ cellRoles: newRoles });
  };

  const handleAddVisitor = () => {
    if (!visitorName.trim()) return;
    const newVisitor: Visitor = {
      id: `v_${Date.now()}`, name: visitorName.trim(),
      phone: visitorPhone.trim(), origin: visitorOrigin.trim(),
      firstVisitDate: new Date().toISOString(), consolidationStatus: 'new',
    };
    updateCell({ visitors: [...(cell?.visitors || []), newVisitor] });
    setVisitorName(''); setVisitorPhone(''); setVisitorOrigin('');
    setAddVisitorOpen(false);
    toast({ title: 'Visitante registrado!' });
  };

  const handlePromoteVisitor = (visitor: Visitor) => {
    const match = allUsers?.find(u => u.name?.toLowerCase() === visitor.name.toLowerCase());
    if (match) {
      handleAddMember(match.id);
      handleRemoveVisitor(visitor.id);
    } else {
      toast({ variant: 'destructive', title: 'Usuário não encontrado', description: `Cadastre "${visitor.name}" no sistema primeiro.` });
    }
  };

  const handleRemoveVisitor = (visitorId: string) => {
    updateCell({ visitors: (cell?.visitors || []).filter(v => v.id !== visitorId) });
  };

  const handleVisitorConsolidation = (visitorId: string, status: string) => {
    updateCell({ visitors: (cell?.visitors || []).map(v => v.id === visitorId ? { ...v, consolidationStatus: status } : v) });
  };

  if (isLoadingCell) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  if (!cell) return (
    <div className="text-center py-16 text-muted-foreground">
      <p>Célula não encontrada.</p>
      <Button variant="link" onClick={() => router.back()}>Voltar</Button>
    </div>
  );

  const baptizedCount = members.filter(u => u.batizado === 'sim' || u.dataBatismo || u.churchData?.baptismDate).length;
  const leader = userMap.get(cell.liderId);
  const coLeaders = (cell.coLiderIds || []).map(id => userMap.get(id)).filter(Boolean) as UserType[];
  const anfitriao = cell.anfitriaoId ? userMap.get(cell.anfitriaoId) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-black tracking-tight">{cell.nome}</h1>
          <p className="text-sm text-muted-foreground">
            {rede?.nome} {area && `› ${area.nome}`}
          </p>
        </div>
        <div className="flex gap-3 text-center">
          <div className="px-4 py-2 bg-muted rounded-xl">
            <p className="text-[10px] font-black uppercase text-muted-foreground">Membros</p>
            <p className="text-xl font-black">{members.length}</p>
          </div>
          <div className="px-4 py-2 bg-sky-50 rounded-xl border border-sky-100">
            <p className="text-[10px] font-black uppercase text-sky-500 flex items-center gap-1 justify-center"><Droplets className="h-3 w-3"/>Batizados</p>
            <p className="text-xl font-black text-sky-700">{baptizedCount}</p>
          </div>
          {coLeaders.length > 0 && (
            <div className="px-4 py-2 bg-purple-50 rounded-xl border border-purple-100">
              <p className="text-[10px] font-black uppercase text-purple-500">Líderes em Treinamento</p>
              <p className="text-xl font-black text-purple-700">{coLeaders.length}</p>
            </div>
          )}
          <div className="px-4 py-2 bg-amber-50 rounded-xl border border-amber-100">
            <p className="text-[10px] font-black uppercase text-amber-500">Visitantes</p>
            <p className="text-xl font-black text-amber-700">{(cell.visitors || []).length}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="members">
        <TabsList className="border-b rounded-none w-full justify-start h-auto p-0 bg-transparent gap-0">
          {[
            { value: 'members',  label: 'Membros',   icon: Users },
            { value: 'visitors', label: 'Visitantes', icon: UserPlus },
            { value: 'historico', label: 'Histórico', icon: History },
            { value: 'about',    label: 'Sobre / Config', icon: Info },
          ].map(({ value, label, icon: Icon }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3 font-bold text-muted-foreground data-[state=active]:text-foreground"
            >
              <Icon className="mr-2 h-4 w-4" />{label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ===== MEMBROS ===== */}
        <TabsContent value="members" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-black">Membros da Célula</CardTitle>
                <CardDescription>Gerencie papéis e acompanhe o status espiritual de cada participante.</CardDescription>
              </div>
              <Button size="sm" onClick={() => setAddMemberOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />Adicionar
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {members.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-10 italic">Nenhum membro cadastrado.</p>
                )}
                {members.map((user, idx) => {
                  const isBaptized = user.batizado === 'sim' || !!user.dataBatismo || !!user.churchData?.baptismDate;
                  const isLeader = user.id === cell.liderId;
                  const role = isLeader ? 'leader' : (cell.cellRoles?.[user.id] || 'member');
                  const roleCfg = ROLES[role] || ROLES.member;

                  return (
                    <div key={`${user.id}_${idx}`} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/30 transition-colors">
                      <div className="relative">
                        <Avatar className="h-10 w-10 border-2 border-background shadow">
                          {user.photoURL && <img src={user.photoURL} className="h-full w-full object-cover rounded-full" />}
                          <AvatarFallback className="font-bold text-sm bg-muted">{user.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        {!!user.churchData?.baptismDate && (
                          <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-sky-500 border-2 border-background flex items-center justify-center" title="Batizado">
                            <Droplets className="h-2 w-2 text-white" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{user.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {user.contacts?.cellPhone || user.contacts?.phone || '—'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {(cell.coLiderIds || []).includes(user.id) && (
                          <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200 font-bold">Líder em Treinamento</Badge>
                        )}
                        {cell.anfitriaoId === user.id && (
                          <Badge variant="outline" className="text-[10px] bg-orange-50 text-orange-700 border-orange-200 font-bold">Anfitrião</Badge>
                        )}
                        {isBaptized ? (
                          <Badge variant="outline" className="text-[10px] border-sky-200 bg-sky-50 text-sky-700 font-bold">
                            <Droplets className="h-2.5 w-2.5 mr-1" />Batizado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground font-bold">
                            Não batizado
                          </Badge>
                        )}

                        {isLeader ? (
                          <Badge className={cn('text-[10px] font-bold', roleCfg.color, 'border-none')}>
                            {roleCfg.label}
                          </Badge>
                        ) : (
                          <Select value={role} onValueChange={val => handleRoleChange(user.id, val)}>
                            <SelectTrigger className="h-7 text-[11px] w-36 font-bold">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="co_leader">Líder em Treinamento</SelectItem>
                              <SelectItem value="member">Membro</SelectItem>
                            </SelectContent>
                          </Select>
                        )}

                        {!isLeader && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleRemoveMember(user.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== VISITANTES ===== */}
        <TabsContent value="visitors" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-black">Visitantes</CardTitle>
                <CardDescription>Pessoas que visitaram mas ainda não são membros formais.</CardDescription>
              </div>
              <Button size="sm" onClick={() => setAddVisitorOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />Registrar Visitante
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {(cell.visitors || []).length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-10 italic">Nenhum visitante registrado.</p>
                )}
                {(cell.visitors || []).map((visitor, idx) => (
                  <div key={`${visitor.id}_${idx}`} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/30 transition-colors">
                    <Avatar className="h-10 w-10 border-2 border-amber-100 bg-amber-50">
                      <AvatarFallback className="font-bold text-amber-700">{visitor.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm">{visitor.name}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        {visitor.phone && <span className="text-[11px] text-muted-foreground flex items-center gap-1"><Phone className="h-2.5 w-2.5"/>{visitor.phone}</span>}
                        {visitor.firstVisitDate && (
                          <span className="text-[11px] text-muted-foreground">
                            1ª visita: {format(new Date(visitor.firstVisitDate), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        )}
                        {visitor.origin && <span className="text-[11px] text-muted-foreground">Origem: {visitor.origin}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select value={visitor.consolidationStatus || 'new'} onValueChange={val => handleVisitorConsolidation(visitor.id, val)}>
                        <SelectTrigger className="h-7 text-[11px] w-28 font-bold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">Novo</SelectItem>
                          <SelectItem value="contacted">Contatado</SelectItem>
                          <SelectItem value="integrated">Integrado</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="sm" className="h-7 text-[11px] font-bold text-emerald-700 border-emerald-200 hover:bg-emerald-50" onClick={() => handlePromoteVisitor(visitor)}>
                        <UserCheck className="mr-1 h-3 w-3" />Promover
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleRemoveVisitor(visitor.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== HISTÓRICO ===== */}
        <TabsContent value="historico" className="mt-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-black flex items-center gap-2">
                <History className="h-4 w-4" /> Histórico de Presenças
              </CardTitle>
              <CardDescription>
                Últimas 8 reuniões — 🟢 Presente · 🟡 Justificado · 🔴 Faltou · ⬜ Sem registro
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!presencas || presencas.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <History className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Nenhum relatório enviado ainda.</p>
                  <p className="text-xs mt-1">O histórico será preenchido conforme os líderes enviarem relatórios semanais.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Cabeçalho com datas */}
                  <div className="flex items-center gap-2 pl-[200px] pb-1 overflow-x-auto">
                    {uniqueDates.map(d => (
                      <div key={d} className="w-9 flex-shrink-0 text-center text-[10px] text-muted-foreground font-bold">
                        {d.slice(5).replace('-', '/')}
                      </div>
                    ))}
                  </div>
                  {/* Linha por membro */}
                  {members.map(member => {
                    const registros = presencasPorMembro[member.id] || [];
                    const isAlerta = luzVermelha.has(member.id);
                    const pedidosAtivos = registros.filter((r: any) => r.pedidoOracao).slice(0, 1);

                    return (
                      <div key={member.id} className={cn('rounded-xl border p-2 flex items-center gap-2 transition-colors', isAlerta ? 'border-red-300 bg-red-50' : 'bg-card')}>
                        {/* Nome */}
                        <div className="w-[188px] flex-shrink-0 flex items-center gap-2">
                          <Avatar className="h-7 w-7 flex-shrink-0 border">
                            {member.photoURL && <img src={member.photoURL} className="h-full w-full object-cover rounded-full" alt={member.name} />}
                            <AvatarFallback className="text-[10px] font-bold">{member.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-xs font-bold truncate">{member.name}</p>
                            {isAlerta && (
                              <span className="text-[10px] text-red-600 font-bold flex items-center gap-0.5">
                                <AlertRed className="h-3 w-3" /> Luz Vermelha
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Heatmap */}
                        <div className="flex gap-2 overflow-x-auto">
                          {uniqueDates.map(d => {
                            const reg = registros.find((r: any) => r.date === d);
                            const status = reg?.status;
                            return (
                              <div
                                key={d}
                                className={cn(
                                  'w-9 h-9 flex-shrink-0 rounded-lg flex items-center justify-center text-base',
                                  !status ? 'bg-muted' :
                                  status === 'presente' ? 'bg-emerald-100' :
                                  status === 'ausente_justificado' ? 'bg-amber-100' :
                                  'bg-red-100'
                                )}
                                title={status ? `${d}: ${status.replace(/_/g, ' ')}` : `${d}: sem registro`}
                              >
                                {!status ? '·' :
                                 status === 'presente' ? '🟢' :
                                 status === 'ausente_justificado' ? '🟡' : '🔴'}
                              </div>
                            );
                          })}
                        </div>
                        {/* Pedido de oração */}
                        {pedidosAtivos.length > 0 && (
                          <div className="ml-2 flex-shrink-0 max-w-[160px]" title={pedidosAtivos[0].pedidoOracao}>
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <HandHeart className="h-3 w-3 text-primary" />
                              <span className="truncate">{pedidosAtivos[0].pedidoOracao}</span>
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== SOBRE ===== */}
        <TabsContent value="about" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-black flex items-center gap-2"><Info className="h-4 w-4"/>Informações Gerais</CardTitle>
                  <CardDescription className="text-xs">Dados de liderança, endereço e reuniões da célula.</CardDescription>
                </div>
                <Button size="sm" variant="outline" className="h-8 gap-1 font-bold text-xs" onClick={() => setIsEditCellOpen(true)}>
                  <Pencil className="h-3.5 w-3.5" /> Editar Célula
                </Button>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                {[
                  { icon: Network, label: 'Rede', value: rede?.nome },
                  { icon: AreaChart, label: 'Área', value: area?.nome },
                  { icon: Users, label: 'Supervisor da Área', value: userMap.get(area?.liderId || '')?.name },
                  { icon: Users, label: 'Anfitrião', value: anfitriao?.name || '—' },
                  { icon: MapPin, label: 'Endereço', value: cell.address?.street },
                  { icon: Calendar, label: 'Dia da Reunião', value: cell.meetingDay },
                  { icon: Clock, label: 'Horário', value: cell.meetingTime },
                  { icon: Calendar, label: 'Futura Multiplicação', value: cell.multiplicationDate ? format(new Date(cell.multiplicationDate + 'T00:00:00'), 'dd/MM/yyyy') : 'Não definida' },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-start gap-3">
                    <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] font-black uppercase text-muted-foreground">{label}</p>
                      <p className="font-medium">{value || '—'}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-black flex items-center gap-2"><Droplets className="h-4 w-4 text-sky-500"/>Resumo Espiritual</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-sky-50 rounded-xl p-4 border border-sky-100">
                    <p className="text-[10px] font-black uppercase text-sky-600">Batizados</p>
                    <p className="text-3xl font-black text-sky-800">{baptizedCount}</p>
                    <p className="text-[10px] text-sky-600">{members.length > 0 ? Math.round((baptizedCount / members.length) * 100) : 0}% do total</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <p className="text-[10px] font-black uppercase text-slate-500">Não batizados</p>
                    <p className="text-3xl font-black text-slate-700">{members.length - baptizedCount}</p>
                    <p className="text-[10px] text-slate-500">potencial de crescimento</p>
                  </div>
                </div>
                <div className="h-2 bg-sky-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-sky-500 rounded-full transition-all"
                    style={{ width: members.length > 0 ? `${(baptizedCount / members.length) * 100}%` : '0%' }}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  {baptizedCount} de {members.length} membros batizados
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal de Edição da Célula */}
      {allUsers && areas && redes && cell && (
        <CreateOrEditCellDialog
          open={isEditCellOpen}
          onOpenChange={setIsEditCellOpen}
          users={allUsers}
          supervisors={allUsers.filter(u => u.hierarchy?.role === 'supervisor' || u.hierarchy?.role === 'admin')}
          areas={areas}
          redes={redes}
          existingCell={cell as any}
          isSupervisor={true}
        />
      )}

      {/* Dialog — Adicionar Membro */}
      <Dialog open={isAddMemberOpen} onOpenChange={setAddMemberOpen}>
        <DialogContent className="sm:max-w-sm max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adicionar Membro</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Buscar por nome..."
            value={memberSearchTerm}
            onChange={e => setMemberSearchTerm(e.target.value)}
            className="mb-2"
          />
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {filteredNonMembers.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4 italic">Nenhum usuário encontrado.</p>
            )}
            {filteredNonMembers.map(u => (
              <button
                key={u.id}
                type="button"
                onClick={() => handleAddMember(u.id)}
                className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-primary/10 flex items-center gap-3 transition-colors"
              >
                <Avatar className="h-8 w-8 border">
                  {u.photoURL && <img src={u.photoURL} className="h-full w-full object-cover rounded-full" />}
                  <AvatarFallback className="text-xs font-bold">{u.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="font-medium text-sm">{u.name}</span>
                {(u.batizado === 'sim' || u.dataBatismo || u.churchData?.baptismDate) && <Droplets className="h-3.5 w-3.5 text-sky-500 ml-auto" />}
              </button>
            ))}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="secondary" size="sm">Cancelar</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog — Adicionar Visitante */}
      <Dialog open={isAddVisitorOpen} onOpenChange={setAddVisitorOpen}>
        <DialogContent className="sm:max-w-sm max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Visitante</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input placeholder="Nome completo" value={visitorName} onChange={e => setVisitorName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input placeholder="(21) 99999-9999" value={visitorPhone} onChange={e => setVisitorPhone(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Como conheceu a célula?</Label>
              <Input placeholder="Ex: Convite de amigo, redes sociais..." value={visitorOrigin} onChange={e => setVisitorOrigin(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="secondary">Cancelar</Button></DialogClose>
            <Button onClick={handleAddVisitor} disabled={!visitorName.trim()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
