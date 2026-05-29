'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  Copy,
  Check,
  ExternalLink,
  CreditCard,
  QrCode,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EventPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  registration: {
    id: string;
    userId: string;
    eventId: string;
    userMetadata: {
      name: string;
      email?: string;
      phone?: string;
    };
    payment?: {
      status: string;
    };
  };
  eventPrice: number;
  eventTitle: string;
}

type PaymentMethod = 'PIX' | 'BOLETO' | 'CREDIT_CARD';

type PaymentResult = {
  method: PaymentMethod;
  pixQrCodeImage?: string;        // base64 PNG
  pixCopyPaste?: string;          // copia-e-cola
  bankSlipUrl?: string;           // boleto URL
  invoiceUrl?: string;            // credit card link
};

// Helper to get tomorrow's date as YYYY-MM-DD
function getTomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function EventPaymentDialog({
  open,
  onOpenChange,
  registration,
  eventPrice,
  eventTitle,
}: EventPaymentDialogProps) {
  const { toast } = useToast();

  // Form state
  const [method, setMethod] = useState<PaymentMethod>('PIX');
  const [value, setValue] = useState<string>(eventPrice.toFixed(2));
  const [dueDate, setDueDate] = useState<string>(getTomorrow());
  const [installments, setInstallments] = useState<number>(1);
  const [cpfCnpj, setCpfCnpj] = useState<string>('');

  // Flow state
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<PaymentResult | null>(null);
  const [copied, setCopied] = useState(false);

  // Reset on open
  useEffect(() => {
    if (open) {
      setMethod('PIX');
      setValue(eventPrice.toFixed(2));
      setDueDate(getTomorrow());
      setInstallments(1);
      setCpfCnpj('');
      setResult(null);
      setCopied(false);
      setIsLoading(false);
    }
  }, [open, eventPrice]);

  // Auto-close after success
  useEffect(() => {
    if (result) {
      const timer = setTimeout(() => {
        // Don't auto-close — let the user explicitly dismiss
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [result]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: 'Copiado!', description: 'Código copiado para a área de transferência.' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerate = async () => {
    if (!cpfCnpj.trim()) {
      toast({
        variant: 'destructive',
        title: 'CPF/CNPJ obrigatório',
        description: 'Informe o CPF ou CNPJ do pagador para criar a cobrança.',
      });
      return;
    }

    setIsLoading(true);
    try {
      // Step 1: Create/fetch customer
      const customerRes = await fetch('/api/asaas/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: registration.userMetadata.name,
          email: registration.userMetadata.email || '',
          phone: registration.userMetadata.phone || '',
          cpfCnpj: cpfCnpj.trim(),
          userId: registration.userId,
        }),
      });

      if (!customerRes.ok) {
        const errData = await customerRes.json().catch(() => ({}));
        throw new Error(errData?.message || `Erro ao criar cliente (${customerRes.status})`);
      }

      const { customerId } = await customerRes.json();

      // Step 2: Create payment
      const paymentBody: Record<string, unknown> = {
        customerId,
        billingType: method,
        value: parseFloat(value) || eventPrice,
        dueDate,
        description: `Inscrição: ${eventTitle}`,
        externalReference: registration.id,
      };

      if (method === 'CREDIT_CARD') {
        paymentBody.installmentCount = installments;
      }

      const paymentRes = await fetch('/api/asaas/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentBody),
      });

      if (!paymentRes.ok) {
        const errData = await paymentRes.json().catch(() => ({}));
        throw new Error(errData?.message || `Erro ao criar cobrança (${paymentRes.status})`);
      }

      const paymentData = await paymentRes.json();

      setResult({
        method,
        pixQrCodeImage: paymentData.pixQrCodeImage,
        pixCopyPaste: paymentData.pixCopyPaste,
        bankSlipUrl: paymentData.bankSlipUrl,
        invoiceUrl: paymentData.invoiceUrl,
      });

      toast({
        title: 'Cobrança gerada com sucesso!',
        description: `${method === 'PIX' ? 'QR Code PIX disponível.' : method === 'BOLETO' ? 'Boleto gerado.' : 'Link de pagamento gerado.'}`,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ocorreu um erro inesperado.';
      console.error('[PaymentDialog]', err);
      toast({
        variant: 'destructive',
        title: 'Erro ao gerar cobrança',
        description: message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-slate-200 shadow-xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-slate-800 font-bold text-base">
            💳 Gerar Cobrança — {registration.userMetadata.name}
          </DialogTitle>
          <DialogDescription className="text-slate-500 text-xs">
            {result
              ? 'Cobrança gerada com sucesso. Compartilhe os dados abaixo com o participante.'
              : `Evento: ${eventTitle}`}
          </DialogDescription>
        </DialogHeader>

        {/* ───── Result state ───── */}
        {result ? (
          <div className="space-y-4 py-2">
            {/* PIX */}
            {result.method === 'PIX' && (
              <div className="flex flex-col items-center gap-4">
                {result.pixQrCodeImage ? (
                  <div className="p-3 bg-white border border-slate-200 rounded-xl inline-flex shadow-sm">
                    <img
                      src={`data:image/png;base64,${result.pixQrCodeImage}`}
                      alt="QR Code PIX"
                      className="size-40 rounded"
                    />
                  </div>
                ) : (
                  <div className="size-40 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center">
                    <QrCode className="size-16 text-slate-300" />
                  </div>
                )}

                {result.pixCopyPaste && (
                  <div className="w-full space-y-1.5">
                    <Label className="text-xs text-slate-500">Código Copia e Cola</Label>
                    <div className="flex gap-2">
                      <Input
                        readOnly
                        value={result.pixCopyPaste}
                        className="bg-slate-50 border-slate-200 text-slate-700 text-xs select-all h-9"
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => handleCopy(result.pixCopyPaste!)}
                        className="shrink-0 h-9 w-9 border-slate-200"
                      >
                        {copied ? (
                          <Check className="size-4 text-emerald-500" />
                        ) : (
                          <Copy className="size-4 text-slate-500" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-none">
                  Aguardando confirmação do PIX
                </Badge>
              </div>
            )}

            {/* BOLETO */}
            {result.method === 'BOLETO' && (
              <div className="flex flex-col items-center gap-4">
                <div className="size-16 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center">
                  <FileText className="size-8 text-blue-500" />
                </div>
                <p className="text-sm text-slate-600 text-center">
                  Boleto gerado com sucesso. Clique para abrir e realizar o pagamento.
                </p>
                {result.bankSlipUrl && (
                  <Button
                    onClick={() => window.open(result.bankSlipUrl, '_blank')}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold w-full"
                  >
                    <ExternalLink className="size-4 mr-2" />
                    Abrir Boleto
                  </Button>
                )}
              </div>
            )}

            {/* CREDIT CARD */}
            {result.method === 'CREDIT_CARD' && (
              <div className="flex flex-col items-center gap-4">
                <div className="size-16 rounded-full bg-violet-50 border border-violet-100 flex items-center justify-center">
                  <CreditCard className="size-8 text-violet-500" />
                </div>
                <p className="text-sm text-slate-600 text-center">
                  Link de pagamento gerado. Compartilhe com o participante.
                </p>
                {result.invoiceUrl && (
                  <div className="w-full space-y-1.5">
                    <Label className="text-xs text-slate-500">Link de Pagamento</Label>
                    <div className="flex gap-2">
                      <Input
                        readOnly
                        value={result.invoiceUrl}
                        className="bg-slate-50 border-slate-200 text-slate-700 text-xs select-all h-9"
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => handleCopy(result.invoiceUrl!)}
                        className="shrink-0 h-9 w-9 border-slate-200"
                      >
                        {copied ? (
                          <Check className="size-4 text-emerald-500" />
                        ) : (
                          <Copy className="size-4 text-slate-500" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}
                {result.invoiceUrl && (
                  <Button
                    variant="outline"
                    onClick={() => window.open(result.invoiceUrl, '_blank')}
                    className="border-slate-200 text-slate-600 hover:bg-slate-50 w-full"
                  >
                    <ExternalLink className="size-4 mr-2" />
                    Abrir Link
                  </Button>
                )}
              </div>
            )}
          </div>
        ) : (
          /* ───── Form state ───── */
          <div className="space-y-4 py-2">
            {/* Billing method */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-600 font-semibold">Método de Pagamento</Label>
              <Select
                value={method}
                onValueChange={(v) => setMethod(v as PaymentMethod)}
              >
                <SelectTrigger className="bg-slate-50 border-slate-200 text-sm h-9">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PIX">🏦 PIX</SelectItem>
                  <SelectItem value="BOLETO">📄 Boleto Bancário</SelectItem>
                  <SelectItem value="CREDIT_CARD">💳 Cartão de Crédito</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-600 font-semibold">Valor (R$)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="bg-slate-50 border-slate-200 h-9 text-sm"
              />
            </div>

            {/* Due date */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-600 font-semibold">Vencimento</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="bg-slate-50 border-slate-200 h-9 text-sm"
              />
            </div>

            {/* Installments — only for credit card */}
            {method === 'CREDIT_CARD' && (
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-600 font-semibold">
                  Parcelas (1–12)
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={installments}
                  onChange={(e) =>
                    setInstallments(Math.min(12, Math.max(1, parseInt(e.target.value) || 1)))
                  }
                  className="bg-slate-50 border-slate-200 h-9 text-sm"
                />
              </div>
            )}

            {/* CPF/CNPJ */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-600 font-semibold">
                CPF / CNPJ do Pagador <span className="text-red-500">*</span>
              </Label>
              <Input
                type="text"
                placeholder="000.000.000-00"
                value={cpfCnpj}
                onChange={(e) => setCpfCnpj(e.target.value)}
                className={cn(
                  'bg-slate-50 border-slate-200 h-9 text-sm',
                  !cpfCnpj && 'border-amber-300 focus-visible:ring-amber-400'
                )}
              />
              <p className="text-[10px] text-slate-400">
                Necessário para criar o cliente no Asaas. Apenas números ou formatado.
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-1">
          {result ? (
            <Button
              onClick={() => onOpenChange(false)}
              className="bg-slate-800 hover:bg-slate-700 text-white font-bold w-full"
            >
              Fechar
            </Button>
          ) : (
            <>
              <DialogClose asChild>
                <Button
                  variant="outline"
                  className="border-slate-200 text-slate-600 hover:bg-slate-50 w-full sm:w-auto"
                >
                  Cancelar
                </Button>
              </DialogClose>
              <Button
                onClick={handleGenerate}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold w-full sm:w-auto shadow-sm"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <CreditCard className="size-4 mr-2" />
                    Gerar Cobrança
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
