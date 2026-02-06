
'use client';
import React, { useState, useMemo } from 'react';
import { useVolunteering, type FinancialTransaction } from '@/contexts/volunteering-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, PlusCircle, Trash2, HeartHandshake, User, Calendar as CalendarIcon, DollarSign } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function TithesOfferingsManager() {
  const { users, financialTransactions, addFinancialTransaction, deleteFinancialTransaction, isLoading } = useVolunteering();
  
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    memberId: 'null',
    category: 'Dízimo',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'PIX' as any,
    description: '',
  });

  const categories = ["Dízimo", "Oferta Alçada", "Oferta de Célula", "Oferta Especial", "Primícias"];
  const paymentMethods = ["PIX", "Dinheiro", "Cartão", "Transferência"];

  const incomeTransactions = useMemo(() => {
    return financialTransactions.filter(t => t.type === 'income' && categories.includes(t.category));
  }, [financialTransactions]);

  const handleSave = async () => {
    if (!formData.amount || isNaN(Number(formData.amount))) return;
    setIsSaving(true);

    const transactionData = {
      type: 'income' as const,
      category: formData.category,
      amount: Number(formData.amount),
      date: Timestamp.fromDate(new Date(`${formData.date}T12:00:00`)),
      description: formData.description,
      status: 'paid' as const,
      memberId: formData.memberId === 'null' ? '' : formData.memberId,
      paymentMethod: formData.paymentMethod,
    };

    await addFinancialTransaction(transactionData);
    setFormData(prev => ({ ...prev, amount: '', description: '' }));
    setIsSaving(false);
  };

  const userMap = useMemo(() => new Map(users.map(u => [u.id, u.name])), [users]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HeartHandshake className="size-5 text-primary" />
            Registrar Entrada
          </CardTitle>
          <CardDescription>Lance dízimos e ofertas recebidas de forma manual.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Membro (Opcional)</Label>
            <Select value={formData.memberId} onValueChange={(v) => setFormData(p => ({...p, memberId: v}))}>
              <SelectTrigger><SelectValue placeholder="Pesquisar membro..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="null">Visitante / Anônimo</SelectItem>
                {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={formData.category} onValueChange={(v) => setFormData(p => ({...p, category: v}))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Valor (R$)</Label>
            <Input 
              type="number" 
              placeholder="0,00" 
              value={formData.amount} 
              onChange={e => setFormData(p => ({...p, amount: e.target.value}))} 
            />
          </div>
          <div className="space-y-2">
            <Label>Data</Label>
            <Input 
              type="date" 
              value={formData.date} 
              onChange={e => setFormData(p => ({...p, date: e.target.value}))} 
            />
          </div>
          <div className="space-y-2">
            <Label>Meio de Pagamento</Label>
            <Select value={formData.paymentMethod} onValueChange={(v) => setFormData(p => ({...p, paymentMethod: v}))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {paymentMethods.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Observação</Label>
            <Input 
              placeholder="Ex: Ref. Culto da Família" 
              value={formData.description}
              onChange={e => setFormData(p => ({...p, description: e.target.value}))}
            />
          </div>
        </CardContent>
        <CardFooter className="justify-end border-t pt-4">
          <Button onClick={handleSave} disabled={isSaving || !formData.amount}>
            {isSaving && <Loader2 className="mr-2 size-4 animate-spin" />}
            Confirmar Registro
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Entradas</CardTitle>
          <CardDescription>Últimos dízimos e ofertas lançados.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Membro</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incomeTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">Nenhuma entrada registrada.</TableCell>
                  </TableRow>
                ) : (
                  incomeTransactions.map(t => (
                    <TableRow key={t.id}>
                      <TableCell>{format(t.date.toDate(), 'dd/MM/yyyy')}</TableCell>
                      <TableCell className="font-medium">
                        {t.memberId ? (
                          <div className="flex items-center gap-2">
                            <User className="size-3 text-muted-foreground" />
                            {userMap.get(t.memberId)}
                          </div>
                        ) : 'Anônimo'}
                      </TableCell>
                      <TableCell><Badge variant="secondary">{t.category}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{t.paymentMethod}</TableCell>
                      <TableCell className="text-right font-bold text-emerald-600">R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteFinancialTransaction(t.id)}>
                          <Trash2 className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
