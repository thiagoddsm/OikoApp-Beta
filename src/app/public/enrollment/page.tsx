'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { useVolunteering, VolunteeringProvider } from '@/contexts/volunteering-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
    Loader2, CheckCircle, Mail, Phone, User, 
    BookOpen, Calendar, MapPin, ArrowRight, 
    Search, Filter, GraduationCap, Waves, Lightbulb, School,
    CheckCircle2, Info, ChevronRight, Sparkles
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/icons';
import { cn } from '@/lib/utils';
import { verifyMemberEmail, submitEnrollmentRequest } from './actions';

function EnrollmentForm() {
    const { courses, classes } = useVolunteering();
    const { toast } = useToast();
    
    const [step, setStep] = useState(1);
    const [isVerifying, setIsVerifying] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    
    const [email, setEmail] = useState('');
    const [identifiedUser, setIdentifiedUser] = useState<any>(null);
    const [formData, setFormData] = useState({ name: '', phone: '' });
    
    const [selectedTab, setSelectedTab] = useState('ensino');
    const [subTab, setSubTab] = useState('lumine');
    const [selectedCourse, setSelectedCourse] = useState<any>(null);
    const [selectedClassId, setSelectedClassId] = useState('');

    const handleVerifyEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;
        setIsVerifying(true);
        try {
            const result = await verifyMemberEmail(email);
            if (result.exists) {
                setIdentifiedUser(result.user);
                toast({ title: "Bem-vindo de volta!", description: `Identificamos seu cadastro como ${result.user.name}.` });
            } else {
                setIdentifiedUser(null);
            }
            setStep(2);
        } catch (err: any) {
            toast({ variant: 'destructive', title: "Erro de Conexão", description: err.message });
        } finally {
            setIsVerifying(false);
        }
    };

    const handleConfirmEnrollment = async () => {
        if (!selectedCourse) return;
        setIsSubmitting(true);
        try {
            const payload = {
                courseId: selectedCourse.id,
                classId: selectedClassId || null,
                name: identifiedUser ? identifiedUser.name : formData.name,
                email: email,
                phone: identifiedUser ? identifiedUser.phone : formData.phone,
                userId: identifiedUser?.id || null,
            };
            await submitEnrollmentRequest(payload);
            setSuccess(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err: any) {
            toast({ variant: 'destructive', title: "Erro ao inscrever", description: err.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredCourses = useMemo(() => {
        return courses.filter(c => {
            const m = c.ministryName?.toLowerCase() || '';
            if (subTab === 'lumine') return m.includes('lumine') || m.includes('ebd');
            if (subTab === 'escolas') return m.includes('wave') || m === 'dis';
            if (subTab === 'ministerios') return !m.includes('lumine') && !m.includes('ebd') && !m.includes('wave') && m !== 'dis';
            return true;
        });
    }, [courses, subTab]);

    if (success) {
        return (
            <div className="max-w-md mx-auto py-20 text-center space-y-6 animate-in zoom-in-95 duration-500">
                <div className="size-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                    <CheckCircle size={48} />
                </div>
                <h2 className="text-4xl font-black uppercase italic tracking-tighter text-slate-900">Protocolo Enviado!</h2>
                <p className="text-muted-foreground font-medium">
                    Sua solicitação de inscrição foi recebida com sucesso. A coordenação do curso entrará em contato em breve para confirmar sua vaga.
                </p>
                <Button onClick={() => window.location.reload()} variant="outline" className="w-full h-12 font-bold rounded-xl">Realizar Outra Inscrição</Button>
            </div>
        );
    }

    return (
        <div className="space-y-10">
            {/* Step Indicator */}
            <div className="flex items-center justify-center gap-4">
                {[1, 2, 3].map((s) => (
                    <div key={s} className="flex items-center gap-2">
                        <div className={cn(
                            "size-8 rounded-full flex items-center justify-center text-xs font-black transition-all",
                            step === s ? "bg-primary text-white scale-110 shadow-lg" : 
                            step > s ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
                        )}>
                            {step > s ? <CheckCircle2 size={16} /> : s}
                        </div>
                        {s < 3 && <div className={cn("w-8 h-0.5 rounded-full", step > s ? "bg-emerald-500" : "bg-muted")} />}
                    </div>
                ))}
            </div>

            {step === 1 && (
                <Card className="max-w-md mx-auto shadow-2xl border-none rounded-[2rem] overflow-hidden">
                    <CardHeader className="bg-primary/5 p-8 border-b text-center">
                        <CardTitle className="text-xl font-black uppercase italic tracking-tight">Identificação</CardTitle>
                        <CardDescription className="text-xs font-bold uppercase tracking-widest">Passo 1 de 3</CardDescription>
                    </CardHeader>
                    <form onSubmit={handleVerifyEmail}>
                        <CardContent className="p-8 space-y-6">
                            <div className="text-center space-y-2">
                                <h3 className="text-xl font-bold text-slate-800">Para começar, qual seu e-mail?</h3>
                                <p className="text-xs text-muted-foreground">Usamos seu e-mail para localizar seu cadastro e histórico ministerial.</p>
                            </div>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
                                <Input 
                                    type="email" 
                                    required 
                                    value={email} 
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="seu@email.com" 
                                    className="h-14 pl-12 rounded-2xl bg-slate-50 border-none text-lg font-medium focus-visible:ring-primary/20"
                                />
                            </div>
                        </CardContent>
                        <CardFooter className="p-8 pt-0">
                            <Button type="submit" disabled={isVerifying} className="w-full h-14 rounded-2xl font-black text-base uppercase tracking-widest shadow-xl">
                                {isVerifying ? <Loader2 className="animate-spin mr-2" /> : <ArrowRight className="mr-2" />}
                                Continuar
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            )}

            {step === 2 && (
                <Card className="max-w-md mx-auto shadow-2xl border-none rounded-[2rem] overflow-hidden animate-in slide-in-from-bottom-4">
                    <CardHeader className="bg-primary/5 p-8 border-b text-center">
                        <CardTitle className="text-xl font-black uppercase italic tracking-tight">Seus Dados</CardTitle>
                        <CardDescription className="text-xs font-bold uppercase tracking-widest">Passo 2 de 3</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                        {identifiedUser ? (
                            <div className="p-6 bg-emerald-50 border-2 border-emerald-100 rounded-3xl space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="size-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-emerald-600">
                                        <User size={24} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-emerald-700 tracking-widest">Membro Reconhecido</p>
                                        <p className="text-lg font-black text-slate-900 leading-tight">{identifiedUser.name}</p>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Telefone Vinculado</p>
                                    <p className="font-bold text-slate-700">{identifiedUser.phone}</p>
                                </div>
                                <div className="pt-2 border-t border-emerald-200">
                                    <p className="text-[10px] text-emerald-800 italic leading-tight">
                                        Seus dados reais serão utilizados no protocolo de inscrição automaticamente.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-start gap-3 mb-4">
                                    <Info className="size-5 text-blue-600 shrink-0 mt-0.5" />
                                    <p className="text-[11px] text-blue-800 font-medium">E-mail não localizado. Por favor, preencha os dados abaixo para criar seu registro de visitante.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] uppercase font-black text-muted-foreground ml-1">Nome Completo</Label>
                                    <Input required value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} placeholder="Como deseja ser chamado?" className="h-12 rounded-xl bg-slate-50" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] uppercase font-black text-muted-foreground ml-1">WhatsApp</Label>
                                    <Input required value={formData.phone} onChange={e => setFormData(p => ({...p, phone: e.target.value}))} placeholder="(21) 9..." className="h-12 rounded-xl bg-slate-50" />
                                </div>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="p-8 pt-0">
                        <Button onClick={() => setStep(3)} className="w-full h-14 rounded-2xl font-black text-base uppercase tracking-widest shadow-xl">
                            Escolher Curso <ArrowRight className="ml-2 size-5" />
                        </Button>
                    </CardFooter>
                </Card>
            )}

            {step === 3 && (
                <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
                    <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
                            <TabsList className="bg-slate-200/50 p-1.5 h-14 rounded-2xl border-2">
                                <TabsTrigger value="ensino" className="rounded-xl px-8 font-black uppercase text-xs tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-lg">
                                    <GraduationCap className="mr-2 size-4" /> Ensino
                                </TabsTrigger>
                                <TabsTrigger value="eventos" className="rounded-xl px-8 font-black uppercase text-xs tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-lg">
                                    <Calendar className="mr-2 size-4" /> Eventos
                                </TabsTrigger>
                            </TabsList>

                            {selectedTab === 'ensino' && (
                                <div className="flex gap-2 p-1 bg-muted/50 rounded-xl border">
                                    {[
                                        { id: 'lumine', label: 'Lumine (EBD)', icon: Lightbulb },
                                        { id: 'escolas', label: 'Escolas', icon: Waves },
                                        { id: 'ministerios', label: 'Ministérios', icon: School }
                                    ].map(t => (
                                        <button 
                                            key={t.id}
                                            onClick={() => setSubTab(t.id)}
                                            className={cn(
                                                "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                                                subTab === t.id ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-slate-900"
                                            )}
                                        >
                                            <t.icon size={12} /> {t.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <TabsContent value="ensino" className="mt-0">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredCourses.map(course => (
                                    <Card 
                                        key={course.id} 
                                        className={cn(
                                            "group cursor-pointer border-2 transition-all rounded-[2rem] overflow-hidden hover:shadow-2xl",
                                            selectedCourse?.id === course.id ? "border-primary ring-4 ring-primary/10 scale-[1.02]" : "border-transparent hover:border-primary/20"
                                        )}
                                        onClick={() => {
                                            setSelectedCourse(course);
                                            const courseClasses = classes.filter(cls => cls.courseId === course.id);
                                            if (courseClasses.length === 1) setSelectedClassId(courseClasses[0].id);
                                            else setSelectedClassId('');
                                        }}
                                    >
                                        <div className="aspect-[4/3] relative">
                                            <img src={course.image || `https://picsum.photos/seed/${course.id}/600/400`} alt={course.name} className="object-cover w-full h-full" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                                            <div className="absolute bottom-0 left-0 p-6 w-full space-y-2">
                                                <Badge className="bg-primary/20 backdrop-blur-md text-white border-none text-[10px] font-black uppercase">{course.ministryName}</Badge>
                                                <h4 className="text-white text-xl font-black uppercase italic tracking-tighter leading-none">{course.name}</h4>
                                            </div>
                                        </div>
                                        <CardContent className="p-6">
                                            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-4">{course.description}</p>
                                            <div className="flex items-center justify-between pt-4 border-t border-dashed">
                                                <div className="flex items-center gap-1.5 text-primary">
                                                    <Sparkles size={14} className="animate-pulse" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">Inscrições Abertas</span>
                                                </div>
                                                <ChevronRight size={16} className="text-muted-foreground group-hover:translate-x-1 transition-transform" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </TabsContent>

                        <TabsContent value="eventos">
                            <div className="py-20 text-center space-y-4 bg-white rounded-[3rem] border-4 border-dashed border-slate-100 shadow-inner">
                                <div className="size-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                                    <Calendar size={40} />
                                </div>
                                <h3 className="text-2xl font-black uppercase italic tracking-tighter text-slate-400">Nenhum evento especial</h3>
                                <p className="text-muted-foreground max-w-xs mx-auto text-sm">No momento não temos eventos com inscrições abertas fora da grade de ensino.</p>
                            </div>
                        </TabsContent>
                    </Tabs>

                    {selectedCourse && (
                        <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-2xl border-t p-6 z-50 animate-in slide-in-from-bottom-full duration-500 shadow-[0_-20px_50px_rgba(0,0,0,0.1)]">
                            <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                                <div className="flex items-center gap-4">
                                    <div className="size-14 rounded-2xl overflow-hidden border-2 border-primary shadow-lg hidden sm:block">
                                        <img src={selectedCourse.image} className="w-full h-full object-cover" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-primary tracking-widest mb-1">Selecionado para {identifiedUser?.name || formData.name || 'Você'}:</p>
                                        <h4 className="text-xl font-black uppercase italic tracking-tighter leading-none">{selectedCourse.name}</h4>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 w-full md:w-auto">
                                    {classes.filter(cls => cls.courseId === selectedCourse.id).length > 1 && (
                                        <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                                            <SelectTrigger className="w-full md:w-64 h-12 rounded-xl bg-slate-100 border-none font-bold">
                                                <SelectValue placeholder="Escolha sua turma..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {classes.filter(cls => cls.courseId === selectedCourse.id).map(cls => (
                                                    <SelectItem key={cls.id} value={cls.id}>{cls.name} ({cls.dayOfWeek})</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                    <Button 
                                        disabled={isSubmitting || (classes.filter(cls => cls.courseId === selectedCourse.id).length > 1 && !selectedClassId)} 
                                        onClick={handleConfirmEnrollment}
                                        className="h-14 px-10 rounded-2xl font-black text-base uppercase tracking-widest shadow-xl flex-1 md:flex-none"
                                    >
                                        {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle className="mr-2" />}
                                        Finalizar Inscrição
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function EnrollmentPage() {
    return (
        <main className="min-h-screen bg-[#F8F9FA] py-12 md:py-20 px-4">
            <div className="max-w-6xl mx-auto space-y-12">
                <div className="text-center space-y-4 mb-16">
                    <div className="size-20 bg-white shadow-xl rounded-3xl flex items-center justify-center mx-auto border-2 border-primary/5 text-primary mb-6">
                        <Logo className="size-10" />
                    </div>
                    <h1 className="text-5xl md:text-8xl font-black italic tracking-tighter uppercase text-slate-900 leading-[0.85]">Portal de <br/><span className="text-primary">Inscrições</span></h1>
                    <p className="text-muted-foreground text-sm md:text-xl font-bold uppercase tracking-widest">Igreja Batista da Manhã • Ano da Visão</p>
                </div>

                <VolunteeringProvider>
                    <EnrollmentForm />
                </VolunteeringProvider>

                <footer className="pt-20 pb-10 text-center">
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.3em]">IBM CORE • Organização a Serviço do Organismo</p>
                </footer>
            </div>
        </main>
    );
}
