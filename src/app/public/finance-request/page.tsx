'use client';

import React, { useState } from 'react';
import { initializeFirebase } from '@/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, DollarSign, Receipt, History, Wallet, CheckCircle2 } from 'lucide-react';
import { Logo } from '@/components/icons';

export default function PublicFinanceRequestPage() {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    requesterName: '',
    phone: '',
    email: '',
    category: '',
    description: '',
    amount: '',
    objective: 'reembolso' as 'reembolso' | 'pagamento' | 'prestacao_contas',
    pixKey: '',
    dueDate: new Date().toISOString().split('T')[0],
    purchaseLink: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.requesterName || !formData.email || !formData.amount) {
        toast({ variant: 'destructive', title: "Campos obrigatórios", description: "Preencha nome, email e valor." });
        return;
    }
    
    setIsSaving(true);
    try {
        const { firestore } = initializeFirebase();
        await addDoc(collection(firestore, 'finance_requests'), {
            ...formData,
            amount: Number(formData.amount),
            status: 'pending',
            createdAt: Timestamp.now(),
        });
        setSubmitted(true);
        toast({ title: "Solicitação Enviada!", description: "Sua solicitação foi registrada com sucesso." });
    } catch (e) {
        console.error(e);
        toast({ variant: 'destructive', title: "Erro ao enviar", description: "Não foi possível enviar sua solicitação agora." });
    } finally {
        setIsSaving(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8 border-t-8 border-emerald-600 shadow-2xl">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="text-emerald-600 size-10" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">Solicitação Enviada!</h2>
          <p className="text-muted-foreground mb-8">
            Sua solicitação de {formData.objective === 'reembolso' ? 'reembolso' : formData.objective === 'pagamento' ? 'pagamento' : 'prestação de contas'} foi protocolada e será analisada pela tesouraria.
          </p>
          <Button onClick={() => setSubmitted(false)} variant="outline" className="w-full">
            Enviar Outra Solicitação
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex flex-col items-center gap-4 text-center mb-8">
            <div className="p-3 bg-primary rounded-2xl shadow-lg shadow-primary/20">
                <Logo className="size-8 text-white" />
            </div>
            <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase italic">OikoApp Financeiro</h1>
                <p className="text-muted-foreground font-medium">Igreja Batista da Manhã - Protocolo de Pagamentos</p>
            </div>
        </div>

        <Card className="shadow-xl border-none">
          <CardHeader className="bg-slate-900 text-white rounded-t-xl py-8">
            <CardTitle className="flex items-center gap-2 text-xl font-black uppercase tracking-tighter">
              <Wallet className="size-6 text-primary" />
              Nova Solicitação
            </CardTitle>
            <CardDescription className="text-slate-400">
              Utilize este formulário para solicitar pagamentos, reembolsos ou prestar contas de ministérios.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6 pt-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black text-muted-foreground">Nome Completo *</Label>
                  <Input 
                    required 
                    value={formData.requesterName} 
                    onChange={e => setFormData(p => ({...p, requesterName: e.target.value}))} 
                    placeholder="Quem está solicitando?" 
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black text-muted-foreground">E-mail para Contato *</Label>
                  <Input 
                    required 
                    type="email" 
                    value={formData.email} 
                    onChange={e => setFormData(p => ({...p, email: e.target.value}))} 
                    placeholder="seu@email.com" 
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black text-muted-foreground">WhatsApp / Celular</Label>
                  <Input 
                    value={formData.phone} 
                    onChange={e => setFormData(p => ({...p, phone: e.target.value}))} 
                    placeholder="(21) 9..." 
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black text-muted-foreground">Objetivo da Solicitação *</Label>
                  <Select value={formData.objective} onValueChange={(v: any) => setFormData(p => ({...p, objective: v}))}>
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reembolso">Reembolso</SelectItem>
                      <SelectItem value="pagamento">Solicitar Pagamento</SelectItem>
                      <SelectItem value="prestacao_contas">Prestação de Contas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black text-muted-foreground">Ministério / Evento</Label>
                  <Input 
                    value={formData.category} 
                    onChange={e => setFormData(p => ({...p, category: e.target.value}))} 
                    placeholder="Ex: Louvor, GC, Conferência..." 
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black text-muted-foreground">Valor (R$) *</Label>
                  <Input 
                    required 
                    type="number" 
                    step="0.01" 
                    value={formData.amount} 
                    onChange={e => setFormData(p => ({...p, amount: e.target.value}))} 
                    placeholder="0,00" 
                    className="h-11 font-bold text-lg text-primary"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black text-muted-foreground">Descrição da Despesa *</Label>
                <Textarea 
                    required 
                    value={formData.description} 
                    onChange={e => setFormData(p => ({...p, description: e.target.value}))} 
                    placeholder="Explique detalhadamente a finalidade deste gasto..." 
                    className="min-h-[100px] resize-none"
                />
              </div>

              {(formData.objective === 'reembolso' || formData.objective === 'pagamento') && (
                <div className="space-y-2 animate-in slide-in-from-top-2">
                  <Label className="text-[10px] uppercase font-black text-primary flex items-center gap-1">
                    <DollarSign size={10}/> Chave PIX para Depósito
                  </Label>
                  <Input 
                    value={formData.pixKey} 
                    onChange={e => setFormData(p => ({...p, pixKey: e.target.value}))} 
                    placeholder="CPF, E-mail, Celular ou Chave Aleatória" 
                    className="h-11"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black text-muted-foreground">Previsão / Data Limite</Label>
                  <Input 
                    type="date" 
                    value={formData.dueDate} 
                    onChange={e => setFormData(p => ({...p, dueDate: e.target.value}))} 
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black text-muted-foreground">Link de Compra (Se houver)</Label>
                  <Input 
                    type="url" 
                    value={formData.purchaseLink} 
                    onChange={e => setFormData(p => ({...p, purchaseLink: e.target.value}))} 
                    placeholder="https://..." 
                    className="h-11"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-4">
                <Label className="text-[10px] uppercase font-black text-muted-foreground flex items-center gap-1">
                  <Receipt size={10}/> Comprovante (Recibo/Nota)
                </Label>
                <div className="border-2 border-dashed rounded-xl p-8 text-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer border-slate-200">
                  <History size={32} className="mx-auto mb-2 text-slate-400 opacity-50" />
                  <p className="text-xs text-slate-500">
                    O upload direto será liberado em breve.<br/>
                    Por enquanto, <strong>envie o comprovante para a Tesouraria</strong><br/>via WhatsApp após terminar este formulário.
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50 rounded-b-xl p-8 border-t">
              <Button type="submit" disabled={isSaving} className="w-full h-14 text-base font-black shadow-xl shadow-primary/20">
                {isSaving ? <Loader2 className="mr-2 size-5 animate-spin" /> : <Send className="mr-2 size-5" />}
                Protocolar Solicitação Agora
              </Button>
            </CardFooter>
          </form>
        </Card>
        
        <p className="text-center text-[10px] text-muted-foreground uppercase font-black tracking-widest pb-8">
            Organização servindo ao organismo • IBM São Gonçalo
        </p>
      </div>
    </div>
  );
}
