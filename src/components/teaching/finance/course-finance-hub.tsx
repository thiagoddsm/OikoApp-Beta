'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  DollarSign, CheckCircle2, Clock, TrendingUp, PlusCircle,
  Users, Receipt, Settings2, Loader2, Save, RefreshCw, Pencil,
} from 'lucide-react';
import { MensalidadesManager } from './mensalidades-manager';
import { AcademicEnrollmentWizard } from '@/components/teaching/enrollment-wizard-dialog';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, limit, doc } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CourseFinanceHubProps {
  courseId: string;
  courseName: string;
  course?: any;
}

export function CourseFinanceHub({ courseId, courseName, course }: CourseFinanceHubProps) {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const [showWizard, setShowWizard] = useState(false);
  const [editingConfig, setEditingConfig] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // ─── Financial Config State (loaded from course document) ────────────────
  const [isPaid, setIsPaid] = useState<boolean>(course?.financeConfig?.isPaid ?? true);
  const [totalAmount, setTotalAmount] = useState<string>(course?.financeConfig?.totalAmount?.toString() ?? '100');
  const [installments, setInstallments] = useState<string>(course?.financeConfig?.installments?.toString() ?? '1');
  const [recurrence, setRecurrence] = useState<string>(course?.financeConfig?.recurrence ?? 'once'); // 'once' | 'monthly'
  const [dueDay, setDueDay] = useState<string>(course?.financeConfig?.dueDay?.toString() ?? '10');
  const [paymentMethod, setPaymentMethod] = useState<string>(course?.financeConfig?.paymentMethod ?? 'pix'); // 'pix' | 'boleto' | 'cartao' | 'dinheiro'

  // Sync when course prop changes
  useEffect(() => {
    if (course?.financeConfig) {
      const c = course.financeConfig;
      setIsPaid(c.isPaid ?? true);
      setTotalAmount(c.totalAmount?.toString() ?? '100');
      setInstallments(c.installments?.toString() ?? '1');
      setRecurrence(c.recurrence ?? 'once');
      setDueDay(c.dueDay?.toString() ?? '10');
      setPaymentMethod(c.paymentMethod ?? 'pix');
    }
  }, [course]);

  const configSaved = !!course?.financeConfig;
  const installmentValue = isPaid
    ? (Number(totalAmount) / Math.max(Number(installments), 1)).toFixed(2)
    : '0.00';

  const handleSaveConfig = async () => {
    if (!firestore) return;
    setIsSavingConfig(true);
    try {
      const docRef = doc(firestore, 'courses', courseId);
      const financeConfig = {
        isPaid,
        totalAmount: Number(totalAmount),
        installments: Number(installments),
        recurrence,
        dueDay: Number(dueDay),
        paymentMethod,
      };
      await updateDocumentNonBlocking(docRef, { financeConfig });
      toast({ title: '✅ Configuração Salva', description: 'As configurações financeiras do curso foram atualizadas.' });
      setEditingConfig(false);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao Salvar', description: err.message });
    } finally {
      setIsSavingConfig(false);
    }
  };

  // ─── Cobranças (tuition_fees) ────────────────────────────────────────────
  const feesQ = useMemoFirebase(
    () => (firestore && user ? query(collection(firestore, 'tuition_fees'), limit(500)) : null),
    [firestore, user]
  );
  const { data: allFees } = useCollection<any>(feesQ);

  const fees = useMemo(
    () => (allFees ?? []).filter((f: any) => f.courseName === courseName || f.courseId === courseId),
    [allFees, courseId, courseName]
  );

  const metrics = useMemo(() => {
    const paid    = fees.filter(f => f.status === 'pago' || f.status === 'paid');
    const pending = fees.filter(f => f.status === 'em_aberto' || f.status === 'pending');
    const totalReceived  = paid.reduce((a, f) => a + (f.amount || 0), 0);
    const totalPending   = pending.reduce((a, f) => a + (f.amount || 0), 0);
    const totalProjected = fees.reduce((a, f) => a + (f.amount || 0), 0);
    const uniqueStudents = new Set(fees.map(f => f.studentId)).size;
    const adimplencia    = fees.length > 0 ? Math.round((paid.length / fees.length) * 100) : 100;
    return { totalReceived, totalPending, totalProjected, uniqueStudents, adimplencia, paidCount: paid.length, pendingCount: pending.length };
  }, [fees]);

  const kpis = [
    { label: 'Arrecadado',    value: `R$ ${metrics.totalReceived.toLocaleString('pt-BR',  { minimumFractionDigits: 2 })}`, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', sub: `${metrics.paidCount} parcela(s) paga(s)` },
    { label: 'Em Aberto',     value: `R$ ${metrics.totalPending.toLocaleString('pt-BR',   { minimumFractionDigits: 2 })}`, icon: Clock,        color: 'text-amber-600',  bg: 'bg-amber-50',   sub: `${metrics.pendingCount} parcela(s)` },
    { label: 'Projeção Total',value: `R$ ${metrics.totalProjected.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: TrendingUp,   color: 'text-indigo-600', bg: 'bg-indigo-50',  sub: `${metrics.uniqueStudents} aluno(s) inscritos` },
    { label: 'Adimplência',   value: `${metrics.adimplencia}%`, icon: Receipt, color: metrics.adimplencia >= 80 ? 'text-emerald-600' : 'text-rose-600', bg: metrics.adimplencia >= 80 ? 'bg-emerald-50' : 'bg-rose-50', sub: fees.length > 0 ? `${metrics.paidCount} de ${fees.length} cobranças` : 'Sem cobranças' },
  ];

  // ─── Helpers ─────────────────────────────────────────────────────────────
  const recurrenceLabel: Record<string, string> = { once: 'Pagamento Único', monthly: 'Mensal (Mensalidade)' };
  const methodLabel: Record<string, string>     = { pix: 'Pix', boleto: 'Boleto', cartao: 'Cartão', dinheiro: 'Dinheiro/Caixa' };

  return (
    <div className="space-y-6">

      {/* ── Painel de Configuração Financeira ──────────────────────────── */}
      <Card className={cn('border-2 transition-colors', editingConfig ? 'border-indigo-300' : configSaved ? 'border-emerald-200 bg-emerald-50/30' : 'border-dashed border-slate-200')}>
        <CardHeader className="pb-3 flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-sm font-black flex items-center gap-2">
              <Settings2 className="size-4 text-indigo-600" />
              Configuração Financeira do Curso
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Defina o valor do curso, o parcelamento máximo permitido para os alunos, vencimento e forme de pagamento padrão.
            </CardDescription>
          </div>
          {!editingConfig && (
            <Button size="sm" variant="outline" className="shrink-0 h-8 text-xs font-bold" onClick={() => setEditingConfig(true)}>
              <Pencil className="size-3.5 mr-1.5" />
              {configSaved ? 'Editar' : 'Configurar'}
            </Button>
          )}
        </CardHeader>

        <CardContent className="space-y-4">

          {/* Resumo (modo leitura) */}
          {!editingConfig && configSaved && (
            <div className="flex flex-wrap gap-3">
              <Badge variant={isPaid ? 'default' : 'secondary'} className="font-bold">
                {isPaid ? '💰 Pago' : '🎓 Gratuito'}
              </Badge>
              {isPaid && (
                <>
                  <Badge variant="outline" className="font-bold text-indigo-700 border-indigo-300">
                    R$ {Number(totalAmount).toFixed(2).replace('.', ',')}
                    {Number(installments) > 1 ? ` (Permite até ${installments}x)` : ' (À vista)'}
                  </Badge>
                  <Badge variant="outline" className="font-bold text-slate-600">
                    {recurrenceLabel[recurrence] ?? recurrence}
                  </Badge>
                  <Badge variant="outline" className="font-bold text-slate-600">
                    Vence dia {dueDay}
                  </Badge>
                  <Badge variant="outline" className="font-bold text-slate-600">
                    {methodLabel[paymentMethod] ?? paymentMethod}
                  </Badge>
                </>
              )}
            </div>
          )}

          {/* Placeholder (não configurado ainda) */}
          {!editingConfig && !configSaved && (
            <p className="text-xs text-muted-foreground italic">
              Nenhuma configuração financeira definida. Clique em "Configurar" para definir o valor e forma de pagamento.
            </p>
          )}

          {/* Formulário de edição */}
          {editingConfig && (
            <div className="space-y-5">

              {/* Curso pago? */}
              <div className="flex items-center justify-between p-3 rounded-lg border bg-slate-50 dark:bg-slate-900/30">
                <div>
                  <Label className="text-sm font-bold">Curso Pago</Label>
                  <p className="text-[11px] text-muted-foreground">Desative para cursos gratuitos.</p>
                </div>
                <Switch checked={isPaid} onCheckedChange={setIsPaid} />
              </div>

              {isPaid && (
                <div className="grid grid-cols-2 gap-4">

                  {/* Valor total */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Valor Total do Curso (R$)</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={totalAmount}
                      onChange={e => setTotalAmount(e.target.value)}
                      placeholder="100.00"
                      className="h-9 text-sm font-bold"
                    />
                  </div>

                  {/* Parcelas */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Parcelamento Máximo Permitido</Label>
                    <Select value={installments} onValueChange={setInstallments}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[1,2,3,4,5,6,8,10,12].map(n => (
                          <SelectItem key={n} value={n.toString()}>
                            {n === 1 ? 'Apenas À vista (1x)' : `Permitir até ${n}x (mínimo R$ ${(Number(totalAmount)/n).toFixed(2).replace('.', ',')}/mês)`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Recorrência */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Tipo de Cobrança</Label>
                    <Select value={recurrence} onValueChange={setRecurrence}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="once">Pagamento Único (curso)</SelectItem>
                        <SelectItem value="monthly">Mensal (mensalidade)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Dia de vencimento */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Dia de Vencimento</Label>
                    <Select value={dueDay} onValueChange={setDueDay}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[1,5,7,10,15,20,25,28].map(d => (
                          <SelectItem key={d} value={d.toString()}>Dia {d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Forma de pagamento */}
                  <div className="space-y-1.5 col-span-2">
                    <Label className="text-xs font-bold">Forma de Pagamento Padrão</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pix">Pix</SelectItem>
                        <SelectItem value="boleto">Boleto Bancário</SelectItem>
                        <SelectItem value="cartao">Cartão de Crédito/Débito</SelectItem>
                        <SelectItem value="dinheiro">Dinheiro / Caixa Interno</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Preview da parcela */}
              {isPaid && Number(installments) > 1 && (
                <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 rounded-lg border border-indigo-200">
                  <DollarSign className="size-4 text-indigo-600 shrink-0" />
                  <p className="text-xs text-indigo-800 font-bold">
                    {installments}x de R$ {installmentValue.replace('.', ',')} = Total R$ {Number(totalAmount).toFixed(2).replace('.', ',')}
                  </p>
                </div>
              )}

              {/* Botões */}
              <div className="flex gap-2 justify-end pt-1">
                <Button size="sm" variant="ghost" className="text-xs" onClick={() => setEditingConfig(false)} disabled={isSavingConfig}>
                  Cancelar
                </Button>
                <Button size="sm" className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleSaveConfig} disabled={isSavingConfig}>
                  {isSavingConfig ? <><Loader2 className="size-3.5 mr-1.5 animate-spin" />Salvando...</> : <><Save className="size-3.5 mr-1.5" />Salvar Configuração</>}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── KPI Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(kpi => (
          <Card key={kpi.label} className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {kpi.label}
              </CardTitle>
              <div className={cn('p-2 rounded-lg', kpi.bg, kpi.color)}>
                <kpi.icon className="size-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-black">{kpi.value}</div>
              <p className="text-[11px] text-muted-foreground mt-1">{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Cobranças ──────────────────────────────────────────────────── */}
      {fees.length === 0 ? (
        <Card className="border-dashed border-2 border-amber-200 bg-amber-50/40">
          <CardContent className="flex flex-col items-center justify-center py-10 gap-3 text-center">
            <DollarSign className="size-10 text-amber-400" />
            <div>
              <p className="font-bold text-sm text-amber-700">Nenhuma cobrança gerada ainda</p>
              <p className="text-xs text-amber-600 mt-1 max-w-xs mx-auto">
                Use o Wizard de Matrícula para matricular alunos e gerar automaticamente as parcelas do curso.
              </p>
            </div>
            <Button
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold mt-2"
              onClick={() => setShowWizard(true)}
            >
              <PlusCircle className="size-4 mr-2" />
              Matricular Aluno e Gerar Cobranças
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-sm flex items-center gap-2">
                <Users className="size-4 text-primary" />
                Cobranças dos Alunos
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Clique em "Dar Baixa" quando receber o pagamento.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="text-xs font-bold border-indigo-300 text-indigo-700 hover:bg-indigo-50"
              onClick={() => setShowWizard(true)}
            >
              <PlusCircle className="size-3.5 mr-1.5" />
              Nova Matrícula
            </Button>
          </div>
          <MensalidadesManager fees={fees} canUpdateStatus={true} />
        </div>
      )}

      <AcademicEnrollmentWizard
        open={showWizard}
        onOpenChange={setShowWizard}
        defaultCourseId={courseId}
      />
    </div>
  );
}
