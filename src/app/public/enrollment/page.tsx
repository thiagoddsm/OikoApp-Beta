'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { VolunteeringProvider, useVolunteering, type Course, type Class } from '@/contexts/volunteering-context';
import { collection, Timestamp, addDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
    Loader2, CheckCircle, Mail, User, Smartphone, 
    GraduationCap, Calendar, ChevronRight, ArrowLeft, 
    Heart, Waves, HandHelping, School, Lightbulb, 
    BookOpen, Clock, Info, LayoutTemplate, Star
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/icons';
import Image from 'next/image';
import { verifyMemberEmail } from './actions';
import { cn } from '@/lib/utils';

function EnrollmentForm() {
    const { firestore } = useFirebase();
    const { courses, classes, isLoading: isContextLoading } = useVolunteering();
    const { toast } = useToast();

    const [step, setStep] = useState<'email' | 'confirm' | 'form' | 'success'>('email');
    const [isVerifying, setIsVerifying] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Member Data
    const [email, setEmail] = useState('');
    const [memberInfo, setMemberInfo] = useState<{ id?: string; name: string; phone: string; isNew: boolean } | null>(null);
    
    // Enrollment Selection
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [mainTab, setMainTab] = useState('ensino');
    const [teachingTab, setTeachingTab] = useState('lumine');

    const handleVerifyEmail = async () => {
        if (!email.trim()) return;
        setIsVerifying(true);
        try {
            const result = await verifyMemberEmail(email.trim());
            setMemberInfo(result);
            setStep(result.isNew ? 'form' : 'confirm');
        } catch (error) {
            toast({ variant: 'destructive', title: "Erro na verificação", description: "Tente novamente em instantes." });
        } finally {
            setIsVerifying(false);
        }
    };

    const handleConfirmIdentity = (confirmed: boolean) => {
        if (confirmed) {
            setStep('form');
        } else {
            setStep('email');
            setEmail('');
            setMemberInfo(null);
        }
    };

    const handleEnroll = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCourse || (!selectedClassId && !selectedCourse.name.toLowerCase().includes('membro'))) {
            toast({ variant: 'destructive', title: "Seleção Incompleta", description: "Por favor, escolha uma turma para continuar." });
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                courseId: selectedCourse.id,
                classId: selectedClassId || 'modular',
                name: memberInfo?.name || '',
                email: email.trim(),
                phone: memberInfo?.phone || '',
                status: 'pending',
                createdAt: Timestamp.now(),
            };

            await addDoc(collection(firestore!, 'enrollment_requests'), payload);
            setStep('success');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (error) {
            toast({ variant: 'destructive', title: "Erro ao protocolar", description: "Falha na conexão. Tente novamente." });
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredCourses = useMemo(() => {
        if (mainTab === 'eventos') return [];
        return courses.filter(c => {
            const m = c.ministryName?.toLowerCase() || '';
            if (teachingTab === 'lumine') return m.includes('lumine') || m.includes('ebd');
            if (teachingTab === 'escolas') return m.includes('wave') || m.includes('dis');
            return !m.includes('lumine') && !m.includes('ebd') && !m.includes('wave') && !m.includes('dis');
        });
    }, [courses, mainTab, teachingTab]);

    if (step === 'success') {
        return (
            <div className="text-center space-y-6 py-12 animate-in zoom-in-95 duration-500">
                <div className="size-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                    <CheckCircle size={48} />
                </div>
                <div className="space-y-2">
                    <h2 className="text-4xl font-black uppercase italic tracking-tighter text-slate-900">Protocolo Enviado!</h2>
                    <p className="text-muted-foreground font-medium">Obrigado, {memberInfo?.name.split(' ')[0]}. Sua solicitação de inscrição foi recebida.</p>
                </div>
                <Card className="max-w-sm mx-auto border-none shadow-lg bg-slate-50">
                    <CardContent className="p-6 text-sm text-slate-600 leading-relaxed">
                        Nossa equipe ministerial analisará os dados e entrará em contato via WhatsApp para confirmar sua vaga e fornecer os materiais necessários.
                    </CardContent>
                </Card>
                <Button onClick={() => window.location.reload()} variant="outline" className="font-bold">Fazer outra inscrição</Button>
            </div>
        );
    }

    return (
        <div className="space-y-10">
            {/* ETAPA 1: IDENTIFICAÇÃO */}
            {step === 'email' && (
                <Card className="border-none shadow-2xl overflow-hidden rounded-[2.5rem] animate-in slide-in-from-bottom-4 duration-500">
                    <CardHeader className="bg-primary/5 p-8 md:p-12 border-b text-center">
                        <div className="size-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-primary mx-auto mb-6">
                            <Mail size={32} />
                        </div>
                        <CardTitle className="text-2xl font-bold">Comece por aqui</CardTitle>
                        <CardDescription>Informe seu e-mail para identificarmos seu cadastro ou iniciarmos um novo.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 md:p-12">
                        <div className="max-w-md mx-auto space-y-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">E-mail de Membro</Label>
                                <Input 
                                    type="email" 
                                    placeholder="seu@email.com" 
                                    className="h-14 text-lg font-medium rounded-2xl px-6"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleVerifyEmail()}
                                />
                            </div>
                            <Button 
                                onClick={handleVerifyEmail} 
                                disabled={!email.includes('@') || isVerifying}
                                className="w-full h-14 rounded-2xl font-black text-base uppercase tracking-widest shadow-xl"
                            >
                                {isVerifying ? <Loader2 className="animate-spin mr-2" /> : <ArrowRight className="mr-2" />}
                                Continuar
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ETAPA 2: CONFIRMAÇÃO DE PRIVACIDADE */}
            {step === 'confirm' && memberInfo && (
                <Card className="border-none shadow-2xl overflow-hidden rounded-[2.5rem] animate-in zoom-in-95">
                    <CardHeader className="bg-primary/5 p-8 border-b text-center">
                        <CardTitle className="text-2xl font-bold">É você?</CardTitle>
                        <CardDescription>Encontramos um cadastro com este e-mail.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 space-y-8 text-center">
                        <div className="space-y-4">
                            <div className="inline-flex flex-col items-center p-6 bg-slate-50 rounded-3xl border-2 border-dashed border-primary/20">
                                <p className="text-2xl font-black text-slate-900 tracking-tight">{memberInfo.name}</p>
                                <p className="text-sm font-bold text-primary mt-1">{memberInfo.phone}</p>
                            </div>
                            <p className="text-xs text-muted-foreground max-w-xs mx-auto italic">
                                Por questões de privacidade, ocultamos parte das informações. Confirme se os dados estão corretos.
                            </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Button onClick={() => handleConfirmIdentity(true)} className="h-12 px-8 rounded-xl font-bold">Sim, sou eu!</Button>
                            <Button onClick={() => handleConfirmIdentity(false)} variant="outline" className="h-12 px-8 rounded-xl font-bold">Não, sou outra pessoa</Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ETAPA 3: CATÁLOGO E INSCRIÇÃO */}
            {(step === 'form' || step === 'success') && (
                <div className="space-y-10 animate-in fade-in duration-700">
                    <div className="text-center space-y-4">
                        <Badge variant="secondary" className="bg-primary/10 text-primary border-none py-1 px-4 text-[10px] font-black uppercase tracking-widest">
                            Olá, {memberInfo?.name.split(' ')[0]}
                        </Badge>
                        <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter text-slate-900">O que vamos <span className="text-primary">viver hoje?</span></h2>
                    </div>

                    <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto h-14 bg-slate-100 p-1.5 rounded-2xl mb-12 shadow-inner">
                            <TabsTrigger value="ensino" className="rounded-xl font-black uppercase tracking-widest text-xs data-[state=active]:bg-white data-[state=active]:shadow-lg">Ensino</TabsTrigger>
                            <TabsTrigger value="eventos" className="rounded-xl font-black uppercase tracking-widest text-xs data-[state=active]:bg-white data-[state=active]:shadow-lg">Eventos</TabsTrigger>
                        </TabsList>

                        <TabsContent value="ensino" className="space-y-8 animate-in slide-in-from-left-4">
                            <Tabs value={teachingTab} onValueChange={setTeachingTab} className="w-full">
                                <div className="flex justify-center mb-8">
                                    <TabsList className="bg-transparent border-b rounded-none h-10 gap-8 overflow-x-auto no-scrollbar flex-nowrap px-4">
                                        <TabsTrigger value="lumine" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none font-bold text-[10px] uppercase tracking-widest pb-3">Lumine (EBD)</TabsTrigger>
                                        <TabsTrigger value="escolas" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none font-bold text-[10px] uppercase tracking-widest pb-3">Escolas (Wave/DIS)</TabsTrigger>
                                        <TabsTrigger value="ministerios" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none font-bold text-[10px] uppercase tracking-widest pb-3">Ministérios</TabsTrigger>
                                    </TabsList>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {filteredCourses.map(course => (
                                        <Card 
                                            key={course.id} 
                                            className={cn(
                                                "group cursor-pointer overflow-hidden border-2 transition-all duration-500 rounded-[2rem]",
                                                selectedCourse?.id === course.id ? "border-primary ring-4 ring-primary/10 shadow-2xl scale-[1.02]" : "border-transparent hover:border-slate-200 bg-white"
                                            )}
                                            onClick={() => {
                                                setSelectedCourse(course);
                                                const courseClasses = classes.filter(cls => cls.courseId === course.id);
                                                if (courseClasses.length === 1) setSelectedClassId(courseClasses[0].id);
                                                else setSelectedClassId('');
                                            }}
                                        >
                                            <div className="relative aspect-[16/10] overflow-hidden">
                                                <Image 
                                                    src={`https://picsum.photos/seed/${course.id}/600/400`} 
                                                    alt={course.name} 
                                                    fill 
                                                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
                                                <div className="absolute bottom-4 left-6 z-20">
                                                    <Badge className="bg-primary/20 backdrop-blur-md text-white border-none mb-1 text-[10px] font-black uppercase">{course.ministryName}</Badge>
                                                    <h4 className="text-white font-black uppercase italic tracking-tighter leading-none">{course.name}</h4>
                                                </div>
                                            </div>
                                            <CardContent className="p-6">
                                                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed font-medium">
                                                    {course.description || 'Nenhum detalhe disponível para este curso.'}
                                                </p>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </Tabs>
                        </TabsContent>

                        <TabsContent value="eventos" className="animate-in slide-in-from-right-4">
                            <div className="py-20 text-center space-y-4 bg-slate-50 rounded-[3rem] border-2 border-dashed">
                                <Calendar className="size-12 mx-auto text-slate-300" />
                                <h3 className="text-xl font-bold text-slate-400">Nenhum evento com inscrições abertas.</h3>
                                <p className="text-sm text-slate-400">Fique atento aos nossos canais oficiais para novidades.</p>
                            </div>
                        </TabsContent>
                    </Tabs>

                    {/* FORMULÁRIO DE FINALIZAÇÃO */}
                    {selectedCourse && (
                        <div className="max-w-2xl mx-auto pt-10 border-t animate-in slide-in-from-bottom-8">
                            <form onSubmit={handleEnroll} className="space-y-8">
                                <div className="p-8 bg-primary text-white rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
                                        <BookOpen size={120} />
                                    </div>
                                    <div className="relative z-10">
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-2">Você selecionou:</p>
                                        <h3 className="text-3xl font-black italic uppercase tracking-tighter leading-none">{selectedCourse.name}</h3>
                                        <p className="text-sm font-bold mt-2 opacity-90">{selectedCourse.ministryName}</p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    {!selectedCourse.name.toLowerCase().includes('membro') ? (
                                        <div className="space-y-3">
                                            <Label className="text-[10px] uppercase font-black text-muted-foreground ml-2">Escolha uma Turma *</Label>
                                            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                                                <SelectTrigger className="h-14 rounded-2xl bg-white border-2">
                                                    <SelectValue placeholder="Selecione o horário disponível..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {classes.filter(cls => cls.courseId === selectedCourse.id).map(cls => (
                                                        <SelectItem key={cls.id} value={cls.id}>
                                                            <div className="flex flex-col text-left py-1">
                                                                <span className="font-bold">{cls.name}</span>
                                                                <span className="text-[10px] text-muted-foreground uppercase">{cls.dayOfWeek} às {cls.startTime}</span>
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    ) : (
                                        <div className="p-6 bg-blue-50 border-2 border-dashed border-blue-200 rounded-[2rem] flex items-start gap-4">
                                            <Info className="size-6 text-blue-600 shrink-0 mt-1" />
                                            <div className="space-y-1">
                                                <p className="font-bold text-blue-900">Inscrição em Ciclo Modular</p>
                                                <p className="text-sm text-blue-800/70 leading-relaxed">
                                                    Este curso acontece todos os domingos às 09h00. Ao se inscrever, você será vinculado automaticamente ao próximo ciclo disponível.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] uppercase font-black text-muted-foreground ml-2">Nome</Label>
                                            <Input value={memberInfo?.name} readOnly className="bg-slate-50 border-none h-12 rounded-xl font-bold" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] uppercase font-black text-muted-foreground ml-2">WhatsApp</Label>
                                            <Input value={memberInfo?.phone} readOnly className="bg-slate-50 border-none h-12 rounded-xl font-bold" />
                                        </div>
                                    </div>

                                    <Button type="submit" disabled={isSubmitting} className="w-full h-16 rounded-[2rem] font-black text-lg uppercase tracking-[0.2em] shadow-2xl">
                                        {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle className="mr-2" />}
                                        Protocolar Inscrição
                                    </Button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function EnrollmentPage() {
    return (
        <main className="min-h-screen bg-[#F8F9FA] selection:bg-primary/10">
            <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b h-20 flex items-center px-6">
                <div className="container mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Logo className="size-10 text-primary" />
                        <div className="flex flex-col leading-none">
                            <span className="text-xl font-black tracking-tighter uppercase italic">Oiko<span className="text-primary">App</span></span>
                            <span className="text-[8px] font-black uppercase tracking-[0.3em] text-muted-foreground">Governança Ministerial</span>
                        </div>
                    </div>
                    <div className="hidden md:flex items-center gap-1.5 px-4 py-2 bg-slate-100 rounded-full">
                        <div className="size-2 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Servidores Online</span>
                    </div>
                </div>
            </nav>

            <div className="container mx-auto px-4 pt-32 pb-20 max-w-6xl">
                <div className="text-center mb-16 space-y-4">
                    <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter uppercase text-slate-900 leading-none">Portal de <br /> <span className="text-primary">Inscrições</span></h1>
                    <p className="text-muted-foreground max-w-xl mx-auto text-sm md:text-lg font-medium">Escolha seu próximo passo de crescimento na Igreja Batista da Manhã.</p>
                </div>

                <VolunteeringProvider>
                    <EnrollmentForm />
                </VolunteeringProvider>
            </div>

            <footer className="bg-white border-t py-12">
                <div className="container mx-auto px-6 text-center space-y-6">
                    <div className="flex items-center justify-center gap-2">
                        <Logo className="size-6 text-slate-400" />
                        <span className="text-sm font-black uppercase tracking-widest text-slate-400 italic">IBM Twogether</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">© 2026 Igreja Batista da Manhã • Ano da Visão</p>
                </div>
            </footer>
        </main>
    );
}
