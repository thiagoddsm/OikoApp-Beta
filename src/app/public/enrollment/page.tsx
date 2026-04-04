'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useFirebase, addDocumentNonBlocking, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Loader2, Send, CheckCircle, BookOpen, GraduationCap, 
  Music, Heart, CalendarDays, Search, UserPlus, Mail, ArrowRight,
  School, Lightbulb, HandHelping, ChevronRight, CheckCircle2, ShieldCheck, Map
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/icons';
import { VolunteeringProvider, useVolunteering } from '@/contexts/volunteering-context';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import Link from 'next/link';

function EnrollmentPortal() {
    const { firestore } = useFirebase();
    const { courses, classes, users, addCourse } = useVolunteering();
    const { toast } = useToast();
    
    const [step, setStep] = useState<'email' | 'form'>('email');
    const [email, setEmail] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    
    const [activeTab, setActiveTab] = useState('teaching');
    const [teachingTab, setTeachingTab] = useState('lumine');
    const [lumineFilter, setLumineFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        courseId: '',
        classId: '',
        eventId: '',
        isExisting: false,
    });

    const handleVerifyEmail = async () => {
        if (!email.trim()) return;
        setIsVerifying(true);
        
        // Simulação de busca na base de dados para identificar o membro
        const foundUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
        
        if (foundUser) {
            setFormData(p => ({
                ...p,
                name: foundUser.name,
                phone: foundUser.phone || '',
                isExisting: true
            }));
            toast({ title: "Bem-vindo de volta!", description: `Identificamos seu cadastro, ${foundUser.name.split(' ')[0]}.` });
        } else {
            setFormData(p => ({ ...p, name: '', phone: '', isExisting: false }));
        }
        
        setStep('form');
        setIsVerifying(false);
    };

    const filteredCourses = useMemo(() => {
        return courses.filter(c => {
            const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
            const ministry = c.ministryName?.toLowerCase() || '';
            
            if (teachingTab === 'lumine') {
                const isLumine = ministry.includes('lumine') || ministry.includes('ebd');
                if (!isLumine) return false;
                if (lumineFilter !== 'all' && c.ebdTrack !== lumineFilter) return false;
                return matchesSearch;
            }
            
            if (teachingTab === 'schools') {
                return (ministry.includes('wave') || ministry === 'dis') && matchesSearch;
            }
            
            if (teachingTab === 'ministries') {
                const other = !ministry.includes('lumine') && !ministry.includes('ebd') && !ministry.includes('wave') && ministry !== 'dis';
                return other && matchesSearch;
            }

            return matchesSearch;
        });
    }, [courses, teachingTab, lumineFilter, searchTerm]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !email || (!formData.courseId && !formData.eventId)) {
            toast({ variant: 'destructive', title: "Campos obrigatórios", description: "Por favor, selecione o que deseja cursar." });
            return;
        }

        setIsSaving(true);
        try {
            await addDocumentNonBlocking(collection(firestore!, 'enrollment_requests'), {
                ...formData,
                email,
                status: 'pending',
                createdAt: Timestamp.now(),
            });
            setSuccess(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (e) {
            toast({ variant: 'destructive', title: "Erro ao enviar", description: "Falha na conexão. Tente novamente." });
        } finally {
            setIsSaving(false);
        }
    };

    if (success) {
        return (
            <div className="max-w-md mx-auto text-center p-8 animate-in zoom-in-95 duration-500">
                <div className="size-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner mb-6">
                    <CheckCircle size={40} />
                </div>
                <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 mb-4">Solicitação Enviada!</h2>
                <p className="text-muted-foreground mb-8">
                    Recebemos seu protocolo de inscrição. Nossa equipe da secretaria entrará em contato em breve para confirmar sua vaga.
                </p>
                <Button onClick={() => setSuccess(false)} variant="outline" className="w-full font-bold">Fazer outra inscrição</Button>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            {/* Esquerda: Catálogo */}
            <div className="lg:col-span-8 space-y-8">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
                    <Input 
                        placeholder="Pesquisar por curso, instrumento ou ministério..." 
                        className="pl-12 h-14 bg-white border-none shadow-xl rounded-2xl text-lg font-medium"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <div className="flex justify-center mb-8">
                        <TabsList className="bg-slate-200/50 p-1 h-14 rounded-2xl">
                            <TabsTrigger value="teaching" className="rounded-xl px-8 font-black uppercase italic tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-lg">
                                <GraduationCap className="mr-2 size-5" /> Ensino
                            </TabsTrigger>
                            <TabsTrigger value="events" className="rounded-xl px-8 font-black uppercase italic tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-lg">
                                <CalendarDays className="mr-2 size-5" /> Eventos
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="teaching" className="space-y-8 animate-in fade-in-50 duration-500">
                        <div className="flex justify-center">
                            <div className="flex gap-2 p-1 bg-white rounded-full shadow-sm border overflow-x-auto no-scrollbar">
                                {[
                                    { id: 'lumine', label: 'Escola Lumine', icon: Lightbulb },
                                    { id: 'schools', label: 'Escolas Wave & DIS', icon: School },
                                    { id: 'ministries', label: 'Ministérios', icon: HandHelping },
                                ].map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => setTeachingTab(t.id)}
                                        className={cn(
                                            "flex items-center gap-2 px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap",
                                            teachingTab === t.id ? "bg-primary text-white shadow-md" : "text-muted-foreground hover:bg-muted"
                                        )}
                                    >
                                        <t.icon size={14} /> {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {teachingTab === 'lumine' && (
                            <div className="flex justify-center gap-2 flex-wrap">
                                {[
                                    { id: 'all', label: 'Todos os Trilhos' },
                                    { id: 'teologico', label: 'Teológico' },
                                    { id: 'biblico', label: 'Bíblico' },
                                    { id: 'discipulado', label: 'Discipulado' },
                                ].map(f => (
                                    <button
                                        key={f.id}
                                        onClick={() => setLumineFilter(f.id)}
                                        className={cn(
                                            "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all",
                                            lumineFilter === f.id ? "bg-slate-900 text-white border-slate-900" : "bg-white text-muted-foreground border-slate-200"
                                        )}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredCourses.map(course => (
                                <Card 
                                    key={course.id} 
                                    className={cn(
                                        "cursor-pointer transition-all hover:scale-[1.02] border-2 group",
                                        formData.courseId === course.id ? "border-primary bg-primary/5" : "border-white bg-white shadow-md"
                                    )}
                                    onClick={() => setFormData(p => ({...p, courseId: course.id, eventId: ''}))}
                                >
                                    <CardContent className="p-5 flex items-center justify-between">
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className={cn(
                                                "size-12 rounded-xl flex items-center justify-center shrink-0",
                                                formData.courseId === course.id ? "bg-primary text-white" : "bg-slate-100 text-slate-400 group-hover:bg-primary/10 group-hover:text-primary"
                                            )}>
                                                <GraduationCap size={24} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-black uppercase italic tracking-tighter text-slate-900 truncate leading-tight">{course.name}</p>
                                                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">
                                                    {course.ministryName} {course.ebdTrack && `• Trilha ${course.ebdTrack}`}
                                                </p>
                                            </div>
                                        </div>
                                        {formData.courseId === course.id && <CheckCircle2 className="size-6 text-primary animate-in zoom-in-50" />}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </TabsContent>

                    <TabsContent value="events" className="space-y-6 animate-in fade-in-50 duration-500">
                        <Card className="bg-rose-50 border-2 border-rose-100 overflow-hidden group hover:shadow-xl transition-all cursor-pointer" onClick={() => setFormData(p => ({...p, eventId: 'jantar_namorados_2026', courseId: ''}))}>
                            <div className="relative h-48 sm:h-64">
                                <Image src="https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=1200&auto=format&fit=crop" alt="Jantar dos Namorados" fill className="object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-rose-950/80 to-transparent" />
                                <Badge className="absolute top-4 right-4 bg-rose-600 text-white font-black px-3 py-1">EM DESTAQUE</Badge>
                                <div className="absolute bottom-6 left-6 text-white">
                                    <h3 className="text-3xl font-black uppercase italic tracking-tighter leading-none">Jantar dos Namorados 2026</h3>
                                    <p className="text-sm opacity-90 mt-2 font-medium">O Riso que Restaura • Sexta, 12 de Junho às 19h</p>
                                </div>
                            </div>
                            <CardContent className="p-6 flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-rose-900/70 text-sm leading-relaxed max-w-lg font-medium italic">"Uma experiência completa de gastronomia e humor para edificar sua aliança."</p>
                                    <div className="flex gap-4 mt-4">
                                        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-rose-600"><CheckCircle size={14}/> Show Stand-up</div>
                                        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-rose-600"><CheckCircle size={14}/> Menu Gourmet</div>
                                    </div>
                                </div>
                                {formData.eventId === 'jantar_namorados_2026' ? <CheckCircle2 className="size-8 text-rose-600" /> : <div className="size-8 rounded-full border-2 border-rose-200" />}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Direita: Formulário */}
            <div className="lg:col-span-4 sticky top-24">
                <Card className="shadow-2xl border-none overflow-hidden rounded-[2rem]">
                    <CardHeader className="bg-primary p-8 text-white relative">
                        <div className="absolute top-0 right-0 p-4 opacity-10"><Send size={80} /></div>
                        <CardTitle className="text-2xl font-black uppercase italic tracking-tighter">Protocolar Inscrição</CardTitle>
                        <CardDescription className="text-primary-foreground/80 font-medium">Preencha para garantir sua vaga.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8">
                        {step === 'email' ? (
                            <div className="space-y-6 animate-in slide-in-from-top-2">
                                <div className="space-y-2">
                                    <Label className="text-[10px] uppercase font-black text-muted-foreground">E-mail para identificação</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-3.5 size-5 text-muted-foreground" />
                                        <Input 
                                            type="email" 
                                            placeholder="seu@email.com" 
                                            className="h-12 pl-10 text-lg"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleVerifyEmail()}
                                        />
                                    </div>
                                </div>
                                <Button onClick={handleVerifyEmail} disabled={isVerifying || !email.includes('@')} className="w-full h-14 font-black uppercase tracking-widest text-base shadow-xl">
                                    {isVerifying ? <Loader2 className="animate-spin" /> : 'Continuar'}
                                </Button>
                                <p className="text-[10px] text-muted-foreground text-center italic">Se você já for membro, seus dados serão carregados automaticamente.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSave} className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2">
                                {formData.isExisting && (
                                    <div className="p-4 bg-emerald-50 border-2 border-emerald-100 rounded-2xl flex items-center gap-3">
                                        <div className="size-10 bg-emerald-500 text-white rounded-full flex items-center justify-center"><CheckCircle size={20}/></div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase text-emerald-600">Membro Reconhecido</p>
                                            <p className="font-bold text-slate-900">{formData.name}</p>
                                        </div>
                                    </div>
                                )}

                                {!formData.isExisting && (
                                    <div className="space-y-2">
                                        <Label className="text-[10px] uppercase font-black text-muted-foreground">Seu Nome Completo</Label>
                                        <Input required className="h-12" value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} />
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label className="text-[10px] uppercase font-black text-muted-foreground">Telefone/WhatsApp</Label>
                                    <Input required type="tel" className="h-12" value={formData.phone} onChange={e => setFormData(p => ({...p, phone: e.target.value}))} placeholder="(21) 9...." />
                                </div>

                                <div className="p-4 bg-slate-50 border border-dashed rounded-2xl">
                                    <p className="text-[10px] font-black uppercase text-muted-foreground mb-3 tracking-widest">Seleção Atual</p>
                                    {formData.courseId || formData.eventId ? (
                                        <div className="flex items-center gap-3">
                                            <div className="size-8 rounded-lg bg-primary text-white flex items-center justify-center"><GraduationCap size={16}/></div>
                                            <p className="font-bold text-sm text-primary truncate">
                                                {formData.eventId === 'jantar_namorados_2026' ? 'Jantar dos Namorados 2026' : courses.find(c => c.id === formData.courseId)?.name}
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-muted-foreground italic">Clique em um curso ao lado para selecionar.</p>
                                    )}
                                </div>

                                <div className="flex flex-col gap-3">
                                    <Button type="submit" disabled={isSaving || (!formData.courseId && !formData.eventId)} className="w-full h-14 font-black uppercase tracking-widest text-base shadow-xl">
                                        {isSaving ? <Loader2 className="animate-spin" /> : 'Finalizar Inscrição'}
                                    </Button>
                                    <Button type="button" variant="ghost" className="text-xs font-bold text-muted-foreground" onClick={() => setStep('email')}>Usar outro e-mail</Button>
                                </div>
                            </form>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default function EnrollmentPage() {
    return (
        <main className="min-h-screen bg-[#F8F9FA] pb-20">
            <nav className="h-20 border-b bg-white flex items-center px-6 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
                    <Link href="/" className="flex items-center gap-2">
                        <Logo className="size-8 text-primary" />
                        <span className="text-xl font-black uppercase italic tracking-tighter">Oiko<span className="text-primary">App</span></span>
                    </Link>
                    <Button variant="ghost" asChild className="font-bold text-xs uppercase tracking-widest">
                        <Link href="/login">Portal do Membro</Link>
                    </Button>
                </div>
            </nav>

            <div className="pt-12 md:pt-20 px-6">
                <div className="max-w-6xl mx-auto space-y-12">
                    <div className="text-center space-y-4">
                        <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 py-1 px-4 text-xs font-black uppercase tracking-[0.2em]">Inscrições Abertas</Badge>
                        <h1 className="text-5xl md:text-8xl font-black italic tracking-tighter uppercase text-slate-900 leading-[0.85]">Portal de Inscrições</h1>
                        <p className="text-muted-foreground text-sm md:text-lg max-w-2xl mx-auto">Garanta sua vaga nos próximos eventos estratégicos e cursos de capacitação da IBM.</p>
                    </div>

                    <VolunteeringProvider>
                        <EnrollmentPortal />
                    </VolunteeringProvider>
                </div>
            </div>
        </main>
    );
}
