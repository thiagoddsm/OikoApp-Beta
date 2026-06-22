'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useVolunteering, type FinanceRequest } from '@/contexts/volunteering-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, PlusCircle, Trash2, Clock, CheckCircle, XCircle,
  DollarSign, Wallet, Share2, Send, Eye, Link as LinkIcon,
  FileText, Paperclip, ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useMinisterialFinance } from "@/hooks/useDomainData";

export function FinanceRequestsManager() {
    const { financialTransactions, financeRequests } = useMinisterialFinance();

  const { addFinanceRequest, updateFinanceRequest, deleteFinanceRequest, isLoading } = useVolunteering();
  const { storage } = useFirebase();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [viewRequest, setViewRequest] = useState<FinanceRequest | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [filterStatus, setStatusFilter] = useState('all');

  // State for the attachment file in the creation form
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    requesterName: '',
    phone: '',
    email: '',
    category: 'Ministério',
    description: '',
    amount: '',
    objective: 'reembolso' as 'reembolso' | 'pagamento' | 'prestacao_contas',
    pixKey: '',
    dueDate: '',
    purchaseLink: '',
  });

  useEffect(() => {
    setFormData(prev => ({ ...prev, dueDate: new Date().toISOString().split('T')[0] }));
  }, []);

  const resetForm = () => {
    setFormData({
      requesterName: '', phone: '', email: '', category: 'Ministério',
      description: '', amount: '', objective: 'reembolso',
      pixKey: '', dueDate: new Date().toISOString().split('T')[0], purchaseLink: ''
    });
    setAttachmentFile(null);
  };

  const [filterDate, setFilterDate] = useState('');
  const [filterName, setFilterName] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const [filterObjective, setFilterObjective] = useState('all');
  const [filterAttachment, setFilterAttachment] = useState('all');
  const [sortConfig, setSortConfig] = useState<{ field: string; direction: 'asc' | 'desc' } | null>(null);

  const filteredRequests = useMemo(() => {
    let result = financeRequests.filter(r => {
      const matchStatus = filterStatus === 'all' || r.status === filterStatus;

      const rDate = r.createdAt ? format(r.createdAt.toDate(), 'dd/MM/yy HH:mm') : '';
      const matchDate = !filterDate || rDate.includes(filterDate);

      const nameEmail = `${r.requesterName} ${r.email}`.toLowerCase();
      const matchName = !filterName || nameEmail.includes(filterName.toLowerCase());

      const valStr = r.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
      const valBasicStr = r.amount.toString();
      const matchValue = !filterValue || valStr.includes(filterValue) || valBasicStr.includes(filterValue);

      const matchObjective = filterObjective === 'all' || r.objective === filterObjective;
      const matchAttachment = filterAttachment === 'all' || (filterAttachment === 'yes' ? !!r.attachmentUrl : !r.attachmentUrl);

      return matchStatus && matchDate && matchName && matchValue && matchObjective && matchAttachment;
    });

    if (sortConfig) {
      result.sort((a, b) => {
        let aVal: any = 0; let bVal: any = 0;
        switch (sortConfig.field) {
          case 'date': aVal = a.createdAt?.toMillis() || 0; bVal = b.createdAt?.toMillis() || 0; break;
          case 'name': aVal = a.requesterName.toLowerCase(); bVal = b.requesterName.toLowerCase(); break;
          case 'value': aVal = a.amount; bVal = b.amount; break;
          case 'status': aVal = a.status; bVal = b.status; break;
        }
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [financeRequests, filterStatus, filterDate, filterName, filterValue, filterObjective, filterAttachment, sortConfig]);

  const toggleSort = (field: string) => {
    setSortConfig(prev => {
      if (prev?.field === field) return { field, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      return { field, direction: 'asc' };
    });
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortConfig?.field !== field) return <ArrowUpDown className="ml-1 size-3 cursor-pointer text-muted-foreground hover:text-primary transition-colors inline" onClick={() => toggleSort(field)} />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="ml-1 size-3 cursor-pointer text-primary inline" onClick={() => toggleSort(field)} /> : <ArrowDown className="ml-1 size-3 cursor-pointer text-primary inline" onClick={() => toggleSort(field)} />;
  };

  const handleCopyPublicLink = async () => {
    const url = `${window.location.origin}/public/finance-request`;
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link Copiado!", description: "O link para o formulário público foi copiado para sua área de transferência." });
    } catch (err) {
      toast({
        title: "Copie o Link Manualmente",
        description: (
          <div className="flex flex-col gap-2">
            <p>Seu navegador bloqueou a cópia automática. Use o link abaixo:</p>
            <Input value={url} readOnly className="bg-muted text-sm" />
          </div>
        ),
        duration: 10000,
      });
    }
  };

  const handleSaveRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.requesterName || !formData.email || !formData.amount) return;

    setIsSaving(true);
    try {
      let attachmentUrl = '';
      if (attachmentFile && storage) {
        const filePath = `finance-attachments/${Date.now()}-${attachmentFile.name}`;
        const fileRef = ref(storage, filePath);
        await uploadBytes(fileRef, attachmentFile);
        attachmentUrl = await getDownloadURL(fileRef);
      }

      await addFinanceRequest({
        ...formData,
        amount: Number(formData.amount),
        attachmentUrl, // Add the URL to the request data
        status: 'pending',
        createdAt: Timestamp.now(),
      });

      toast({ title: "Solicitação Enviada!" });
      setIsFormOpen(false);
      resetForm();
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: "Erro ao enviar" });
    } finally {
      setIsSaving(false);
    }
  };

  const objectiveLabels = { reembolso: 'Reembolso', pagamento: 'Pagamento', prestacao_contas: 'Prestação de Contas' };

  const handleStatusChange = async (req: FinanceRequest, newStatus: FinanceRequest['status'], rejectionReason?: string) => {
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === 'rejected' && rejectionReason) {
        updateData.rejectionReason = rejectionReason;
      }
      await updateFinanceRequest(req.id, updateData);
      toast({ title: "Status Atualizado" });

      if (req.phone && (newStatus === 'approved' || newStatus === 'rejected' || newStatus === 'paid')) {
        try {
          const response = await fetch('/api/finance/notify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              requesterName: req.requesterName,
              phone: req.phone,
              amount: req.amount,
              objective: req.objective,
              newStatus: newStatus,
              rejectionReason: rejectionReason
            }),
          });

          if (!response.ok) {
            const errData = await response.json().catch(() => ({ error: 'Erro de comunicação com o servidor' }));
            throw new Error(errData.error || `HTTP ${response.status}`);
          }

          toast({ title: "Notificação Enviada", description: "O solicitante foi avisado pelo WhatsApp." });
        } catch (error: any) {
          console.error("Erro ao enviar WhatsApp:", error);
          toast({ variant: 'destructive', title: "Erro na Notificação", description: `Não foi possível avisar o solicitante via WhatsApp: ${error.message}` });
        }
      } else if (!req.phone && (newStatus === 'approved' || newStatus === 'rejected' || newStatus === 'paid')) {
        toast({ title: "Aviso", description: "Solicitante sem telefone. Notificação não enviada." });
      }
    } catch (dbError: any) {
      console.error("Erro ao atualizar status no banco:", dbError);
      toast({ variant: 'destructive', title: "Erro ao Atualizar", description: "Não foi possível atualizar o status no banco de dados." });
    }
  };


  const statusConfig = {
    pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    approved: { label: 'Aprovado', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
    paid: { label: 'Pago', color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle },
    rejected: { label: 'Rejeitado', color: 'bg-red-100 text-red-800', icon: XCircle },
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-lg font-black uppercase flex items-center gap-2"><Wallet className="size-5 text-primary" /> Fluxo de Solicitações</h3>
          <p className="text-sm text-muted-foreground">Gerencie pagamentos, reembolsos e prestação de contas dos ministérios.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleCopyPublicLink} className="h-10"><Share2 className="mr-2 size-4" /> Copiar Link Público</Button>
          <Button onClick={() => setIsFormOpen(true)} className="shadow-lg h-10"><PlusCircle className="mr-2 size-4" /> Nova Solicitação</Button>
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="align-top py-3">
                <div className="mb-2 flex items-center">Data <SortIcon field="date" /></div>
                <Input placeholder="Buscar..." value={filterDate} onChange={e => setFilterDate(e.target.value)} className="h-7 text-[10px] w-24 px-2 font-normal bg-white" />
              </TableHead>
              <TableHead className="align-top py-3">
                <div className="mb-2 flex items-center">Solicitante <SortIcon field="name" /></div>
                <Input placeholder="Nome ou e-mail..." value={filterName} onChange={e => setFilterName(e.target.value)} className="h-7 text-[10px] w-40 px-2 font-normal bg-white" />
              </TableHead>
              <TableHead className="align-top py-3">
                <div className="mb-2">Objetivo</div>
                <Select value={filterObjective} onValueChange={setFilterObjective}>
                  <SelectTrigger className="h-7 text-[10px] w-[110px] px-2 bg-white"><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-[10px]">Todos</SelectItem>
                    <SelectItem value="reembolso" className="text-[10px]">Reembolso</SelectItem>
                    <SelectItem value="pagamento" className="text-[10px]">Pagamento</SelectItem>
                    <SelectItem value="prestacao_contas" className="text-[10px]">Prestação</SelectItem>
                  </SelectContent>
                </Select>
              </TableHead>
              <TableHead className="align-top py-3">
                <div className="mb-2 text-center">Anexo</div>
                <Select value={filterAttachment} onValueChange={setFilterAttachment}>
                  <SelectTrigger className="h-7 text-[10px] w-[80px] px-2 mx-auto bg-white"><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-[10px]">Todos</SelectItem>
                    <SelectItem value="yes" className="text-[10px]">Com anexo</SelectItem>
                    <SelectItem value="no" className="text-[10px]">Sem anexo</SelectItem>
                  </SelectContent>
                </Select>
              </TableHead>
              <TableHead className="align-top py-3">
                <div className="mb-2 flex items-center">Valor <SortIcon field="value" /></div>
                <Input placeholder="R$..." value={filterValue} onChange={e => setFilterValue(e.target.value)} className="h-7 text-[10px] w-20 px-2 font-normal bg-white" />
              </TableHead>
              <TableHead className="align-top py-3">
                <div className="mb-2 flex items-center">Status <SortIcon field="status" /></div>
                <Select value={filterStatus} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-7 text-[10px] w-[95px] px-2 bg-white"><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-[10px]">Todos</SelectItem>
                    <SelectItem value="pending" className="text-[10px]">Pendentes</SelectItem>
                    <SelectItem value="approved" className="text-[10px]">Aprovados</SelectItem>
                    <SelectItem value="paid" className="text-[10px]">Pagos</SelectItem>
                    <SelectItem value="rejected" className="text-[10px]">Rejeitados</SelectItem>
                  </SelectContent>
                </Select>
              </TableHead>
              <TableHead className="text-right align-top pt-3"><div className="mb-2">Ações</div></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="h-32 text-center"><Loader2 className="size-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
            ) : filteredRequests.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground italic">Nenhuma solicitação encontrada.</TableCell></TableRow>
            ) : (
              filteredRequests.map(req => {
                const config = statusConfig[req.status] || statusConfig.pending;
                return (
                  <TableRow key={req.id} className="group hover:bg-muted/30">
                    <TableCell className="text-xs text-muted-foreground">{req.createdAt ? format(req.createdAt.toDate(), 'dd/MM/yy HH:mm') : '-'}</TableCell>
                    <TableCell><div className="flex flex-col"><span className="font-bold text-slate-900">{req.requesterName}</span><span className="text-[10px] text-muted-foreground truncate max-w-[150px]">{req.email}</span></div></TableCell>
                    <TableCell><Badge variant="outline" className="bg-white text-[10px] font-black uppercase">{objectiveLabels[req.objective]}</Badge></TableCell>
                    <TableCell className="text-center">{!!req.attachmentUrl && <span title="Esta solicitação possui um anexo" className="flex justify-center"><Paperclip className="size-4 text-muted-foreground" /></span>}</TableCell>
                    <TableCell className="font-black text-slate-900">R$ {req.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell><Badge className={cn("text-[10px] font-black uppercase border-none", config.color)}><config.icon className="size-3 mr-1" /> {config.label}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => setViewRequest(req)} title="Ver Detalhes"><Eye className="size-4" /></Button>
                        {req.status === 'pending' && (
                          <>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600" onClick={() => handleStatusChange(req, 'approved')} title="Aprovar">
                              <CheckCircle className="size-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => {
                              const reason = prompt("Informe o motivo da rejeição (opcional):");
                              if (reason === null) return;
                              handleStatusChange(req, 'rejected', reason || undefined);
                            }} title="Rejeitar">
                              <XCircle className="size-4" />
                            </Button>
                          </>
                        )}
                        {req.status === 'approved' && <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600" onClick={() => handleStatusChange(req, 'paid')} title="Marcar como Pago"><DollarSign className="size-4" /></Button>}
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => deleteFinanceRequest(req.id)} title="Excluir"><Trash2 className="size-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isFormOpen} onOpenChange={(isOpen) => { if (!isOpen) resetForm(); setIsFormOpen(isOpen); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><PlusCircle className="size-5 text-primary" /> Nova Solicitação Financeira</DialogTitle>
            <DialogDescription>Preencha os campos abaixo para solicitar um pagamento ou reembolso.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveRequest} className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="text-[10px] uppercase font-black text-muted-foreground">Nome do Solicitante *</Label><Input required value={formData.requesterName} onChange={e => setFormData(p => ({ ...p, requesterName: e.target.value }))} placeholder="Seu nome completo" /></div>
              <div className="space-y-2"><Label className="text-[10px] uppercase font-black text-muted-foreground">E-mail *</Label><Input type="email" required value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} placeholder="seu@email.com" /></div>
              <div className="space-y-2"><Label className="text-[10px] uppercase font-black text-muted-foreground">Celular</Label><Input value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} placeholder="(21) 9..." /></div>
              <div className="space-y-2"><Label className="text-[10px] uppercase font-black text-muted-foreground">Objetivo *</Label><Select value={formData.objective} onValueChange={(v: any) => setFormData(p => ({ ...p, objective: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="reembolso">Reembolso</SelectItem><SelectItem value="pagamento">Solicitar Pagamento</SelectItem><SelectItem value="prestacao_contas">Prestação de Contas</SelectItem></SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="text-[10px] uppercase font-black text-muted-foreground">Categoria</Label><Input value={formData.category} onChange={e => setFormData(p => ({ ...p, category: e.target.value }))} placeholder="Ex: Louvor, Conferência..." /></div>
              <div className="space-y-2"><Label className="text-[10px] uppercase font-black text-muted-foreground">Valor (R$) *</Label><Input type="number" step="0.01" required value={formData.amount} onChange={e => setFormData(p => ({ ...p, amount: e.target.value }))} placeholder="0,00" /></div>
            </div>
            <div className="space-y-2"><Label className="text-[10px] uppercase font-black text-muted-foreground">Descrição da Despesa *</Label><Textarea required value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="Descreva detalhadamente a finalidade do gasto..." /></div>
            {(formData.objective === 'reembolso' || formData.objective === 'pagamento') && (<div className="space-y-2 animate-in slide-in-from-top-2"><Label className="text-[10px] uppercase font-black text-primary flex items-center gap-1"><DollarSign size={10} /> Chave PIX</Label><Input value={formData.pixKey} onChange={e => setFormData(p => ({ ...p, pixKey: e.target.value }))} placeholder="CPF, E-mail, Celular ou Aleatória" /></div>)}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="text-[10px] uppercase font-black text-muted-foreground">Data para Pagamento</Label><Input type="date" value={formData.dueDate} onChange={e => setFormData(p => ({ ...p, dueDate: e.target.value }))} /></div>
              <div className="space-y-2"><Label className="text-[10px] uppercase font-black text-muted-foreground">Link de Compra</Label><Input type="url" value={formData.purchaseLink} onChange={e => setFormData(p => ({ ...p, purchaseLink: e.target.value }))} placeholder="https://..." /></div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black text-muted-foreground flex items-center gap-1.5"><Paperclip size={12} /> Anexar Comprovante / Nota Fiscal</Label>
              <Input type="file" onChange={(e) => setAttachmentFile(e.target.files ? e.target.files[0] : null)} className="pt-2 text-xs h-auto" />
              {attachmentFile && <p className="text-xs text-muted-foreground italic mt-1">Arquivo: {attachmentFile.name}</p>}
            </div>
            <DialogFooter className="border-t pt-6">
              <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
              <Button type="submit" disabled={isSaving}>{isSaving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Send className="mr-2 size-4" />} Enviar Solicitação</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewRequest} onOpenChange={() => setViewRequest(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileText className="size-5 text-primary" /> Detalhes da Solicitação</DialogTitle>
            <DialogDescription>Visualize as informações completas da solicitação de {viewRequest?.requesterName}.</DialogDescription>
          </DialogHeader>
          {viewRequest && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4"><div><Label className="text-[10px] uppercase font-black text-muted-foreground">Solicitante</Label><p className="text-sm font-bold">{viewRequest.requesterName}</p><p className="text-xs text-muted-foreground">{viewRequest.email}</p></div><div><Label className="text-[10px] uppercase font-black text-muted-foreground">Objetivo</Label><p className="text-sm font-bold uppercase tracking-tight">{objectiveLabels[viewRequest.objective]}</p></div></div>
              <div className="grid grid-cols-2 gap-4"><div><Label className="text-[10px] uppercase font-black text-muted-foreground">Categoria</Label><p className="text-sm font-bold uppercase">{viewRequest.category}</p></div><div><Label className="text-[10px] uppercase font-black text-muted-foreground">Valor Solicitado</Label><p className="text-xl font-black text-primary">R$ {viewRequest.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p></div></div>
              <div><Label className="text-[10px] uppercase font-black text-muted-foreground">Descrição</Label><div className="bg-muted/30 p-3 rounded-lg text-sm whitespace-pre-wrap mt-1">{viewRequest.description || "N/A"}</div></div>
              {(viewRequest.objective === 'reembolso' || viewRequest.objective === 'pagamento') && (<div className="p-4 bg-primary/5 border border-primary/10 rounded-xl"><div><Label className="text-[10px] uppercase font-black text-primary flex items-center gap-1"><DollarSign size={10} /> Chave PIX</Label><p className="font-mono text-sm font-bold mt-1">{viewRequest.pixKey || "Não informada"}</p></div></div>)}
              <div className="grid grid-cols-2 gap-4"><div><Label className="text-[10px] uppercase font-black text-muted-foreground">Data Desejada</Label><p className="text-sm font-bold">{viewRequest.dueDate ? format(new Date(viewRequest.dueDate + 'T12:00:00'), 'dd/MM/yyyy') : '-'}</p></div><div><Label className="text-[10px] uppercase font-black text-muted-foreground">Link de Compra</Label>{viewRequest.purchaseLink ? (<Button asChild variant="link" className="h-auto p-0 text-blue-600"><a href={viewRequest.purchaseLink} target="_blank" rel="noopener noreferrer"><LinkIcon size={12} className="mr-1" /> Abrir Link</a></Button>) : <p className="text-sm text-muted-foreground">-</p>}</div></div>
              {viewRequest.attachmentUrl && (<div><Label className="text-[10px] uppercase font-black text-muted-foreground">Anexo</Label><Button asChild variant="secondary" className="w-full"><a href={viewRequest.attachmentUrl} target="_blank" rel="noopener noreferrer"><Paperclip size={12} className="mr-2" /> Ver Comprovante</a></Button></div>)}
            </div>
          )}
          <DialogFooter className="border-t pt-6 gap-2"><DialogClose asChild><Button variant="outline">Fechar</Button></DialogClose></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
