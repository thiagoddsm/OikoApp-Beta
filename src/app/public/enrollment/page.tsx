'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { useVolunteering, VolunteeringProvider } from '@/contexts/volunteering-context';
import { collection, Timestamp, addDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
    Loader2, Send, CheckCircle, GraduationCap, 
    BookOpen, School, Lightbulb, Star, Mail, ArrowRight,
    UserCheck, ShieldCheck, HelpCircle, CalendarDays
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/icons';
import { verifyMemberEmail } from './actions';
import { cn } from '@/lib/utils';

function EnrollmentForm() {
    const { firestore } = useFirebase();
    const { courses, classes } = useVolunteering();
    const { toast } = useToast();
    
    const [step, setStep] = useState<'email' | 'form' | 'success'>('email');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedTab, setSelectedTab] = useState('ensino');
    const [selectedSubTab, setSelectedSubTab] = useState('lumine');
    
    // Dados do formulário
    const [email, setEmail] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        courseId: '',
        classId: ''
    });

    const [recognizedMember, setRecognizedMember] = useState<any>(null);

    const handleVerifyEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !email.includes('@')) return;

        setIsLoading(true);
        try {
            const result = await verifyMemberEmail(email);
            if (result.exists && result.member) {
                setRecognizedMember(result.member);
                setFormData(p => ({
                    ...p,
                    name: result.member!.name,
                    phone: result.member!.phone
                }));
            } else {
                setRecognizedMember(null);
                setFormData(p => ({ ...p, name: '', phone: '' }));
            }
            setStep('form');
        } catch (err) {
            toast({ variant: 'destructive', title: "Erro na verificação", description: "Não foi possível validar seu e-mail." });
        } finally {
            setIsLoading(false);
        }
    };

    const handleEnroll = async (courseId: string, classId?: string) => {
        if (!formData.name || !email) {
            toast({ variant: 'destructive', title: "Dados incompletos", description: "Por favor, preencha seu nome e contato." });
            return;
        }

        setIsLoading(true);
        try {
            await addDoc(collection(firestore!, 'enrollment_requests'), {
                name: formData.name,
                email: email.toLowerCase().trim(),
                phone: formData.phone,
                courseId,
                classId: classId || '',
                status: 'pending',
                createdAt: Timestamp.now()
            });
            setStep('success');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            toast({ variant: 'destructive', title: "Erro ao protocolar", description: "Ocorreu uma falha técnica. Tente novamente." });
        } finally {
            setIsLoading(false);
        }
    };

    const groupedCourses = useMemo(() => {
        return {
            lumine: courses.filter(c => c.ministryName?.toLowerCase().includes('lumine') || c.ministryName?.toLowerCase().includes('ebd')),
            escolas: courses.filter(c => c.ministryName?.toLowerCase() === 'wave' || c.ministryName?.toLowerCase() === 'dis'),
            ministerios: courses.filter(c => !c.ministryName?.toLowerCase().includes('lumine') && !c.ministryName?.toLowerCase().includes('ebd') && c.ministryName?.toLowerCase() !== 'wave' && c.ministryName?.toLowerCase() !== 'dis')
        };
    }, [courses]);

    if (step === 'success') {
        return (
            <div className="max-w-md mx-auto text-center p-8 animate-in zoom-in-95 duration-500">
                <div className="size-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner mb-6">
                    <CheckCircle size={40} />
                </div>
                <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 mb-4">Solicitação Enviada!</h2>
                <p className="text-muted-foreground mb-8">
                    Seu protocolo de inscrição foi registrado com sucesso. A coordenação do curso entrará em contato em breve.
                </p>
                <Button onClick={() => window.location.reload()} variant="outline" className="w-full font-bold">Voltar ao Início</Button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-4">
                <Logo className="size-12 text-primary mx-auto mb-4" />
                <h1 className="text-5xl md:text-8xl font-black italic tracking-tighter uppercase text-slate-900 leading-[0.85]">
                    Portal de Inscrições
                </h1>
                <p className="text-muted-foreground text-sm md:text-lg max-w-2xl mx-auto">
                    Onde a organização serve ao organismo. Inscreva-se em nossos cursos, trilhos de crescimento e eventos estratégicos.
                </p>
            </div>

            {step === 'email' ? (
                <Card className="max-w-md mx-auto shadow-2xl border-none overflow-hidden rounded-[2rem]">
                    <CardHeader className="bg-primary/5 p-8 border-b">
                        <CardTitle className="text-xl font-bold flex items-center gap-2">
                            <Mail className="size-5 text-primary" /> Identificação
                        </CardTitle>
                        <CardDescription>Insira seu e-mail para começar seu protocolo.</CardDescription>
                    </CardHeader>
                    <form onSubmit={handleVerifyEmail}>
                        <CardContent className="p-8">
                            <div className="space-y-2">
                                <Label className="text-[10px] uppercase font-black text-muted-foreground">Seu Melhor E-mail</Label>
                                <Input 
                                    required 
                                    type="email" 
                                    value={email} 
                                    onChange={e => setEmail(e.target.value)} 
                                    placeholder="exemplo@email.com"
                                    className="h-12 text-lg"
                                />
                            </div>
                        </CardContent>
                        <CardFooter className="p-8 pt-0">
                            <Button type="submit" disabled={isLoading} className="w-full h-14 font-black text-base uppercase tracking-widest">
                                {isLoading ? <Loader2 className="animate-spin mr-2" /> : <ArrowRight className="mr-2" />}
                                Continuar
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            ) : (
                <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                    {/* Header de Boas-vindas */}
                    <Card className="border-none shadow-lg bg-primary text-white rounded-[2rem] overflow-hidden">
                        <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="size-16 bg-white/20 rounded-2xl flex items-center justify-center">
                                    {recognizedMember ? <ShieldCheck size={32} /> : <UserCheck size={32} />}
                                </div>
                                <div>
                                    <h3 className="text-xl font-black uppercase italic leading-none">
                                        {recognizedMember ? recognizedMember.maskedName : "Novo Visitante"}
                                    </h3>
                                    <p className="text-white/70 text-sm mt-1">
                                        {recognizedMember 
                                            ? `Membro identificado: ${recognizedMember.maskedPhone}` 
                                            : `Seja bem-vindo à IBM! Vamos criar seu cadastro.`}
                                    </p>
                                </div>
                            </div>
                            {!recognizedMember && (
                                <div className="w-full md:w-auto space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <Label className="text-[9px] uppercase font-black text-white/60">Seu Nome Completo</Label>
                                            <Input 
                                                value={formData.name} 
                                                onChange={e => setFormData(p => ({...p, name: e.target.value}))}
                                                className="bg-white/10 border-white/20 text-white placeholder:text-white/30 h-10"
                                                placeholder="Como prefere ser chamado?"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[9px] uppercase font-black text-white/60">Telefone / WhatsApp</Label>
                                            <Input 
                                                value={formData.phone} 
                                                onChange={e => setFormData(p => ({...p, phone: e.target.value}))}
                                                className="bg-white/10 border-white/20 text-white placeholder:text-white/30 h-10"
                                                placeholder="(21) 99999-9999"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                            <Button variant="outline" size="sm" onClick={() => setStep('email')} className="bg-transparent border-white/20 text-white hover:bg-white/10 shrink-0">
                                Alterar E-mail
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Catálogo de Inscrições */}
                    <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
                        <div className="flex justify-center mb-8">
                            <TabsList className="bg-slate-200/50 p-1 h-14 rounded-2xl border-2">
                                <TabsTrigger value="ensino" className="px-8 font-black uppercase italic tracking-tighter text-sm data-[state=active]:bg-white data-[state=active]:shadow-xl rounded-xl">
                                    <GraduationCap className="mr-2 size-4" /> Ensino & Trilhos
                                </TabsTrigger>
                                <TabsTrigger value="eventos" className="px-8 font-black uppercase italic tracking-tighter text-sm data-[state=active]:bg-white data-[state=active]:shadow-xl rounded-xl">
                                    <CalendarDays className="mr-2 size-4" /> Eventos
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="ensino" className="mt-0 space-y-8 animate-in fade-in-50 duration-500">
                            <Tabs value={selectedSubTab} onValueChange={setSelectedSubTab} className="w-full">
                                <div className="flex justify-start overflow-x-auto no-scrollbar pb-4 border-b">
                                    <TabsList className="bg-transparent h-auto p-0 gap-8">
                                        {[
                                            { id: 'lumine', label: 'Lumine (EBD)', icon: Lightbulb },
                                            { id: 'escolas', label: 'Escolas Wave/DIS', icon: School },
                                            { id: 'ministerios', label: 'Cursos de Ministérios', icon: BookOpen },
                                        ].map(sub => (
                                            <TabsTrigger 
                                                key={sub.id} 
                                                value={sub.id}
                                                className="bg-transparent border-none p-0 h-auto data-[state=active]:text-primary data-[state=active]:shadow-none group relative pb-2"
                                            >
                                                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-widest">
                                                    <sub.icon className="size-4" />
                                                    {sub.label}
                                                </div>
                                                <div className="absolute bottom-0 left-0 w-full h-1 bg-primary scale-x-0 group-data-[state=active]:scale-x-100 transition-transform origin-left rounded-full" />
                                            </TabsTrigger>
                                        ))}
                                    </TabsList>
                                </div>

                                {['lumine', 'escolas', 'ministerios'].map(key => (
                                    <TabsContent key={key} value={key} className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {groupedCourses[key as keyof typeof groupedCourses].length === 0 ? (
                                            <div className="col-span-full py-20 text-center text-muted-foreground italic border-2 border-dashed rounded-[2rem]">
                                                Nenhum curso com inscrições abertas nesta categoria.
                                            </div>
                                        ) : (
                                            groupedCourses[key as keyof typeof groupedCourses].map(course => {
                                                const courseClasses = classes.filter(cls => cls.courseId === course.id);
                                                const hasClasses = courseClasses.length > 0;

                                                return (
                                                    <Card key={course.id} className="border-none shadow-lg hover:shadow-2xl transition-all duration-300 rounded-[2rem] overflow-hidden group">
                                                        <div className="h-32 bg-slate-100 relative overflow-hidden">
                                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
                                                            <div className="absolute bottom-4 left-6 z-20">
                                                                <Badge className="bg-primary/20 backdrop-blur-md text-white border-none mb-1 text-[10px] font-black uppercase">{course.ministryName}</Badge>
                                                                <h4 className="text-white font-black uppercase italic tracking-tighter leading-none">{course.name}</h4>
                                                            </div>
                                                        </div>
                                                        <CardContent className="p-6 space-y-4">
                                                            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                                                {course.description || 'Uma jornada de crescimento e aprendizado na Palavra de Deus.'}
                                                            </p>
                                                            
                                                            {hasClasses ? (
                                                                <div className="space-y-3 pt-2">
                                                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Turmas Disponíveis:</p>
                                                                    <div className="space-y-2">
                                                                        {courseClasses.map(cls => (
                                                                            <Button 
                                                                                key={cls.id}
                                                                                variant="outline"
                                                                                className="w-full justify-between h-auto py-3 px-4 rounded-xl border-slate-100 hover:border-primary/30 hover:bg-primary/5 group/btn"
                                                                                onClick={() => handleEnroll(course.id, cls.id)}
                                                                                disabled={isLoading}
                                                                            >
                                                                                <div className="text-left">
                                                                                    <p className="font-bold text-slate-900 text-sm group-hover/btn:text-primary transition-colors">{cls.name}</p>
                                                                                    <p className="text-[10px] text-muted-foreground">{cls.dayOfWeek} às {cls.startTime}</p>
                                                                                </div>
                                                                                <Send className="size-4 text-slate-300 group-hover/btn:text-primary transition-all group-hover/btn:translate-x-1" />
                                                                            </Button>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-xl border border-amber-100">
                                                                    <HelpCircle size={16} />
                                                                    <span className="text-[10px] font-bold uppercase">Sem turmas abertas</span>
                                                                </div>
                                                            )}
                                                        </CardContent>
                                                    </Card>
                                                )
                                            })
                                        )}
                                    </TabsContent>
                                ))}
                            </Tabs>
                        </TabsContent>

                        <TabsContent value="eventos" className="mt-0 animate-in fade-in-50 duration-500">
                            <div className="py-20 text-center space-y-4 bg-slate-50 rounded-[2rem] border-2 border-dashed">
                                <CalendarDays className="size-12 mx-auto text-slate-300" />
                                <div>
                                    <h3 className="text-xl font-black uppercase italic tracking-tighter text-slate-900">Eventos em Breve</h3>
                                    <p className="text-muted-foreground text-sm max-w-xs mx-auto">Fique atento aos próximos eventos estratégicos da IBM. As inscrições aparecerão aqui.</p>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            )}
        </div>
    );
}

export default function EnrollmentPage() {
    return (
        <VolunteeringProvider>
            <main className="min-h-screen bg-[#F8F9FA] py-12 md:py-20 px-4">
                <EnrollmentForm />
            </main>
        </VolunteeringProvider>
    );
}
