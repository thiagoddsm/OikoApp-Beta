'use client';

import React, { useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useVolunteering, VolunteeringProvider } from '@/contexts/volunteering-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
    Loader2, Search, BookOpen, GraduationCap, CheckCircle2, 
    ChevronRight, ArrowLeft, UserPlus, Waves, Lightbulb, 
    School, Info, Mail, User, Phone, Check, ShieldCheck,
    AlertCircle, Building2
} from 'lucide-react';
import { PublicNavbar } from '@/components/public/navbar';
import { PublicFooter } from '@/components/public/footer';
import { useFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Image from 'next/image';

const ebdTrackLabels: Record<string, string> = {
    discipulado: "Trilho de Discipulado",
    teologico: "Trilho Teológico",
    biblico: "Trilho Bíblico"
};

function EnrollmentPageContent() {
    const { courses, classes, isLoading: isContextLoading } = useVolunteering();
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    
    // UI State
    const [activeMainTab, setActiveMainTab] = useState('lumine');
    const [activeLumineTab, setActiveLumineTab] = useState('discipulado');
    const [selectedCourse, setSelectedCourse] = useState<any>(null);
    
    // Enrollment Flow State
    const [step, setStep] = useState<'email' | 'form' | 'success'>('email');
    const [email, setEmail] = useState('');
    const [isCheckingEmail, setIsCheckingEmail] = useState(false);
    const [foundUser, setFoundUser] = useState<any>(null);
    const [isSubmitting, setIsSaving] = useState(false);

    // Form Fields for new user
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [selectedClassId, setSelectedClassId] = useState('');

    const handleCheckEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !firestore) return;
        
        setIsCheckingEmail(true);
        try {
            const q = query(collection(firestore, 'users'), where('email', '==', email.trim().toLowerCase()));
            const snap = await getDocs(q);
            
            if (!snap.empty) {
                const user = snap.docs[0].data();
                setFoundUser({ id: snap.docs[0].id, ...user });
                setName(user.name);
                setPhone(user.phone || '');
                toast({ title: "Bem-vindo de volta!", description: `Identificamos seu cadastro como ${user.name}.` });
            } else {
                setFoundUser(null);
                setName('');
                setPhone('');
            }
            setStep('form');
        } catch (e) {
            toast({ variant: 'destructive', title: "Erro na verificação", description: "Tente novamente em instantes." });
        } finally {
            setIsCheckingEmail(false);
        }
    };

    const handleFinishEnrollment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCourse || !selectedClassId || isSubmitting || !firestore) return;

        setIsSaving(true);
        try {
            const enrollmentData = {
                userId: foundUser?.id || '',
                name: name,
                email: email.trim().toLowerCase(),
                phone: phone,
                courseId: selectedCourse.id,
                classId: selectedClassId,
                status: 'pending',
                createdAt: Timestamp.now(),
            };

            await addDocumentNonBlocking(collection(firestore, 'enrollment_requests'), enrollmentData);
            setStep('success');
            toast({ title: "Solicitação Enviada!", description: "Sua inscrição está em análise pela coordenação." });
        } catch (e) {
            toast({ variant: 'destructive', title: "Erro ao enviar", description: "Não foi possível concluir a solicitação." });
        } finally {
            setIsSaving(false);
        }
    };

    const lumineCourses = useMemo(() => courses.filter(c => c.ministryName?.toLowerCase().includes('lumine') || c.ministryName?.toLowerCase().includes('ebd')), [courses]);
    const schoolCourses = useMemo(() => courses.filter(c => c.ministryName?.toLowerCase().includes('wave') || c.ministryName?.toLowerCase().includes('dis')), [courses]);
    const otherCourses = useMemo(() => courses.filter(c => !lumineCourses.includes(c) && !schoolCourses.includes(c)), [courses, lumineCourses, schoolCourses]);

    const filteredLumine = useMemo(() => lumineCourses.filter(c => c.ebdTrack === activeLumineTab), [lumineCourses, activeLumineTab]);

    const courseClasses = useMemo(() => {
        if (!selectedCourse) return [];
        return classes.filter(cls => cls.courseId === selectedCourse.id);
    }, [classes, selectedCourse]);

    const renderCourseCard = (course: any) => {
        const hasClasses = classes.some(cls => cls.courseId === course.id);
        const Icon = course.ministryName?.toLowerCase().includes('wave') ? Waves : course.ministryName?.toLowerCase().includes('dis') ? School : Lightbulb;

        return (
            <Card key={course.id} className={cn(
                "overflow-hidden transition-all duration-300 group flex flex-col border-2",
                hasClasses ? "hover:border-primary/50 hover:shadow-xl cursor-pointer" : "opacity-60 grayscale border-slate-200"
            )} onClick={() => hasClasses && setSelectedCourse(course)}>
                <div className="relative aspect-video bg-muted overflow-hidden">
                    <Image src={`https://picsum.photos/seed/${course.id}/600/400`} alt={course.name} fill className="object-cover transition-transform group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-3 left-3 flex gap-2">
                        <Badge className="bg-white/20 text-white backdrop-blur-md border-none text-[10px] uppercase font-black">{course.type || 'Curso'}</Badge>
                    </div>
                </div>
                <CardHeader className="p-4 space-y-1">
                    <div className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-widest">
                        <Icon className="size-3" /> {course.ministryName}
                    </div>
                    <CardTitle className="text-lg font-black leading-tight group-hover:text-primary transition-colors">{course.name}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 flex-1">
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{course.description || 'Nenhuma descrição disponível.'}</p>
                </CardContent>
                <CardFooter className="p-4 pt-0">
                    {hasClasses ? (
                        <Button className="w-full h-10 font-black uppercase text-xs group-hover:bg-primary shadow-lg">
                            Inscrever-se Agora <ChevronRight className="ml-2 size-4" />
                        </Button>
                    ) : (
                        <Button disabled variant="secondary" className="w-full h-10 font-bold uppercase text-xs">
                            Sem Turmas Abertas
                        </Button>
                    )}
                </CardFooter>
            </Card>
        );
    };

    if (isContextLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary size-10" /></div>;

    return (
        <div className="min-h-screen flex flex-col bg-slate-50">
            <PublicNavbar />
            
            <main className="flex-1 container mx-auto px-4 py-12 max-w-6xl">
                {!selectedCourse ? (
                    <div className="space-y-12 animate-in fade-in duration-500">
                        <div className="text-center max-w-3xl mx-auto space-y-4">
                            <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter text-slate-900 uppercase">
                                Portal de <span className="text-primary">Inscrições</span>
                            </h1>
                            <p className="text-lg text-muted-foreground font-medium">
                                Escolha sua próxima etapa de crescimento espiritual. Temos cursos para todas as fases da sua caminhada com Cristo.
                            </p>
                        </div>

                        <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="w-full">
                            <div className="flex justify-center mb-10">
                                <TabsList className="bg-white p-1 rounded-2xl border-2 shadow-sm h-auto flex flex-wrap justify-center md:flex-nowrap">
                                    <TabsTrigger value="lumine" className="px-8 py-3 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white font-black uppercase text-xs tracking-widest">
                                        Trilha Lumine
                                    </TabsTrigger>
                                    <TabsTrigger value="schools" className="px-8 py-3 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white font-black uppercase text-xs tracking-widest">
                                        Escolas IBM
                                    </TabsTrigger>
                                    <TabsTrigger value="others" className="px-8 py-3 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white font-black uppercase text-xs tracking-widest">
                                        Capacitação Geral
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            <TabsContent value="lumine" className="space-y-8 mt-0">
                                <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-6 rounded-[2rem] border-2 shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-primary/10 text-primary rounded-2xl"><Lightbulb size={32} /></div>
                                        <div>
                                            <h2 className="text-2xl font-black italic text-slate-900 uppercase tracking-tight leading-none">Lumine</h2>
                                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Trilha do Crescimento IBM</p>
                                        </div>
                                    </div>
                                    <Tabs value={activeLumineTab} onValueChange={setActiveLumineTab} className="w-full md:w-auto">
                                        <TabsList className="bg-slate-100 p-1 rounded-xl w-full md:w-auto">
                                            {Object.entries(ebdTrackLabels).map(([id, label]) => (
                                                <TabsTrigger key={id} value={id} className="text-[10px] font-black uppercase tracking-widest px-4">
                                                    {label.split(' ')[2]}
                                                </TabsTrigger>
                                            ))}
                                        </TabsList>
                                    </Tabs>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {filteredLumine.map(renderCourseCard)}
                                </div>
                            </TabsContent>

                            <TabsContent value="schools" className="mt-0">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {schoolCourses.map(renderCourseCard)}
                                </div>
                            </TabsContent>

                            <TabsContent value="others" className="mt-0">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {otherCourses.map(renderCourseCard)}
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                ) : (
                    <div className="max-w-4xl mx-auto animate-in zoom-in-95 duration-300">
                        <Button variant="ghost" className="mb-6 hover:bg-slate-200 font-bold" onClick={() => { setSelectedCourse(null); setStep('email'); setEmail(''); setFoundUser(null); }}>
                            <ArrowLeft className="mr-2 size-4" /> Voltar para o Catálogo
                        </Button>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                            <div className="lg:col-span-5">
                                <Card className="overflow-hidden border-none shadow-2xl">
                                    <div className="relative aspect-[4/5] w-full">
                                        <Image src={`https://picsum.photos/seed/${selectedCourse.id}/800/1000`} alt={selectedCourse.name} fill className="object-cover" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent" />
                                        <div className="absolute bottom-6 left-6 text-white space-y-2">
                                            <Badge className="bg-primary/80 border-none px-3 font-black text-[10px] uppercase">{selectedCourse.ministryName}</Badge>
                                            <h2 className="text-3xl font-black italic uppercase leading-none tracking-tighter">{selectedCourse.name}</h2>
                                        </div>
                                    </div>
                                    <CardContent className="p-6 bg-slate-950 text-slate-300">
                                        <p className="text-sm leading-relaxed">{selectedCourse.description}</p>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="lg:col-span-7">
                                <Card className="h-full border-2 shadow-xl rounded-[2rem] overflow-hidden">
                                    <CardHeader className="bg-muted/30 border-b pb-6 pt-8 px-8">
                                        <div className="flex items-center gap-2 text-[10px] font-black uppercase text-primary mb-2 tracking-[0.2em]">
                                            <ShieldCheck size={14} /> Passo {step === 'email' ? '1' : step === 'form' ? '2' : 'Final'} de 3
                                        </div>
                                        <CardTitle className="text-2xl font-black text-slate-900 uppercase italic">Formulário de Inscrição</CardTitle>
                                        <CardDescription>Preencha seus dados para garantir sua vaga.</CardDescription>
                                    </CardHeader>
                                    
                                    <CardContent className="p-8">
                                        {step === 'email' && (
                                            <form onSubmit={handleCheckEmail} className="space-y-6 animate-in slide-in-from-right-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="email" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Qual o seu e-mail?</Label>
                                                    <div className="relative">
                                                        <Mail className="absolute left-3 top-3.5 size-5 text-muted-foreground" />
                                                        <Input 
                                                            id="email" 
                                                            type="email" 
                                                            placeholder="seuemail@exemplo.com" 
                                                            className="pl-10 h-12 text-lg font-medium border-2" 
                                                            value={email}
                                                            onChange={e => setEmail(e.target.value)}
                                                            required
                                                        />
                                                    </div>
                                                    <p className="text-[10px] text-muted-foreground italic mt-2">
                                                        Usamos seu e-mail para verificar se você já possui cadastro em nosso sistema.
                                                    </p>
                                                </div>
                                                <Button type="submit" className="w-full h-14 text-lg font-black shadow-lg" disabled={isCheckingEmail}>
                                                    {isCheckingEmail ? <Loader2 className="animate-spin mr-2" /> : <ChevronRight className="mr-2" />}
                                                    Continuar
                                                </Button>
                                            </form>
                                        )}

                                        {step === 'form' && (
                                            <form onSubmit={handleFinishEnrollment} className="space-y-6 animate-in slide-in-from-right-4">
                                                {foundUser ? (
                                                    <div className="bg-emerald-50 border-2 border-emerald-200 p-4 rounded-2xl flex items-center gap-4">
                                                        <div className="size-12 bg-emerald-500 text-white rounded-full flex items-center justify-center font-black text-xl shadow-inner">
                                                            {foundUser.name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-black uppercase text-emerald-700 tracking-widest">Identificamos você!</p>
                                                            <p className="font-bold text-slate-900">{foundUser.name}</p>
                                                        </div>
                                                        <Check className="ml-auto text-emerald-600 size-6" />
                                                    </div>
                                                ) : (
                                                    <div className="space-y-4">
                                                        <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-center gap-3 mb-4">
                                                            <Info className="size-4 text-amber-600" />
                                                            <p className="text-[10px] text-amber-800 font-bold uppercase">Não encontramos cadastro com este e-mail. Por favor, preencha abaixo:</p>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label htmlFor="name" className="text-[10px] uppercase font-black text-muted-foreground">Nome Completo</Label>
                                                            <Input id="name" placeholder="Como quer ser chamado?" className="h-11 font-medium" value={name} onChange={e => setName(e.target.value)} required />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label htmlFor="phone" className="text-[10px] uppercase font-black text-muted-foreground">Celular (WhatsApp)</Label>
                                                            <div className="relative">
                                                                <Phone className="absolute left-3 top-3 size-4 text-muted-foreground" />
                                                                <Input id="phone" placeholder="(21) 99999-9999" className="pl-10 h-11 font-medium" value={phone} onChange={e => setPhone(e.target.value)} required />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="space-y-4 pt-4 border-t">
                                                    <Label className="text-[10px] uppercase font-black text-primary tracking-[0.2em] flex items-center gap-2">
                                                        <Building2 className="size-3" /> Selecione sua Turma
                                                    </Label>
                                                    <div className="grid gap-3">
                                                        {courseClasses.map(cls => (
                                                            <button
                                                                key={cls.id}
                                                                type="button"
                                                                onClick={() => setSelectedClassId(cls.id)}
                                                                className={cn(
                                                                    "w-full p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between",
                                                                    selectedClassId === cls.id ? "bg-primary/5 border-primary shadow-inner" : "bg-card border-slate-100 hover:border-slate-300"
                                                                )}
                                                            >
                                                                <div>
                                                                    <p className="font-black text-sm uppercase tracking-tight text-slate-900">{cls.name}</p>
                                                                    <p className="text-xs text-muted-foreground font-bold mt-1 uppercase">{cls.dayOfWeek} às {cls.startTime}</p>
                                                                </div>
                                                                {selectedClassId === cls.id ? <CheckCircle2 className="text-primary size-6" /> : <div className="size-6 rounded-full border-2 border-slate-200" />}
                                                            </button>
                                                        ))}
                                                        {courseClasses.length === 0 && <p className="text-sm text-destructive italic text-center py-4">Nenhuma turma disponível no momento.</p>}
                                                    </div>
                                                </div>

                                                <Button type="submit" className="w-full h-14 text-lg font-black shadow-xl" disabled={isSubmitting || !selectedClassId}>
                                                    {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2" />}
                                                    Confirmar Inscrição
                                                </Button>
                                            </form>
                                        )}

                                        {step === 'success' && (
                                            <div className="text-center space-y-6 py-8 animate-in zoom-in-95 duration-500">
                                                <div className="size-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                                                    <Check size={48} />
                                                </div>
                                                <div className="space-y-2">
                                                    <h3 className="text-2xl font-black text-slate-900 uppercase italic">Inscrição Protocolada!</h3>
                                                    <p className="text-muted-foreground font-medium">
                                                        Tudo certo, <strong>{name}</strong>! Sua solicitação foi enviada para o ministério responsável. 
                                                        Em breve entraremos em contato via WhatsApp com as instruções de início.
                                                    </p>
                                                </div>
                                                <div className="p-4 bg-muted/30 rounded-2xl border border-dashed flex items-center gap-3 text-left">
                                                    <AlertCircle className="size-5 text-primary shrink-0" />
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase leading-relaxed">
                                                        Fique atento ao seu celular. A confirmação oficial será enviada pela coordenação da escola.
                                                    </p>
                                                </div>
                                                <Button variant="outline" className="w-full h-12 font-black" onClick={() => window.location.reload()}>
                                                    Voltar ao Início
                                                </Button>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            <PublicFooter />
        </div>
    );
}

export default function EnrollmentPage() {
    return (
        <VolunteeringProvider>
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary size-10" /></div>}>
                <EnrollmentPageContent />
            </Suspense>
        </VolunteeringProvider>
    );
}
