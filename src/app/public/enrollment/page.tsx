'use client';

import React, { useState, useMemo } from 'react';
import { VolunteeringProvider, useVolunteering } from '@/contexts/volunteering-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Loader2, ArrowRight, CheckCircle, Search,
    BookOpen, Layers, Clock, CalendarDays, Sparkles, ChevronLeft, Info,
    GraduationCap, Briefcase, ListChecks, ChevronRight, QrCode, Copy
} from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/icons';
import { cn } from '@/lib/utils';
import { verifyMemberEmail, submitEnrollmentRequest } from './actions';
import { useFirebase } from '@/firebase';
import { useEventsData, useCoursesData } from "@/hooks/useDomainData";

const STEPS = [
    { id: 1, name: 'Identificação', icon: Sparkles },
    { id: 2, name: 'Categoria', icon: Layers },
    { id: 3, name: 'Catálogo', icon: BookOpen },
    { id: 4, name: 'Turma', icon: Clock },
    { id: 5, name: 'Resumo', icon: CheckCircle }
];

function Stepper({ currentStep }: { currentStep: number }) {
    return (
        <div className="flex justify-center mb-12 mt-4 px-4 overflow-hidden">
            <div className="flex items-center w-full max-w-2xl">
                {STEPS.map((step, idx) => (
                    <React.Fragment key={step.id}>
                        <div className="flex flex-col items-center gap-2 relative z-10 shrink-0">
                            <div className={cn(
                                "size-10 md:size-12 rounded-full border-2 flex items-center justify-center transition-all bg-white",
                                currentStep === step.id ? "border-primary text-primary scale-110 shadow-lg" :
                                    currentStep > step.id ? "bg-primary border-primary text-white" : "border-slate-200 text-slate-300"
                            )}>
                                <step.icon className="size-4 md:size-5" />
                            </div>
                            <span className={cn(
                                "absolute -bottom-6 text-[9px] md:text-[10px] font-black uppercase tracking-widest whitespace-nowrap",
                                currentStep === step.id ? "text-primary" : "text-muted-foreground"
                            )}>{step.name}</span>
                        </div>
                        {idx < STEPS.length - 1 && (
                            <div className={cn(
                                "flex-1 h-1 mx-1 md:mx-3 rounded-full transition-all duration-500",
                                currentStep > step.id ? "bg-primary" : "bg-slate-200"
                            )} />
                        )}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
}

function EnrollmentForm() {
    const { firestore } = useFirebase();
    const { events, reservations, rooms, strategicEvents, reservationCategories } = useEventsData();
    const { courses, classes, enrollmentRequests, pedagogicalLogs, theoflixCourses } = useCoursesData();

    const { toast } = useToast();

    // Global Flow State
    const [currentStep, setCurrentStep] = useState(1);
    const [isSuccess, setIsSuccess] = useState(false);

    // Step 1: Identification
    const [mode, setMode] = useState<'existing' | 'new'>('existing');
    const [isVerifying, setIsVerifying] = useState(false);
    const [emailInput, setEmailInput] = useState('');
    const [foundUser, setFoundUser] = useState<{ userId: string; maskedName: string; maskedPhone: string; hasCpf?: boolean } | null>(null);
    const [formData, setFormData] = useState({ name: '', phone: '' });

    // Step 2: Category
    const [selectedCategory, setSelectedCategory] = useState<'lumine' | 'escolas' | 'ministerios' | 'eventos' | null>(null);

    // Step 3: Catalog
    const [trailFilter, setTrailFilter] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

    // Step 4: Class Selection
    const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

    // Step 5: Submission & Asaas Specifics
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [cpfCnpj, setCpfCnpj] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'BOLETO' | 'CREDIT_CARD' | 'UNDEFINED'>('PIX');
    const [chargeType, setChargeType] = useState<'UNIQUE' | 'SUBSCRIPTION'>('UNIQUE');
    const [companionName, setCompanionName] = useState('');
    const [billingResult, setBillingResult] = useState<any>(null);

    // Navigation Data
    const courseClasses = useMemo(() => classes.filter(cls => {
        if (cls.courseId !== selectedCourseId) return false;
        
        // Hide class if registrationDeadline has passed
        if (cls.registrationDeadline) {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const todayLocalStr = `${year}-${month}-${day}`;
            
            if (cls.registrationDeadline < todayLocalStr) {
                return false;
            }
        }
        
        return true;
    }), [classes, selectedCourseId]);
    const selectedCourse = useMemo(() => courses.find(c => c.id === selectedCourseId), [courses, selectedCourseId]);
    const selectedClassObj = useMemo(() => classes.find(c => c.id === selectedClassId), [classes, selectedClassId]);

    const selectedEvent = useMemo(() => {
        if (!strategicEvents || !selectedEventId) return null;
        return strategicEvents.find(e => e.id === selectedEventId);
    }, [strategicEvents, selectedEventId]);

    const filteredCourses = useMemo(() => {
        if (!courses || selectedCategory === 'eventos' || !selectedCategory) return [];
        const result = courses.filter(c => {
            const ministry = c.ministryName?.toLowerCase() || '';
            const isLumine = ministry.includes('lumine') || ministry.includes('ebd');
            const isEscola = ministry.includes('wave') || ministry === 'dis';

            if (selectedCategory === 'lumine' && !isLumine) return false;
            if (selectedCategory === 'escolas' && !isEscola) return false;
            if (selectedCategory === 'ministerios' && (isLumine || isEscola)) return false;

            if (selectedCategory === 'lumine') {
                if (!trailFilter) return false;
                if (trailFilter !== 'all' && c.ebdTrack !== trailFilter) return false;
            }

            if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase();
                return c.name.toLowerCase().includes(term) || (c.description || '').toLowerCase().includes(term);
            }
            return true;
        });

        return result.sort((a, b) => {
            const orderA = (a as any).sortOrder !== undefined && (a as any).sortOrder !== null ? Number((a as any).sortOrder) : 9999;
            const orderB = (b as any).sortOrder !== undefined && (b as any).sortOrder !== null ? Number((b as any).sortOrder) : 9999;
            if (orderA !== orderB) return orderA - orderB;
            return a.name.localeCompare(b.name);
        });
    }, [courses, selectedCategory, trailFilter, searchTerm]);

    const filteredEvents = useMemo(() => {
        if (!strategicEvents || selectedCategory !== 'eventos') return [];
        return strategicEvents.filter(evt => {
            const isApprovedPublic = evt.status === 'aprovado' && evt.isPublicForRegistration === true;
            if (!isApprovedPublic) return false;

            if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase();
                return evt.eventName.toLowerCase().includes(term) || (evt.ministry || '').toLowerCase().includes(term);
            }
            return true;
        });
    }, [strategicEvents, selectedCategory, searchTerm]);

    // Handlers
    const handleVerifyEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!emailInput.trim()) return;

        setIsVerifying(true);
        const result = await verifyMemberEmail(emailInput);
        setIsVerifying(false);

        if (result.error) {
            toast({ variant: 'destructive', title: "Erro", description: result.error });
            return;
        }

        if (result.found) {
            setFoundUser({
                userId: result.userId!,
                maskedName: result.maskedName!,
                maskedPhone: result.maskedPhone!,
                hasCpf: result.hasCpf
            });
            setMode('existing');
        } else {
            setFoundUser(null);
            setMode('new');
        }
    };

    const nextStep = () => {
        if (selectedCategory === 'eventos' && currentStep === 3) {
            setCurrentStep(5);
        } else {
            setCurrentStep(p => Math.min(p + 1, 5));
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const prevStep = () => {
        if (selectedCategory === 'eventos' && currentStep === 5) {
            setCurrentStep(3);
        } else {
            setCurrentStep(p => Math.max(p - 1, 1));
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleFinalSubmit = async () => {
        if (selectedCategory === 'eventos') {
            if (!selectedEventId || !selectedEvent) return;

            const needsCpfInput = selectedEvent.isPaid === 'pago' && (mode === 'new' || !foundUser?.hasCpf);
            if (needsCpfInput && !cpfCnpj.trim()) {
                toast({
                    variant: 'destructive',
                    title: 'CPF/CNPJ obrigatório',
                    description: 'Preencha o CPF ou CNPJ do pagador para gerar a cobrança.'
                });
                return;
            }

            setIsSubmitting(true);
            try {
                const finalEmail = emailInput.toLowerCase().trim();
                let finalName = mode === 'new' ? formData.name : undefined;
                let finalPhone = mode === 'new' ? formData.phone : undefined;
                let userId = foundUser?.userId;
                let finalCpf = cpfCnpj;

                if (userId && firestore) {
                    const { doc, getDoc } = await import('firebase/firestore');
                    const userDoc = await getDoc(doc(firestore, 'users', userId));
                    if (userDoc.exists()) {
                        const realData = userDoc.data();
                        finalName = realData.name;
                        finalPhone = realData.phone;
                        if (!finalCpf) {
                            finalCpf = realData.cpfCnpj || realData.cpf || realData.cnpj || '';
                        }
                    }
                }

                if (!finalName) {
                    finalName = 'Participante IBM';
                }

                const isPaid = selectedEvent.isPaid === 'pago';
                let asaasCharge: any = null;

                if (isPaid) {
                    // 1. Criar/Buscar Cliente no Asaas
                    const customerRes = await fetch('/api/asaas/customers', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            name: finalName,
                            email: finalEmail,
                            phone: finalPhone || '',
                            cpfCnpj: finalCpf.replace(/\D/g, ''),
                            userId: userId || undefined,
                            tenantId: new URLSearchParams(window.location.search).get('tenantId') || undefined
                        }),
                    });

                    if (!customerRes.ok) {
                        const err = await customerRes.json().catch(() => ({}));
                        throw new Error(err.error || `Erro ao criar cliente no Asaas (${customerRes.status})`);
                    }

                    const { customerId } = await customerRes.json();

                    // 2. Criar cobrança ou assinatura no Asaas
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    const tomorrowStr = tomorrow.toISOString().split('T')[0];

                    const isSubscription = chargeType === 'SUBSCRIPTION';
                    const endpoint = isSubscription ? '/api/asaas/subscriptions' : '/api/asaas/payments';

                    const paymentRes = await fetch(endpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            customerId,
                            billingType: paymentMethod,
                            value: selectedEvent.ticketPrice || 0,
                            dueDate: tomorrowStr,
                            description: `Inscrição Evento: ${selectedEvent.eventName}`,
                            externalReference: userId || undefined,
                            tenantId: new URLSearchParams(window.location.search).get('tenantId') || undefined
                        }),
                    });

                    if (!paymentRes.ok) {
                        const err = await paymentRes.json().catch(() => ({}));
                        throw new Error(err.error || `Erro ao criar cobrança no Asaas (${paymentRes.status})`);
                    }

                    asaasCharge = await paymentRes.json();
                }

                // 3. Salvar inscrição no Firestore
                if (firestore) {
                    const { collection, addDoc, Timestamp } = await import('firebase/firestore');
                    const regData: any = {
                        eventId: selectedEventId,
                        userId: userId || 'anonymous',
                        userMetadata: {
                            name: finalName,
                            email: finalEmail,
                            phone: finalPhone || '',
                        },
                        payment: {
                            status: isPaid ? 'pending' : 'approved',
                            method: isPaid ? paymentMethod.toLowerCase() : 'free',
                            valuePaid: isPaid ? (selectedEvent.ticketPrice || 0) : 0,
                            paidAt: isPaid ? null : Timestamp.now(),
                            transactionId: isPaid ? (asaasCharge?.id || `asaas_${Math.random().toString(36).substring(2, 10)}`) : 'free',
                        },
                        attendance: {
                            checkedIn: false,
                            checkedInAt: null,
                            checkedInBy: null,
                        },
                        companionName: companionName.trim(),
                        createdAt: Timestamp.now(),
                    };

                    if (isPaid && asaasCharge) {
                        regData.payment.asaasPaymentId = asaasCharge.id;
                        regData.payment.asaasStatus = asaasCharge.status || 'PENDING';
                        regData.payment.invoiceUrl = asaasCharge.invoiceUrl;
                        regData.payment.bankSlipUrl = asaasCharge.bankSlipUrl;

                        // Obter QR Code se for PIX
                        if (paymentMethod === 'PIX' && asaasCharge.id) {
                            try {
                                const tenantId = new URLSearchParams(window.location.search).get('tenantId');
                                const url = new URL(window.location.origin + `/api/asaas/payments/${asaasCharge.id}/pix`);
                                if (tenantId) url.searchParams.set('tenantId', tenantId);

                                const qrRes = await fetch(url.toString());
                                if (qrRes.ok) {
                                    const qrData = await qrRes.json();
                                    regData.payment.pixQrCodeImage = qrData.encodedImage;
                                    regData.payment.pixCopyPaste = qrData.payload;
                                }
                            } catch (e) {
                                console.error('Erro ao buscar QR Code Pix:', e);
                            }
                        }
                    }

                    const docRef = await addDoc(collection(firestore, 'event_registrations'), regData);

                    setBillingResult({
                        isPaid,
                        registrationId: docRef.id,
                        paymentMethod,
                        chargeType,
                        value: selectedEvent.ticketPrice,
                        invoiceUrl: asaasCharge?.invoiceUrl || regData.payment.invoiceUrl || '',
                        bankSlipUrl: asaasCharge?.bankSlipUrl || regData.payment.bankSlipUrl || '',
                        pixQrCodeImage: asaasCharge?.pixQrCodeImage || regData.payment.pixQrCodeImage || '',
                        pixCopyPaste: asaasCharge?.pixCopyPaste || regData.payment.pixCopyPaste || '',
                    });
                }

                setIsSuccess(true);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } catch (error: any) {
                console.error(error);
                toast({
                    variant: 'destructive',
                    title: "Erro ao processar",
                    description: error.message || "Não foi possível enviar sua inscrição."
                });
            } finally {
                setIsSubmitting(false);
            }
        } else {
            if (!selectedCourseId) return;
            setIsSubmitting(true);
            try {
                const result = await submitEnrollmentRequest({
                    userId: foundUser?.userId,
                    name: mode === 'new' ? formData.name : undefined,
                    email: emailInput.toLowerCase().trim(),
                    phone: mode === 'new' ? formData.phone : undefined,
                    courseId: selectedCourseId,
                    classId: selectedClassId || undefined
                });

                if (result?.error) {
                    throw new Error(result.error);
                }

                setIsSuccess(true);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } catch (error) {
                toast({ variant: 'destructive', title: "Erro ao processar", description: "Não foi possível enviar sua inscrição." });
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    // Rendered Views
    if (isSuccess) {
        const isPaidEvent = billingResult?.isPaid;
        return (
            <div className={cn("mx-auto py-12 px-4 text-center space-y-6 animate-in zoom-in-95 duration-500", isPaidEvent ? "max-w-lg" : "max-w-md")}>
                <div className="size-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                    <CheckCircle size={40} />
                </div>
                <h2 className="text-4xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">
                    {isPaidEvent ? "Inscrição\nRecebida!" : "Inscrição\nConfirmada!"}
                </h2>

                {isPaidEvent ? (
                    <div className="space-y-4 text-left bg-white p-6 rounded-[2rem] border-2 shadow-md">
                        <p className="text-sm text-slate-600 font-medium text-center">
                            Sua inscrição para <strong>{selectedEvent?.eventName}</strong> está pré-registrada. Conclua o pagamento abaixo para confirmar sua vaga.
                        </p>

                        {/* PIX */}
                        {billingResult.paymentMethod === 'PIX' && (
                            <div className="flex flex-col items-center gap-4 border-t border-slate-100 pt-4">
                                {billingResult.pixQrCodeImage ? (
                                    <div className="p-3 bg-white border border-slate-200 rounded-xl inline-flex shadow-sm">
                                        <img
                                            src={`data:image/png;base64,${billingResult.pixQrCodeImage}`}
                                            alt="QR Code PIX"
                                            className="size-40 rounded"
                                        />
                                    </div>
                                ) : (
                                    <div className="size-40 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center">
                                        <QrCode className="size-16 text-slate-300" />
                                    </div>
                                )}

                                {billingResult.pixCopyPaste && (
                                    <div className="w-full space-y-1.5">
                                        <Label className="text-xs text-slate-500">Código Pix Copia e Cola</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                readOnly
                                                value={billingResult.pixCopyPaste}
                                                className="bg-slate-50 border-slate-200 text-slate-700 text-xs select-all h-9"
                                            />
                                            <Button
                                                size="icon"
                                                variant="outline"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(billingResult.pixCopyPaste);
                                                    toast({ title: 'Copiado!', description: 'Código Pix copiado.' });
                                                }}
                                                className="shrink-0 h-9 w-9 border-slate-200"
                                            >
                                                <Copy className="size-4 text-slate-500" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* BOLETO */}
                        {billingResult.paymentMethod === 'BOLETO' && billingResult.bankSlipUrl && (
                            <div className="flex flex-col items-center gap-4 border-t border-slate-100 pt-4">
                                <p className="text-sm text-slate-600 text-center">
                                    O boleto bancário foi gerado com sucesso.
                                </p>
                                <Button
                                    onClick={() => window.open(billingResult.bankSlipUrl, '_blank')}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold w-full"
                                >
                                    Abrir Boleto
                                </Button>
                            </div>
                        )}

                        {/* CREDIT_CARD ou UNDEFINED */}
                        {(billingResult.paymentMethod === 'CREDIT_CARD' || billingResult.paymentMethod === 'UNDEFINED') && billingResult.invoiceUrl && (
                            <div className="flex flex-col items-center gap-4 border-t border-slate-100 pt-4">
                                <p className="text-sm text-slate-600 text-center">
                                    O link de faturamento foi gerado. Clique no botão abaixo para preencher os dados de pagamento.
                                </p>
                                <Button
                                    onClick={() => window.open(billingResult.invoiceUrl, '_blank')}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold w-full"
                                >
                                    Efetuar Pagamento
                                </Button>
                            </div>
                        )}

                        <div className="text-[11px] text-slate-500 font-mono text-center pt-2">
                            ID de inscrição: {billingResult.registrationId}
                        </div>
                    </div>
                ) : (
                    <p className="text-muted-foreground font-medium">
                        Sua solicitação para <strong>{selectedCategory === 'eventos' ? selectedEvent?.eventName : selectedCourse?.name}</strong> foi recebida.
                        {selectedCategory === 'eventos' ? " Inscrição confirmada!" : " Em breve a secretaria entrará em contato."}
                    </p>
                )}

                <Button onClick={() => window.location.reload()} variant="outline" className="w-full font-bold h-12 rounded-xl">
                    Fazer Outra Inscrição
                </Button>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
            {/* Header Global */}
            <div className="text-center space-y-4 mb-2">
                <Logo className="size-12 text-primary mx-auto mb-4" />
                <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase text-slate-900 leading-none">Sistema de<br />Inscrições</h1>
            </div>

            {/* Stepper Wizard Indicator */}
            <Stepper currentStep={currentStep} />

            {/* Passo 1: Identificação */}
            {currentStep === 1 && (
                <Card className="shadow-xl border-dashed border-2 overflow-hidden rounded-[2.5rem] animate-in slide-in-from-right-8">
                    <CardHeader className="bg-primary/5 p-8 border-b text-center">
                        <CardTitle className="text-2xl font-black uppercase italic tracking-tighter">Quem é você?</CardTitle>
                        <CardDescription>Precisamos do seu e-mail para vincular a inscrição.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8">
                        {!mode || (mode === 'existing' && !foundUser) ? (
                            <form onSubmit={handleVerifyEmail} className="space-y-6">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground">E-mail Principal</Label>
                                    <Input
                                        required
                                        type="email"
                                        placeholder="seu@email.com"
                                        value={emailInput}
                                        onChange={e => setEmailInput(e.target.value)}
                                        className="h-14 rounded-2xl text-lg font-medium border-slate-200"
                                    />
                                </div>
                                <Button disabled={isVerifying || !emailInput} className="w-full h-14 rounded-2xl font-black text-base uppercase tracking-widest shadow-xl">
                                    {isVerifying ? <Loader2 className="animate-spin mr-2" /> : <ArrowRight className="mr-2" />}
                                    Buscar Cadastro
                                </Button>
                            </form>
                        ) : mode === 'existing' && foundUser ? (
                            <div className="space-y-8 animate-in fade-in zoom-in-95">
                                <div className="p-6 bg-primary/5 rounded-3xl border-2 border-dashed border-primary/20 flex items-center gap-4">
                                    <div className="size-14 bg-white rounded-2xl shadow-sm flex items-center justify-center text-primary shrink-0">
                                        <Sparkles size={28} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-primary tracking-widest leading-none mb-1">Encontramos você</p>
                                        <h3 className="text-lg font-black text-slate-900 leading-none">{foundUser.maskedName}</h3>
                                        <p className="text-xs font-medium text-muted-foreground mt-1">{foundUser.maskedPhone}</p>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <Button onClick={() => nextStep()} className="w-full h-14 rounded-2xl font-black text-base uppercase tracking-widest shadow-xl">
                                        Sim, Sou Eu
                                    </Button>
                                    <Button variant="ghost" onClick={() => { setFoundUser(null); setMode('new'); }} className="w-full font-bold text-muted-foreground">
                                        Não sou eu / Informar outro
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={(e) => { e.preventDefault(); nextStep(); }} className="space-y-6 animate-in fade-in">
                                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3 items-center mb-6">
                                    <Info className="size-5 text-amber-600 shrink-0" />
                                    <p className="text-xs font-bold text-amber-800">E-mail não cadastrado. Preencha seus dados para criar um protocolo.</p>
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-muted-foreground">Nome Completo</Label>
                                        <Input required value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} className="h-12 rounded-xl" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-muted-foreground">WhatsApp</Label>
                                        <Input required type="tel" value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} placeholder="(21) 9..." className="h-12 rounded-xl" />
                                    </div>
                                </div>
                                <Button className="w-full h-14 rounded-2xl font-black text-base uppercase tracking-widest shadow-xl">
                                    Avançar
                                </Button>
                            </form>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Passo 2: Categoria */}
            {currentStep === 2 && (
                <div className="space-y-6 animate-in slide-in-from-right-8">
                    <Button variant="ghost" size="sm" onClick={prevStep} className="text-muted-foreground -ml-2 mb-2 font-bold uppercase tracking-widest text-[10px]">
                        <ChevronLeft className="mr-1 size-3" /> Voltar
                    </Button>
                    <h3 className="text-2xl font-black italic tracking-tighter uppercase text-center mb-8">O que você está buscando?</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button
                            onClick={() => { setSelectedCategory('lumine'); setSelectedCourseId(null); setSelectedClassId(null); nextStep(); }}
                            className="bg-white p-6 rounded-[2rem] border-2 shadow-sm hover:border-primary hover:shadow-xl hover:-translate-y-1 transition-all text-left flex flex-col group"
                        >
                            <div className="size-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><BookOpen size={24} /></div>
                            <h4 className="text-lg font-black uppercase tracking-tighter italic leading-none mb-2">Cursos Lumine</h4>
                            <p className="text-xs text-muted-foreground font-medium">Trilhos teológicos, bíblicos e de discipulado da igreja local.</p>
                        </button>

                        <button
                            onClick={() => { setSelectedCategory('escolas'); setSelectedCourseId(null); setSelectedClassId(null); nextStep(); }}
                            className="bg-white p-6 rounded-[2rem] border-2 shadow-sm hover:border-primary hover:shadow-xl hover:-translate-y-1 transition-all text-left flex flex-col group"
                        >
                            <div className="size-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><GraduationCap size={24} /></div>
                            <h4 className="text-lg font-black uppercase tracking-tighter italic leading-none mb-2">Escolas Especiais</h4>
                            <p className="text-xs text-muted-foreground font-medium">Wave School e programa DIS de aperfeiçoamento.</p>
                        </button>

                        <button
                            onClick={() => { setSelectedCategory('ministerios'); setSelectedCourseId(null); setSelectedClassId(null); nextStep(); }}
                            className="bg-white p-6 rounded-[2rem] border-2 shadow-sm hover:border-primary hover:shadow-xl hover:-translate-y-1 transition-all text-left flex flex-col group"
                        >
                            <div className="size-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><Briefcase size={24} /></div>
                            <h4 className="text-lg font-black uppercase tracking-tighter italic leading-none mb-2">Ministérios</h4>
                            <p className="text-xs text-muted-foreground font-medium">Treinamentos focados em capacitação de voluntariado.</p>
                        </button>

                        <button
                            onClick={() => { setSelectedCategory('eventos'); setSelectedCourseId(null); setSelectedClassId(null); nextStep(); }}
                            className="bg-white p-6 rounded-[2rem] border-2 shadow-sm hover:border-primary hover:shadow-xl hover:-translate-y-1 transition-all text-left flex flex-col group"
                        >
                            <div className="size-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><CalendarDays size={24} /></div>
                            <h4 className="text-lg font-black uppercase tracking-tighter italic leading-none mb-2">Eventos</h4>
                            <p className="text-xs text-muted-foreground font-medium">Inscrições pontuais para retiros, conferências e mais.</p>
                        </button>
                    </div>
                </div>
            )}

            {/* Passo 3: Catálogo */}
            {currentStep === 3 && (
                <div className="space-y-6 animate-in slide-in-from-right-8">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => {
                            if (selectedCategory === 'lumine' && trailFilter !== null) {
                                setTrailFilter(null);
                            } else {
                                prevStep();
                            }
                        }} 
                        className="text-muted-foreground -ml-2 mb-2 font-bold uppercase tracking-widest text-[10px]"
                    >
                        <ChevronLeft className="mr-1 size-3" /> {selectedCategory === 'lumine' && trailFilter !== null ? 'Escolher Trilho' : 'Escolher Categoria'}
                    </Button>

                    {selectedCategory === 'eventos' ? (
                        <div className="space-y-6">
                            <div className="space-y-4">
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground size-5" />
                                    <Input
                                        placeholder="Buscar evento por nome..."
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        className="h-14 pl-12 rounded-2xl bg-white border-2 shadow-sm text-lg focus-visible:ring-primary/20"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {filteredEvents.map(evt => {
                                    const isPaid = evt.isPaid === 'pago';
                                    return (
                                        <Card
                                            key={evt.id}
                                            className="overflow-hidden rounded-[2rem] cursor-pointer transition-all duration-300 hover:shadow-xl border-2 hover:border-primary group bg-white"
                                            onClick={() => {
                                                setSelectedEventId(evt.id);
                                                setSelectedCourseId(null);
                                                setSelectedClassId(null);
                                                nextStep();
                                            }}
                                        >
                                            <div className="relative aspect-video bg-slate-100">
                                                <img src={`https://picsum.photos/seed/${evt.id}/600/300`} alt="" className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-700" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent z-10" />
                                                <div className="absolute top-4 right-4 z-20 flex gap-1.5">
                                                    <Badge className={cn("border-none text-[9px] font-bold uppercase", isPaid ? "bg-amber-500 text-slate-900" : "bg-emerald-500 text-white")}>
                                                        {isPaid ? `R$ ${evt.ticketPrice?.toFixed(2)}` : 'Gratuito'}
                                                    </Badge>
                                                </div>
                                                <div className="absolute bottom-4 left-5 z-20 pr-4">
                                                    <Badge className="bg-primary backdrop-blur-md text-white border-none mb-2 text-[8px] font-black uppercase tracking-widest">{evt.ministry || 'Evento'}</Badge>
                                                    <h4 className="text-white font-black uppercase italic tracking-tighter leading-tight text-lg shadow-sm mb-1">{evt.eventName}</h4>
                                                    <p className="text-white/80 text-[10px] font-medium flex items-center gap-1">
                                                        <CalendarDays className="size-3" /> {evt.startDate ? new Date(evt.startDate + 'T00:00:00').toLocaleDateString('pt-BR') : ''}
                                                    </p>
                                                </div>
                                            </div>
                                        </Card>
                                    );
                                })}
                                {filteredEvents.length === 0 && (
                                    <div className="col-span-full py-16 text-center text-muted-foreground border-2 border-dashed rounded-[2rem]">
                                        Nenhum evento com inscrições abertas no momento.
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {selectedCategory === 'lumine' && trailFilter === null ? (
                                <div className="space-y-6 animate-in fade-in-50 duration-500">
                                    <h3 className="text-xl font-black italic tracking-tighter uppercase text-center mb-6">Selecione o Trilho Acadêmico</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            type="button"
                                            onClick={() => setTrailFilter('all')}
                                            className="bg-white p-6 rounded-[2rem] border-2 shadow-sm hover:border-primary hover:shadow-xl hover:-translate-y-1 transition-all text-left flex flex-col group"
                                        >
                                            <div className="size-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                                <Layers size={24} />
                                            </div>
                                            <h4 className="text-lg font-black uppercase tracking-tighter italic leading-none mb-2">Todos</h4>
                                            <p className="text-xs text-muted-foreground font-medium">Exibe todas as disciplinas e trilhos disponíveis.</p>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setTrailFilter('biblico')}
                                            className="bg-white p-6 rounded-[2rem] border-2 shadow-sm hover:border-primary hover:shadow-xl hover:-translate-y-1 transition-all text-left flex flex-col group"
                                        >
                                            <div className="size-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                                <BookOpen size={24} />
                                            </div>
                                            <h4 className="text-lg font-black uppercase tracking-tighter italic leading-none mb-2">Bíblico</h4>
                                            <p className="text-xs text-muted-foreground font-medium">Estudo e aprofundamento das Escrituras.</p>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setTrailFilter('teologico')}
                                            className="bg-white p-6 rounded-[2rem] border-2 shadow-sm hover:border-primary hover:shadow-xl hover:-translate-y-1 transition-all text-left flex flex-col group"
                                        >
                                            <div className="size-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                                <GraduationCap size={24} />
                                            </div>
                                            <h4 className="text-lg font-black uppercase tracking-tighter italic leading-none mb-2">Teológico</h4>
                                            <p className="text-xs text-muted-foreground font-medium">Doutrina sistemática e teologia prática.</p>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setTrailFilter('discipulado')}
                                            className="bg-white p-6 rounded-[2rem] border-2 shadow-sm hover:border-primary hover:shadow-xl hover:-translate-y-1 transition-all text-left flex flex-col group"
                                        >
                                            <div className="size-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                                <ListChecks size={24} />
                                            </div>
                                            <h4 className="text-lg font-black uppercase tracking-tighter italic leading-none mb-2">Discipulado</h4>
                                            <p className="text-xs text-muted-foreground font-medium">Crescimento, maturidade e caminhada cristã.</p>
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6 animate-in slide-in-from-right-8">
                                    {selectedCategory === 'lumine' && (
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="text-sm font-black uppercase italic text-primary tracking-wider">
                                                Lumine — Trilho: {
                                                    trailFilter === 'all' ? 'Todos' :
                                                    trailFilter === 'biblico' ? 'Bíblico' :
                                                    trailFilter === 'teologico' ? 'Teológico' :
                                                    trailFilter === 'discipulado' ? 'Discipulado' : ''
                                                }
                                            </h4>
                                            <Button variant="ghost" size="sm" onClick={() => setTrailFilter(null)} className="h-7 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary">
                                                <ChevronLeft className="mr-1 size-3" /> Outro Trilho
                                            </Button>
                                        </div>
                                    )}
                                    <div className="relative">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground size-5" />
                                        <Input
                                            placeholder="Buscar curso por nome..."
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                            className="h-14 pl-12 rounded-2xl bg-white border-2 shadow-sm text-lg focus-visible:ring-primary/20"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {filteredCourses.map(course => (
                                            <Card
                                                key={course.id}
                                                className="overflow-hidden rounded-[2rem] cursor-pointer transition-all duration-300 hover:shadow-xl border-2 hover:border-primary group bg-white"
                                                onClick={() => {
                                                    setSelectedCourseId(course.id);
                                                    setSelectedClassId(null);
                                                    nextStep();
                                                }}
                                            >
                                                <div className="relative aspect-video bg-slate-100">
                                                    <img src={course.imageUrl || `https://picsum.photos/seed/${course.id}/600/300`} alt="" className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-700" />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent z-10" />
                                                    <div className="absolute bottom-4 left-5 z-20 pr-4">
                                                        <Badge className="bg-primary backdrop-blur-md text-white border-none mb-2 text-[8px] font-black uppercase tracking-widest">{course.ministryName}</Badge>
                                                        <h4 className="text-white font-black uppercase italic tracking-tighter leading-tight text-lg shadow-sm">{course.name}</h4>
                                                    </div>
                                                </div>
                                            </Card>
                                        ))}
                                        {filteredCourses.length === 0 && (
                                            <div className="col-span-full py-16 text-center text-muted-foreground border-2 border-dashed rounded-[2rem]">
                                                Nenhum curso encontrado nesta categoria.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Passo 4: Turma */}
            {currentStep === 4 && (
                <div className="space-y-6 animate-in slide-in-from-right-8">
                    <Button variant="ghost" size="sm" onClick={prevStep} className="text-muted-foreground -ml-2 mb-2 font-bold uppercase tracking-widest text-[10px]">
                        <ChevronLeft className="mr-1 size-3" /> Escolher Outro Curso
                    </Button>

                    <div className="bg-white p-6 rounded-[2rem] border-2 shadow-sm text-center">
                        <Badge className="bg-slate-100 text-slate-800 border bg-primary/10 text-primary hover:bg-primary/20 mb-3">{selectedCourse?.ministryName}</Badge>
                        <h3 className="text-2xl md:text-3xl font-black italic tracking-tighter uppercase mb-2 text-slate-900">{selectedCourse?.name}</h3>
                        <p className="text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">{selectedCourse?.description}</p>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2 mb-4 ml-2">
                            <Clock className="size-4" /> Turmas Disponíveis
                        </Label>

                        {courseClasses.length > 0 ? (
                            <div className="grid gap-3">
                                {courseClasses.map(cls => (
                                    <button
                                        key={cls.id}
                                        onClick={() => { setSelectedClassId(cls.id); nextStep(); }}
                                        className="w-full bg-white p-5 rounded-2xl text-left border-2 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-primary hover:shadow-lg group"
                                    >
                                        <div>
                                            <p className="text-base font-black uppercase tracking-tighter text-slate-900">{cls.name}</p>
                                            <div className="flex items-center gap-2 text-xs font-bold mt-1 uppercase text-slate-500">
                                                <CalendarDays className="size-4" /> {cls.dayOfWeek} às {cls.startTime}
                                            </div>
                                        </div>
                                        <div className="size-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-colors shrink-0">
                                            <ArrowRight className="size-5" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="p-8 bg-white rounded-2xl border-2 border-dashed text-center">
                                <p className="text-sm font-bold text-muted-foreground">Opa! Nenhuma turma aberta para este curso no momento.</p>
                                <Button variant="link" onClick={prevStep} className="mt-2 text-primary font-bold">Voltar aos Cursos</Button>
                            </div>
                        )}

                        {/* Option to enroll without class if it's an online course or interest list */}
                        {courseClasses.length === 0 && (
                            <Button
                                variant="outline"
                                onClick={() => { setSelectedClassId(null); nextStep(); }}
                                className="w-full h-14 rounded-2xl border-2 border-primary text-primary hover:bg-primary/5 font-black uppercase tracking-widest text-xs"
                            >
                                Entrar na Fila de Espera
                            </Button>
                        )}
                    </div>
                </div>
            )}

            {/* Passo 5: Resumo e Finalização */}
            {currentStep === 5 && (
                <div className="space-y-6 animate-in slide-in-from-right-8">
                    <Button variant="ghost" size="sm" onClick={prevStep} className="text-muted-foreground -ml-2 mb-2 font-bold uppercase tracking-widest text-[10px]">
                        <ChevronLeft className="mr-1 size-3" /> {selectedCategory === 'eventos' ? 'Alterar Evento' : 'Alterar Turma'}
                    </Button>

                    <Card className="shadow-xl border-none overflow-hidden rounded-[2.5rem] bg-slate-900 text-white">
                        <CardHeader className="p-8 pb-4 text-center">
                            <div className="size-16 bg-white/10 rounded-full mx-auto flex items-center justify-center mb-4">
                                <ListChecks className="size-8 text-primary-foreground" />
                            </div>
                            <CardTitle className="text-2xl font-black uppercase italic tracking-tighter text-white">Confirme sua Inscrição</CardTitle>
                            <CardDescription className="text-slate-400">Verifique os dados antes de finalizar.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-8 pt-0 space-y-6">
                            <div className="p-5 bg-white/5 rounded-2xl space-y-4">
                                <div>
                                    <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Aluno(a)</Label>
                                    <p className="font-bold text-lg">{mode === 'existing' ? foundUser?.maskedName : formData.name}</p>
                                    <p className="text-sm text-slate-400">{emailInput}</p>
                                </div>

                                <div className="h-px bg-white/10" />

                                {selectedCategory === 'eventos' ? (
                                    <div>
                                        <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Evento Selecionado</Label>
                                        <p className="font-bold text-lg text-primary-foreground italic uppercase tracking-tighter leading-none mt-1">{selectedEvent?.eventName}</p>
                                        <p className="text-xs text-slate-400 mt-1 uppercase font-semibold">
                                            {selectedEvent?.startDate ? new Date(selectedEvent.startDate + 'T12:00:00').toLocaleDateString('pt-BR') : ''}
                                        </p>
                                    </div>
                                ) : (
                                    <div>
                                        <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Curso Selecionado</Label>
                                        <p className="font-bold text-lg text-primary-foreground italic uppercase tracking-tighter leading-none mt-1">{selectedCourse?.name}</p>
                                    </div>
                                )}

                                {selectedClassObj && (
                                    <>
                                        <div className="h-px bg-white/10" />
                                        <div>
                                            <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Turma / Horário</Label>
                                            <p className="font-bold">{selectedClassObj.name}</p>
                                            <p className="text-sm text-slate-400 uppercase">{selectedClassObj.dayOfWeek} às {selectedClassObj.startTime}</p>
                                        </div>
                                    </>
                                )}
                            </div>

                            {selectedCategory === 'eventos' && selectedEvent?.isPaid === 'pago' && (
                                <div className="space-y-4 p-5 bg-white/5 rounded-2xl border border-white/10">
                                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                                        💳 Informações de Faturamento (Asaas)
                                    </h4>

                                    {(mode === 'new' || !foundUser?.hasCpf) && (
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] font-black uppercase text-slate-400">
                                                CPF / CNPJ do Pagador <span className="text-red-400">*</span>
                                            </Label>
                                            <Input
                                                type="text"
                                                placeholder="000.000.000-00"
                                                value={cpfCnpj}
                                                onChange={(e) => setCpfCnpj(e.target.value)}
                                                className="bg-white/10 border-white/20 text-white h-11 rounded-xl placeholder-slate-600 focus-visible:ring-primary focus-visible:border-primary"
                                            />
                                        </div>
                                    )}

                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-black uppercase text-slate-400">Formato</Label>
                                        <Select
                                            value={chargeType}
                                            onValueChange={(val: any) => setChargeType(val)}
                                        >
                                            <SelectTrigger className="bg-white/10 border-white/20 text-white h-11 rounded-xl">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                                <SelectItem value="UNIQUE">Cobrança Única</SelectItem>
                                                <SelectItem value="SUBSCRIPTION">Assinatura Mensal</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-black uppercase text-slate-400">Meio de Pagamento</Label>
                                        <Select
                                            value={paymentMethod}
                                            onValueChange={(val: any) => setPaymentMethod(val)}
                                        >
                                            <SelectTrigger className="bg-white/10 border-white/20 text-white h-11 rounded-xl">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                                <SelectItem value="PIX">🏦 Pix</SelectItem>
                                                <SelectItem value="BOLETO">📄 Boleto Bancário</SelectItem>
                                                <SelectItem value="CREDIT_CARD">💳 Cartão de Crédito</SelectItem>
                                                <SelectItem value="UNDEFINED">❓ Indefinido (Escolha do pagador)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-black uppercase text-slate-400">Nome do Acompanhante (Opcional)</Label>
                                        <Input
                                            type="text"
                                            placeholder="Nome de quem vai com você..."
                                            value={companionName}
                                            onChange={(e) => setCompanionName(e.target.value)}
                                            className="bg-white/10 border-white/20 text-white h-11 rounded-xl placeholder-slate-600 focus-visible:ring-primary focus-visible:border-primary"
                                        />
                                    </div>

                                    <div className="flex justify-between items-center text-xs border-t border-white/10 pt-3">
                                        <span className="text-slate-400">Valor total:</span>
                                        <span className="font-bold text-amber-400 text-base">
                                            R$ {selectedEvent?.ticketPrice?.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {selectedCategory === 'eventos' && selectedEvent?.isPaid !== 'pago' && (
                                <div className="space-y-4 p-5 bg-white/5 rounded-2xl border border-white/10">
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-black uppercase text-slate-400">Nome do Acompanhante (Opcional)</Label>
                                        <Input
                                            type="text"
                                            placeholder="Nome de quem vai com você..."
                                            value={companionName}
                                            onChange={(e) => setCompanionName(e.target.value)}
                                            className="bg-white/10 border-white/20 text-white h-11 rounded-xl placeholder-slate-600 focus-visible:ring-primary focus-visible:border-primary"
                                        />
                                    </div>
                                    <div className="flex justify-between items-center text-xs border-t border-white/10 pt-3">
                                        <span className="text-slate-400">Valor da Inscrição:</span>
                                        <span className="font-bold text-emerald-400 text-sm">Gratuito</span>
                                    </div>
                                </div>
                            )}

                            <Button
                                onClick={handleFinalSubmit}
                                disabled={isSubmitting}
                                className="w-full h-16 rounded-2xl font-black text-lg uppercase tracking-[0.2em] shadow-2xl bg-primary hover:bg-primary/90 text-white"
                            >
                                {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <ChevronRight className="mr-2" />}
                                Finalizar Inscrição
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}

export default function EnrollmentPage() {
    return (
        <main className="min-h-screen bg-[#F8F9FA] pb-24 selection:bg-primary/20">
            <VolunteeringProvider>
                <EnrollmentForm />
            </VolunteeringProvider>
        </main>
    );
}
