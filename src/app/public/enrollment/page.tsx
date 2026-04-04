'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useFirebase, useVolunteering } from '@/firebase';
import { VolunteeringProvider } from '@/contexts/volunteering-context';
import { collection, Timestamp, addDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
    Loader2, 
    Send, 
    CheckCircle, 
    GraduationCap, 
    Users, 
    Calendar, 
    ChevronRight, 
    ArrowLeft,
    Lightbulb,
    Waves,
    HandHelping,
    School,
    BookOpen,
    Mail,
    Search,
    Info,
    CalendarDays
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/icons';
import { cn } from '@/lib/utils';
import { verifyMemberEmail } from './actions';

function PublicEnrollmentContent() {
    const { firestore } = useFirebase();
    const { courses, classes } = useVolunteering();
    const { toast } = useToast();
    
    const [step, setStep] = useState<'email' | 'form'>('email');
    const [email, setEmail] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    
    const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
    const [selectedTab, setSelectedTab] = useState('ensino');
    const [isSaving, setIsSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        classId: '',
    });

    const handleVerifyEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;

        setIsVerifying(true);
        try {
            const result = await verifyMemberEmail(email);
            if (result.exists && result.user) {
                setFormData(prev => ({
                    ...prev,
                    name: result.user.name,
                    phone: result.user.phone,
                }));
                toast({
                    title: `Olá, ${result.user.name.split(' ')[0]}!`,
                    description: "Reconhecemos seu cadastro. Prossiga com sua inscrição.",
                });
            } else {
                toast({
                    title: "Novo Cadastro",
                    description: "Não encontramos seu e-mail. Por favor, preencha os dados abaixo.",
                });
            }
            setStep('form');
        } catch (error) {
            toast({
                variant: 'destructive',
                title: "Erro de Conexão",
                description: "Não foi possível verificar seu cadastro agora.",
            });
        } finally {
            setIsVerifying(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCourseId || !formData.name || !email || !firestore) return;

        setIsSaving(true);
        try {
            await addDoc(collection(firestore, 'enrollment_requests'), {
                ...formData,
                email: email.toLowerCase().trim(),
                courseId: selectedCourseId,
                status: 'pending',
                createdAt: Timestamp.now(),
            });
            setSuccess(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: "Erro ao enviar", description: "Falha técnica ao processar inscrição." });
        } finally {
            setIsSaving(false);
        }
    };

    const groupedCourses = useMemo(() => {
        const groups: Record<string, any> = { Lumine: { teologico: [], biblico: [], discipulado: [] }, Escolas: [], Geral: [] };
        courses.forEach(c => {
            const m = c.ministryName?.toLowerCase() || '';
            if (m.includes('lumine') || m.includes('ebd')) {
                if (c.ebdTrack === 'teologico') groups.Lumine.teologico.push(c);
                else if (c.ebdTrack === 'biblico') groups.Lumine.biblico.push(c);
                else groups.Lumine.discipulado.push(c);
            } else if (m.includes('wave') || m.includes('dis')) {
                groups.Escolas.push(c);
            } else {
                groups.Geral.push(c);
            }
        });
        return groups;
    }, [courses]);

    const CourseCard = ({ course }: { course: any }) => {
        const courseClasses = classes.filter(cls => cls.courseId === course.id);
        const hasOpenClasses = courseClasses.length > 0;

        return (
            <Card className={cn(
                "group cursor-pointer transition-all duration-500 hover:shadow-xl border-2 overflow-hidden",
                selectedCourseId === course.id ? "border-primary ring-2 ring-primary/20 bg-primary/5" : "border-slate-100 hover:border-primary/30"
            )} onClick={() => hasOpenClasses && setSelectedCourseId(course.id)}>
                <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-white rounded-2xl shadow-sm group-hover:scale-110 transition-transform">
                            {course.ministryName?.toLowerCase().includes('wave') ? <Waves className="text-primary" /> :
                             course.ministryName?.toLowerCase().includes('dis') ? <HandHelping className="text-primary" /> :
                             <GraduationCap className="text-primary" />}
                        </div>
                        {hasOpenClasses ? (
                            <Badge className="bg-emerald-500 text-white font-black text-[10px] uppercase">Inscrições Abertas</Badge>
                        ) : (
                            <Badge variant="outline" className="text-slate-400 font-bold text-[10px] uppercase">Em breve</Badge>
                        )}
                    </div>
                    <h4 className="text-lg font-black uppercase italic tracking-tighter leading-none mb-2">{course.name}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-4">{course.description}</p>
                    
                    {hasOpenClasses && (
                        <div className="space-y-2 pt-4 border-t border-dashed">
                            {courseClasses.slice(0, 2).map(cls => (
                                <div key={cls.id} className="flex items-center justify-between text-[10px] font-bold uppercase tracking-tight text-slate-500">
                                    <div className="flex items-center gap-1.5"><Calendar className="size-3" /> {cls.dayOfWeek}</div>
                                    <div className="flex items-center gap-1.5"><Clock className="size-3" /> {cls.startTime}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    };

    const EnrollmentForm = () => (
        <Card className="shadow-2xl border-none overflow-hidden rounded-[2rem] animate-in slide-in-from-bottom-4 duration-700">
            <CardHeader className="bg-primary/5 p-8 border-b">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-white rounded-[1.5rem] shadow-sm text-primary">
                        <Users size={32} />
                    </div>
                    <div>
                        <CardTitle className="text-2xl font-black uppercase italic tracking-tighter">Protocolo de Inscrição</CardTitle>
                        <CardDescription className="text-sm font-medium">Confirme seus dados para garantir sua vaga.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <form onSubmit={handleSave}>
                <CardContent className="p-8 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-black text-muted-foreground">Nome Completo</Label>
                            <Input required value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} className="h-12" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-black text-muted-foreground">Celular/WhatsApp</Label>
                            <Input required value={formData.phone} onChange={e => setFormData(p => ({...p, phone: e.target.value}))} placeholder="(21) 9..." className="h-12" />
                        </div>
                    </div>

                    <div className="p-6 bg-slate-50 border-2 border-dashed rounded-[1.5rem] space-y-4">
                        <Label className="text-xs font-black uppercase text-primary flex items-center gap-2">
                            <GraduationCap size={16}/> Turma Selecionada
                        </Label>
                        <div className="space-y-3">
                            {classes.filter(cls => cls.courseId === selectedCourseId).map(cls => (
                                <label 
                                    key={cls.id} 
                                    className={cn(
                                        "flex items-center justify-between p-4 bg-white border-2 rounded-2xl cursor-pointer transition-all",
                                        formData.classId === cls.id ? "border-primary bg-primary/5" : "border-slate-100 hover:border-primary/20"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <input 
                                            type="radio" 
                                            name="classSelect" 
                                            checked={formData.classId === cls.id} 
                                            onChange={() => setFormData(p => ({...p, classId: cls.id}))}
                                            className="size-4 text-primary"
                                        />
                                        <div className="flex flex-col">
                                            <span className="font-bold text-sm">{cls.name}</span>
                                            <span className="text-[10px] text-muted-foreground font-black uppercase">{cls.dayOfWeek} às {cls.startTime}</span>
                                        </div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="p-8 bg-muted/20 flex flex-col gap-4">
                    <Button type="submit" disabled={isSaving || !formData.classId} className="w-full h-16 font-black text-lg uppercase tracking-widest shadow-xl">
                        {isSaving ? <Loader2 className="mr-2 animate-spin" /> : <Send className="mr-2" />}
                        Confirmar Protocolo
                    </Button>
                    <p className="text-[10px] text-center text-muted-foreground uppercase font-bold tracking-tighter">Igreja Batista da Manhã • Ano da Visão</p>
                </CardFooter>
            </form>
        </Card>
    );

    if (success) {
        return (
            <main className="min-h-screen bg-[#F8F9FA] py-20 px-4 flex items-center justify-center">
                <Card className="max-w-md w-full text-center p-12 animate-in zoom-in-95 duration-500 rounded-[3rem] shadow-2xl border-none">
                    <div className="size-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner mb-8">
                        <CheckCircle size={48} />
                    </div>
                    <h2 className="text-4xl font-black uppercase italic tracking-tighter text-slate-900 mb-4 leading-none">Inscrição Protocolada!</h2>
                    <p className="text-muted-foreground text-lg mb-10 leading-relaxed font-medium">
                        Recebemos seu pedido. A liderança do curso entrará em contato em breve para confirmar sua participação.
                    </p>
                    <Button onClick={() => window.location.reload()} variant="outline" className="w-full h-14 font-black rounded-2xl uppercase tracking-widest">Enviar Outra</Button>
                </Card>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#F8F9FA] py-12 md:py-24 px-4 overflow-x-hidden">
            <div className="max-w-6xl mx-auto space-y-16">
                
                {/* Header */}
                <div className="text-center space-y-6 relative">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 size-64 bg-primary/5 rounded-full blur-3xl -z-10" />
                    <Logo className="size-16 text-primary mx-auto mb-6" />
                    <h1 className="text-5xl md:text-8xl font-black italic tracking-tighter uppercase text-slate-900 leading-[0.85]">
                        Portal de Inscrições
                    </h1>
                    <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto font-medium">
                        Sua jornada de crescimento começa aqui. Escolha um curso ou evento e faça parte do que Deus está fazendo.
                    </p>
                </div>

                <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
                    <div className="flex justify-center mb-12">
                        <TabsList className="bg-slate-100/50 p-1.5 rounded-[2rem] h-auto border-2 border-white/50 shadow-inner">
                            <TabsTrigger value="ensino" className="px-10 py-3 rounded-[1.5rem] font-black uppercase text-xs tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-lg">
                                <GraduationCap className="size-4 mr-2" /> Ensino
                            </TabsTrigger>
                            <TabsTrigger value="eventos" className="px-10 py-3 rounded-[1.5rem] font-black uppercase text-xs tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-lg">
                                <CalendarDays className="size-4 mr-2" /> Eventos
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="ensino" className="mt-0">
                        <div className="space-y-16">
                            {/* Lumine Section */}
                            <section className="space-y-10">
                                <div className="flex items-center gap-4 px-2">
                                    <div className="p-4 bg-primary text-white rounded-[1.5rem] shadow-xl shadow-primary/20"><Lightbulb size={32} /></div>
                                    <div>
                                        <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900">Lumine (EBD)</h2>
                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Escola Bíblica Discipuladora</p>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-1 gap-12 pl-4 border-l-4 border-primary/10 ml-8">
                                    {['discipulado', 'teologico', 'biblico'].map(track => {
                                        const list = (groupedCourses.Lumine as any)[track];
                                        if (list?.length === 0) return null;
                                        return (
                                            <div key={track} className="space-y-6">
                                                <h4 className="text-sm font-black text-primary/60 uppercase tracking-[0.25em] flex items-center gap-2">
                                                    <ChevronRight className="size-4" /> Trilho {track === 'teologico' ? 'Teológico' : track === 'biblico' ? 'Bíblico' : 'de Discipulado'}
                                                </h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                    {list.map((course: any) => <CourseCard key={course.id} course={course} />)}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>

                            {/* Escolas Section */}
                            <section className="space-y-10">
                                <div className="flex items-center gap-4 px-2">
                                    <div className="p-4 bg-slate-900 text-white rounded-[1.5rem] shadow-xl"><School size={32} /></div>
                                    <div>
                                        <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900">Escolas & Academias</h2>
                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Wave, DIS e Artes</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {groupedCourses.Escolas?.map((course: any) => (
                                        <CourseCard key={course.id} course={course} />
                                    ))}
                                </div>
                            </section>

                            {/* Ministérios Section */}
                            <section className="space-y-10">
                                <div className="flex items-center gap-4 px-2">
                                    <div className="p-4 bg-indigo-600 text-white rounded-[1.5rem] shadow-xl"><BookOpen size={32} /></div>
                                    <div>
                                        <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900">Ministérios</h2>
                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Cursos Gerais e Treinamentos</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {groupedCourses.Geral?.map((course: any) => (
                                        <CourseCard key={course.id} course={course} />
                                    ))}
                                </div>
                            </section>
                        </div>
                    </TabsContent>

                    <TabsContent value="eventos" className="mt-0">
                        <div className="py-20 text-center space-y-4 bg-slate-50 rounded-[3rem] border-4 border-dashed border-slate-200">
                            <CalendarDays className="size-16 mx-auto text-slate-300 opacity-50" />
                            <h3 className="text-2xl font-black uppercase text-slate-400 italic">Nenhum evento com inscrições abertas</h3>
                            <p className="text-slate-400 font-medium max-w-sm mx-auto">Novos eventos estratégicos serão listados aqui em breve. Fique atento aos avisos oficiais.</p>
                        </div>
                    </TabsContent>
                </Tabs>

                {/* Seção de Identificação / Protocolo */}
                <section id="protocolo" className="max-w-2xl mx-auto pt-12 border-t-2 border-slate-100">
                    {step === 'email' ? (
                        <Card className="shadow-2xl border-none overflow-hidden rounded-[2.5rem] animate-in slide-in-from-bottom-4 duration-700">
                            <CardHeader className="bg-primary p-10 text-white text-center">
                                <div className="size-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6 backdrop-blur-xl">
                                    <Mail className="size-8" />
                                </div>
                                <CardTitle className="text-3xl font-black uppercase italic tracking-tighter">Identificação</CardTitle>
                                <CardDescription className="text-primary-foreground/80 font-medium">Informe seu e-mail para iniciar o protocolo.</CardDescription>
                            </CardHeader>
                            <form onSubmit={handleVerifyEmail}>
                                <CardContent className="p-10 space-y-6">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] uppercase font-black text-muted-foreground ml-2">E-mail do Membro ou Visitante</Label>
                                        <div className="relative">
                                            <Search className="absolute left-4 top-4 size-5 text-muted-foreground" />
                                            <Input 
                                                type="email" 
                                                required 
                                                value={email} 
                                                onChange={e => setEmail(e.target.value)} 
                                                placeholder="seu@email.com" 
                                                className="h-14 pl-12 rounded-2xl text-lg font-bold shadow-inner"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                                        <Info className="size-5 text-blue-600 shrink-0 mt-0.5" />
                                        <p className="text-[11px] text-blue-800 leading-relaxed font-medium italic">
                                            Se você já tem cadastro no OikoApp, seus dados serão reconhecidos automaticamente.
                                        </p>
                                    </div>
                                </CardContent>
                                <CardFooter className="px-10 pb-10">
                                    <Button type="submit" disabled={isVerifying} className="w-full h-16 font-black text-lg uppercase tracking-widest shadow-xl">
                                        {isVerifying ? <Loader2 className="mr-2 animate-spin" /> : <ArrowRight className="mr-2" />}
                                        Iniciar Inscrição
                                    </Button>
                                </CardFooter>
                            </form>
                        </Card>
                    ) : (
                        <div className="space-y-8">
                            {!selectedCourseId ? (
                                <div className="p-8 text-center bg-amber-50 border-2 border-dashed border-amber-200 rounded-[2rem] space-y-4">
                                    <Search className="size-10 mx-auto text-amber-400" />
                                    <p className="text-amber-900 font-bold uppercase text-sm italic">Selecione um curso acima para prosseguir</p>
                                    <Button variant="ghost" onClick={() => setStep('email')} className="text-amber-700 font-black text-[10px] uppercase tracking-widest"><ArrowLeft className="size-3 mr-2" /> Mudar E-mail</Button>
                                </div>
                            ) : (
                                <EnrollmentForm />
                            )}
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}

export default function EnrollmentPage() {
    return (
        <VolunteeringProvider>
            <PublicEnrollmentContent />
        </VolunteeringProvider>
    );
}