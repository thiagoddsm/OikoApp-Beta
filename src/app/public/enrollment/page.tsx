
'use client';

import React, { useState, useMemo, Suspense } from 'react';
import { useVolunteering, VolunteeringProvider } from '@/contexts/volunteering-context';
import { useFirebase } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
    BookOpen, 
    GraduationCap, 
    Lightbulb, 
    Music, 
    Users, 
    Loader2, 
    Search, 
    CheckCircle2, 
    ArrowRight, 
    Mail, 
    UserPlus,
    School,
    Waves
} from 'lucide-react';
import { PublicNavbar } from '@/components/public/navbar';
import { PublicFooter } from '@/components/public/footer';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';

function EnrollmentFlow({ course, classes, onCancel }) {
    const { firestore } = useFirebase();
    const { addEnrollmentRequest, addUser } = useVolunteering();
    const { toast } = useToast();
    
    const [step, setStep] = useState<'email' | 'form' | 'success'>('email');
    const [email, setEmail] = useState('');
    const [isChecking, setIsChecking] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [userData, setUserData] = useState({
        name: '',
        phone: '',
        classId: '',
    });

    const courseClasses = useMemo(() => classes.filter(c => c.courseId === course.id), [classes, course.id]);

    const handleCheckEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !firestore) return;
        
        setIsChecking(true);
        try {
            const q = query(collection(firestore, 'users'), where('email', '==', email.trim()));
            const snap = await getDocs(q);
            
            if (!snap.empty) {
                const userDoc = snap.docs[0];
                const data = userDoc.data();
                setUserData(prev => ({ ...prev, name: data.name, phone: data.phone || '' }));
                toast({ title: `Olá, ${data.name.split(' ')[0]}!`, description: "Reconhecemos seu cadastro. Escolha sua turma abaixo." });
            } else {
                toast({ title: "Seja bem-vindo!", description: "Não encontramos seu e-mail. Preencha os dados abaixo para continuar." });
            }
            setStep('form');
        } catch (e) {
            toast({ variant: 'destructive', title: "Erro na verificação" });
        } finally {
            setIsChecking(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userData.classId) {
            toast({ variant: 'destructive', title: "Escolha uma turma" });
            return;
        }
        setIsSubmitting(true);
        
        try {
            // Se for novo, podemos criar o usuário ou apenas a solicitação
            // Para simplificar o MVP e evitar duplicidade sem login, criamos apenas a solicitação
            // O administrador cuidará da criação do usuário ao aprovar.
            
            await addEnrollmentRequest({
                userId: '', // Será preenchido no admin
                name: userData.name,
                email: email,
                phone: userData.phone,
                courseId: course.id,
                classId: userData.classId,
                status: 'pending',
                createdAt: new Date() as any
            });
            
            setStep('success');
        } catch (e) {
            toast({ variant: 'destructive', title: "Erro ao enviar inscrição" });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (step === 'success') {
        return (
            <div className="py-12 text-center space-y-6 animate-in zoom-in-95">
                <div className="size-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                    <CheckCircle2 size={40} />
                </div>
                <div className="space-y-2">
                    <h2 className="text-2xl font-black uppercase tracking-tight">Inscrição Recebida!</h2>
                    <p className="text-muted-foreground max-w-sm mx-auto">Sua solicitação para o curso <strong>{course.name}</strong> foi protocolada. Em breve o responsável entrará em contato.</p>
                </div>
                <Button onClick={onCancel} className="w-full max-w-xs h-12 font-bold shadow-lg">Voltar ao Catálogo</Button>
            </div>
        );
    }

    return (
        <Card className="max-w-xl mx-auto border-2 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4">
            <CardHeader className="bg-primary/5 border-b py-8">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-2xl font-black italic tracking-tighter uppercase text-primary">Inscrição: {course.name}</CardTitle>
                        <CardDescription className="mt-1 font-medium">{course.ministryName}</CardDescription>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onCancel} className="h-8 w-8 rounded-full"><X className="size-4"/></Button>
                </div>
            </CardHeader>
            <CardContent className="p-8">
                {step === 'email' ? (
                    <form onSubmit={handleCheckEmail} className="space-y-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Passo 1: Verificação</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 size-4 text-muted-foreground" />
                                <Input 
                                    type="email" 
                                    placeholder="Digite seu melhor e-mail..." 
                                    className="pl-10 h-12 text-base font-medium shadow-inner"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <p className="text-[10px] text-muted-foreground italic">Usamos seu e-mail para identificar se você já faz parte da nossa base.</p>
                        </div>
                        <Button type="submit" className="w-full h-14 font-black text-lg shadow-xl" disabled={isChecking}>
                            {isChecking ? <Loader2 className="animate-spin size-6" /> : "Continuar para Inscrição"}
                        </Button>
                    </form>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in-50">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-muted-foreground uppercase">Seu Nome Completo</Label>
                                <Input 
                                    value={userData.name} 
                                    onChange={e => setUserData(p => ({...p, name: e.target.value}))} 
                                    className="h-11"
                                    required 
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-muted-foreground uppercase">Celular / WhatsApp</Label>
                                <Input 
                                    value={userData.phone} 
                                    onChange={e => setUserData(p => ({...p, phone: e.target.value}))} 
                                    className="h-11"
                                    placeholder="(21) 9..."
                                    required 
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-primary uppercase">Escolha sua Turma</Label>
                                <Select value={userData.classId} onValueChange={v => setUserData(p => ({...p, classId: v}))}>
                                    <SelectTrigger className="h-14 font-bold border-primary/30">
                                        <SelectValue placeholder="Selecione o horário..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {courseClasses.map(cls => (
                                            <SelectItem key={cls.id} value={cls.id}>
                                                <div className="flex flex-col items-start py-1">
                                                    <span className="font-bold">{cls.name}</span>
                                                    <span className="text-[10px] uppercase font-medium text-muted-foreground">{cls.dayOfWeek} às {cls.startTime}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <Button type="submit" className="w-full h-14 font-black text-lg shadow-xl" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="animate-spin size-6" /> : "Confirmar Minha Inscrição"}
                        </Button>
                        <Button type="button" variant="ghost" className="w-full text-xs" onClick={() => setStep('email')}>Voltar ao início</Button>
                    </form>
                )}
            </CardContent>
        </Card>
    );
}

