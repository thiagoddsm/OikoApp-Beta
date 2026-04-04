'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { VolunteeringProvider, useVolunteering } from '@/contexts/volunteering-context';
import { collection, Timestamp, addDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
    Loader2, Send, CheckCircle, Mail, User, Phone, 
    ArrowRight, GraduationCap, School, BookOpen, Music,
    Waves, Lightbulb, HeartHandshake, CalendarDays,
    Info, ShieldCheck, ChevronRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/icons';
import { verifyMemberEmail } from './actions';
import { cn } from '@/lib/utils';

function EnrollmentFormContent() {
    const { firestore } = useFirebase();
    const { courses, classes } = useVolunteering();
    const { toast } = useToast();
    
    // Estados do Fluxo
    const [step, setStep] = useState<'email' | 'details' | 'selection'>('email');
    const [isVerifying, setIsVerifying] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    
    // Dados do Aluno
    const [email, setEmail] = useState('');
    const [isExistingMember, setIsExistingMember] = useState(false);
    const [maskedData, setMaskedData] = useState<{ name: string; phone: string } | null>(null);
    const [formData, setFormData] = useState({ name: '', phone: '' });
    
    // Seleção de Curso/Evento
    const [selectedTab, setSelectedTab] = useState('ensino');
    const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

    const handleVerifyEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;

        setIsVerifying(true);
        const result = await verifyMemberEmail(email);
        setIsVerifying(false);

        if (result.found) {
            setIsExistingMember(true);
            setMaskedData({ name: result.maskedName!, phone: result.maskedPhone! });
            setStep('details');
        } else {
            setIsExistingMember(false);
            setStep('details');
        }
    };

    const handleConfirmDetails = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isExistingMember && (!formData.name || !formData.phone)) {
            toast({ variant: 'destructive', title: "Campos Obrigatórios", description: "Preencha seu nome e telefone." });
            return;
        }
        setStep('selection');
    };

    const handleEnroll = async (courseId: string) => {
        if (!firestore) return;
        setIsSubmitting(true);

        try {
            const requestData = {
                name: isExistingMember ? 'Membro Identificado' : formData.name,
                email: email.trim().toLowerCase(),
                phone: isExistingMember ? 'Telefone Identificado' : formData.phone,
                courseId,
                status: 'pending',
                createdAt: Timestamp.now(),
                source: 'public_portal'
            };

            await addDoc(collection(firestore, 'enrollment_requests'), requestData);
            setSuccess(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: "Erro no Protocolo", description: "Tente novamente em instantes." });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (success) {
        return (
            <div className="max-w-md mx-auto text-center space-y-6 py-12 animate-in zoom-in-95 duration-500">
                <div className="size-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                    <CheckCircle size={40} />
                </div>
                <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900">Protocolo Enviado!</h2>
                <p className="text-muted-foreground leading-relaxed">
                    Sua solicitação de inscrição foi recebida com sucesso. Nossa secretaria entrará em contato em breve para confirmar sua turma.
                </p>
                <Button onClick={() => window.location.reload()} variant="outline" className="w-full font-bold h-12 rounded-xl">Realizar outra Inscrição</Button>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="text-center space-y-4">
                <Logo className="size-12 text-primary mx-auto mb-4" />
                <h1 className="text-5xl md:text-8xl font-black italic tracking-tighter uppercase text-slate-900 leading-[0.85]">
                    Portal de Inscrições
                </h1>
                <p className="text-muted-foreground text-sm md:text-lg max-w-xl mx-auto font-medium">
                    Ensino, Comunhão e Crescimento Ministerial em um só lugar.
                </p>
            </div>

            <Card className="shadow-2xl border-none overflow-hidden rounded-[2.5rem] bg-white/80 backdrop-blur-sm">
                <CardHeader className="bg-primary/5 p-8 md:p-10 border-b">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white rounded-2xl shadow-sm text-primary">
                            {step === 'email' ? <Mail size={24} /> : step === 'details' ? <User size={24} /> : <BookOpen size={24} />}
                        </div>
                        <div>
                            <CardTitle className="text-xl font-bold">
                                {step === 'email' ? 'Passo 1: Identificação' : step === 'details' ? 'Passo 2: Confirmação' : 'Passo 3: Escolha sua Atividade'}
                            </CardTitle>
                            <CardDescription>
                                {step === 'email' ? 'Comece informando seu e-mail.' : step === 'details' ? 'Confirme se os dados estão corretos.' : 'Selecione o curso ou evento desejado.'}
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-8 md:p-10">
                    {step === 'email' && (
                        <form onSubmit={handleVerifyEmail} className="space-y-6 animate-in fade-in slide-in-from-top-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] uppercase font-black text-muted-foreground ml-1">E-mail para Inscrição</Label>
                                <Input 
                                    required 
                                    type="email" 
                                    placeholder="seu@email.com" 
                                    className="h-14 text-lg font-medium rounded-2xl"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                />
                            </div>
                            <Button type="submit" disabled={isVerifying || !email} className="w-full h-14 font-black text-base uppercase tracking-widest shadow-xl rounded-2xl">
                                {isVerifying ? <Loader2 className="animate-spin" /> : 'Continuar'}
                            </Button>
                        </form>
                    )}

                    {step === 'details' && (
                        <form onSubmit={handleConfirmDetails} className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                            {isExistingMember ? (
                                <div className="p-6 bg-emerald-50 border-2 border-emerald-100 rounded-3xl space-y-4">
                                    <div className="flex items-center gap-3 text-emerald-700">
                                        <ShieldCheck size={20} />
                                        <span className="text-xs font-black uppercase">Cadastro Encontrado!</span>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-2xl font-black text-slate-900 leading-none">{maskedData?.name}</p>
                                        <p className="text-sm font-medium text-slate-500">{maskedData?.phone}</p>
                                    </div>
                                    <p className="text-[10px] text-emerald-600 font-bold uppercase italic">Os dados foram protegidos por segurança.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-start gap-3 mb-4">
                                        <Info className="size-5 text-blue-600 shrink-0 mt-0.5" />
                                        <p className="text-xs text-blue-800 font-medium leading-relaxed">Não encontramos um cadastro para o e-mail informado. Preencha os campos abaixo para criar seu protocolo.</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] uppercase font-black text-muted-foreground ml-1">Seu Nome Completo</Label>
                                        <Input required value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} className="h-12 rounded-xl" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] uppercase font-black text-muted-foreground ml-1">WhatsApp / Celular</Label>
                                        <Input required type="tel" value={formData.phone} onChange={e => setFormData(p => ({...p, phone: e.target.value}))} placeholder="(21) 9..." className="h-12 rounded-xl" />
                                    </div>
                                </div>
                            )}
                            <div className="flex gap-3">
                                <Button type="button" variant="outline" onClick={() => setStep('email')} className="h-12 px-6 rounded-xl font-bold">Voltar</Button>
                                <Button type="submit" className="flex-1 h-12 font-black text-base uppercase tracking-widest shadow-lg rounded-xl">Confirmar e Escolher Curso</Button>
                            </div>
                        </form>
                    )}

                    {step === 'selection' && (
                        <div className="space-y-8 animate-in fade-in zoom-in-95">
                            <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
                                <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1.5 rounded-2xl h-14">
                                    <TabsTrigger value="ensino" className="font-black text-xs uppercase tracking-widest rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">Ensino & Escolas</TabsTrigger>
                                    <TabsTrigger value="eventos" className="font-black text-xs uppercase tracking-widest rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">Eventos Gerais</TabsTrigger>
                                </TabsList>

                                <TabsContent value="ensino" className="mt-8 space-y-10">
                                    {/* LUMINE / TRILHOS */}
                                    <section className="space-y-4">
                                        <div className="flex items-center gap-3 px-2">
                                            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl"><Lightbulb size={20}/></div>
                                            <h3 className="font-black text-sm uppercase tracking-widest text-indigo-900">Trilha Lumine (Discipulado)</h3>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {courses.filter(c => c.ministryName?.toLowerCase().includes('lumine') || c.ebdTrack).map(c => (
                                                <button key={c.id} onClick={() => handleEnroll(c.id)} disabled={isSubmitting} className="group relative text-left p-5 border-2 rounded-3xl hover:border-indigo-500 hover:bg-indigo-50 transition-all bg-white shadow-sm">
                                                    <p className="font-black text-slate-900 uppercase italic tracking-tighter text-lg">{c.name}</p>
                                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{c.description}</p>
                                                    <div className="mt-4 flex items-center gap-2 text-[10px] font-black uppercase text-indigo-600">Inscrever-se <ChevronRight size={14}/></div>
                                                </button>
                                            ))}
                                        </div>
                                    </section>

                                    {/* ESCOLAS WAVE/DIS */}
                                    <section className="space-y-4">
                                        <div className="flex items-center gap-3 px-2">
                                            <div className="p-2 bg-rose-100 text-rose-600 rounded-xl"><Music size={20}/></div>
                                            <h3 className="font-black text-sm uppercase tracking-widest text-rose-900">Escolas & Academias</h3>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {courses.filter(c => ['wave', 'dis'].includes(c.ministryName?.toLowerCase())).map(c => (
                                                <button key={c.id} onClick={() => handleEnroll(c.id)} disabled={isSubmitting} className="group relative text-left p-5 border-2 rounded-3xl hover:border-rose-500 hover:bg-rose-50 transition-all bg-white shadow-sm">
                                                    <div className="flex justify-between items-start">
                                                        <p className="font-black text-slate-900 uppercase italic tracking-tighter text-lg">{c.name}</p>
                                                        <Badge variant="secondary" className="text-[9px] uppercase">{c.ministryName}</Badge>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{c.description}</p>
                                                    <div className="mt-4 flex items-center gap-2 text-[10px] font-black uppercase text-rose-600">Solicitar Matrícula <ChevronRight size={14}/></div>
                                                </button>
                                            ))}
                                        </div>
                                    </section>
                                </TabsContent>

                                <TabsContent value="eventos" className="mt-8">
                                    <div className="py-20 text-center space-y-4 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
                                        <CalendarDays className="size-12 mx-auto text-slate-300" />
                                        <div>
                                            <p className="font-bold text-slate-600">Nenhum evento com inscrição aberta no momento.</p>
                                            <p className="text-xs text-slate-400 uppercase tracking-widest mt-1">Fique atento às nossas redes sociais!</p>
                                        </div>
                                    </div>
                                </TabsContent>
                            </Tabs>
                            <Button variant="ghost" onClick={() => setStep('details')} className="w-full text-xs font-bold uppercase text-muted-foreground">Alterar meus dados</Button>
                        </div>
                    )}
                </CardContent>
                
                <CardFooter className="p-8 bg-slate-50 flex flex-col gap-4 border-t">
                    <p className="text-[10px] text-center text-muted-foreground uppercase font-black tracking-widest">Igreja Batista da Manhã • Secretaria Ministerial</p>
                </CardFooter>
            </Card>
        </div>
    );
}

export default function EnrollmentPage() {
    return (
        <VolunteeringProvider>
            <main className="min-h-screen bg-[#F8F9FA] py-12 md:py-20 px-4">
                <div className="max-w-4xl mx-auto">
                    <EnrollmentFormContent />
                </div>
            </main>
        </VolunteeringProvider>
    );
}
