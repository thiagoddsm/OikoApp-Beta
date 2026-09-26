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
import { Loader2, Search, CheckCircle2, Ticket, Package, Shirt, UserPlus, ListOrdered, Filter, Check, ShieldCheck, HeartHandshake } from 'lucide-react';
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
    checkedIn: boolean;
    kitRetirado?: boolean;
    camisaRetirada?: boolean;
    isVisitor?: boolean;
    checkedInAt?: any;
    checkedInBy?: string;
  };
};

// Funções Heurísticas para Extrair Dados das Enquetes e Ingresso
function inferIsMember(reg: Registration): boolean {
  if (reg.attendance?.isVisitor === false) return true; // Forçado manualmente
  if (reg.attendance?.isVisitor === true) return false;
  if (!reg.customAnswers) return false;
  for (const [key, val] of Object.entries(reg.customAnswers)) {
    const k = key.toLowerCase();
    const v = val.toLowerCase();
    if (k.includes('membro') && (v === 'sim' || v.includes('sou'))) return true;
    if (k.includes('igreja') && (v.includes('manhã') || v.includes('ibm'))) return true;
  }
  return false; // Assumimos Visitante por padrão se não houver prova de membro
}

function inferIsInGC(reg: Registration): boolean {
  if (!reg.customAnswers) return false;
  for (const [key, val] of Object.entries(reg.customAnswers)) {
    const k = key.toLowerCase();
    const v = val.toLowerCase();
    if (k.includes('gc') || k.includes('célula') || k.includes('grupo de crescimento')) {
      if (v === 'sim' || (v.length > 2 && v !== 'não' && v !== 'nenhum' && !v.includes('não participo'))) return true;
    }
  }
  return false;
}

function inferHasShirt(reg: Registration): boolean {
  const t = (reg.ticketName || '').toLowerCase();
  if (t.includes('camisa') || t.includes('t-shirt') || t.includes('kit completo')) return true;
  if (!reg.customAnswers) return false;
  for (const [key, val] of Object.entries(reg.customAnswers)) {
    const k = key.toLowerCase();
    if ((k.includes('camisa') || k.includes('tamanho')) && val.length > 0 && val.toLowerCase() !== 'não quero') return true;
  }
  return false;
}