function CourseCard({ course, classes, onSelect }) {
    const hasClasses = classes.some(c => c.courseId === course.id);
    const ministry = course.ministryName?.toLowerCase() || '';
    
    const Icon = ministry.includes('wave') ? Music : 
                 ministry.includes('dis') ? School :
                 ministry.includes('lumine') ? Lightbulb : BookOpen;

    return (
        <Card className={cn(
            "group overflow-hidden transition-all duration-500 border-none shadow-xl flex flex-col h-full",
            !hasClasses ? "opacity-60 grayscale scale-[0.98]" : "hover:scale-[1.03] hover:shadow-2xl hover:ring-2 hover:ring-primary/20"
        )}>
            <div className="relative aspect-video overflow-hidden">
                <Image 
                    src={course.image || `https://picsum.photos/seed/${course.id}/800/450`} 
                    alt={course.name} 
                    fill 
                    className="object-cover transition-transform duration-[2000ms] group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60" />
                {!hasClasses && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                        <Badge variant="destructive" className="font-black text-xs px-4 py-1">INDISPONÍVEL AGORA</Badge>
                    </div>
                )}
            </div>
            <CardHeader className="p-5 flex-1">
                <div className="flex justify-between items-start mb-2">
                    <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest h-5 border-primary/30 text-primary">
                        {course.ministryName}
                    </Badge>
                    {course.type === 'trilho' && <Badge className="text-[10px] h-5 px-2 bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-none">TRILHA</Badge>}
                </div>
                <CardTitle className="text-lg font-black uppercase italic tracking-tighter leading-none group-hover:text-primary transition-colors">
                    {course.name}
                </CardTitle>
                <CardDescription className="text-xs line-clamp-2 mt-2 leading-relaxed">
                    {course.description || "Inicie sua jornada de crescimento e aprendizado neste curso fundamental."}
                </CardDescription>
            </CardHeader>
            <CardFooter className="p-5 pt-0">
                <Button 
                    className="w-full font-black text-xs uppercase h-10 tracking-widest shadow-lg" 
                    disabled={!hasClasses}
                    onClick={() => onSelect(course)}
                >
                    {hasClasses ? "Inscrever-se" : "Sem Turmas Abertas"}
                    {hasClasses && <ArrowRight className="ml-2 size-3" />}
                </Button>
            </CardFooter>
        </Card>
    );
}

