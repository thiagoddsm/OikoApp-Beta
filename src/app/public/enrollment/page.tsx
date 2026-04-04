
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useFirebase, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, where, limit, getDocs, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { 
    Loader2, Send, CheckCircle, Search, Mail, Smartphone, 
    User, BookOpen, CalendarDays, Waves, HandHelping, 
    Lightbulb, School, ArrowRight, GraduationCap, ChevronRight,
    MapPin, Clock, Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/icons';
import { cn } from '@/lib/utils';
import { VolunteeringProvider, useVolunteering } from '@/contexts/volunteering-context';

function EnrollmentPortal() {
    const { firestore } = useFirebase();
    const { courses, classes } = useVolunteering();
    const { toast } = useToast();
    
    // UI State
    const [activeMainTab, setActiveMainTab] = useState('ensino');
    const [activeEnsinoTab, setActiveEnsinoTab] = useState('lumine');
    const [activeLumineTrack, setActiveLumineTrack] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    
    // Form State
    const [formStep, setStep] = useState<'email' | 'details' | 'success'>('email');
    const [isCheckingEmail, setIsCheckingEmail] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [identifiedUser, setIdentifiedUser] = useState<{ name: string; id: string } | null>(null);
    
    const [formData, setFormData] = useState({
        email: '',
        name: '',
        phone: '',
        courseId: '',
        eventId: '',
    });

    // Filtering logic
    const filteredCourses = useMemo(() => {
        return courses.filter(c => {
            const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
            const ministry = c.ministryName?.toLowerCase() || '';
            
            if (activeEnsinoTab === 'lumine') {
                const isLumine = ministry.includes('lumine') || ministry.includes('ebd');
                if (!isLumine) return false;
                if (activeLumineTrack !== 'all' && c.ebdTrack !== activeLumineTrack) return false;
            } else if (activeEnsinoTab === 'escolas') {
                const isSchool = ministry.includes('wave') || ministry === 'dis';
                if (!isSchool) return false;
            } else if (activeEnsinoTab === 'ministerios') {
                const isLumine = ministry.includes('lumine') || ministry.includes('ebd');
                const isSchool = ministry.includes('wave') || ministry === 'dis';
                if (isLumine || isSchool) return false;
            }
            
            return matchesSearch;
        });
    }, [courses, activeEnsinoTab, activeLumineTrack, searchTerm]);

    const handleCheckEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.email || !firestore) return;

        setIsCheckingEmail(true);
        try {
            const usersRef = collection(firestore, 'users');
            const q = query(usersRef, where('email', '==', formData.email.toLowerCase().trim()), limit(1));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const userDoc = querySnapshot.docs[0];
                const userData = userDoc.data();
                setIdentifiedUser({ name: userData.name, id: userDoc.id });
                setFormData(prev => ({ ...prev, name: userData.name, phone: userData.phone || '' }));
                toast({ title: "Bem-vindo de volta!", description: `Identificamos seu cadastro, ${userData.name.split(' ')[0]}.` });
            } else {
                setIdentifiedUser(null);
                setFormData(prev => ({ ...prev, name: '', phone: '' }));
            }
            setStep('details');
        } catch (error) {
            console.error("Error checking email:", error);
            setStep('details'); // Move forward anyway, handle as new
        } finally {
            setIsCheckingEmail(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.email || (!formData.courseId && !formData.eventId) || !firestore) {
            toast({ variant: 'destructive', title: "Campos incompletos", description: "Por favor, selecione um curso/evento e preencha seus dados." });
            return;
        }

        setIsSubmitting(true);
        try {
            await addDocumentNonBlocking(collection(firestore, 'enrollment_requests'), {
                ...formData,
                status: 'pending',
                createdAt: Timestamp.now(),
                identifiedUserId: identifiedUser?.id || null,
                type: activeMainTab
            });
            setStep('success');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (e) {
            toast({ variant: 'destructive', title: "Erro ao enviar", description: "Falha na comunicação com o servidor." });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (formStep === 'success') {
        return (
            <div className="min-h-[60vh] flex items-center justify-center p-4">
                <Card className="max-w-md w-full text-center p-8 border-none shadow-2xl rounded-[2rem] animate-in zoom-in-95 duration-500">
                    <div className="size-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle size={40} />
                    </div>
                    <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 mb-4">Solicitação Enviada!</h2>
                    <p className="text-muted-foreground mb-8">
                        Recebemos seu interesse. A secretaria do ministério entrará em contato em breve para confirmar sua vaga na turma.
                    </p>
                    <Button onClick={() => window.location.reload()} variant="outline" className="w-full font-bold h-12 rounded-xl">Fazer Outra Inscrição</Button>
                </Card>
            </div>
        );
    }

    const selectedItemName = formData.courseId 
        ? courses.find(c => c.id === formData.courseId)?.name 
        : (formData.eventId === 'jantar-namorados' ? 'Jantar dos Namorados 2026' : '');

    return (
        <div className="max-w-7xl mx-auto px-4 py-12 md:py-20 space-y-16">
            {/* Header */}
            <div className="text-center space-y-6">
                <div className="flex justify-center mb-4">
                    <Logo className="size-16 text-primary" />
                </div>
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 py-1 px-6 text-xs font-black uppercase tracking-[0.3em] rounded-full">Portal de Inscrições</Badge>
                <h1 className="text-5xl md:text-8xl font-black italic tracking-tighter uppercase text-slate-900 leading-[0.85]">
                    O Riso que <span className="text-primary">Restaura</span> <br />
                    <span className="text-slate-400">& Trilhas de</span> Crescimento
                </h1>
                <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto font-medium">
                    Escolha sua jornada ministerial e garanta sua vaga nos próximos eventos e cursos IBM.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                {/* Catalog Side */}
                <div className="lg:col-span-8 space-y-10">
                    <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="w-full">
                        <div className="flex justify-center mb-10">
                            <TabsList className="bg-slate-100 p-1.5 rounded-full h-14">
                                <TabsTrigger value="ensino" className="rounded-full px-10 font-black uppercase italic tracking-tighter text-sm data-[state=active]:bg-white data-[state=active]:shadow-md">
                                    <GraduationCap className="mr-2 size-4" /> Ensino
                                </TabsTrigger>
                                <TabsTrigger value="eventos" className="rounded-full px-10 font-black uppercase italic tracking-tighter text-sm data-[state=active]:bg-white data-[state=active]:shadow-md">
                                    <CalendarDays className="mr-2 size-4" /> Eventos
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="ensino" className="space-y-10 animate-in fade-in-50 duration-500">
                            {/* Sub-tabs for Schools */}
                            <div className="flex flex-col items-center gap-6">
                                <div className="flex flex-wrap justify-center gap-3">
                                    {[
                                        { id: 'lumine', label: 'Escola Lumine', icon: Lightbulb },
                                        { id: 'escolas', label: 'Escolas (Wave/DIS)', icon: Waves },
                                        { id: 'ministerios', label: 'Ministérios', icon: HandHelping }
                                    ].map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveEnsinoTab(tab.id)}
                                            className={cn(
                                                "flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all border-2",
                                                activeEnsinoTab === tab.id 
                                                    ? "bg-primary border-primary text-white shadow-lg shadow-primary/30" 
                                                    : "bg-white border-slate-200 text-slate-500 hover:border-primary/30"
                                            )}
                                        >
                                            <tab.icon size={14} />
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>

                                {activeEnsinoTab === 'lumine' && (
                                    <div className="flex flex-wrap justify-center gap-2 animate-in slide-in-from-top-2">
                                        {[
                                            { id: 'all', label: 'Todos Trilhos' },
                                            { id: 'teologico', label: 'Trilho Teológico' },
                                            { id: 'biblico', label: 'Trilho Bíblico' },
                                            { id: 'discipulado', label: 'Trilho Discipulado' }
                                        ].map(track => (
                                            <button
                                                key={track.id}
                                                onClick={() => setActiveLumineTrack(track.id)}
                                                className={cn(
                                                    "px-4 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all",
                                                    activeLumineTrack === track.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                                )}
                                            >
                                                {track.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Search */}
                            <div className="relative max-w-md mx-auto">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                <Input 
                                    placeholder="Buscar por curso..." 
                                    className="pl-10 h-12 rounded-2xl bg-white border-slate-200 shadow-sm"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            {/* Course Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {filteredCourses.map(course => (
                                    <Card 
                                        key={course.id} 
                                        className={cn(
                                            "cursor-pointer transition-all hover:scale-[1.02] border-2 rounded-[1.5rem] overflow-hidden",
                                            formData.courseId === course.id ? "border-primary bg-primary/5 ring-4 ring-primary/5" : "border-slate-100"
                                        )}
                                        onClick={() => setFormData(p => ({...p, courseId: course.id, eventId: ''}))}
                                    >
                                        <CardHeader className="p-6 pb-2">
                                            <div className="flex justify-between items-start mb-2">
                                                <Badge variant="secondary" className="text-[9px] uppercase font-black px-2 h-5 tracking-tighter">
                                                    {course.ministryName}
                                                </Badge>
                                                {course.ebdTrack && (
                                                    <Badge variant="outline" className="text-[9px] uppercase font-black px-2 h-5 border-primary text-primary">
                                                        Trilha {course.ebdTrack}
                                                    </Badge>
                                                )}
                                            </div>
                                            <CardTitle className="text-xl font-black uppercase italic tracking-tighter leading-tight">{course.name}</CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-6 pt-2">
                                            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{course.description}</p>
                                        </CardContent>
                                        <CardFooter className="px-6 py-4 bg-slate-50 border-t flex justify-between items-center">
                                            <div className="flex items-center gap-3 text-[10px] font-black uppercase text-slate-500 tracking-widest">
                                                <Clock size={12} /> Próximo Ciclo: Março
                                            </div>
                                            <div className={cn("size-5 rounded-full border-2 flex items-center justify-center transition-all", formData.courseId === course.id ? "border-primary bg-primary" : "border-slate-300")}>
                                                {formData.courseId === course.id && <CheckCircle className="size-3 text-white" />}
                                            </div>
                                        </CardFooter>
                                    </Card>
                                ))}
                            </div>
                        </TabsContent>

                        <TabsContent value="eventos" className="animate-in fade-in-50 duration-500">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <Card 
                                    className={cn(
                                        "cursor-pointer transition-all hover:scale-[1.02] border-4 rounded-[2.5rem] overflow-hidden group",
                                        formData.eventId === 'jantar-namorados' ? "border-rose-500 ring-8 ring-rose-50" : "border-transparent shadow-xl"
                                    )}
                                    onClick={() => setFormData(p => ({...p, eventId: 'jantar-namorados', courseId: ''}))}
                                >
                                    <div className="aspect-video relative overflow-hidden bg-rose-900">
                                        <img src="https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=800&auto=format&fit=crop" alt="Jantar dos Namorados" className="object-cover w-full h-full opacity-60 group-hover:scale-110 transition-transform duration-700" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-rose-950 via-transparent to-transparent" />
                                        <div className="absolute bottom-6 left-6 right-6 text-white">
                                            <Badge className="bg-rose-600 text-white border-none mb-2 font-black uppercase text-[10px]">Junho 2026</Badge>
                                            <h3 className="text-3xl font-black italic tracking-tighter uppercase leading-none">Jantar dos <br/> Namorados</h3>
                                        </div>
                                    </div>
                                    <CardContent className="p-8">
                                        <p className="text-muted-foreground leading-relaxed font-medium">Uma noite exclusiva de comunhão, gastronomia gourmet e o Stand-up do Welson Nunes. O riso que restaura sua aliança.</p>
                                        <div className="mt-6 flex flex-wrap gap-4">
                                            <div className="flex items-center gap-2 text-xs font-black uppercase text-rose-600 tracking-widest"><MapPin size={14}/> Templo IBM</div>
                                            <div className="flex items-center gap-2 text-xs font-black uppercase text-rose-600 tracking-widest"><Clock size={14}/> 19:30H</div>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="p-8 pt-0 flex justify-between items-center">
                                        <Button variant="outline" asChild className="rounded-full border-rose-200 text-rose-600 font-bold hover:bg-rose-50 h-10 px-6">
                                            <a href="/eventos/jantar-dos-namorados" target="_blank" onClick={e => e.stopPropagation()}>Saiba mais <ArrowRight className="ml-2 size-4"/></a>
                                        </Button>
                                        <div className={cn("size-8 rounded-full border-2 flex items-center justify-center transition-all shadow-inner", formData.eventId === 'jantar-namorados' ? "border-rose-500 bg-rose-500" : "border-slate-200 bg-white")}>
                                            {formData.eventId === 'jantar-namorados' && <CheckCircle className="size-5 text-white" />}
                                        </div>
                                    </CardFooter>
                                </Card>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Form Side */}
                <div className="lg:col-span-4 sticky top-24">
                    <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white">
                        <CardHeader className="bg-slate-900 text-white p-8">
                            <CardTitle className="text-2xl font-black uppercase italic tracking-tighter flex items-center gap-2">
                                <Send className="size-6 text-primary" />
                                Protocolar Protocolo
                            </CardTitle>
                            <CardDescription className="text-slate-400 font-medium mt-2">
                                {formStep === 'email' ? 'Identificação inicial' : 'Confirmação de matrícula'}
                            </CardDescription>
                        </CardHeader>
                        <form onSubmit={formStep === 'email' ? handleCheckEmail : handleSave}>
                            <CardContent className="p-8 space-y-6">
                                {formStep === 'email' ? (
                                    <div className="space-y-4 animate-in slide-in-from-right-4">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Seu E-mail Principal *</Label>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                                                <Input 
                                                    required 
                                                    type="email" 
                                                    value={formData.email} 
                                                    onChange={e => setFormData(p => ({...p, email: e.target.value}))}
                                                    placeholder="seu@email.com"
                                                    className="pl-10 h-14 rounded-2xl bg-slate-50 border-none font-bold"
                                                />
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground italic leading-relaxed">
                                            Usaremos seu e-mail para verificar se você já possui uma jornada iniciada na IBM.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-6 animate-in slide-in-from-left-4">
                                        {identifiedUser ? (
                                            <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl flex items-center gap-3">
                                                <div className="size-10 bg-primary/10 text-primary rounded-full flex items-center justify-center font-black">
                                                    {identifiedUser.name.charAt(0)}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[10px] font-black uppercase text-primary tracking-widest leading-none mb-1">Membro Identificado</p>
                                                    <p className="font-bold text-slate-900 truncate">{identifiedUser.name}</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Nome Completo *</Label>
                                                <div className="relative">
                                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                                                    <Input 
                                                        required 
                                                        value={formData.name} 
                                                        onChange={e => setFormData(p => ({...p, name: e.target.value}))}
                                                        placeholder="Seu nome completo"
                                                        className="pl-10 h-12 rounded-2xl bg-slate-50 border-none font-bold"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">WhatsApp / Celular *</Label>
                                            <div className="relative">
                                                <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                                                <Input 
                                                    required 
                                                    value={formData.phone} 
                                                    onChange={e => setFormData(p => ({...p, phone: e.target.value}))}
                                                    placeholder="(21) 99999-9999"
                                                    className="pl-10 h-12 rounded-2xl bg-slate-50 border-none font-bold"
                                                />
                                            </div>
                                        </div>

                                        <div className="p-4 border-2 border-dashed border-slate-200 rounded-2xl space-y-2">
                                            <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Item Selecionado</Label>
                                            {selectedItemName ? (
                                                <div className="flex items-center gap-2 text-primary font-black uppercase italic tracking-tighter">
                                                    <CheckCircle size={16} />
                                                    {selectedItemName}
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 text-slate-400 text-xs font-bold italic">
                                                    <Info size={14} /> Selecione ao lado...
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter className="p-8 bg-slate-50 border-t flex flex-col gap-4">
                                {formStep === 'email' ? (
                                    <Button type="submit" disabled={isCheckingEmail} className="w-full h-14 font-black text-base uppercase tracking-widest shadow-xl rounded-2xl">
                                        {isCheckingEmail ? <Loader2 className="mr-2 animate-spin" /> : <ArrowRight className="mr-2" />}
                                        Avançar para Dados
                                    </Button>
                                ) : (
                                    <div className="grid grid-cols-2 gap-2 w-full">
                                        <Button type="button" variant="outline" onClick={() => setStep('email')} className="h-14 font-bold rounded-2xl">Voltar</Button>
                                        <Button type="submit" disabled={isSubmitting || (!formData.courseId && !formData.eventId)} className="h-14 font-black text-base uppercase tracking-widest shadow-xl rounded-2xl">
                                            {isSubmitting ? <Loader2 className="mr-2 animate-spin" /> : null}
                                            Finalizar
                                        </Button>
                                    </div>
                                )}
                                <p className="text-[10px] text-center text-muted-foreground uppercase font-black tracking-widest">Ambiente Seguro OikoApp • IBM Core</p>
                            </CardFooter>
                        </form>
                    </Card>
                </div>
            </div>
        </div>
    );
}

export default function EnrollmentPage() {
    return (
        <main className="min-h-screen bg-[#F8F9FA]">
            <VolunteeringProvider>
                <EnrollmentPortal />
            </VolunteeringProvider>
        </main>
    );
}
