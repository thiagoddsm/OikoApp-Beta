'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { VolunteeringProvider, useVolunteering } from '@/contexts/volunteering-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
    Loader2, ArrowRight, CheckCircle, Search, UserPlus, 
    BookOpen, School, HandHelping, GraduationCap, Filter,
    Layers, Clock, CalendarDays, Sparkles, ChevronRight, Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/icons';
import { cn } from '@/lib/utils';
import { verifyMemberEmail, submitEnrollmentRequest } from './actions';

function EnrollmentForm() {
    const { courses, classes, isLoading: isLoadingContext } = useVolunteering();
    const { toast } = useToast();
    
    // Estados do Fluxo
    const [step, setStep] = useState<'identification' | 'catalog' | 'success'>('identification');
    const [mode, setMode] = useState<'existing' | 'new'>('existing');
    const [isVerifying, setIsVerifying] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Dados de Identificação
    const [emailInput, setEmailInput] = useState('');
    const [foundUser, setFoundUser] = useState<{ userId: string; maskedName: string; maskedPhone: string } | null>(null);
    const [formData, setFormData] = useState({ name: '', phone: '' });

    // Dados de Inscrição
    const [selectedTab, setSelectedTab] = useState('ensino');
    const [subFilter, setSubFilter] = useState('lumine');
    const [trailFilter, setTrailFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
    const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

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
                maskedPhone: result.maskedPhone!
            });
            setMode('existing');
        } else {
            setFoundUser(null);
            setMode('new');
        }
    };

    const handleConfirmIdentity = () => setStep('catalog');

    const handleFinalSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCourseId) return;

        setIsSubmitting(true);
        try {
            await submitEnrollmentRequest({
                userId: foundUser?.userId,
                name: mode === 'new' ? formData.name : undefined,
                email: emailInput.toLowerCase().trim(),
                phone: mode === 'new' ? formData.phone : undefined,
                courseId: selectedCourseId,
                classId: selectedClassId || undefined
            });
            setStep('success');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (error) {
            toast({ variant: 'destructive', title: "Erro ao processar", description: "Não foi possível enviar sua inscrição." });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Filtros de Catálogo
    const filteredCourses = useMemo(() => {
        if (!courses) return [];
        return courses.filter(c => {
            const ministry = c.ministryName?.toLowerCase() || '';
            const isLumine = ministry.includes('lumine') || ministry.includes('ebd');
            const isEscola = ministry.includes('wave') || ministry === 'dis';
            
            // 1. Filtro Principal (Sub-abas)
            if (subFilter === 'lumine' && !isLumine) return false;
            if (subFilter === 'escolas' && !isEscola) return false;
            if (subFilter === 'ministerios' && (isLumine || isEscola)) return false;

            // 2. Filtro de Trilho (apenas para Lumine)
            if (subFilter === 'lumine' && trailFilter !== 'all' && c.ebdTrack !== trailFilter) return false;

            // 3. Busca
            if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase();
                return c.name.toLowerCase().includes(term) || (c.description || '').toLowerCase().includes(term);
            }

            return true;
        });
    }, [courses, subFilter, trailFilter, searchTerm]);

    const selectedCourse = useMemo(() => courses.find(c => c.id === selectedCourseId), [courses, selectedCourseId]);
    const courseClasses = useMemo(() => classes.filter(cls => cls.courseId === selectedCourseId), [classes, selectedCourseId]);

    if (step === 'success') {
        return (
            <div className="max-w-md mx-auto py-20 px-4 text-center space-y-6 animate-in zoom-in-95 duration-500">
                <div className="size-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                    <CheckCircle size={40} />
                </div>
                <h2 className="text-4xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">Protocolo<br/>Enviado!</h2>
                <p className="text-muted-foreground font-medium">Sua solicitação para <strong>{selectedCourse?.name}</strong> foi recebida. Em breve a secretaria entrará em contato.</p>
                <Button onClick={() => window.location.reload()} variant="outline" className="w-full font-bold h-12 rounded-xl">Fazer Outra Inscrição</Button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 space-y-10">
            {/* Header */}
            <div className="text-center space-y-4">
                <Logo className="size-12 text-primary mx-auto mb-4" />
                <h1 className="text-5xl md:text-6xl font-black italic tracking-tighter uppercase text-slate-900 leading-none">Portal de Inscrições</h1>
                <p className="text-muted-foreground text-sm font-bold uppercase tracking-[0.2em]">Igreja Batista da Manhã</p>
            </div>

            {step === 'identification' ? (
                <Card className="shadow-2xl border-none overflow-hidden rounded-[2.5rem] animate-in slide-in-from-bottom-4">
                    <CardHeader className="bg-primary/5 p-8 border-b text-center">
                        <CardTitle className="text-2xl font-black uppercase italic tracking-tighter">Identificação</CardTitle>
                        <CardDescription>Para prosseguir, informe seu e-mail cadastrado.</CardDescription>
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
                                    Continuar
                                </Button>
                            </form>
                        ) : mode === 'existing' && foundUser ? (
                            <div className="space-y-8 animate-in fade-in zoom-in-95">
                                <div className="p-6 bg-primary/5 rounded-3xl border-2 border-dashed border-primary/20 flex items-center gap-4">
                                    <div className="size-14 bg-white rounded-2xl shadow-sm flex items-center justify-center text-primary">
                                        <Sparkles size={28} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-primary tracking-widest leading-none mb-1">Membro Reconhecido</p>
                                        <h3 className="text-xl font-black text-slate-900 leading-none">{foundUser.maskedName}</h3>
                                        <p className="text-sm font-medium text-muted-foreground mt-1">{foundUser.maskedPhone}</p>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <Button onClick={handleConfirmIdentity} className="w-full h-14 rounded-2xl font-black text-base uppercase tracking-widest shadow-xl">
                                        Sim, Sou Eu
                                    </Button>
                                    <Button variant="ghost" onClick={() => { setFoundUser(null); setMode('new'); }} className="w-full font-bold text-muted-foreground">
                                        Não sou eu / Trocar e-mail
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={(e) => { e.preventDefault(); setStep('catalog'); }} className="space-y-6 animate-in fade-in">
                                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3 items-center mb-6">
                                    <Info className="size-5 text-amber-600 shrink-0" />
                                    <p className="text-xs font-bold text-amber-800">E-mail não encontrado. Preencha seus dados para criar um protocolo.</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-muted-foreground">Nome Completo</Label>
                                        <Input required value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} className="h-12 rounded-xl" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-muted-foreground">WhatsApp</Label>
                                        <Input required type="tel" value={formData.phone} onChange={e => setFormData(p => ({...p, phone: e.target.value}))} placeholder="(21) 9..." className="h-12 rounded-xl" />
                                    </div>
                                </div>
                                <Button className="w-full h-14 rounded-2xl font-black text-base uppercase tracking-widest shadow-xl">
                                    Avançar para Catálogo
                                </Button>
                            </form>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                    <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 bg-slate-100 p-1.5 rounded-[2rem] h-16 border-2 border-white shadow-inner">
                            <TabsTrigger value="ensino" className="rounded-[1.5rem] font-black uppercase italic tracking-tighter data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-primary">
                                <GraduationCap size={18} className="mr-2" /> Ensino
                            </TabsTrigger>
                            <TabsTrigger value="eventos" className="rounded-[1.5rem] font-black uppercase italic tracking-tighter data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-primary">
                                <CalendarDays size={18} className="mr-2" /> Eventos
                            </TabsTrigger>
                        </TabsList>

                        <div className="mt-8 space-y-8">
                            {selectedTab === 'ensino' && (
                                <>
                                    {/* Filtros de Sub-aba */}
                                    <div className="flex flex-wrap gap-2 justify-center">
                                        <Button variant={subFilter === 'lumine' ? 'default' : 'outline'} onClick={() => setSubFilter('lumine')} className="h-11 px-6 rounded-full font-black uppercase italic tracking-tighter text-xs">Lumine</Button>
                                        <Button variant={subFilter === 'escolas' ? 'default' : 'outline'} onClick={() => setSubFilter('escolas')} className="h-11 px-6 rounded-full font-black uppercase italic tracking-tighter text-xs">Escolas (Wave/DIS)</Button>
                                        <Button variant={subFilter === 'ministerios' ? 'default' : 'outline'} onClick={() => setSubFilter('ministerios')} className="h-11 px-6 rounded-full font-black uppercase italic tracking-tighter text-xs">Ministérios</Button>
                                    </div>

                                    {/* Busca e Trilhos (específico Lumine) */}
                                    <div className="space-y-4">
                                        <div className="relative">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground size-5" />
                                            <Input 
                                                placeholder="Buscar curso por nome ou tema..." 
                                                value={searchTerm}
                                                onChange={e => setSearchTerm(e.target.value)}
                                                className="h-14 pl-12 rounded-2xl bg-white border-none shadow-md text-lg focus-visible:ring-primary/20" 
                                            />
                                        </div>

                                        {subFilter === 'lumine' && (
                                            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 pt-1">
                                                <Button variant={trailFilter === 'all' ? 'secondary' : 'ghost'} size="sm" onClick={() => setTrailFilter('all')} className="rounded-full font-bold h-8 text-[10px] uppercase whitespace-nowrap">Todos</Button>
                                                <Button variant={trailFilter === 'biblico' ? 'secondary' : 'ghost'} size="sm" onClick={() => setTrailFilter('biblico')} className="rounded-full font-bold h-8 text-[10px] uppercase whitespace-nowrap">Bíblico</Button>
                                                <Button variant={trailFilter === 'teologico' ? 'secondary' : 'ghost'} size="sm" onClick={() => setTrailFilter('teologico')} className="rounded-full font-bold h-8 text-[10px] uppercase whitespace-nowrap">Teológico</Button>
                                                <Button variant={trailFilter === 'discipulado' ? 'secondary' : 'ghost'} size="sm" onClick={() => setTrailFilter('discipulado')} className="rounded-full font-bold h-8 text-[10px] uppercase whitespace-nowrap">Discipulado</Button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Catálogo de Cursos */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {filteredCourses.map(course => (
                                            <Card 
                                                key={course.id} 
                                                className={cn(
                                                    "overflow-hidden rounded-[2rem] cursor-pointer transition-all duration-500 hover:shadow-2xl border-none shadow-sm",
                                                    selectedCourseId === course.id ? "ring-4 ring-primary scale-102" : "hover:-translate-y-1"
                                                )}
                                                onClick={() => {
                                                    setSelectedCourseId(course.id);
                                                    setSelectedClassId(null);
                                                }}
                                            >
                                                <CardContent className="p-0">
                                                    <div className="relative aspect-video bg-slate-200">
                                                        <img src={`https://picsum.photos/seed/${course.id}/800/450`} alt="" className="object-cover w-full h-full" />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
                                                        <div className="absolute bottom-4 left-6 z-20">
                                                            <Badge className="bg-primary/20 backdrop-blur-md text-white border-none mb-1 text-[10px] font-black uppercase">{course.ministryName}</Badge>
                                                            <h4 className="text-white font-black uppercase italic tracking-tighter leading-none">{course.name}</h4>
                                                        </div>
                                                    </div>
                                                    <div className="p-6 space-y-4">
                                                        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{course.description}</p>
                                                        
                                                        {selectedCourseId === course.id && (
                                                            <div className="space-y-4 animate-in slide-in-from-top-2">
                                                                <Label className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-2">
                                                                    <Clock className="size-3" /> Selecione a Turma
                                                                </Label>
                                                                {courseClasses.length > 0 ? (
                                                                    <div className="grid gap-2">
                                                                        {courseClasses.map(cls => (
                                                                            <button
                                                                                key={cls.id}
                                                                                onClick={(e) => { e.stopPropagation(); setSelectedClassId(cls.id); }}
                                                                                className={cn(
                                                                                    "w-full p-4 rounded-2xl text-left border-2 transition-all flex flex-col",
                                                                                    selectedClassId === cls.id ? "bg-primary border-primary text-white" : "bg-slate-50 border-slate-100 hover:border-primary/30"
                                                                                )}
                                                                            >
                                                                                <p className="text-xs font-black uppercase tracking-tighter">{cls.name}</p>
                                                                                <div className={cn("flex items-center gap-2 text-[10px] font-bold mt-1 uppercase", selectedClassId === cls.id ? "text-white/70" : "text-muted-foreground")}>
                                                                                    <CalendarDays className="size-3" /> {cls.dayOfWeek} às {cls.startTime}
                                                                                </div>
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <div className="p-4 bg-muted/50 rounded-2xl border border-dashed text-center">
                                                                        <p className="text-xs italic text-muted-foreground">Sem turmas abertas para este curso.</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </>
                            )}

                            {selectedTab === 'eventos' && (
                                <div className="py-20 text-center space-y-4 bg-slate-50 rounded-[2rem] border-2 border-dashed">
                                    <CalendarDays className="size-12 mx-auto text-slate-300" />
                                    <h3 className="text-xl font-bold text-slate-400 uppercase tracking-widest italic">Nenhum evento com inscrições abertas</h3>
                                    <p className="text-sm text-muted-foreground max-w-xs mx-auto">Os próximos eventos estratégicos da IBM aparecerão aqui em breve.</p>
                                </div>
                            )}
                        </div>
                    </Tabs>

                    {selectedCourseId && (
                        <div className="fixed bottom-8 left-0 right-0 px-4 z-50 animate-in slide-in-from-bottom-10 duration-500">
                            <div className="max-w-md mx-auto">
                                <Button 
                                    onClick={handleFinalSubmit}
                                    disabled={isSubmitting || (!courseClasses.length ? false : !selectedClassId)}
                                    className="w-full h-16 rounded-[2rem] font-black text-lg uppercase tracking-[0.2em] shadow-2xl shadow-primary/40 group"
                                >
                                    {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Send className="mr-2 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />}
                                    Finalizar Inscrição
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// Sub-componentes auxiliares
function Send(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="m22 2-7 20-4-9-9-4Z" />
            <path d="M22 2 11 13" />
        </svg>
    )
}

export default function EnrollmentPage() {
    return (
        <main className="min-h-screen bg-[#F8F9FA] pb-32">
            <VolunteeringProvider>
                <EnrollmentForm />
            </VolunteeringProvider>
        </main>
    );
}
