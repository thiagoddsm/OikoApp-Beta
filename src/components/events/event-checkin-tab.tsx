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
import { Loader2, Search, CheckCircle2, Ticket, Package, Shirt, UserPlus, ListOrdered, Filter } from 'lucide-react';
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

export function EventCheckInTab({ eventId }: EventCheckInTabProps) {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTicket, setFilterTicket] = useState<string>('all');
  
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
      // Sort alphabetically by default
      regs.sort((a, b) => a.userMetadata.name.localeCompare(b.userMetadata.name));
      setRegistrations(regs);
      setIsLoading(false);
      
      // Update selected reg if modal is open
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

  const uniqueTickets = Array.from(new Set(registrations.map(r => r.ticketName || 'Geral')));

  const filteredRegistrations = registrations.filter(reg => {
    const searchLower = searchTerm.toLowerCase();
    const nameMatch = reg.userMetadata.name.toLowerCase().includes(searchLower);
    const emailMatch = reg.userMetadata.email?.toLowerCase().includes(searchLower);
    const ticketMatch = filterTicket === 'all' || (reg.ticketName || 'Geral') === filterTicket;
    
    return (nameMatch || emailMatch) && ticketMatch;
  });

  const totalCheckedIn = registrations.filter(r => r.attendance?.checkedIn).length;
  const totalKits = registrations.filter(r => r.attendance?.kitRetirado).length;
  const totalShirts = registrations.filter(r => r.attendance?.camisaRetirada).length;

  const handleUpdateAttendance = async (regId: string, field: string, value: boolean) => {
    if (!firestore) return;
    setIsUpdating(true);
    try {
      const docRef = doc(firestore, 'event_registrations', regId);
      
      // Construir o payload garantindo que o objeto attendance exista
      const updatePayload: any = {
        [`attendance.${field}`]: value
      };

      if (field === 'checkedIn' && value === true) {
        updatePayload['attendance.checkedInAt'] = new Date();
        updatePayload['attendance.checkedInBy'] = user?.displayName || 'Equipe';
      }

      await updateDoc(docRef, updatePayload);
      
      toast({
        title: "Atualizado com sucesso",
        description: `Status de ${field} alterado.`,
      });
    } catch (error) {
      console.error("Error updating attendance:", error);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar",
        description: "Tente novamente.",
      });
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
            <span className="text-sm font-medium text-emerald-600 mb-1">Check-ins</span>
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
        <CardHeader className="pb-4">
          <CardTitle className="text-xl flex items-center gap-2">
            <CheckCircle2 className="size-5 text-primary" /> Recepção e Check-in
          </CardTitle>
          <CardDescription>
            Busque pelo nome, confira o ingresso e gerencie a entrada e kits.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por nome ou e-mail..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-slate-50 border-slate-200"
              />
            </div>
            <Select value={filterTicket} onValueChange={setFilterTicket}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filtrar Ingresso" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Ingressos</SelectItem>
                {uniqueTickets.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-xl border bg-white overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Participante</TableHead>
                  <TableHead>Ingresso / Status</TableHead>
                  <TableHead className="text-center">Ações de Portaria</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRegistrations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-slate-500">
                      Nenhum participante encontrado com estes filtros.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRegistrations.map((reg) => {
                    const isChecked = reg.attendance?.checkedIn;
                    
                    return (
                      <TableRow key={reg.id} className={isChecked ? "bg-emerald-50/30" : ""}>
                        <TableCell>
                          <div className="font-bold text-slate-800">{reg.userMetadata.name}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                            {reg.payment.status === 'pending' && (
                              <span className="text-amber-600 font-bold bg-amber-100 px-2 py-0.5 rounded-full">
                                Pagamento Pendente
                              </span>
                            )}
                            {reg.attendance?.isVisitor && (
                              <span className="text-blue-600 font-bold bg-blue-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <UserPlus className="size-3" /> Visitante
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-slate-50 font-semibold mb-1">
                            <Ticket className="size-3 mr-1" /> {reg.ticketName || 'Geral'}
                          </Badge>
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {reg.attendance?.kitRetirado && <Badge className="text-[10px] bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-none px-1.5"><Package className="size-3 mr-1" /> Kit OK</Badge>}
                            {reg.attendance?.camisaRetirada && <Badge className="text-[10px] bg-amber-100 text-amber-700 hover:bg-amber-200 border-none px-1.5"><Shirt className="size-3 mr-1" /> Camisa OK</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button 
                            onClick={() => openCheckInModal(reg)}
                            variant={isChecked ? "outline" : "default"}
                            className={isChecked ? "border-emerald-500 text-emerald-600 hover:bg-emerald-50" : "bg-primary text-white shadow-sm"}
                          >
                            {isChecked ? (
                              <><CheckCircle2 className="size-4 mr-2" /> Gerenciar</>
                            ) : (
                              "Fazer Check-in"
                            )}
                          </Button>
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

      {/* Check-in Modal */}
      <Dialog open={isCheckInModalOpen} onOpenChange={setIsCheckInModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl">Entrada: {selectedReg?.userMetadata.name}</DialogTitle>
          </DialogHeader>
          
          {selectedReg && (
            <div className="py-4 space-y-6">
              
              {/* Infos do Ingresso e Respostas */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-sm font-semibold text-slate-600">Ingresso:</span>
                  <Badge className="bg-primary/10 text-primary border-none shadow-none text-sm">{selectedReg.ticketName || 'Geral'}</Badge>
                </div>
                
                {selectedReg.customAnswers && Object.keys(selectedReg.customAnswers).length > 0 && (
                  <div className="pt-3 border-t border-slate-200 mt-3">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block flex items-center gap-1"><ListOrdered className="size-3"/> Respostas (Enquete)</span>
                    <div className="space-y-2">
                      {Object.entries(selectedReg.customAnswers).map(([key, value]) => (
                        <div key={key} className="text-sm">
                          <span className="text-slate-500 block text-xs">{key}</span>
                          <span className="font-medium text-slate-800">{value as string}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Controles de Portaria */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Filter className="size-4" /> Ações de Portaria</h4>
                
                {/* 1. Checkin Geral */}
                <div className="flex items-center justify-between p-3 rounded-lg border border-emerald-100 bg-emerald-50/30">
                  <div className="space-y-0.5">
                    <Label className="text-base font-bold text-emerald-800">Check-in Realizado</Label>
                    <p className="text-xs text-emerald-600">Confirma a entrada no evento.</p>
                  </div>
                  <Switch 
                    checked={!!selectedReg.attendance?.checkedIn}
                    onCheckedChange={(val) => handleUpdateAttendance(selectedReg.id, 'checkedIn', val)}
                    disabled={isUpdating}
                    className="data-[state=checked]:bg-emerald-500"
                  />
                </div>

                {/* 2. Retirada de Kit */}
                <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white shadow-sm">
                  <div className="space-y-0.5 flex items-center gap-2">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-md"><Package className="size-4" /></div>
                    <div>
                      <Label className="text-sm font-bold text-slate-800">Retirou o Kit</Label>
                      <p className="text-xs text-slate-500">Entrega do material.</p>
                    </div>
                  </div>
                  <Switch 
                    checked={!!selectedReg.attendance?.kitRetirado}
                    onCheckedChange={(val) => handleUpdateAttendance(selectedReg.id, 'kitRetirado', val)}
                    disabled={isUpdating}
                  />
                </div>

                {/* 3. Retirada de Camisa */}
                <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white shadow-sm">
                  <div className="space-y-0.5 flex items-center gap-2">
                    <div className="p-2 bg-amber-50 text-amber-600 rounded-md"><Shirt className="size-4" /></div>
                    <div>
                      <Label className="text-sm font-bold text-slate-800">Retirou a Camisa</Label>
                      <p className="text-xs text-slate-500">Entrega do vestuário.</p>
                    </div>
                  </div>
                  <Switch 
                    checked={!!selectedReg.attendance?.camisaRetirada}
                    onCheckedChange={(val) => handleUpdateAttendance(selectedReg.id, 'camisaRetirada', val)}
                    disabled={isUpdating}
                  />
                </div>

                {/* 4. Visitante */}
                <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white shadow-sm">
                  <div className="space-y-0.5 flex items-center gap-2">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-md"><UserPlus className="size-4" /></div>
                    <div>
                      <Label className="text-sm font-bold text-slate-800">É Visitante?</Label>
                      <p className="text-xs text-slate-500">Marcar como visitante.</p>
                    </div>
                  </div>
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
