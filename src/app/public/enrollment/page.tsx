
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { useVolunteering, VolunteeringProvider } from '@/contexts/volunteering-context';
import { verifyMemberEmail } from './actions';
import { collection, Timestamp, addDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
    Loader2, Send, CheckCircle, Mail, User, Phone, 
    ChevronRight, BookOpen, GraduationCap, Waves, 
    Lightbulb, School, CalendarDays, Search, Heart, 
    Star, ArrowRight, Sparkles, AlertCircle, Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

function EnrollmentPageContent() {
    const { firestore } = useFirebase();
    const { courses, classes } = useVolunteering();
    const { toast } = useToast();
    
    const [step, setStep] = useState<'email' | 'details'>('email');
    const [email, setEmail] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [identifiedUser, setIdentifiedUser] = useState<{id: string, name: string, phone: string} | null>(null);
    
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);
    const [success, setSuccess] = useState(false);

    // Navegação de Catálogo
    const [mainTab, setMainTab] = useState('ensino');
    const [ensinoSubTab, setEnsinoSubTab] = useState('lumine');

    const handleVerifyEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !email.includes('@')) {
            toast({ variant: 'destructive', title: "E-mail inválido", description: "Por favor, insira um e-mail válido." });
            return;
        }

        setIsVerifying(true);
        try {
            const result = await verifyMemberEmail(email);
            if (result.exists && result.user) {
                setIdentifiedUser(result.user);
                setName(result.user.name);
                setPhone(result.user.phone);
                toast({ title: "Bem-vindo de volta!", description: `Reconhecemos seu cadastro, ${result.user.name.split(' ')[0]}.` });
            } else {
                setIdentifiedUser(null);
                setName('');
                setPhone('');
                toast({ title: "Novo por aqui?", description: "Não encontramos seu e-mail. Vamos criar um novo protocolo para você." });
            }
            setStep('details');
        } catch (error) {
            toast({ variant: 'destructive', title: "Erro na verificação", description: "Tente novamente em instantes." });
        } finally {
            setIsVerifying(false);
        }
    };

    const handleSelectCourse = (courseId: string) => {
        setSelectedCourseId(courseId);
        const courseClasses = classes.filter(c => c.courseId === courseId);
        if (courseClasses.length === 1) {
            setSelectedClassId(courseClasses[0].id);
        } else {
            setSelectedClassId('');
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSaveProtocol = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !phone || !selectedCourseId || !firestore) return;

        setIsSaving(true);
        try {
            await addDoc(collection(firestore, 'enrollment_requests'), {
                name,
                email,
                phone,
                courseId: selectedCourseId,
                classId: selectedClassId || null,
                status: 'pending',
                createdAt: Timestamp.now(),
                userId: identifiedUser?.id || null
            });
            setSuccess(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (e) {
            toast({ variant: 'destructive', title: "Erro ao enviar", description: "Ocorreu uma falha técnica. Tente novamente." });
        } finally {
            setIsSaving(false);
        }
    };

    const filteredCourses = useMemo(() => {
        if (mainTab === 'eventos') return [];
        return courses.filter(c => {
            const m = c.ministryName?.toLowerCase() || '';
            if (ensinoSubTab === 'lumine') return m.includes('lumine') || m.includes('ebd');
            if (ensinoSubTab === 'escolas') return m.includes('wave') || m === 'dis';
            return !m.includes('lumine') && !m.includes('ebd') && !m.includes('wave') && m !== 'dis';
        });
    }, [courses, mainTab, ensinoSubTab]);

    if (success) {
        return (
            <main className="min-h-screen bg-slate-50 py-20 px-4 flex items-center justify-center">
                <Card className="max-w-md w-full text-center p-8 animate-in zoom-in-95 duration-500 rounded-[2.5rem] border-none shadow-2xl">
                    <div className="size-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner mb-6">
                        <CheckCircle size={48} />
                    </div>
                    <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 mb-4">Protocolo Enviado!</h2>
                    <p className="text-muted-foreground mb-8">
                        Recebemos sua solicitação. A secretaria entrará em contato via WhatsApp para confirmar sua vaga e detalhes do curso.
                    </p>
                    <Button onClick={() => window.location.reload()} className="w-full h-12 font-bold rounded-xl shadow-xl">Protocolar Outro</Button>
                </Card>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#F8F9FA] py-12 md:py-20 px-4">
            <div className="max-w-4xl mx-auto space-y-12">
                <div className="text-center space-y-4">
                    <Logo className="size-16 text-primary mx-auto mb-4" />
                    <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter uppercase text-slate-900 leading-[0.85]">
                        Portal de <span className="text-primary">Inscrições</span>
                    </h1>
                    <p className="text-muted-foreground text-lg md:text-xl font-medium max-w-2xl mx-auto">Sua jornada de crescimento e serviço começa aqui. Escolha o seu próximo passo.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Formulário de Protocolo */}
                    <div className="lg:col-span-5 order-2 lg:order-1">
                        <Card className="shadow-2xl border-none overflow-hidden rounded-[2rem] sticky top-8">
                            <CardHeader className="bg-primary/5 p-8 border-b">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-white rounded-2xl shadow-sm text-primary">
                                        <Sparkles size={24} />
                                    </div>
                                    <div>
                                        <CardTitle className="text-xl font-bold">Protocolo de Vaga</CardTitle>
                                        <CardDescription>Preencha para garantir seu interesse.</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-8">
                                {step === 'email' ? (
                                    <form onSubmit={handleVerifyEmail} className="space-y-6 animate-in fade-in slide-in-from-top-2">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Seu melhor e-mail</Label>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-3.5 size-5 text-muted-foreground" />
                                                <Input 
                                                    required 
                                                    type="email"
                                                    placeholder="exemplo@email.com" 
                                                    className="pl-10 h-12 text-lg font-medium"
                                                    value={email}
                                                    onChange={e => setEmail(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <Button type="submit" disabled={isVerifying} className="w-full h-14 font-black uppercase tracking-widest shadow-lg">
                                            {isVerifying ? <Loader2 className="animate-spin" /> : "Verificar E-mail"}
                                        </Button>
                                        <div className="flex items-start gap-2 p-3 bg-muted/30 rounded-xl">
                                            <Info className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                                            <p className="text-[10px] text-muted-foreground leading-tight">Inicie pelo e-mail para que possamos identificar se você já faz parte da nossa família.</p>
                                        </div>
                                    </form>
                                ) : (
                                    <form onSubmit={handleSaveProtocol} className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                                        <div className="p-4 bg-muted/20 border-2 border-dashed rounded-2xl mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="size-10 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                                                    {identifiedUser ? <CheckCircle size={20}/> : <User size={20}/>}
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase text-muted-foreground">{identifiedUser ? "Membro Reconhecido" : "E-mail Disponível"}</p>
                                                    <p className="font-bold text-sm truncate max-w-[180px]">{email}</p>
                                                </div>
                                                <Button variant="ghost" size="sm" onClick={() => setStep('email')} className="ml-auto text-[10px] uppercase font-black">Alterar</Button>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Nome Completo</Label>
                                            <Input required value={name} onChange={e => setName(e.target.value)} className="h-11" placeholder="Como devemos te chamar?" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">WhatsApp</Label>
                                            <div className="relative">
                                                <Phone className="absolute left-3 top-3 size-4 text-muted-foreground" />
                                                <Input required value={phone} onChange={e => setPhone(e.target.value)} className="pl-10 h-11" placeholder="(21) 9..." />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Curso Escolhido</Label>
                                            <div className={cn(
                                                "p-4 border-2 rounded-xl transition-all",
                                                selectedCourseId ? "border-primary bg-primary/5" : "border-dashed border-muted-foreground/20"
                                            )}>
                                                {selectedCourseId ? (
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 bg-white rounded-lg text-primary shadow-sm"><BookOpen size={16}/></div>
                                                            <span className="font-bold text-sm">{courses.find(c => c.id === selectedCourseId)?.name}</span>
                                                        </div>
                                                        <Button variant="ghost" size="sm" onClick={() => setSelectedCourseId(null)} className="h-6 w-6 p-0 text-destructive"><XCircle size={14}/></Button>
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-muted-foreground italic text-center py-2">Selecione um curso no catálogo ao lado.</p>
                                                )}
                                            </div>
                                        </div>

                                        <Button type="submit" disabled={isSaving || !selectedCourseId} className="w-full h-14 font-black uppercase tracking-widest shadow-xl">
                                            {isSaving ? <Loader2 className="animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                            Protocolar Inscrição
                                        </Button>
                                    </form>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Catálogo de Cursos */}
                    <div className="lg:col-span-7 order-1 lg:order-2 space-y-6">
                        <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-2 bg-white p-1 h-14 rounded-2xl shadow-sm border">
                                <TabsTrigger value="ensino" className="rounded-xl font-black uppercase tracking-tighter italic text-lg data-[state=active]:bg-primary data-[state=active]:text-white">
                                    <GraduationCap className="mr-2 h-5 w-5" /> Ensino
                                </TabsTrigger>
                                <TabsTrigger value="eventos" className="rounded-xl font-black uppercase tracking-tighter italic text-lg data-[state=active]:bg-primary data-[state=active]:text-white">
                                    <CalendarDays className="mr-2 h-5 w-5" /> Eventos
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="ensino" className="mt-6 space-y-6">
                                <Tabs value={ensinoSubTab} onValueChange={setEnsinoSubTab} className="w-full">
                                    <TabsList className="flex h-auto bg-transparent gap-2 p-0 overflow-x-auto no-scrollbar">
                                        <TabsTrigger value="lumine" className="h-9 px-4 rounded-full border bg-white font-bold data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:border-indigo-600">Lumine (EBD)</TabsTrigger>
                                        <TabsTrigger value="escolas" className="h-9 px-4 rounded-full border bg-white font-bold data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:border-indigo-600">Escolas (Wave/DIS)</TabsTrigger>
                                        <TabsTrigger value="ministerios" className="h-9 px-4 rounded-full border bg-white font-bold data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:border-indigo-600">Ministérios</TabsTrigger>
                                    </TabsList>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                                        {filteredCourses.map(course => (
                                            <Card key={course.id} className={cn(
                                                "group cursor-pointer transition-all border-2 overflow-hidden",
                                                selectedCourseId === course.id ? "border-primary ring-2 ring-primary/20" : "hover:border-primary/30"
                                            )} onClick={() => handleSelectCourse(course.id)}>
                                                <CardHeader className="p-4 bg-muted/10 border-b">
                                                    <div className="flex justify-between items-start">
                                                        <div className="p-2 bg-white rounded-lg text-primary shadow-sm"><BookOpen size={16}/></div>
                                                        <Badge variant="outline" className="text-[8px] uppercase font-black">{course.ministryName}</Badge>
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="p-4">
                                                    <h4 className="font-bold text-slate-900 uppercase tracking-tight mb-1">{course.name}</h4>
                                                    <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">{course.description}</p>
                                                </CardContent>
                                                <CardFooter className="p-4 bg-muted/5 flex justify-end">
                                                    <div className="text-[10px] font-black uppercase text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
                                                        Selecionar <ArrowRight size={12}/>
                                                    </div>
                                                </CardFooter>
                                            </Card>
                                        ))}
                                        {filteredCourses.length === 0 && (
                                            <div className="col-span-full py-20 text-center text-muted-foreground border-2 border-dashed rounded-[2rem]">
                                                <Search className="size-8 mx-auto mb-2 opacity-20" />
                                                <p className="text-sm font-medium">Nenhum curso disponível nesta categoria.</p>
                                            </div>
                                        )}
                                    </div>
                                </Tabs>
                            </TabsContent>

                            <TabsContent value="eventos" className="mt-6">
                                <div className="py-20 text-center space-y-4 bg-white rounded-[2rem] border-2 border-dashed border-muted-foreground/20">
                                    <div className="size-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto">
                                        <Heart size={32} />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-xl text-slate-900 uppercase italic">Próximos Eventos</h3>
                                        <p className="text-muted-foreground text-sm max-w-xs mx-auto">As inscrições para eventos sazonais serão abertas em breve. Fique atento aos avisos oficiais.</p>
                                    </div>
                                    <Button variant="outline" className="rounded-full font-bold h-10 px-8 border-rose-200 text-rose-600 hover:bg-rose-50">Ver Calendário</Button>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </div>
        </main>
    );
}

export default function EnrollmentPage() {
    return (
        <VolunteeringProvider>
            <EnrollmentPageContent />
        </VolunteeringProvider>
    );
}
