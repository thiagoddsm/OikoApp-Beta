'use client';

import React, { useMemo, useState } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Users, DollarSign, CheckCircle2, AlertCircle, Phone, Mail, UserPlus, Check, X, CreditCard } from 'lucide-react';
import { PaymentStatusBadge } from '@/components/events/payment-status-badge';
import { EventPaymentDialog } from '@/components/events/payment-dialog';

interface EventRegistrationsTabProps {
  eventId: string;
  eventPrice?: number;
  isPaid?: boolean;
  eventTitle?: string;
}

type Registration = {
  id: string;
  eventId: string;
  userId: string;
  userMetadata: {
    name: string;
    email: string;
    phone: string;
    gcId?: string;
  };
  payment: {
    status: 'pending' | 'approved';
    method: string;
    valuePaid: number;
    paidAt?: any;
    transactionId?: string;
  };
  attendance?: {
    checkedIn: boolean;
    checkedInAt?: any;
    checkedInBy?: string;
  };
  companionName?: string;
  createdAt: any;
};

export function EventRegistrationsTab({ eventId, eventPrice = 0, isPaid = false, eventTitle = '' }: EventRegistrationsTabProps) {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null);

  // Fetch registrations for this event
  const registrationsQuery = useMemoFirebase(() => {
    if (!firestore || !eventId) return null;
    return query(
      collection(firestore, 'event_registrations'),
      where('eventId', '==', eventId)
    );
  }, [firestore, eventId]);

  const { data: rawRegistrations, isLoading } = useCollection<Registration>(registrationsQuery);

  // Computed metrics
  const metrics = useMemo(() => {
    if (!rawRegistrations) return { total: 0, approved: 0, pending: 0, revenue: 0 };
    const total = rawRegistrations.length;
    const approved = rawRegistrations.filter(r => r.payment?.status === 'approved').length;
    const pending = total - approved;
    const revenue = rawRegistrations
      .filter(r => r.payment?.status === 'approved')
      .reduce((sum, r) => sum + (r.payment?.valuePaid || 0), 0);

    return { total, approved, pending, revenue };
  }, [rawRegistrations]);

  const filteredRegistrations = useMemo(() => {
    if (!rawRegistrations) return [];

    const normalize = (str: string) => 
      (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

    const search = normalize(searchTerm.trim());

    return [...rawRegistrations]
      .filter(r => {
        const name = normalize(r.userMetadata?.name || '');
        const email = normalize(r.userMetadata?.email || '');
        const phone = normalize(r.userMetadata?.phone || '');
        const companion = normalize(r.companionName || '');

        return name.includes(search) || email.includes(search) || phone.includes(search) || companion.includes(search);
      })
      .sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return dateB - dateA; // latest first
      });
  }, [rawRegistrations, searchTerm]);

  // Manual payment approval override
  const handleApprovePayment = async (regId: string) => {
    if (!firestore) return;
    setIsUpdating(regId);
    try {
      const regDocRef = doc(firestore, 'event_registrations', regId);
      await updateDoc(regDocRef, {
        'payment.status': 'approved',
        'payment.paidAt': Timestamp.now()
      });
      toast({
        title: "Pagamento Aprovado",
        description: "A inscrição foi marcada manualmente como aprovada/paga.",
      });
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar",
        description: "Não foi possível aprovar o pagamento.",
      });
    } finally {
      setIsUpdating(null);
    }
  };

  // Toggle Check-in status
  const handleToggleCheckIn = async (reg: Registration) => {
    if (!firestore || !user) return;
    setIsUpdating(`checkin-${reg.id}`);
    try {
      const regDocRef = doc(firestore, 'event_registrations', reg.id);
      const currentlyCheckedIn = reg.attendance?.checkedIn || false;

      await updateDoc(regDocRef, {
        attendance: {
          checkedIn: !currentlyCheckedIn,
          checkedInAt: !currentlyCheckedIn ? Timestamp.now() : null,
          checkedInBy: !currentlyCheckedIn ? user.uid : null
        }
      });

      toast({
        title: !currentlyCheckedIn ? "Check-in Realizado" : "Check-in Cancelado",
        description: !currentlyCheckedIn 
          ? `Presença de ${reg.userMetadata.name} confirmada.` 
          : `Presença de ${reg.userMetadata.name} desmarcada.`,
      });
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Erro no Check-in",
        description: "Ocorreu um erro ao atualizar o status de presença.",
      });
    } finally {
      setIsUpdating(null);
    }
  };

  const handleRemoveRegistration = async (regId: string) => {
    if (!firestore || !confirm("Tem certeza que deseja cancelar e remover esta inscrição?")) return;
    setIsUpdating(`delete-${regId}`);
    try {
      await deleteDoc(doc(firestore, 'event_registrations', regId));
      toast({
        title: "Inscrição Cancelada",
        description: "O registro de inscrição foi removido com sucesso.",
      });
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Erro ao remover",
        description: "Não foi possível cancelar a inscrição.",
      });
    } finally {
      setIsUpdating(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-48 w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white border-slate-100 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase">Inscrições Totais</CardTitle>
            <Users className="size-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-800">{metrics.total}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Participantes inscritos</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-100 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase">Confirmadas</CardTitle>
            <CheckCircle2 className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-600">{metrics.approved}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Pagamento aprovado / Grátis</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-100 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase">Pendentes</CardTitle>
            <AlertCircle className="size-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-amber-600">{metrics.pending}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Aguardando PIX ou liberação</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-100 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase">Receita Confirmada</CardTitle>
            <DollarSign className="size-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-blue-600">R$ {metrics.revenue.toFixed(2)}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Total arrecadado</p>
          </CardContent>
        </Card>
      </div>

      {/* Main List and Controls */}
      <Card className="bg-white border-slate-100 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-slate-800 font-bold">Lista de Participantes</CardTitle>
              <CardDescription>Gerenciamento de pagamentos, credenciamento e presença.</CardDescription>
            </div>
            <div className="w-full sm:w-64">
              <Input
                placeholder="Buscar participante..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-50 border-slate-200 focus-visible:ring-primary text-xs"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          {filteredRegistrations.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Users className="size-12 mx-auto opacity-20 mb-3" />
              <p className="text-sm font-medium">Nenhum participante encontrado.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    <TableHead className="text-xs font-bold text-slate-700">Participante</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700">Contato</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700">Acompanhante</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700">Pagamento</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700">Presença</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRegistrations.map((reg) => {
                    const isApproved = reg.payment?.status === 'approved';
                    const isCheckedIn = reg.attendance?.checkedIn || false;

                    return (
                      <TableRow key={reg.id} className="hover:bg-slate-50/50">
                        {/* Participant info */}
                        <TableCell>
                          <div className="font-bold text-slate-800 text-sm">{reg.userMetadata?.name}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-slate-400">
                              Inscrito em: {reg.createdAt?.toDate ? reg.createdAt.toDate().toLocaleDateString('pt-BR') : 'Data Indisponível'}
                            </span>
                            {(reg as any).ticketName && (
                              <Badge variant="outline" className="text-[9px] uppercase px-1.5 h-4 bg-slate-50 border-slate-200 text-slate-500 font-bold">
                                {(reg as any).ticketName}
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        {/* Contacts */}
                        <TableCell>
                          <div className="flex flex-col gap-1 text-xs">
                            <span className="flex items-center gap-1 text-slate-600">
                              <Phone className="size-3 text-slate-400" /> {reg.userMetadata?.phone || 'Sem celular'}
                            </span>
                            <span className="flex items-center gap-1 text-slate-500">
                              <Mail className="size-3 text-slate-400" /> {reg.userMetadata?.email || 'Sem email'}
                            </span>
                          </div>
                        </TableCell>

                        {/* Companion */}
                        <TableCell className="text-xs text-slate-600 font-medium">
                          {(reg as any).companions && (reg as any).companions.length > 0 ? (
                            <div className="space-y-0.5">
                              {(reg as any).companions.map((c: any, index: number) => (
                                <span key={index} className="flex items-center gap-1 text-[11px] text-slate-700">
                                  <UserPlus className="size-3 text-slate-400" /> {c.name} ({c.age}a)
                                </span>
                              ))}
                            </div>
                          ) : reg.companionName ? (
                            <span className="flex items-center gap-1">
                              <UserPlus className="size-3 text-slate-400" /> {reg.companionName}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/60 italic">-</span>
                          )}
                        </TableCell>

                        {/* Payment status badge */}
                        <TableCell>
                          <div className="flex flex-col gap-1 items-start">
                            <PaymentStatusBadge
                              status={
                                // Prefer Asaas status (uppercase) if available, else map local status
                                (reg.payment as any)?.asaasStatus ||
                                (reg.payment?.status === 'approved' ? 'CONFIRMED' : 'PENDING')
                              }
                            />
                            <span className="text-[9px] font-mono text-slate-400">
                              {reg.payment?.method === 'free' ? 'Grátis' : `Pix (R$ ${reg.payment?.valuePaid?.toFixed(2)})`}
                            </span>
                          </div>
                        </TableCell>

                        {/* Attendance status badge */}
                        <TableCell>
                          <Badge className={isCheckedIn ? "bg-blue-100 text-blue-800 hover:bg-blue-100 border-none" : "bg-slate-100 text-slate-600 hover:bg-slate-100 border-none"}>
                            {isCheckedIn ? 'Presente' : 'Ausente'}
                          </Badge>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1.5">
                            {/* Toggle check-in */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleToggleCheckIn(reg)}
                              disabled={isUpdating === `checkin-${reg.id}` || !isApproved}
                              className={isCheckedIn 
                                ? "h-7 px-2 bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100" 
                                : "h-7 px-2 border-slate-200 text-slate-600 hover:bg-slate-100"
                              }
                              title={isCheckedIn ? "Desmarcar Presença" : "Confirmar Presença"}
                            >
                              {isUpdating === `checkin-${reg.id}` ? (
                                <Loader2 className="size-3 animate-spin" />
                              ) : isCheckedIn ? (
                                <X className="size-3.5" />
                              ) : (
                                <Check className="size-3.5" />
                              )}
                            </Button>

                            {/* Approve manually */}
                            {!isApproved && (
                              <Button
                                size="sm"
                                onClick={() => handleApprovePayment(reg.id)}
                                disabled={isUpdating === reg.id}
                                className="h-7 px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                                title="Aprovar Pagamento Manual"
                              >
                                {isUpdating === reg.id ? <Loader2 className="size-3 animate-spin" /> : 'Aprovar'}
                              </Button>
                            )}

                            {/* Generate Asaas charge for pending registrations */}
                            {!isApproved && isPaid && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedRegistration(reg);
                                  setPaymentDialogOpen(true);
                                }}
                                className="h-7 px-2 border-blue-200 text-blue-700 hover:bg-blue-50"
                                title="Gerar Cobrança Asaas"
                              >
                                <CreditCard className="size-3 mr-1" />
                                Cobrar
                              </Button>
                            )}

                            {/* Remove registration */}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemoveRegistration(reg.id)}
                              disabled={isUpdating === `delete-${reg.id}`}
                              className="h-7 px-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                              title="Cancelar Inscrição"
                            >
                              {isUpdating === `delete-${reg.id}` ? <Loader2 className="size-3 animate-spin" /> : <X className="size-3.5" />}
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

      {/* Payment Dialog */}
      {selectedRegistration && (
        <EventPaymentDialog
          open={paymentDialogOpen}
          onOpenChange={(open) => {
            setPaymentDialogOpen(open);
            if (!open) setSelectedRegistration(null);
          }}
          registration={selectedRegistration}
          eventPrice={eventPrice}
          eventTitle={eventTitle}
        />
      )}
    </div>
  );
}
