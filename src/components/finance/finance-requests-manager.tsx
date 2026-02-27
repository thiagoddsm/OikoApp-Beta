
'use client';

import React, { useState, useMemo } from 'react';
import { useVolunteering, type FinanceRequest } from '@/contexts/volunteering-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, PlusCircle, Trash2, Clock, CheckCircle, XCircle, 
  FileText, ExternalLink, Link as LinkIcon, DollarSign, 
  Wallet, User, Phone, Mail, Receipt, History
} from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

export function FinanceRequestsManager() {
  const { financeRequests, addFinanceRequest, updateFinanceRequest, deleteFinanceRequest, isLoading } = useVolunteering();
  const { toast } = useToast();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [filterStatus, setStatusFilter] = useState('all');

  const [formData, setFormData] = useState({
    requesterName: '',
    phone: '',
    email: '',
    category: 'Ministério',
    description: '',
    amount: '',
    objective: 'reembolso' as 'reembolso' | 'pagamento' | 'prestacao_contas',
    pixKey: '',
    dueDate: new Date().toISOString().split('T')[0],
    purchaseLink: '',
  });

  const filteredRequests = useMemo(() => {
    return financeRequests.filter(r => filterStatus === 'all' || r.status === filterStatus);
  }, [financeRequests, filterStatus]);

  const handleSaveRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.requesterName || !formData.email || !formData.amount) return;
    
    setIsSaving(true);
    try {
        await addFinanceRequest({
            requesterName: formData.requesterName,
            phone: formData.phone,
            email: formData.email,
            category: formData.category,
            description: formData.description,
            amount: Number(formData.amount),
            objective: formData.objective,
            pixKey: formData.pixKey,
            dueDate: formData.dueDate,
            purchaseLink: formData.purchaseLink,
            status: 'pending',
            createdAt: Timestamp.now(),
        });
        toast({ title: "Solicitação Enviada!", description: "Sua solicitação foi registrada para análise financeira." });
        setIsFormOpen(false);
        setFormData({
            requesterName: '',
            phone: '',
            email: '',
            category: 'Ministério',
            description: '',
            amount: '',
            objective: 'reembolso',
            pixKey: '',
            dueDate: new Date().toISOString().split('T')[0],
            purchaseLink: '',
        });
    } catch (e) {
        toast({ variant: 'destructive', title: "Erro ao enviar", description: "Tente novamente." });
    } finally {
        setIsSaving(false);
    }
  };

  const handleStatusChange = async (requestId: string, newStatus: FinanceRequest['status']) => {
      await updateFinanceRequest(requestId, { status: newStatus });
      toast({ title: "Status Atualizado", description: `Solicitação marcada como ${newStatus}.` });
  };

  const objectiveLabels = {
      reembolso: 'Reembolso',
      pagamento: 'Pagamento',
      prestacao_contas: 'Prestação de Contas'
  };

  const statusConfig = {
      pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      approved: { label: 'Aprovado', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
      paid: { label: 'Pago', color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle2 },
      rejected: { label: 'Rejeitado', color: 'bg-red-100 text-red-800', icon: XCircle },
  };

  const CheckCircle2 = CheckCircle; // Reusing the icon if not distinct in lucide-react

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
              <h3 className="text-lg font-black uppercase flex items-center gap-2">
                  <Wallet className="size-5 text-primary" /> Fluxo de Solicitações
              </h3>
              <p className="text-sm text-muted-foreground">Gerencie pagamentos, reembolsos e prestação de contas dos ministérios.</p>
          </div>
          <div className="flex items-center gap-2">
              <Select value={filterStatus} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px] bg-white"><SelectValue placeholder="Filtrar status" /></SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">Todos os Status</SelectItem>
                      <SelectItem value="pending">Pendentes</SelectItem>
                      <SelectItem value="approved">Aprovados</SelectItem>
                      <SelectItem value="paid">Pagos</SelectItem>
                      <SelectItem value="rejected">Rejeitados</SelectItem>
                  </SelectContent>
              </Select>
              <Button onClick={() => setIsFormOpen(true)} className="shadow-lg">
                  <PlusCircle className="mr-2 size-4" /> Nova Solicitação
              </Button>
          </div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <Table>
              <TableHeader className="bg-muted/50">
                  <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Solicitante</TableHead>
                      <TableHead>Objetivo</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                  {isLoading ? (
                      <TableRow><TableCell colSpan={7} className="h-32 text-center"><Loader2 className="size-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                  ) : filteredRequests.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground italic">Nenhuma solicitação encontrada.</TableCell></TableRow>
                  ) : (
                      filteredRequests.map(req => {
                          const config = statusConfig[req.status];
                          return (
                              <TableRow key={req.id} className="group hover:bg-muted/30">
                                  <TableCell className="text-xs text-muted-foreground">
                                      {format(req.createdAt.toDate(), 'dd/MM/yy HH:mm')}
                                  </TableCell>
                                  <TableCell>
                                      <div className="flex flex-col">
                                          <span className="font-bold text-slate-900">{req.requesterName}</span>
                                          <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">{req.email}</span>
                                      </div>
                                  </TableCell>
                                  <TableCell>
                                      <Badge variant="outline" className="bg-white text-[10px] font-black uppercase">
                                          {objectiveLabels[req.objective]}
                                      </Badge>
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground uppercase font-bold">{req.category}</TableCell>
                                  <TableCell className="font-black text-slate-900">
                                      R$ {req.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </TableCell>
                                  <TableCell>
                                      <Badge className={cn("text-[10px] font-black uppercase border-none", config.color)}>
                                          <config.icon className="size-3 mr-1" /> {config.label}
                                      </Badge>
                                  </TableCell>
                                  <TableCell className="text-right">
                                      <div className="flex justify-end gap-1">
                                          {req.status === 'pending' && (
                                              <>
                                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600" onClick={() => handleStatusChange(req.id, 'approved')} title="Aprovar">
                                                      <CheckCircle className="size-4" />
                                                  </Button>
                                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => handleStatusChange(req.id, 'rejected')} title="Rejeitar">
                                                      <XCircle className="size-4" />
                                                  </Button>
                                              </>
                                          )}
                                          {req.status === 'approved' && (
                                              <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600" onClick={() => handleStatusChange(req.id, 'paid')} title="Marcar como Pago">
                                                  <DollarSign className="size-4" />
                                              </Button>
                                          )}
                                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => deleteFinanceRequest(req.id)} title="Excluir">
                                              <Trash2 className="size-4" />
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

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                      <PlusCircle className="size-5 text-primary" />
                      Nova Solicitação Financeira
                  </DialogTitle>
                  <DialogDescription>Preencha os campos abaixo para solicitar um pagamento ou reembolso.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSaveRequest} className="space-y-6 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                          <Label className="text-[10px] uppercase font-black text-muted-foreground">Nome do Solicitante *</Label>
                          <Input required value={formData.requesterName} onChange={e => setFormData(p => ({...p, requesterName: e.target.value}))} placeholder="Seu nome completo" />
                      </div>
                      <div className="space-y-2">
                          <Label className="text-[10px] uppercase font-black text-muted-foreground">E-mail *</Label>
                          <Input required type="email" value={formData.email} onChange={e => setFormData(p => ({...p, email: e.target.value}))} placeholder="seu@email.com" />
                      </div>
                      <div className="space-y-2">
                          <Label className="text-[10px] uppercase font-black text-muted-foreground">Celular</Label>
                          <Input value={formData.phone} onChange={e => setFormData(p => ({...p, phone: e.target.value}))} placeholder="(21) 9..." />
                      </div>
                      <div className="space-y-2">
                          <Label className="text-[10px] uppercase font-black text-muted-foreground">Objetivo da Solicitação *</Label>
                          <Select value={formData.objective} onValueChange={(v: any) => setFormData(p => ({...p, objective: v}))}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="reembolso">Reembolso</SelectItem>
                                  <SelectItem value="pagamento">Solicitar Pagamento</SelectItem>
                                  <SelectItem value="prestacao_contas">Prestação de Contas</SelectItem>
                              </SelectContent>
                          </Select>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                          <Label className="text-[10px] uppercase font-black text-muted-foreground">Categoria (Ministério/Evento)</Label>
                          <Input value={formData.category} onChange={e => setFormData(p => ({...p, category: e.target.value}))} placeholder="Ex: Louvor, Conferência..." />
                      </div>
                      <div className="space-y-2">
                          <Label className="text-[10px] uppercase font-black text-muted-foreground">Valor (R$) *</Label>
                          <Input required type="number" step="0.01" value={formData.amount} onChange={e => setFormData(p => ({...p, amount: e.target.value}))} placeholder="0,00" />
                      </div>
                  </div>

                  <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-black text-muted-foreground">Descrição da Despesa *</Label>
                      <Textarea required value={formData.description} onChange={e => setFormData(p => ({...p, description: e.target.value}))} placeholder="Descreva detalhadamente a finalidade do gasto..." />
                  </div>

                  {(formData.objective === 'reembolso' || formData.objective === 'pagamento') && (
                      <div className="space-y-2 animate-in slide-in-from-top-2">
                          <Label className="text-[10px] uppercase font-black text-primary flex items-center gap-1">
                              <DollarSign size={10}/> Chave PIX para Depósito
                          </Label>
                          <Input value={formData.pixKey} onChange={e => setFormData(p => ({...p, pixKey: e.target.value}))} placeholder="CPF, E-mail, Celular ou Aleatória" />
                      </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                          <Label className="text-[10px] uppercase font-black text-muted-foreground">Data para Pagamento</Label>
                          <Input type="date" value={formData.dueDate} onChange={e => setFormData(p => ({...p, dueDate: e.target.value}))} />
                      </div>
                      <div className="space-y-2">
                          <Label className="text-[10px] uppercase font-black text-muted-foreground">Link de Compra (Se houver)</Label>
                          <Input type="url" value={formData.purchaseLink} onChange={e => setFormData(p => ({...p, purchaseLink: e.target.value}))} placeholder="https://..." />
                      </div>
                  </div>

                  <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-black text-muted-foreground flex items-center gap-1">
                          <Receipt size={10}/> Recibo ou Nota Fiscal
                      </Label>
                      <div className="border-2 border-dashed rounded-lg p-6 text-center bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer">
                          <History size={24} className="mx-auto mb-2 text-muted-foreground opacity-50" />
                          <p className="text-xs text-muted-foreground">O upload de anexos será liberado em breve.<br/>Por enquanto, anexe o link ou envie ao tesoureiro.</p>
                          <Input type="file" className="hidden" disabled />
                      </div>
                  </div>

                  <DialogFooter className="border-t pt-6">
                      <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                      <Button type="submit" disabled={isSaving}>
                          {isSaving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Send className="mr-2 size-4" />}
                          Enviar Solicitação
                      </Button>
                  </DialogFooter>
              </form>
          </DialogContent>
      </Dialog>
    </div>
  );
}
