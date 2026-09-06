'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Calendar, Clock, MapPin, Ticket, CheckCircle2, Share2, 
  Copy, Check, QrCode, Sparkles, ArrowRight, ShieldCheck, 
  AlertCircle, Loader2, ArrowLeft, ExternalLink, Users, CreditCard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { 
  getPublicItemBySlug, 
  verifyMemberEmail, 
  submitEventRegistration, 
  submitEnrollmentRequest 
} from '@/app/public/enrollment/actions';

export default function DirectRegistrationPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params?.slug as string;
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ type: 'event' | 'course'; item: any; classes?: any[] } | null>(null);

  // Form State
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [isMember, setIsMember] = useState(false);
  const [emailChecked, setEmailChecked] = useState(false);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [verifiedUser, setVerifiedUser] = useState<any>(null);

  // Event specifics
  const [selectedTicketId, setSelectedTicketId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'CREDIT_CARD'>('PIX');

  // Checkout / Result State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [pixCopied, setPixCopied] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);

  useEffect(() => {
    async function loadItem() {
      if (!slug) return;
      setLoading(true);
      try {
        const res = await getPublicItemBySlug(slug);
        setData(res);
        if (res?.type === 'event') {
          const tickets = (res.item as any)?.tickets || [];
          const active = tickets.filter((t: any) => t.isActive !== false);
          if (active.length > 0) {
            setSelectedTicketId(active[0].id);
          }
          if (res.item?.acceptCreditCard === true && res.item?.acceptPix === false) {
            setPaymentMethod('CREDIT_CARD');
          } else {
            setPaymentMethod('PIX');
          }
        } else if (res?.type === 'course' && res.classes && res.classes.length > 0) {
          setSelectedClassId(res.classes[0].id);
        }
      } catch (err) {
        console.error('Error loading registration item:', err);
      } finally {
        setLoading(false);
      }
    }
    loadItem();
  }, [slug]);

  // Verificar e-mail do membro
  const handleCheckEmail = async () => {
    if (!email || !email.includes('@')) return;
    setIsVerifyingEmail(true);
    try {
      const res = await verifyMemberEmail(email.toLowerCase().trim());
      setEmailChecked(true);
      if (res.found) {
        setVerifiedUser(res);
        setIsMember(true);
        toast({
          title: `Olá, ${res.maskedName}!`,
          description: 'Identificamos seu cadastro de membro.',
        });
      } else {
        setVerifiedUser(null);
        setIsMember(false);
      }
    } catch {
      // Ignora erro
    } finally {
      setIsVerifyingEmail(false);
    }
  };

  const item = data?.item;
  const isEvent = data?.type === 'event';

  // Ingressos do evento
  const tickets = useMemo(() => {
    if (!isEvent || !item?.tickets) return [];
    return item.tickets.filter((t: any) => t.isActive !== false);
  }, [isEvent, item]);

  const selectedTicket = useMemo(() => {
    if (!tickets.length || !selectedTicketId) return null;
    return tickets.find((t: any) => t.id === selectedTicketId);
  }, [tickets, selectedTicketId]);

  // Cálculo de Preço
  const finalPrice = useMemo(() => {
    if (!isEvent) return 0;
    if (selectedTicket) return Number(selectedTicket.price) || 0;
    if (item?.ticketPrice && item.isPaid === 'pago') return Number(item.ticketPrice) || 0;
    return 0;
  }, [isEvent, selectedTicket, item]);

  const isPaid = finalPrice > 0;
  const allowsPix = item?.acceptPix !== false;
  const allowsCreditCard = item?.acceptCreditCard === true;

  // Formatar Datas
  const formattedDates = useMemo(() => {
    if (!item) return '';
    if (item.eventDates && Array.isArray(item.eventDates) && item.eventDates.length > 0) {
      return item.eventDates.map((d: any) => {
        const dateParts = (d.date || '').split('-');
        const dateFormatted = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}` : d.date;
        const timeStr = d.timeStart ? ` às ${d.timeStart}` : '';
        return `${d.label ? `${d.label}: ` : ''}${dateFormatted}${timeStr}`;
      }).join(' • ');
    }
    if (item.startDate) {
      const startParts = item.startDate.split('-');
      const startFormatted = startParts.length === 3 ? `${startParts[2]}/${startParts[1]}/${startParts[0]}` : item.startDate;
      const endFormatted = item.endDate ? (item.endDate.split('-').length === 3 ? `${item.endDate.split('-')[2]}/${item.endDate.split('-')[1]}/${item.endDate.split('-')[0]}` : item.endDate) : '';
      return `${startFormatted}${endFormatted && endFormatted !== startFormatted ? ` até ${endFormatted}` : ''}`;
    }
    return '';
  }, [item]);

  // Submissão do Formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes('@')) {
      toast({ variant: 'destructive', title: 'E-mail obrigatório', description: 'Informe um e-mail válido para a inscrição.' });
      return;
    }

    if (!isMember && !name.trim()) {
      toast({ variant: 'destructive', title: 'Nome obrigatório', description: 'Por favor, informe seu nome completo.' });
      return;
    }

    if (isPaid && !cpfCnpj.trim() && !verifiedUser?.hasCpf) {
      toast({ variant: 'destructive', title: 'CPF/CNPJ obrigatório', description: 'Necessário para emissão do pagamento no Asaas.' });
      return;
    }

    // Validar perguntas customizadas
    if (isEvent && item.customQuestions && item.customQuestions.length > 0) {
      for (const q of item.customQuestions) {
        if (q.isRequired && !customAnswers[q.id]?.trim()) {
          toast({ variant: 'destructive', title: 'Pergunta obrigatória', description: `Responda: ${q.label}` });
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      const finalEmail = email.toLowerCase().trim();
      let finalName = name.trim();
      let finalPhone = phone.trim();
      const userId = verifiedUser?.userId;
      const finalCpf = cpfCnpj.replace(/\D/g, '');

      let asaasCharge: any = null;
      let pixData: any = null;

      if (isPaid) {
        // 1. Criar/Buscar Cliente no Asaas via API Route
        const custRes = await fetch('/api/asaas/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: finalName || (verifiedUser?.maskedName ? undefined : finalEmail.split('@')[0]),
            email: finalEmail,
            phone: finalPhone || undefined,
            cpfCnpj: finalCpf || undefined,
            userId: userId || undefined,
            tenantId: searchParams.get('tenantId') || undefined
          })
        });

        if (!custRes.ok) {
          const err = await custRes.json().catch(() => ({}));
          throw new Error(err.error || 'Erro ao processar cliente no Asaas');
        }
        const { customerId } = await custRes.json();

        // 2. Criar Cobrança no Asaas
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        const payRes = await fetch('/api/asaas/payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerId,
            billingType: paymentMethod,
            value: finalPrice,
            dueDate: tomorrow.toISOString().split('T')[0],
            description: `Inscrição: ${item.eventName || item.name}${selectedTicket ? ` - ${selectedTicket.name}` : ''}`,
            externalReference: userId || undefined,
            tenantId: searchParams.get('tenantId') || undefined
          })
        });

        if (!payRes.ok) {
          const err = await payRes.json().catch(() => ({}));
          throw new Error(err.error || 'Erro ao gerar pagamento no Asaas');
        }
        asaasCharge = await payRes.json();

        // 3. Obter PIX QR Code se método for PIX
        if (paymentMethod === 'PIX') {
          pixData = asaasCharge?.pixQrCode || null;
          if (!pixData && asaasCharge?.id) {
            try {
              const pixRes = await fetch(`/api/asaas/payments/${asaasCharge.id}/pix`);
              if (pixRes.ok) {
                pixData = await pixRes.json();
              }
            } catch (e) {
              console.warn('Erro ao buscar QR code PIX:', e);
            }
          }
        }
      }

      // 4. Salvar registro no Firestore via Server Action
      let registrationId = '';
      let confirmedName = finalName;

      if (isEvent) {
        const regRes = await submitEventRegistration({
          eventId: item.id,
          userId: userId || undefined,
          name: finalName,
          email: finalEmail,
          phone: finalPhone,
          cpfCnpj: finalCpf,
          ticketId: selectedTicket?.id || 'default',
          ticketName: selectedTicket?.name || 'Geral',
          customAnswers,
          tenantId: searchParams.get('tenantId') || undefined,
          payment: {
            status: isPaid ? 'pending' : 'approved',
            method: isPaid ? paymentMethod.toLowerCase() : 'free',
            valuePaid: isPaid ? finalPrice : 0,
            transactionId: asaasCharge?.id || 'free',
            asaasPaymentId: asaasCharge?.id || null,
            invoiceUrl: asaasCharge?.invoiceUrl || null,
            bankSlipUrl: asaasCharge?.bankSlipUrl || null,
          }
        });

        if (regRes.error) {
          throw new Error(regRes.error);
        }
        registrationId = regRes.registrationId || '';
        confirmedName = regRes.finalName || finalName || finalEmail.split('@')[0];
      } else {
        const reqRes = await submitEnrollmentRequest({
          userId: userId || undefined,
          name: finalName,
          email: finalEmail,
          phone: finalPhone,
          courseId: item.id,
          classId: selectedClassId || '',
          paymentMethod: isPaid ? paymentMethod : 'FREE',
          asaasPaymentId: asaasCharge?.id || '',
          tenantId: searchParams.get('tenantId') || undefined,
        });

        if (reqRes.error) {
          throw new Error(reqRes.error);
        }
        registrationId = reqRes.requestId || '';
        confirmedName = finalName || finalEmail.split('@')[0];
      }

      setResult({
        success: true,
        registrationId,
        name: confirmedName,
        isPaid,
        price: finalPrice,
        paymentMethod,
        asaasCharge,
        pixData,
        ticketName: selectedTicket?.name || 'Geral'
      });

      toast({
        title: isPaid 
          ? (paymentMethod === 'CREDIT_CARD' ? 'Inscrição aguardando pagamento no cartão!' : 'Inscrição aguardando pagamento PIX!') 
          : 'Inscrição Confirmada com Sucesso!',
        description: isPaid 
          ? (paymentMethod === 'CREDIT_CARD' ? 'Acesse o link do Asaas para preencher os dados do cartão.' : 'Efetue o pagamento PIX para garantir sua vaga.') 
          : 'Sua vaga está garantida.',
      });
    } catch (err: any) {
      console.error('Erro na inscrição:', err);
      toast({
        variant: 'destructive',
        title: 'Erro ao processar inscrição',
        description: err.message || 'Tente novamente em instantes.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyPixCode = () => {
    if (!result?.pixData?.payload) return;
    navigator.clipboard.writeText(result.pixData.payload);
    setPixCopied(true);
    toast({ title: 'Código Copiado!', description: 'Cole no seu app de pagamentos/banco.' });
    setTimeout(() => setPixCopied(false), 3000);
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setUrlCopied(true);
    toast({ title: 'Link Copiado!', description: 'Compartilhe o link deste evento com amigos.' });
    setTimeout(() => setUrlCopied(false), 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
        <Loader2 className="size-10 text-primary animate-spin mb-4" />
        <p className="text-slate-400 text-sm font-medium">Carregando informações da inscrição...</p>
      </div>
    );
  }

  if (!data || !item) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <Card className="max-w-md w-full bg-slate-900 border-slate-800 text-slate-100 text-center p-6 rounded-3xl shadow-2xl">
          <AlertCircle className="size-12 text-amber-500 mx-auto mb-4" />
          <CardTitle className="text-xl font-bold mb-2">Página não encontrada</CardTitle>
          <CardDescription className="text-slate-400 mb-6">
            O evento ou curso especificado não foi localizado ou não está mais com inscrições abertas.
          </CardDescription>
          <Link href="/public/enrollment">
            <Button className="w-full h-12 rounded-xl font-bold">
              Ver Catálogo Completo de Cursos & Eventos
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  // TELA DE SUCESSO / CHECKOUT PIX
  if (result) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center p-4 sm:p-6">
        <Card className="max-w-xl w-full bg-slate-900/90 backdrop-blur border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden p-6 sm:p-8">
          <div className="text-center mb-6">
            <div className={`size-16 rounded-full flex items-center justify-center mx-auto mb-4 border ${
              result.isPaid && result.paymentMethod === 'CREDIT_CARD'
                ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            }`}>
              {result.isPaid && result.paymentMethod === 'CREDIT_CARD' ? (
                <CreditCard className="size-8" />
              ) : (
                <CheckCircle2 className="size-9" />
              )}
            </div>
            <Badge className={`mb-2 ${
              result.isPaid && result.paymentMethod === 'CREDIT_CARD'
                ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
            }`}>
              {result.isPaid 
                ? (result.paymentMethod === 'CREDIT_CARD' ? 'Aguardando Pagamento no Cartão' : 'Aguardando Pagamento PIX') 
                : 'Inscrição Confirmada'}
            </Badge>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{item.eventName || item.name}</h1>
            <p className="text-xs text-slate-400 mt-1">Participante: <strong className="text-slate-200">{result.name}</strong></p>
          </div>

          {result.isPaid && (result.paymentMethod === 'PIX' || result.pixData) ? (
            <div className="bg-slate-950/70 border border-slate-800 rounded-3xl p-6 text-center space-y-4 mb-6">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Escaneie o QR Code PIX no seu app</p>
              
              {result.pixData?.encodedImage && (
                <div className="inline-block p-4 bg-white rounded-2xl shadow-lg">
                  <img
                    src={`data:image/png;base64,${result.pixData.encodedImage}`}
                    alt="QR Code PIX"
                    className="size-48 sm:size-56 object-contain"
                  />
                </div>
              )}

              <div className="pt-2">
                <p className="text-2xl font-black text-emerald-400">R$ {result.price.toFixed(2)}</p>
                <p className="text-[11px] text-slate-400">Ingresso: {result.ticketName}</p>
              </div>

              {result.pixData?.payload && (
                <div className="pt-2 space-y-2">
                  <Button 
                    onClick={copyPixCode} 
                    className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-sm gap-2 shadow-lg shadow-emerald-600/20"
                  >
                    {pixCopied ? <Check className="size-4" /> : <Copy className="size-4" />}
                    {pixCopied ? 'Código PIX Copiado!' : 'Copiar Chave PIX Copia-e-Cola'}
                  </Button>
                </div>
              )}

              {result.asaasCharge?.invoiceUrl && (
                <div className="pt-1">
                  <a 
                    href={result.asaasCharge.invoiceUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-xs text-blue-400 hover:underline inline-flex items-center gap-1 font-medium"
                  >
                    Abrir fatura completa no Asaas <ExternalLink className="size-3" />
                  </a>
                </div>
              )}

              {result.registrationId && (
                <div className="pt-2 text-[10px] font-mono text-slate-500">
                  Protocolo: #{result.registrationId.slice(0, 10).toUpperCase()}
                </div>
              )}
            </div>
          ) : result.isPaid && result.paymentMethod === 'CREDIT_CARD' ? (
            <div className="bg-slate-950/70 border border-slate-800 rounded-3xl p-6 text-center space-y-4 mb-6">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Pagamento com Cartão de Crédito</p>
              <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
                Para sua segurança, os dados do cartão são preenchidos diretamente no ambiente protegido do Asaas.
              </p>

              <div className="pt-1">
                <p className="text-2xl font-black text-blue-400">R$ {result.price.toFixed(2)}</p>
                <p className="text-[11px] text-slate-400">Ingresso: {result.ticketName}</p>
              </div>

              {result.asaasCharge?.invoiceUrl ? (
                <a 
                  href={result.asaasCharge.invoiceUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-block w-full pt-2"
                >
                  <Button className="w-full h-14 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-sm gap-2 shadow-lg shadow-blue-600/20">
                    <CreditCard className="size-4" /> Pagar com Cartão no Asaas <ExternalLink className="size-4" />
                  </Button>
                </a>
              ) : (
                <p className="text-xs text-amber-400">A fatura foi gerada. Verifique seu e-mail para concluir o pagamento.</p>
              )}

              {result.registrationId && (
                <div className="pt-2 text-[10px] font-mono text-slate-500">
                  Protocolo: #{result.registrationId.slice(0, 10).toUpperCase()}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-950/50 border border-slate-800 rounded-3xl p-6 text-center space-y-3 mb-6">
              <Sparkles className="size-8 text-blue-400 mx-auto" />
              <p className="text-base font-bold text-white">Sua vaga está garantida!</p>
              <p className="text-xs text-slate-400 leading-relaxed">
                Você receberá informações adicionais da organização e avisos importantes no seu e-mail ou WhatsApp cadastrado.
              </p>
              {result.registrationId && (
                <div className="pt-2 text-xs font-mono text-slate-500">
                  Protocolo: #{result.registrationId.slice(0, 10).toUpperCase()}
                </div>
              )}
            </div>
          )}

          <div className="space-y-3">
            <Button
              variant="outline"
              onClick={copyShareLink}
              className="w-full h-12 rounded-xl font-bold border-slate-800 text-slate-200 hover:bg-slate-800 gap-2"
            >
              {urlCopied ? <Check className="size-4 text-emerald-400" /> : <Share2 className="size-4" />}
              {urlCopied ? 'Link Copiado!' : 'Convidar Amigos no WhatsApp'}
            </Button>

            <Link href="/" className="block">
              <Button variant="ghost" className="w-full text-xs text-slate-400 hover:text-white">
                Voltar à Página Inicial
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-primary selection:text-white pb-20">
      {/* Top Navbar */}
      <nav className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur sticky top-0 z-40 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition">
          <ArrowLeft className="size-4" /> Voltar
        </Link>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={copyShareLink}
            className="text-xs text-slate-400 hover:text-white gap-1.5 h-8 px-3 rounded-full border border-slate-800"
          >
            <Share2 className="size-3.5" /> Compartilhar
          </Button>
        </div>
      </nav>

      {/* Main Container */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* COLUNA ESQUERDA: APRESENTAÇÃO DO EVENTO (HERO) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Banner Poster */}
            {item.coverImageUrl && (
              <div className="relative w-full aspect-[16/9] rounded-3xl overflow-hidden shadow-2xl border border-slate-800/80 bg-slate-900">
                <img
                  src={item.coverImageUrl}
                  alt={item.eventName || item.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                  <Badge className="bg-primary text-white border-none font-bold uppercase text-[10px] tracking-wider px-3 py-1">
                    {item.ministry || 'Igreja Batista da Manhã'}
                  </Badge>
                  {isEvent && (
                    <Badge variant="outline" className="bg-slate-950/80 text-slate-300 border-slate-700 text-[10px] font-bold">
                      {isPaid ? `A partir de R$ ${finalPrice.toFixed(2)}` : 'Inscrição Gratuita'}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            <div>
              {!item.coverImageUrl && (
                <Badge className="bg-primary/20 text-primary border-primary/30 font-bold uppercase text-[10px] tracking-wider px-3 py-1 mb-3">
                  {item.ministry || 'Igreja Batista da Manhã'}
                </Badge>
              )}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
                {item.eventName || item.name}
              </h1>
              {item.visionAlignment && item.visionAlignment !== '.' && (
                <p className="text-slate-400 text-sm sm:text-base mt-3 leading-relaxed">
                  {item.visionAlignment}
                </p>
              )}
            </div>

            {/* Informações Práticas (Data, Horário, Local) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
                <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Calendar className="size-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Data & Horário</p>
                  <p className="text-xs sm:text-sm font-bold text-slate-200 mt-0.5">{formattedDates || 'A definir'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
                <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                  <MapPin className="size-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Localização</p>
                  <p className="text-xs sm:text-sm font-bold text-slate-200 mt-0.5">
                    {item.externalLocation || item.space || 'Templo IBM - Mutondo, São Gonçalo'}
                  </p>
                </div>
              </div>
            </div>

            {/* Ingressos / Lotes Disponíveis */}
            {isEvent && tickets.length > 0 && (
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Ticket className="size-4 text-primary" /> Opções de Inscrição / Ingressos
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {tickets.map((t: any) => {
                    const isSelected = selectedTicketId === t.id;
                    const price = Number(t.price) || 0;
                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTicketId(t.id)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-primary/10 border-primary shadow-lg shadow-primary/10 ring-1 ring-primary'
                            : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-sm text-white">{t.name}</h4>
                          <span className="font-black text-sm text-emerald-400">
                            {price === 0 ? 'Gratuito' : `R$ ${price.toFixed(2)}`}
                          </span>
                        </div>
                        {t.description && (
                          <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">{t.description}</p>
                        )}
                        <div className="mt-3 flex items-center justify-end">
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? 'text-primary' : 'text-slate-500'}`}>
                            {isSelected ? '✓ Selecionado' : 'Selecionar'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* COLUNA DIREITA: FORMULÁRIO DE INSCRIÇÃO DIRETA */}
          <div className="lg:col-span-5">
            <Card className="bg-slate-900/90 border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden sticky top-20">
              <CardHeader className="bg-slate-950/60 border-b border-slate-800/80 p-6 sm:p-7">
                <CardTitle className="text-lg sm:text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                  <Sparkles className="size-5 text-primary" /> Formulário de Inscrição
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Preencha seus dados para garantir sua vaga neste evento.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-6 sm:p-7">
                <form onSubmit={handleSubmit} className="space-y-4">
                  
                  {/* E-mail */}
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                      Seu E-mail
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        required
                        type="email"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={e => {
                          setEmail(e.target.value);
                          if (isMember) setIsMember(false);
                          if (emailChecked) setEmailChecked(false);
                        }}
                        onBlur={handleCheckEmail}
                        className="h-11 bg-slate-950 border-slate-800 text-white rounded-xl text-sm"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCheckEmail}
                        disabled={isVerifyingEmail || !email}
                        className="h-11 px-3 border-slate-800 text-slate-300 rounded-xl"
                      >
                        {isVerifyingEmail ? <Loader2 className="size-4 animate-spin" /> : 'Verificar'}
                      </Button>
                    </div>
                    {isMember && (
                      <p className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1 font-medium">
                        <CheckCircle2 className="size-3" /> Membro identificado ({verifiedUser?.maskedName})
                      </p>
                    )}
                  </div>

                  {emailChecked && (
                    <>
                      {/* Nome Completo (se não membro) */}
                      {!isMember && (
                        <div className="space-y-1.5">
                          <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                            Nome Completo
                          </Label>
                          <Input
                            required
                            type="text"
                            placeholder="Ex: Carlos Eduardo Silva"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="h-11 bg-slate-950 border-slate-800 text-white rounded-xl text-sm"
                          />
                        </div>
                      )}

                      {/* WhatsApp (se não membro) */}
                      {!isMember && (
                        <div className="space-y-1.5">
                          <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                            WhatsApp para Confirmação
                          </Label>
                          <Input
                            required
                            type="tel"
                            placeholder="(21) 99999-9999"
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                            className="h-11 bg-slate-950 border-slate-800 text-white rounded-xl text-sm"
                          />
                        </div>
                      )}

                  {/* CPF se evento for pago */}
                  {isPaid && (!isMember || !verifiedUser?.hasCpf) && (
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                        CPF do Pagador (Obrigatório para cobrança)
                      </Label>
                      <Input
                        required
                        type="text"
                        placeholder="000.000.000-00"
                        value={cpfCnpj}
                        onChange={e => setCpfCnpj(e.target.value)}
                        className="h-11 bg-slate-950 border-slate-800 text-white rounded-xl text-sm"
                      />
                    </div>
                  )}

                  {/* Perguntas customizadas do evento */}
                  {isEvent && item.customQuestions && item.customQuestions.map((q: any) => (
                    <div key={q.id} className="space-y-1.5 pt-1">
                      <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                        {q.label} {q.isRequired && <span className="text-rose-400">*</span>}
                      </Label>
                      <Input
                        required={q.isRequired}
                        placeholder={q.placeholder || 'Sua resposta'}
                        value={customAnswers[q.id] || ''}
                        onChange={e => setCustomAnswers(p => ({ ...p, [q.id]: e.target.value }))}
                        className="h-11 bg-slate-950 border-slate-800 text-white rounded-xl text-sm"
                      />
                    </div>
                  ))}

                  {/* Formas de Pagamento Aceitas (quando o evento aceita múltiplos métodos) */}
                  {isPaid && allowsPix && allowsCreditCard && (
                    <div className="space-y-2 pt-2 border-t border-slate-850">
                      <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                        Forma de Pagamento
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('PIX')}
                          className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                            paymentMethod === 'PIX'
                              ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/40 shadow-sm'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-white'
                          }`}
                        >
                          <span className="text-sm">⚡</span>
                          <span>PIX</span>
                          <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-normal">Imediato</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setPaymentMethod('CREDIT_CARD')}
                          className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                            paymentMethod === 'CREDIT_CARD'
                              ? 'bg-blue-500/15 border-blue-500 text-blue-300 ring-1 ring-blue-500/40 shadow-sm'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-white'
                          }`}
                        >
                          <CreditCard className="size-3.5 text-blue-400" />
                          <span>Cartão de Crédito</span>
                        </button>
                      </div>
                    </div>
                  )}
                  </>
                  )}

                  {/* Resumo do Pedido e Botão Final */}
                  <div className="pt-4 border-t border-slate-800/80 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Total:</span>
                      <span className="font-black text-lg text-emerald-400">
                        {finalPrice === 0 ? 'Gratuito' : `R$ ${finalPrice.toFixed(2)}`}
                      </span>
                    </div>

                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-sm uppercase tracking-wider shadow-xl shadow-primary/20 gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="size-5 animate-spin" />
                          Processando...
                        </>
                      ) : isPaid ? (
                        paymentMethod === 'CREDIT_CARD' ? (
                          <>
                            Pagar com Cartão de Crédito <ArrowRight className="size-4" />
                          </>
                        ) : (
                          <>
                            Gerar Chave PIX e Inscrever-se <ArrowRight className="size-4" />
                          </>
                        )
                      ) : (
                        <>
                          Confirmar Inscrição Gratuita <CheckCircle2 className="size-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}