function getShirtSize(reg: Registration): string | null {
  if (!reg.customAnswers) return null;
  for (const [key, val] of Object.entries(reg.customAnswers)) {
    const k = key.toLowerCase();
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
  
  // Filtros Avançados
  const [filterProfile, setFilterProfile] = useState<string>('all'); // all | members | visitors
  const [filterGC, setFilterGC] = useState<string>('all'); // all | in_gc | no_gc
  const [filterShirt, setFilterShirt] = useState<string>('all'); // all | with_shirt
  
  const [selectedReg, setSelectedReg] = useState<Registration | null>(null);
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch registrations in real-time
  useEffect(() => {
    if (!firestore || !eventId) return;

    const q = query(
      collection(firestore, 'event_registrations'),
      where('eventId', '==', eventId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const regs: Registration[] = [];
      snapshot.forEach((doc) => {
        regs.push({ id: doc.id, ...doc.data() } as Registration);
      });
      // Sort alphabetically
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

  const totalCheckedIn = registrations.filter(r => r.attendance?.checkedIn).length;
  const totalKits = registrations.filter(r => r.attendance?.kitRetirado).length;
  const totalShirts = registrations.filter(r => r.attendance?.camisaRetirada).length;

  const handleUpdateAttendance = async (regId: string, field: string, value: boolean) => {
    if (!firestore) return;
    setIsUpdating(true);
    try {
      const docRef = doc(firestore, 'event_registrations', regId);
      const updatePayload: any = { [`attendance.${field}`]: value };

      if (field === 'checkedIn' && value === true) {
        updatePayload['attendance.checkedInAt'] = new Date();
        updatePayload['attendance.checkedInBy'] = user?.displayName || 'Equipe';
      }

      await updateDoc(docRef, updatePayload);
      toast({ title: "Status atualizado!", description: "Sincronizado com o sistema." });
    } catch (error) {
      console.error("Error updating:", error);
      toast({ variant: "destructive", title: "Erro ao atualizar", description: "Tente novamente." });
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
      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white shadow-sm border-slate-200">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
            <span className="text-sm font-medium text-slate-500 mb-1">Inscritos</span>
            <span className="text-3xl font-black text-slate-800">{registrations.length}</span>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 border-emerald-100 shadow-sm">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
            <span className="text-sm font-medium text-emerald-600 mb-1">Entradas</span>
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
            
            {/* Filtros */}
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
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[250px] pl-6">Participante</TableHead>
                  <TableHead>Perfil & Entregas Necessárias</TableHead>
                  <TableHead className="text-right pr-6">Ações Rápidas (Portaria)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRegistrations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-12 text-slate-500">
                      Nenhum participante encontrado com estes filtros.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRegistrations.map((reg) => {
                    const isChecked = reg.attendance?.checkedIn;
                    const isMember = inferIsMember(reg);
                    const inGC = inferIsInGC(reg);
                    const hasShirt = inferHasShirt(reg);
                    const shirtSize = getShirtSize(reg);

                    return (
                      <TableRow key={reg.id} className={isChecked ? "bg-slate-50/50" : ""}>
                        <TableCell className="pl-6">
                          <div className="font-bold text-slate-800 text-sm">{reg.userMetadata.name}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                            {reg.payment.status === 'pending' && (
                              <span className="text-red-600 font-bold bg-red-100 px-2 py-0.5 rounded-full">Pendente</span>
                            )}
                            <Badge variant="outline" className="text-[10px] bg-white border-slate-200">
                              {reg.ticketName || 'Geral'}
                            </Badge>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex flex-col gap-1.5 items-start">
                            {/* Tags de Perfil */}
                            <div className="flex gap-1">
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

                            {/* Tags de Kit/Camisa */}
                            <div className="flex gap-1 mt-0.5">
                              <Badge variant="outline" className={`text-[10px] px-1.5 font-bold ${isMember ? 'border-slate-300 text-slate-600' : 'border-blue-300 text-blue-600 bg-blue-50'}`}>
                                <Package className="size-3 mr-1" /> {isMember ? 'Kit Membro' : 'Kit Visitante'}
                              </Badge>
                              {hasShirt && (
                                <Badge variant="outline" className="text-[10px] px-1.5 border-amber-300 text-amber-700 bg-amber-50 font-bold">
                                  <Shirt className="size-3 mr-1" /> Camisa {shirtSize && `(Tam: ${shirtSize})`}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="text-right pr-6">
                          {/* Botões Inline para agilizar a portaria */}
                          <div className="flex items-center justify-end gap-2">
                            {/* Kit Toggle */}
                            <Button 
                              size="sm" 
                              variant={reg.attendance?.kitRetirado ? "default" : "outline"}
                              className={`h-8 px-2.5 ${reg.attendance?.kitRetirado ? 'bg-indigo-600 hover:bg-indigo-700' : 'border-slate-300 text-slate-600 hover:bg-slate-100'}`}
                              onClick={() => handleUpdateAttendance(reg.id, 'kitRetirado', !reg.attendance?.kitRetirado)}
                              title="Marcar Kit como Entregue"
                            >
                              {reg.attendance?.kitRetirado ? <Check className="size-4 mr-1"/> : <Package className="size-4 mr-1 opacity-50"/>} Kit
                            </Button>

                            {/* Camisa Toggle (só aparece se comprou) */}
                            {hasShirt && (
                              <Button 
                                size="sm" 
                                variant={reg.attendance?.camisaRetirada ? "default" : "outline"}
                                className={`h-8 px-2.5 ${reg.attendance?.camisaRetirada ? 'bg-amber-500 hover:bg-amber-600' : 'border-slate-300 text-slate-600 hover:bg-slate-100'}`}
                                onClick={() => handleUpdateAttendance(reg.id, 'camisaRetirada', !reg.attendance?.camisaRetirada)}
                                title="Marcar Camisa como Entregue"
                              >
                                {reg.attendance?.camisaRetirada ? <Check className="size-4 mr-1"/> : <Shirt className="size-4 mr-1 opacity-50"/>} Camisa
                              </Button>
                            )}

                            {/* Check-in Toggle */}
                            <Button 
                              size="sm"
                              variant={isChecked ? "outline" : "default"}
                              className={`h-8 px-3 ml-2 ${isChecked ? "border-emerald-500 text-emerald-600 hover:bg-emerald-50" : "bg-emerald-600 hover:bg-emerald-500 text-white"}`}
                              onClick={() => handleUpdateAttendance(reg.id, 'checkedIn', !isChecked)}
                            >
                              {isChecked ? <><CheckCircle2 className="size-4 mr-1.5" /> OK</> : "Entrou"}
                            </Button>

                            {/* Botão de Ver Tudo (Abre Modal) */}
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600" onClick={() => openCheckInModal(reg)}>
                              <ListOrdered className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Check-in Modal (Detalhes Completos) */}
      <Dialog open={isCheckInModalOpen} onOpenChange={setIsCheckInModalOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="text-xl">Detalhes: {selectedReg?.userMetadata.name}</DialogTitle>
          </DialogHeader>
          
          {selectedReg && (
            <div className="py-2 space-y-6">
              
              {/* Infos e Respostas */}
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

              {/* Toggles Manuais */}
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
