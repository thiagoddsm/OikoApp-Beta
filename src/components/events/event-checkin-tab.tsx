'use client';

import React, { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { collection, query, where, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, Search, CheckCircle2, Ticket, Package, Shirt, UserPlus, ListOrdered, Check, ShieldCheck, HeartHandshake } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface EventCheckInTabProps {
  eventId: string;
}

type Registration = {
  id: string;
  ticketName?: string;
  customAnswers?: Record<string, string>;
  userMetadata: {
    name: string;
    email: string;
    phone: string;
  };
  payment: {
    status: 'pending' | 'approved';
  };
  attendance?: {
    checkedIn?: boolean; // Legacy
    domManha?: boolean;
    domTarde?: boolean;
    terca?: boolean;
    quinta?: boolean;
    kitRetirado?: boolean;
    camisaRetirada?: boolean;
    isVisitor?: boolean;
    checkedInAt?: any;
    checkedInBy?: string;
  };
};

function normalizeText(text: string): string {
  if (!text) return '';
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function inferIsMember(reg: Registration): boolean {
  if (reg.attendance?.isVisitor === false) return true;
  if (reg.attendance?.isVisitor === true) return false;
  if (!reg.customAnswers) return false;
  for (const [key, val] of Object.entries(reg.customAnswers)) {
    const k = normalizeText(key);
    const v = normalizeText(val);
    if (k.includes('membro') && (v === 'sim' || v.includes('sou'))) return true;
    if (k.includes('igreja') && (v.includes('manha') || v.includes('ibm'))) return true;
  }
  return false;
}

function inferIsInGC(reg: Registration): boolean {
  if (!reg.customAnswers) return false;
  for (const [key, val] of Object.entries(reg.customAnswers)) {
    const k = normalizeText(key);
    const v = normalizeText(val);
    if (k.includes('gc') || k.includes('celula') || k.includes('grupo de crescimento')) {
      if (v === 'sim' || (v.length > 2 && !v.includes('nao') && !v.includes('nenhum') && !v.includes('nao participo'))) return true;
    }
  }
  return false;
}

function inferHasShirt(reg: Registration): boolean {
  const t = normalizeText(reg.ticketName || '');
  if (t.includes('camisa') || t.includes('t-shirt') || t.includes('kit completo')) return true;
  if (!reg.customAnswers) return false;
  for (const [key, val] of Object.entries(reg.customAnswers)) {
    const k = normalizeText(key);
    const v = normalizeText(val);
    if ((k.includes('camisa') || k.includes('tamanho')) && v.length > 0 && !v.includes('nao quero') && !v.includes('sem camisa')) return true;
  }
  return false;
}

function getShirtSize(reg: Registration): string | null {
  if (!reg.customAnswers) return null;
  for (const [key, val] of Object.entries(reg.customAnswers)) {
    const k = normalizeText(key);
    if (k.includes('tamanho') || k.includes('camisa')) return val;
  }
  return null;
}

export function EventCheckInTab({ eventId }: EventCheckInTabProps) {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [filterProfile, setFilterProfile] = useState<string>('all');
  const [filterGC, setFilterGC] = useState<string>('all');
  const [filterShirt, setFilterShirt] = useState<string>('all');
  
  const [selectedReg, setSelectedReg] = useState<Registration | null>(null);
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!firestore || !eventId) return;

    const q = query(collection(firestore, 'event_registrations'), where('eventId', '==', eventId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const regs: Registration[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as Registration;
        if (regs.length === 0) {
           console.log("SAMPLE CUSTOM ANSWERS:", data.customAnswers);
        }
        regs.push({ id: doc.id, ...data });
      });
      regs.sort((a, b) => a.userMetadata.name.localeCompare(b.userMetadata.name));
      setRegistrations(regs);
      setIsLoading(false);
      
      if (selectedReg) {
        const updatedReg = regs.find(r => r.id === selectedReg.id);
        if (updatedReg) setSelectedReg(updatedReg);
      }
    }, (error) => {
      console.error("Error fetching registrations:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, eventId]);

  const filteredRegistrations = registrations.filter(reg => {
    const searchLower = searchTerm.toLowerCase();
    const nameMatch = reg.userMetadata.name.toLowerCase().includes(searchLower);
    const emailMatch = reg.userMetadata.email?.toLowerCase().includes(searchLower);
    if (!nameMatch && !emailMatch) return false;

    const isMember = inferIsMember(reg);
    if (filterProfile === 'members' && !isMember) return false;
    if (filterProfile === 'visitors' && isMember) return false;

    const inGC = inferIsInGC(reg);
    if (filterGC === 'in_gc' && !inGC) return false;
    if (filterGC === 'no_gc' && inGC) return false;

    const hasShirt = inferHasShirt(reg);
    if (filterShirt === 'with_shirt' && !hasShirt) return false;
    
    return true;
  });

  // Pessoas que vieram em pelo menos 1 sessão
  const totalCheckedIn = registrations.filter(r => r.attendance?.domManha || r.attendance?.domTarde || r.attendance?.terca || r.attendance?.quinta || r.attendance?.checkedIn).length;
  const totalKits = registrations.filter(r => r.attendance?.kitRetirado).length;
  const totalShirts = registrations.filter(r => r.attendance?.camisaRetirada).length;

  const handleUpdateAttendance = async (regId: string, field: string, value: boolean) => {
    if (!firestore) return;
    setIsUpdating(true);
    try {
      const docRef = doc(firestore, 'event_registrations', regId);
      const updatePayload: any = { [`attendance.${field}`]: value };

      if (value === true && (field === 'domManha' || field === 'domTarde' || field === 'terca' || field === 'quinta')) {
        updatePayload['attendance.checkedInAt'] = new Date();
        updatePayload['attendance.checkedInBy'] = user?.displayName || 'Equipe';
      }

      await updateDoc(docRef, updatePayload);
      toast({ title: "Status atualizado!", description: "Sincronizado com o sistema." });
    } catch (error) {
      console.error("Error updating:", error);
      toast({ variant: "destructive", title: "Erro", description: "Tente novamente." });
    } finally {
      setIsUpdating(false);
    }
  };

  const openCheckInModal = (reg: Registration) => {
    setSelectedReg(reg);
    setIsCheckInModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white shadow-sm border-slate-200">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
            <span className="text-sm font-medium text-slate-500 mb-1">Inscritos</span>
            <span className="text-3xl font-black text-slate-800">{registrations.length}</span>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 border-emerald-100 shadow-sm">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
            <span className="text-sm font-medium text-emerald-600 mb-1">Presenças (Únicas)</span>
            <span className="text-3xl font-black text-emerald-700">{totalCheckedIn}</span>
          </CardContent>
        </Card>
        <Card className="bg-indigo-50 border-indigo-100 shadow-sm">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
            <span className="text-sm font-medium text-indigo-600 mb-1">Kits Entregues</span>
            <span className="text-3xl font-black text-indigo-700">{totalKits}</span>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-100 shadow-sm">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
            <span className="text-sm font-medium text-amber-600 mb-1">Camisas Entregues</span>
            <span className="text-3xl font-black text-amber-700">{totalShirts}</span>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4 border-b border-slate-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <CheckCircle2 className="size-5 text-primary" /> Portaria Inteligente
              </CardTitle>
              <CardDescription>Busque nomes e faça entregas com 1 clique.</CardDescription>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar nome..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-slate-50 border-slate-200 h-9"
                />
              </div>
              <Select value={filterProfile} onValueChange={setFilterProfile}>
                <SelectTrigger className="w-[140px] h-9 text-xs">
                  <SelectValue placeholder="Perfil" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="members">Só Membros</SelectItem>
                  <SelectItem value="visitors">Só Visitantes</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterGC} onValueChange={setFilterGC}>
                <SelectTrigger className="w-[120px] h-9 text-xs">
                  <SelectValue placeholder="GC" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Filtro GC</SelectItem>
                  <SelectItem value="in_gc">Participa</SelectItem>
                  <SelectItem value="no_gc">Não Participa</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterShirt} onValueChange={setFilterShirt}>
                <SelectTrigger className="w-[130px] h-9 text-xs">
                  <SelectValue placeholder="Camisa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Com/Sem Camisa</SelectItem>
                  <SelectItem value="with_shirt">Com Camisa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="rounded-xl border-t md:border bg-white overflow-hidden">
            {/* Cabeçalho Desktop */}
            <div className="hidden md:grid grid-cols-12 gap-4 p-4 bg-slate-50 border-b font-medium text-sm text-slate-500 items-center">
              <div className="col-span-4 pl-2">Participante</div>
              <div className="col-span-3">Perfil & Entregas</div>
              <div className="col-span-5 text-right pr-2">Check-in Diário</div>
            </div>

            {/* Lista de Participantes */}
            <div className="divide-y divide-slate-100">
              {filteredRegistrations.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  Nenhum participante encontrado com estes filtros.
                </div>
              ) : (
                filteredRegistrations.map((reg) => {
                  const isMember = inferIsMember(reg);
                  const inGC = inferIsInGC(reg);
                  const hasShirt = inferHasShirt(reg);
                  const shirtSize = getShirtSize(reg);

                  const att = reg.attendance || {};
                  const domM = att.domManha || false;
                  const domT = att.domTarde || false;
                  const ter = att.terca || false;
                  const qui = att.quinta || false;

                  const checkedInCount = [domM, domT, ter, qui].filter(Boolean).length;

                  return (
                    <div key={reg.id} className={`p-4 md:p-4 grid grid-cols-1 md:grid-cols-12 gap-4 md:items-center ${checkedInCount > 0 ? "bg-slate-50/50" : ""}`}>
                      
                      {/* Coluna 1: Dados do Participante */}
                      <div className="md:col-span-4 flex flex-col items-start gap-1 md:pl-2">
                        <div className="flex items-center justify-between w-full md:w-auto">
                          <div className="font-bold text-slate-800 text-base md:text-sm">{reg.userMetadata.name}</div>
                          {/* Botão Detalhes Mobile */}
                          <Button size="icon" variant="ghost" className="h-8 w-8 md:hidden text-slate-400" onClick={() => openCheckInModal(reg)}>
                            <ListOrdered className="size-4" />
                          </Button>
                        </div>
                        <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2 mt-1">
                          {reg.payment.status === 'pending' && (
                            <span className="text-red-600 font-bold bg-red-100 px-2 py-0.5 rounded-full">Pendente</span>
                          )}
                          <Badge variant="outline" className="text-[10px] bg-white border-slate-200">
                            {reg.ticketName || 'Geral'}
                          </Badge>
                        </div>
                      </div>
                      
                      {/* Coluna 2: Perfil e Entregas (Kit/Camisa) */}
                      <div className="md:col-span-4 flex flex-col gap-3 md:gap-1.5 items-start">
                        {/* Tags de Perfil */}
                        <div className="flex flex-wrap gap-1">
                          {isMember ? (
                            <Badge className="text-[10px] bg-slate-100 text-slate-700 hover:bg-slate-200 border-none px-1.5">
                              <ShieldCheck className="size-3 mr-1" /> Membro
                            </Badge>
                          ) : (
                            <Badge className="text-[10px] bg-blue-100 text-blue-700 hover:bg-blue-200 border-none px-1.5 font-bold">
                              <HeartHandshake className="size-3 mr-1" /> Visitante
                            </Badge>
                          )}
                          {inGC && (
                            <Badge className="text-[10px] bg-teal-100 text-teal-700 hover:bg-teal-200 border-none px-1.5">Em GC</Badge>
                          )}
                        </div>

                        {/* Botões de Entrega: em mobile ocupam a tela toda lado a lado, em desktop pequenos */}
                        <div className="flex gap-2 md:gap-1 w-full md:w-auto mt-1 md:mt-0">
                          {/* Kit Toggle */}
                          <Button 
                            size="sm" 
                            variant={att.kitRetirado ? "default" : "outline"}
                            className={`flex-1 md:flex-none h-9 md:h-6 px-2 text-xs md:text-[10px] ${att.kitRetirado ? 'bg-indigo-600 hover:bg-indigo-700' : 'border-slate-300 text-slate-600 hover:bg-slate-100'}`}
                            onClick={() => handleUpdateAttendance(reg.id, 'kitRetirado', !att.kitRetirado)}
                          >
                            {att.kitRetirado ? <Check className="size-3 md:size-3 mr-1"/> : <Package className="size-3 md:size-3 mr-1"/>} {isMember ? 'Kit Membro' : 'Kit Visitante'}
                          </Button>

                          {/* Camisa Toggle */}
                          {hasShirt && (
                            <Button 
                              size="sm" 
                              variant={att.camisaRetirada ? "default" : "outline"}
                              className={`flex-1 md:flex-none h-9 md:h-6 px-2 text-xs md:text-[10px] ${att.camisaRetirada ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100'}`}
                              onClick={() => handleUpdateAttendance(reg.id, 'camisaRetirada', !att.camisaRetirada)}
                            >
                              {att.camisaRetirada ? <Check className="size-3 md:size-3 mr-1"/> : <Shirt className="size-3 md:size-3 mr-1"/>} Camisa {shirtSize && `(${shirtSize})`}
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Coluna 3: Check-ins Diários */}
                      <div className="md:col-span-4 flex flex-col md:flex-row md:items-center justify-start md:justify-end gap-2 md:pr-2 w-full mt-2 md:mt-0">
                        <div className="grid grid-cols-4 md:flex items-center gap-1.5 w-full md:w-auto bg-slate-50 md:bg-slate-100 p-1.5 md:p-1 rounded-lg border border-slate-200">
                          <Button 
                            size="sm" variant={domM ? "default" : "ghost"} 
                            className={`h-9 md:h-7 px-0 md:px-2 text-xs font-bold md:font-normal ${domM ? 'bg-emerald-600 hover:bg-emerald-700' : 'text-slate-500 hover:text-slate-700 bg-white md:bg-transparent shadow-sm md:shadow-none border md:border-none border-slate-200'}`}
                            onClick={() => handleUpdateAttendance(reg.id, 'domManha', !domM)}
                            title="Domingo Manhã"
                          >
                            Dom M
                          </Button>
                          <Button 
                            size="sm" variant={domT ? "default" : "ghost"} 
                            className={`h-9 md:h-7 px-0 md:px-2 text-xs font-bold md:font-normal ${domT ? 'bg-emerald-600 hover:bg-emerald-700' : 'text-slate-500 hover:text-slate-700 bg-white md:bg-transparent shadow-sm md:shadow-none border md:border-none border-slate-200'}`}
                            onClick={() => handleUpdateAttendance(reg.id, 'domTarde', !domT)}
                            title="Domingo Tarde/Noite"
                          >
                            Dom N
                          </Button>
                          <Button 
                            size="sm" variant={ter ? "default" : "ghost"} 
                            className={`h-9 md:h-7 px-0 md:px-2 text-xs font-bold md:font-normal ${ter ? 'bg-emerald-600 hover:bg-emerald-700' : 'text-slate-500 hover:text-slate-700 bg-white md:bg-transparent shadow-sm md:shadow-none border md:border-none border-slate-200'}`}
                            onClick={() => handleUpdateAttendance(reg.id, 'terca', !ter)}
                            title="Terça-feira"
                          >
                            Ter
                          </Button>
                          <Button 
                            size="sm" variant={qui ? "default" : "ghost"} 
                            className={`h-9 md:h-7 px-0 md:px-2 text-xs font-bold md:font-normal ${qui ? 'bg-emerald-600 hover:bg-emerald-700' : 'text-slate-500 hover:text-slate-700 bg-white md:bg-transparent shadow-sm md:shadow-none border md:border-none border-slate-200'}`}
                            onClick={() => handleUpdateAttendance(reg.id, 'quinta', !qui)}
                            title="Quinta-feira"
                          >
                            Qui
                          </Button>
                        </div>

                        {/* Botão de Detalhes Desktop */}
                        <Button size="sm" variant="ghost" className="hidden md:flex h-8 w-8 p-0 text-slate-400 hover:text-slate-600 ml-1" onClick={() => openCheckInModal(reg)}>
                          <ListOrdered className="size-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isCheckInModalOpen} onOpenChange={setIsCheckInModalOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="text-xl">Detalhes: {selectedReg?.userMetadata.name}</DialogTitle>
          </DialogHeader>
          
          {selectedReg && (
            <div className="py-2 space-y-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex justify-between items-start mb-3 border-b border-slate-200 pb-3">
                  <span className="text-sm font-semibold text-slate-600">Ingresso:</span>
                  <Badge className="bg-primary/10 text-primary border-none shadow-none text-sm">{selectedReg.ticketName || 'Geral'}</Badge>
                </div>
                
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1"><ListOrdered className="size-3"/> Respostas (Enquete)</span>
                {selectedReg.customAnswers && Object.keys(selectedReg.customAnswers).length > 0 ? (
                  <div className="space-y-2.5">
                    {Object.entries(selectedReg.customAnswers).map(([key, value]) => (
                      <div key={key} className="text-sm leading-tight">
                        <span className="text-slate-500 block text-[11px] uppercase">{key}</span>
                        <span className="font-medium text-slate-800">{value as string}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic">Nenhuma resposta personalizada.</p>
                )}
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-800">Ajustes Manuais</h4>
                <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white">
                  <Label className="text-sm font-bold text-slate-800 flex items-center gap-2"><UserPlus className="size-4 text-blue-600"/> Forçar como Visitante</Label>
                  <Switch 
                    checked={!!selectedReg.attendance?.isVisitor}
                    onCheckedChange={(val) => handleUpdateAttendance(selectedReg.id, 'isVisitor', val)}
                    disabled={isUpdating}
                  />
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