function EnrollmentPageContent() {
    const { courses, classes, isLoading } = useVolunteering();
    const [selectedCourse, setSelectedCourse] = useState<any>(null);
    const [activeTab, setActiveTab] = useState('lumine');
    const [lumineSubTab, setLumineSubTab] = useState('discipulado');

    const filteredCourses = useMemo(() => {
        if (!courses) return { lumine: [], schools: [], others: [] };
        
        const lumine = courses.filter(c => c.ministryName?.toLowerCase().includes('lumine') || c.ministryName?.toLowerCase().includes('ebd'));
        const schools = courses.filter(c => c.ministryName?.toLowerCase().includes('wave') || c.ministryName?.toLowerCase().includes('dis'));
        const others = courses.filter(c => !lumine.includes(c) && !schools.includes(c));
        
        return { lumine, schools, others };
    }, [courses]);

    const lumineByTrack = useMemo(() => {
        const list = filteredCourses.lumine;
        return {
            discipulado: list.filter(c => c.ebdTrack === 'discipulado' || c.name.toLowerCase().includes('pertencer') || c.name.toLowerCase().includes('crescer')),
            biblico: list.filter(c => c.ebdTrack === 'biblico'),
            teologico: list.filter(c => c.ebdTrack === 'teologico' || c.ebdTrack === 'teologia'),
        };
    }, [filteredCourses.lumine]);

    if (isLoading) {
        return <div className="flex h-96 w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
    }

    if (selectedCourse) {
        return <EnrollmentFlow course={selectedCourse} classes={classes} onCancel={() => setSelectedCourse(null)} />;
    }

    return (
        <div className="space-y-12">
            <header className="text-center space-y-4 max-w-3xl mx-auto">
                <div className="size-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                    <GraduationCap size={32} />
                </div>
                <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter uppercase text-slate-900 leading-none">
                    Lumine <span className="text-primary">IBM</span>
                </h1>
                <p className="text-lg text-muted-foreground font-medium leading-relaxed italic">
                    "Organização servindo ao organismo." Encontre o seu próximo passo na nossa trilha de crescimento espiritual.
                </p>
            </header>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="flex justify-center mb-8">
                    <TabsList className="bg-muted/50 p-1 rounded-2xl border-2 h-auto">
                        <TabsTrigger value="lumine" className="rounded-xl px-8 py-3 data-[state=active]:bg-white data-[state=active]:shadow-lg font-black text-xs uppercase tracking-widest">Trilha Lumine</TabsTrigger>
                        <TabsTrigger value="schools" className="rounded-xl px-8 py-3 data-[state=active]:bg-white data-[state=active]:shadow-lg font-black text-xs uppercase tracking-widest">Escolas IBM</TabsTrigger>
                        <TabsTrigger value="others" className="rounded-xl px-8 py-3 data-[state=active]:bg-white data-[state=active]:shadow-lg font-black text-xs uppercase tracking-widest">Outros Cursos</TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="lumine" className="space-y-10 animate-in fade-in-50 duration-500">
                    <div className="flex justify-center">
                        <Tabs value={lumineSubTab} onValueChange={setLumineSubTab} className="w-full max-w-2xl">
                            <TabsList className="grid w-full grid-cols-3 bg-slate-100 rounded-lg p-1 h-10">
                                <TabsTrigger value="discipulado" className="text-[10px] uppercase font-bold tracking-tight">Discipulado</TabsTrigger>
                                <TabsTrigger value="biblico" className="text-[10px] uppercase font-bold tracking-tight">Bíblia</TabsTrigger>
                                <TabsTrigger value="teologico" className="text-[10px] uppercase font-bold tracking-tight">Teologia</TabsTrigger>
                            </TabsList>
                            
                            {Object.entries(lumineByTrack).map(([track, list]) => (
                                <TabsContent key={track} value={track} className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {list.map(course => <CourseCard key={course.id} course={course} classes={classes} onSelect={setSelectedCourse} />)}
                                    {list.length === 0 && (
                                        <div className="col-span-full py-20 text-center border-2 border-dashed rounded-3xl bg-muted/20">
                                            <p className="text-muted-foreground font-bold italic">Nenhum curso disponível nesta categoria no momento.</p>
                                        </div>
                                    )}
                                </TabsContent>
                            ))}
                        </Tabs>
                    </div>
                </TabsContent>

                <TabsContent value="schools" className="animate-in slide-in-from-left-4 duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredCourses.schools.map(course => <CourseCard key={course.id} course={course} classes={classes} onSelect={setSelectedCourse} />)}
                    </div>
                </TabsContent>

                <TabsContent value="others" className="animate-in slide-in-from-left-4 duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredCourses.others.map(course => <CourseCard key={course.id} course={course} classes={classes} onSelect={setSelectedCourse} />)}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

export default function EnrollmentPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <PublicNavbar />
      <main className="flex-1 container mx-auto px-4 py-12 md:py-20">
        <VolunteeringProvider>
            <Suspense fallback={<div className="flex h-96 items-center justify-center"><Loader2 className="animate-spin size-10 text-primary" /></div>}>
                <EnrollmentPageContent />
            </Suspense>
        </VolunteeringProvider>
      </main>
      <PublicFooter />
    </div>
  );
}

function X({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M18 6 6 18" /><path d="m6 6 12 12" />
        </svg>
    )
}
