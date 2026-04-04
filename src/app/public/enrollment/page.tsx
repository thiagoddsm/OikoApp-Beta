'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useFirebase, useVolunteering, VolunteeringProvider } from '@/contexts/volunteering-context';
import { collection, Timestamp, addDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
    Loader2, Send, CheckCircle, Search, Mail, 
    ArrowLeft, UserCheck, GraduationCap, School, 
    BookOpen, Waves, HandHelping, Lightbulb,
    ChevronRight, CalendarDays, UserPlus
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { verifyMemberEmail } from './actions';

function EnrollmentPortal() {
    const { firestore } = useFirebase();
    const { courses, classes } = useVolunteering();
    const { toast } = useToast();
    
    const [step, setStep] = useState<'email' | 'form'>('email');
    const [isCheckingEmail, setIsCheckingEmail] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    
    const [emailInput, setEmailInput] = useState('');
    const [isMember, setIsMember] = useState(false);
    
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        courseId: '',
        classId: '',
    });

    const [selectedTab, setSelectedTab] = useState('ensino');
    const [schoolTab, setSchoolTab] = useState('lumine');
    const [lumineFilter, setLumineFilter] = useState('all');

    const handleVerifyEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!emailInput.trim() || isCheckingEmail) return;

        setIsCheckingEmail(true);
        try {
            const result = await verifyMemberEmail(emailInput);
            
            if (result.success) {
                if (result.isMember && result.user) {
                    setIsMember(true);
                    setFormData(p => ({ ...p, name: result.user!.name, phone: result.user!.phone || '' }));
                    toast({ title: "Bem-vindo de volta!", description: `Reconhecemos seu cadastro, ${result.user.name.split(' ')[0]}.` });
                } else {
                    setIsMember(false);
                    toast({ title: "Novo por aqui?", description: "Não encontramos seu e-mail. Vamos criar seu protocolo agora." });
                }
                setStep('form');
            } else {
                toast({ variant: 'destructive', title: "Erro na verificação", description: result.message });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: "Erro técnico", description: "Não foi possível verificar seu e-mail agora." });
        } finally {
            setIsCheckingEmail(false);
        }
    };

    const handleEnroll = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.courseId || isSaving || !firestore) return;

        setIsSaving(true);
        try {
            await addDoc(collection(firestore, 'enrollment_requests'), {
                ...formData,
                email: emailInput.trim().toLowerCase(),
                status: 'pending',
                createdAt: Timestamp.now(),
            });
            setSuccess(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (e) {
            toast({ variant: 'destructive', title: "Erro ao protocolar", description: "Ocorreu uma falha técnica. Tente novamente." });
        } finally {
            setIsSaving(false);
        }
    };

    const filteredCourses = useMemo(() => {
        if (selectedTab === 'eventos') return [];
        
        let filtered = courses;
        
        if (schoolTab === 'lumine') {
            filtered = filtered.filter(c => c.ministryName?.toLowerCase().includes('lumine') || c.ministryName?.toLowerCase().includes('ebd'));
            if (lumineFilter !== 'all') {
                filtered = filtered.filter(c => c.ebdTrack === lumineFilter);
            }
        } else if (schoolTab === 'escolas') {
            filtered = filtered.filter(c => c.ministryName?.toLowerCase().includes('wave') || c.ministryName?.toLowerCase().includes('dis'));
        } else if (schoolTab === 'ministerios') {
            filtered = filtered.filter(c => 
                !c.ministryName?.toLowerCase().includes('lumine') && 
                !c.ministryName?.toLowerCase().includes('ebd') &&
                !c.ministryName?.toLowerCase().includes('wave') &&
                !c.ministryName?.toLowerCase().includes('dis')
            );
        }
        
        return filtered;
    }, [courses, selectedTab, schoolTab, lumineFilter]);

    const selectedCourse = useMemo(() => courses.find(c => c.id === formData.courseId), [courses, formData.courseId]);
    const courseClasses = useMemo(() => classes.filter(c => c.courseId === formData.courseId), [classes, formData.courseId]);

    if (success) {
        return (
            <main className="min-h-screen bg-[#F8F9FA] py-12 md:py-20 px-4 flex items-center justify-center">
                <Card className="max-w-md w-full text-center p-8 animate-in zoom-in-95 duration-500 rounded-[2rem] border-none shadow-2xl">
                    <div className="size-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner mb-6">
                        <CheckCircle size={40} />
                    </div>
                    <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 mb-4">Interesse Protocolado!</h2>
                    <p className="text-muted-foreground mb-8">
                        Recebemos sua solicitação para <strong>{selectedCourse?.name}</strong>. Nossa equipe entrará em contato em breve para confirmar sua vaga.
                    </p>
                    <Button onClick={() => window.location.reload()} variant="outline" className="w-full font-bold h-12 rounded-xl">Protocolar Outro</Button>
                </Card>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#F8F9FA] pb-20">
            {/* Top Branding */}
            <div className="bg-slate-900 text-white py-12 md:py-24 px-4 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-20 opacity-5 pointer-events-none"><Logo className="size-[30rem]" /></div>
                <div className="max-w-6xl mx-auto text-center space-y-6 relative z-10">
                    <Badge className="bg-primary/20 text-white border-primary/30 py-1 px-4 text-xs font-bold uppercase tracking-[0.2em]">Inscrições Abertas</Badge>
                    <h1 className="text-5xl md:text-8xl font-black italic tracking-tighter uppercase text-white leading-[0.85]">Portal de Inscrições</h1>
                    <p className="text-slate-400 max-w-2xl mx-auto text-sm md:text-xl font-medium leading-tight">Garanta sua vaga nos próximos eventos estratégicos e cursos de capacitação da IBM.</p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 -mt-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Lado Esquerdo: Catálogo */}
                <div className="lg:col-span-8 space-y-8">
                    <Card className="shadow-xl border-none rounded-[2rem] overflow-hidden bg-white">
                        <CardHeader className="bg-slate-50 border-b p-6">
                            <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
                                <TabsList className="grid w-full grid-cols-2 bg-slate-200/50 p-1 h-14 rounded-2xl">
                                    <TabsTrigger value="ensino" className="rounded-xl font-black uppercase italic tracking-tighter text-lg data-[state=active]:bg-primary data-[state=active]:text-white">Ensino</TabsTrigger>
                                    <TabsTrigger value="eventos" className="rounded-xl font-black uppercase italic tracking-tighter text-lg data-[state=active]:bg-primary data-[state=active]:text-white">Eventos</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </CardHeader>
                        <CardContent className="p-6">
                            {selectedTab === 'ensino' && (
                                <Tabs value={schoolTab} onValueChange={setSchoolTab} className="w-full space-y-6">
                                    <div className="flex justify-center">
                                        <TabsList className="bg-transparent gap-4">
                                            <TabsTrigger value="lumine" className="font-bold uppercase text-[10px] tracking-widest data-[state=active]:bg-primary/10 data-[state=active]:text-primary border rounded-full px-6">Escola Lumine</TabsTrigger>
                                            <TabsTrigger value="escolas" className="font-bold uppercase text-[10px] tracking-widest data-[state=active]:bg-primary/10 data-[state=active]:text-primary border rounded-full px-6">Escolas (Wave/DIS)</TabsTrigger>
                                            <TabsTrigger value="ministerios" className="font-bold uppercase text-[10px] tracking-widest data-[state=active]:bg-primary/10 data-[state=active]:text-primary border rounded-full px-6">Ministérios</TabsTrigger>
                                        </TabsList>
                                    </div>

                                    {schoolTab === 'lumine' && (
                                        <div className="flex flex-wrap justify-center gap-2 mb-6">
                                            {[
                                                { id: 'all', label: 'Ver Todos' },
                                                { id: 'teologico', label: 'Trilho Teológico' },
                                                { id: 'biblico', label: 'Trilho Bíblico' },
                                                { id: 'discipulado', label: 'Trilho Discipulado' }
                                            ].map(filter => (
                                                <button 
                                                    key={filter.id}
                                                    onClick={() => setLumineFilter(filter.id)}
                                                    className={cn(
                                                        "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-tighter transition-all border",
                                                        lumineFilter === filter.id ? "bg-primary text-white border-primary shadow-lg scale-105" : "bg-white text-muted-foreground hover:border-primary/30"
                                                    )}
                                                >
                                                    {filter.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {filteredCourses.map(course => {
                                            const isSelected = formData.courseId === course.id;
                                            const hasActiveClasses = classes.some(cls => cls.courseId === course.id);
                                            
                                            return (
                                                <button 
                                                    key={course.id}
                                                    onClick={() => setFormData(p => ({ ...p, courseId: course.id, classId: '' }))}
                                                    className={cn(
                                                        "text-left p-6 rounded-3xl border-2 transition-all group relative overflow-hidden",
                                                        isSelected ? "border-primary bg-primary/5 ring-4 ring-primary/10" : "bg-white border-slate-100 hover:border-slate-300"
                                                    )}
                                                >
                                                    <div className="flex flex-col h-full gap-4">
                                                        <div className="flex justify-between items-start">
                                                            <div className={cn("p-2.5 rounded-2xl shadow-sm transition-colors", isSelected ? "bg-primary text-white" : "bg-slate-50 text-slate-400 group-hover:bg-primary/5 group-hover:text-primary")}>
                                                                {schoolTab === 'lumine' ? <Lightbulb size={20} /> : schoolTab === 'escolas' ? <Waves size={20} /> : <BookOpen size={20} />}
                                                            </div>
                                                            <Badge variant="secondary" className="text-[8px] font-black uppercase">{course.ministryName}</Badge>
                                                        </div>
                                                        <div>
                                                            <h3 className="text-xl font-black uppercase italic tracking-tighter text-slate-900 leading-none mb-2">{course.name}</h3>
                                                            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{course.description}</p>
                                                        </div>
                                                        <div className="mt-auto pt-4 border-t border-dashed flex items-center justify-between">
                                                            <div className="flex items-center gap-1.5 text-[10px] font-black text-primary uppercase">
                                                                <CalendarDays size={12} />
                                                                {hasActiveClasses ? "Próxima Turma: Março" : "Aguardando Agenda"}
                                                            </div>
                                                            {isSelected && <CheckCircle size={16} className="text-primary animate-in zoom-in" />}
                                                        </div>
                                                    </div>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </TabsContent>
                            )}

                            {selectedTab === 'eventos' && (
                                <div className="py-20 text-center space-y-4 bg-slate-50 rounded-[2rem] border-2 border-dashed">
                                    <CalendarDays size={48} className="mx-auto text-slate-300" />
                                    <div>
                                        <h3 className="text-xl font-black uppercase italic tracking-tighter">Eventos em Breve</h3>
                                        <p className="text-sm text-muted-foreground">Estamos preparando os próximos calendários estratégicos.</p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Lado Direito: Protocolo */}
                <div className="lg:col-span-4 sticky top-6">
                    <Card className="shadow-2xl border-none overflow-hidden rounded-[2.5rem] bg-slate-900 text-white">
                        <CardHeader className="bg-white/5 border-b border-white/10 p-8 text-center">
                            <CardTitle className="text-2xl font-black uppercase italic tracking-tighter leading-none mb-2">Protocolar Interesse</CardTitle>
                            <CardDescription className="text-white/50 text-[10px] uppercase font-bold tracking-widest">
                                {step === 'email' ? 'Identificação Necessária' : 'Finalize seu Cadastro'}
                            </CardDescription>
                        </CardHeader>
                        
                        <CardContent className="p-8">
                            {step === 'email' ? (
                                <form onSubmit={handleVerifyEmail} className="space-y-6">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] uppercase font-black text-white/50 ml-1">E-mail para Início</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-4 top-4 size-5 text-white/20" />
                                            <Input 
                                                required 
                                                type="email"
                                                className="h-14 bg-white/5 border-white/10 pl-12 rounded-2xl focus:bg-white/10 transition-all text-white placeholder:text-white/20" 
                                                placeholder="seu@email.com"
                                                value={emailInput}
                                                onChange={e => setEmailInput(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <Button disabled={isCheckingEmail || !emailInput} className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20">
                                        {isCheckingEmail ? <Loader2 className="animate-spin size-5" /> : "Verificar Cadastro"}
                                    </Button>
                                    <p className="text-[9px] text-white/30 text-center font-bold uppercase leading-tight">
                                        Usamos seu e-mail para reconhecer sua jornada e facilitar sua inscrição.
                                    </p>
                                </form>
                            ) : (
                                <form onSubmit={handleEnroll} className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                                    <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-1">
                                        <Label className="text-[9px] uppercase font-black text-primary">Opção Selecionada</Label>
                                        <p className="text-sm font-black uppercase italic truncate">{selectedCourse?.name || "Nenhuma Selecionada"}</p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-[10px] uppercase font-black text-white/50 ml-1">Nome Completo</Label>
                                        <div className="relative">
                                            <UserPlus className="absolute left-4 top-4 size-5 text-white/20" />
                                            <Input 
                                                required 
                                                className="h-14 bg-white/5 border-white/10 pl-12 rounded-2xl text-white placeholder:text-white/20" 
                                                placeholder="Como prefere ser chamado?"
                                                value={formData.name}
                                                onChange={e => setFormData(p => ({...p, name: e.target.value}))}
                                                disabled={isMember}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-[10px] uppercase font-black text-white/50 ml-1">Celular / WhatsApp</Label>
                                        <Input 
                                            required 
                                            className="h-14 bg-white/5 border-white/10 rounded-2xl text-white placeholder:text-white/20" 
                                            placeholder="(21) 9..."
                                            value={formData.phone}
                                            onChange={e => setFormData(p => ({...p, phone: e.target.value}))}
                                        />
                                    </div>

                                    {courseClasses.length > 0 && (
                                        <div className="space-y-2">
                                            <Label className="text-[10px] uppercase font-black text-white/50 ml-1">Turma Preferencial</Label>
                                            <select 
                                                required
                                                className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl text-white px-4 appearance-none outline-none focus:bg-white/10"
                                                value={formData.classId}
                                                onChange={e => setFormData(p => ({ ...p, classId: e.target.value }))}
                                            >
                                                <option value="" className="bg-slate-900">Selecione o horário...</option>
                                                {courseClasses.map(cls => (
                                                    <option key={cls.id} value={cls.id} className="bg-slate-900">
                                                        {cls.name} ({cls.dayOfWeek} às {cls.startTime})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <Button type="submit" disabled={isSaving || !formData.courseId} className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20">
                                        {isSaving ? <Loader2 className="animate-spin size-5" /> : (
                                            <>
                                                <Send className="size-4 mr-2" />
                                                Protocolar Agora
                                            </>
                                        )}
                                    </Button>

                                    <button 
                                        type="button"
                                        onClick={() => setStep('email')}
                                        className="w-full text-center text-[10px] font-black uppercase text-white/30 hover:text-white transition-colors"
                                    >
                                        Voltar e Trocar E-mail
                                    </button>
                                </form>
                            )}
                        </CardContent>
                        <CardFooter className="bg-white/5 p-6 flex flex-col gap-2">
                            <p className="text-[9px] text-center text-white/30 uppercase font-black tracking-tighter">Igreja Batista da Manhã • Ano da Visão</p>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </main>
    );
}

export default function EnrollmentPage() {
    return (
        <VolunteeringProvider>
            <EnrollmentPortal />
        </VolunteeringProvider>
    );
}
