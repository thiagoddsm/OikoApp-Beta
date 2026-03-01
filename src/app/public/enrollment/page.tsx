'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
    Loader2, 
    BookOpen, 
    ChevronRight, 
    Waves, 
    Lightbulb, 
    School, 
    HandHelping,
    Search,
    PlayCircle,
    Info,
    Calendar,
    Users,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import { PublicNavbar } from '@/components/public/navbar';
import { PublicFooter } from '@/components/public/footer';
import { cn } from '@/lib/utils';
import { useVolunteering, VolunteeringProvider } from '@/contexts/volunteering-context';
import { useToast } from '@/hooks/use-toast';

function EnrollmentPortal() {
    const { courses, classes, users, isLoading } = useVolunteering();
    const { firestore } = useFirebase();
    const { toast } = useToast();
    
    const [searchQuery, setSearchQuery] = useState('');
    const [activeMainTab, setActiveMainTab] = useState('trilhos');
    const [activeTrilhoTab, setActiveTrilhoTab] = useState('discipulado');

    const [isCheckingEmail, setIsCheckingEmail] = useState(false);
    const [userEmail, setUserEmail] = useState('');
    const [step, setStep] = useState<'email' | 'form' | 'success'>('email');
    const [selectedCourse, setSelectedCourse] = useState<any>(null);
    const [foundUser, setFoundUser] = useState<any>(null);

    // Form fields for new user
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
    });

    const getMinistryIcon = (name: string) => {
        const n = name?.toLowerCase() || '';
        if (n.includes('wave')) return Waves;
        if (n === 'dis') return HandHelping;
        if (n.includes('lumine') || n.includes('ebd')) return Lightbulb;
        if (n.includes('college') || n.includes('escola')) return School;
        return BookOpen;
    };

    // Logical grouping
    const filteredCourses = useMemo(() => {
        if (!courses) return [];
        return courses.filter(c => {
            const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                 c.ministryName.toLowerCase().includes(searchQuery.toLowerCase());
            
            if (!matchesSearch) return false;

            if (activeMainTab === 'trilhos') {
                const isLumine = c.ministryName.toLowerCase().includes('lumine') || c.ministryName.toLowerCase().includes('ebd');
                if (!isLumine) return false;
                if (activeTrilhoTab === 'discipulado') return c.ebdTrack === 'discipulado';
                if (activeTrilhoTab === 'biblico') return c.ebdTrack === 'biblico';
                if (activeTrilhoTab === 'teologico') return c.ebdTrack === 'teologico';
                return true;
            }

            if (activeMainTab === 'escolas') {
                return c.ministryName.toLowerCase().includes('wave') || c.ministryName.toLowerCase() === 'dis';
            }

            if (activeMainTab === 'outros') {
                const isLumine = c.ministryName.toLowerCase().includes('lumine') || c.ministryName.toLowerCase().includes('ebd');
                const isSchool = c.ministryName.toLowerCase().includes('wave') || c.ministryName.toLowerCase() === 'dis';
                return !isLumine && !isSchool;
            }

            return true;
        });
    }, [courses, searchQuery, activeMainTab, activeTrilhoTab]);

    const handleStartEnrollment = (course: any) => {
        setSelectedCourse(course);
        setStep('email');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCheckEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userEmail || !firestore) return;

        setIsCheckingEmail(true);
        try {
            const q = query(collection(firestore, 'users'), where('email', '==', userEmail.toLowerCase().trim()));
            const querySnapshot = await useCollection(q as any); // Simplification for finding one
            
            // In a real scenario we'd use a server action or getDocs directly
            // For now, let's assume we find it if the list from context has it
            const existing = users.find(u => u.email?.toLowerCase() === userEmail.toLowerCase().trim());

            if (existing) {
                setFoundUser(existing);
                setFormData({ name: existing.name, phone: existing.phone || '' });
                handleFinishEnrollment(existing.id, true);
            } else {
                setFoundUser(null);
                setStep('form');
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao verificar e-mail.' });
        } finally {
            setIsCheckingEmail(false);
        }
    };

    const handleFinishEnrollment = async (userId?: string, isExisting = false) => {
        setIsCheckingEmail(true);
        try {
            const enrollmentData = {
                userId: userId || 'new',
                name: formData.name,
                email: userEmail.toLowerCase().trim(),
                phone: formData.phone,
                courseId: selectedCourse.id,
                status: 'pending',
                createdAt: Timestamp.now(),
            };

            await addDocumentNonBlocking(collection(firestore!, 'enrollment_requests'), enrollmentData);
            setStep('success');
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível completar sua inscrição.' });
        } finally {
            setIsCheckingEmail(false);
        }
    };

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
    }

    if (step === 'success') {
        return (
            <div className="max-w-2xl mx-auto py-20 px-4 text-center space-y-6">
                <div className="size-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                    <CheckCircle2 size={40} />
                </div>
                <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Solicitação Enviada!</h2>
                <p className="text-slate-600">
                    Sua pré-inscrição para <strong>{selectedCourse.name}</strong> foi recebida. 
                    Nossa equipe entrará em contato em breve para confirmar sua turma e horários.
                </p>
                <Button size="lg" onClick={() => setStep('email')} className="rounded-full">Voltar ao Início</Button>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto py-10 px-4 space-y-10">
            {/* Header */}
            <div className="text-center space-y-4">
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 px-4 py-1 font-black uppercase tracking-[0.2em] text-[10px]">
                    Portal de Crescimento IBM
                </Badge>
                <h1 className="text-4xl md:text-6xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">
                    Lumine <span className="text-primary">&</span> Escolas
                </h1>
                <p className="text-slate-500 max-w-2xl mx-auto text-sm md:text-base font-medium">
                    Escolha sua trilha de discipulado ou inscreva-se em uma de nossas escolas ministeriais. 
                    O organismo cresce quando cada parte se desenvolve.
                </p>
            </div>

            {selectedCourse ? (
                <Card className="max-w-xl mx-auto border-2 border-primary/20 shadow-2xl animate-in zoom-in-95">
                    <CardHeader className="bg-primary/5 border-b text-center relative">
                        <Button variant="ghost" size="icon" className="absolute left-2 top-2" onClick={() => setSelectedCourse(null)}>
                            <X className="size-4" />
                        </Button>
                        <CardTitle className="text-xl font-black uppercase italic tracking-tight">{selectedCourse.name}</CardTitle>
                        <CardDescription>Iniciando sua jornada no curso</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-8">
                        {step === 'email' ? (
                            <form onSubmit={handleCheckEmail} className="space-y-6">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Seu melhor e-mail</Label>
                                    <Input 
                                        type="email" 
                                        placeholder="seu@email.com" 
                                        className="h-12 text-lg" 
                                        value={userEmail} 
                                        onChange={e => setUserEmail(e.target.value)} 
                                        required 
                                    />
                                    <p className="text-[10px] text-muted-foreground italic">Verificaremos se você já possui cadastro na IBM.</p>
                                </div>
                                <Button type="submit" className="w-full h-12 font-black uppercase tracking-widest" disabled={isCheckingEmail}>
                                    {isCheckingEmail ? <Loader2 className="animate-spin mr-2" /> : "Verificar e Continuar"}
                                </Button>
                            </form>
                        ) : (
                            <form onSubmit={(e) => { e.preventDefault(); handleFinishEnrollment(); }} className="space-y-6">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Nome Completo</Label>
                                        <Input 
                                            placeholder="Como prefere ser chamado" 
                                            className="h-11" 
                                            value={formData.name} 
                                            onChange={e => setFormData(p => ({...p, name: e.target.value}))} 
                                            required 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">WhatsApp</Label>
                                        <Input 
                                            placeholder="(21) 99999-9999" 
                                            className="h-11" 
                                            value={formData.phone} 
                                            onChange={e => setFormData(p => ({...p, phone: e.target.value}))} 
                                            required 
                                        />
                                    </div>
                                </div>
                                <Button type="submit" className="w-full h-12 font-black uppercase tracking-widest" disabled={isCheckingEmail}>
                                    {isCheckingEmail ? <Loader2 className="animate-spin mr-2" /> : "Finalizar Inscrição"}
                                </Button>
                            </form>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto mb-8 bg-muted/50 p-1 rounded-full">
                        <TabsTrigger value="trilhos" className="rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm uppercase font-black text-[10px]">Trilhos</TabsTrigger>
                        <TabsTrigger value="escolas" className="rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm uppercase font-black text-[10px]">Escolas</TabsTrigger>
                        <TabsTrigger value="outros" className="rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm uppercase font-black text-[10px]">Outros</TabsTrigger>
                    </TabsList>

                    {activeMainTab === 'trilhos' && (
                        <div className="space-y-8 animate-in fade-in-50 duration-500">
                            <Tabs value={activeTrilhoTab} onValueChange={setActiveTrilhoTab} className="w-full">
                                <div className="flex justify-center">
                                    <TabsList className="h-9 bg-slate-100">
                                        <TabsTrigger value="discipulado" className="text-[10px] uppercase font-bold tracking-tight">Discipulado</TabsTrigger>
                                        <TabsTrigger value="biblico" className="text-[10px] uppercase font-bold tracking-tight">Bíblico</TabsTrigger>
                                        <TabsTrigger value="teologico" className="text-[10px] uppercase font-bold tracking-tight">Teológico</TabsTrigger>
                                    </TabsList>
                                </div>
                            </Tabs>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                        {filteredCourses.map((course) => {
                            const Icon = getMinistryIcon(course.ministryName);
                            const courseClasses = classes.filter(cls => cls.courseId === course.id);
                            const hasClasses = courseClasses.length > 0;
                            
                            // Agrupamento de horários simplificado conforme solicitado
                            const scheduleSummary = useMemo(() => {
                                if (!hasClasses) return [];
                                const scheduleMap: Record<string, { days: Set<string>, capacity: number, occupied: number }> = {};
                                
                                courseClasses.forEach(cls => {
                                    if (cls.startTime) {
                                        const key = cls.startTime;
                                        if (!scheduleMap[key]) {
                                            scheduleMap[key] = { days: new Set(), capacity: 0, occupied: 0 };
                                        }
                                        if (cls.dayOfWeek) scheduleMap[key].days.add(cls.dayOfWeek);
                                        scheduleMap[key].capacity += cls.maxStudents || 999;
                                        scheduleMap[key].occupied += cls.students?.length || 0;
                                    }
                                });

                                return Object.entries(scheduleMap).map(([time, data]) => ({
                                    time,
                                    days: Array.from(data.days).join(', '),
                                    available: data.capacity - data.occupied,
                                    isFull: (data.capacity - data.occupied) <= 0
                                }));
                            }, [courseClasses, hasClasses]);

                            const isTotallyFull = hasClasses && scheduleSummary.every(s => s.isFull);

                            return (
                                <Card 
                                    key={course.id} 
                                    className={cn(
                                        "group flex flex-col h-full transition-all duration-500 hover:shadow-2xl border-none shadow-lg",
                                        !hasClasses && "opacity-60 grayscale bg-muted/20"
                                    )}
                                >
                                    <div className="relative h-40 w-full overflow-hidden rounded-t-xl">
                                        <div className={cn(
                                            "absolute inset-0 bg-slate-900/40 group-hover:bg-slate-900/20 transition-colors z-10",
                                            !hasClasses && "bg-slate-900/60"
                                        )} />
                                        <Icon className="absolute top-4 left-4 z-20 text-white opacity-80" size={24} />
                                        <img 
                                            src={course.image || 'https://picsum.photos/seed/placeholder/800/450'} 
                                            alt={course.name} 
                                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                                        />
                                        <Badge className="absolute bottom-4 right-4 z-20 bg-white/20 backdrop-blur-md text-white border-white/20 font-black uppercase text-[8px] tracking-widest">
                                            {course.ministryName}
                                        </Badge>
                                    </div>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-xl font-black uppercase italic tracking-tighter text-slate-900">{course.name}</CardTitle>
                                        <CardDescription className="line-clamp-2 text-xs font-medium leading-relaxed min-h-[2.5rem]">
                                            {course.description || "Inicie sua jornada de crescimento nesta disciplina."}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex-1 space-y-4">
                                        <div className="space-y-2">
                                            {hasClasses ? (
                                                scheduleSummary.map((s, idx) => (
                                                    <div key={idx} className="flex flex-col p-2 bg-muted/30 rounded-lg border border-border/50">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-700">
                                                                <Calendar className="size-3 text-primary" />
                                                                {s.days} às {s.time}
                                                            </div>
                                                            {s.available < 999 && (
                                                                <Badge variant={s.isFull ? "destructive" : "secondary"} className="text-[8px] h-4 font-black">
                                                                    {s.isFull ? "ESGOTADO" : `${s.available} VAGAS`}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="flex items-center gap-2 p-2 bg-slate-100 rounded-lg text-[10px] font-bold text-slate-400 uppercase italic">
                                                    <Info className="size-3" /> Sem turmas abertas
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                    <CardFooter className="pt-0 pb-6">
                                        <Button 
                                            className={cn(
                                                "w-full rounded-full font-black uppercase tracking-widest text-[10px] h-11",
                                                !hasClasses || isTotallyFull ? "bg-slate-200 text-slate-400 cursor-not-allowed" : "shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                                            )}
                                            onClick={() => (hasClasses && !isTotallyFull) && handleStartEnrollment(course)}
                                            disabled={!hasClasses || isTotallyFull}
                                        >
                                            {isTotallyFull ? (
                                                <><AlertCircle className="size-3 mr-2" /> Vagas Esgotadas</>
                                            ) : !hasClasses ? (
                                                "Indisponível"
                                            ) : (
                                                <><PlayCircle className="size-4 mr-2" /> Quero me inscrever</>
                                            )}
                                        </Button>
                                    </CardFooter>
                                </Card>
                            );
                        })}
                    </div>
                </Tabs>
            )}
        </div>
    );
}

export default function EnrollmentPage() {
    return (
        <VolunteeringProvider>
            <div className="min-h-screen bg-slate-50 flex flex-col">
                <PublicNavbar />
                <main className="flex-1">
                    <EnrollmentPortal />
                </main>
                <PublicFooter />
            </div>
        </VolunteeringProvider>
    );
}

function X({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
        </svg>
    );
}
