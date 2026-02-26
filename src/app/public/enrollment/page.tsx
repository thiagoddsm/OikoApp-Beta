
'use client';

import React, { useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
    CheckCircle2, 
    ArrowRight, 
    BookOpen, 
    User, 
    Smartphone, 
    Mail, 
    Loader2, 
    IdCard, 
    HeartHandshake, 
    GraduationCap, 
    ShieldCheck, 
    Search,
    ChevronRight,
    Star,
    Sparkles
} from 'lucide-react';
import { useVolunteering, type Course } from '@/contexts/volunteering-context';
import { useFirebase } from '@/firebase';
import { collection, query, where, getDocs, Timestamp, addDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

function EnrollmentFormContent() {
    const { courses, isLoading: isLoadingCourses } = useVolunteering();
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    
    // Estados do Fluxo
    const [step, setStep] = useState<'identity' | 'profile' | 'selection' | 'success'>('identity');
    const [isSearching, setIsSearching] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Dados do Aluno
    const [foundMember, setFoundMember] = useState<any>(null);
    const [email, setEmail] = useState('');
    const [profileData, setProfileData] = useState({
        name: '',
        phone: '',
        cpf: '',
    });
    
    const [selectedCourseId, setSelectedCourseId] = useState(searchParams.get('courseId') || '');

    const handleSearchEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !firestore) return;
        
        setIsSearching(true);
        try {
            const q = query(collection(firestore, 'users'), where('email', '==', email.toLowerCase().trim()));
            const snap = await getDocs(q);
            
            if (!snap.empty) {
                const member = { id: snap.docs[0].id, ...snap.docs[0].data() };
                setFoundMember(member);
                setStep('selection');
                toast({ title: `Olá, ${member.name}!`, description: "Reconhecemos seu cadastro IBM." });
            } else {
                setFoundMember(null);
                setStep('profile');
            }
        } catch (e) {
            toast({ variant: 'destructive', title: "Erro na busca", description: "Tente novamente em instantes." });
        } finally {
            setIsSearching(false);
        }
    };

    const handleProfileSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!profileData.name || !profileData.phone) {
            toast({ variant: 'destructive', title: "Preencha os campos obrigatórios." });
            return;
        }
        setStep('selection');
    };

    const handleEnroll = async (courseId: string) => {
        if (!firestore) return;
        setIsSubmitting(true);
        setSelectedCourseId(courseId);

        try {
            let finalUserId = foundMember?.id;

            // Se for novo, cria o usuário primeiro
            if (!finalUserId) {
                const newUser = await addDoc(collection(firestore, 'users'), {
                    ...profileData,
                    email: email.toLowerCase().trim(),
                    integrationStatus: 'nao_alcancado',
                    createdAt: Timestamp.now()
                });
                finalUserId = newUser.id;
            }

            // Cria a solicitação de inscrição
            await addDoc(collection(firestore, 'enrollment_requests'), {
                userId: finalUserId,
                name: foundMember?.name || profileData.name,
                email: email.toLowerCase().trim(),
                phone: foundMember?.phone || profileData.phone,
                courseId: courseId,
                status: 'pending',
                createdAt: Timestamp.now()
            });

            setStep('success');
            toast({ title: "Solicitação Enviada!", description: "Aguarde o contato da coordenação." });
        } catch (error) {
            toast({ variant: 'destructive', title: "Erro ao processar", description: "Ocorreu uma falha técnica." });
        } finally {
            setIsSubmitting(false);
        }
    };

    const groupedCourses = useMemo(() => {
        const groups: Record<string, Course[]> = {
            discipulado: [],
            teologico: [],
            biblico: [],
            escolas: [],
            outros: []
        };

        courses.forEach(c => {
            const name = c.name.toLowerCase();
            const ministry = c.ministryName.toLowerCase();

            if (c.ebdTrack === 'discipulado' || name.includes('pertencer') || name.includes('crescer')) groups.discipulado.push(c);
            else if (c.ebdTrack === 'teologico') groups.teologico.push(c);
            else if (c.ebdTrack === 'biblico') groups.biblico.push(c);
            else if (ministry.includes('wave') || ministry.includes('dis')) groups.escolas.push(c);
            else groups.outros.push(c);
        });

        return groups;
    }, [courses]);

    const getCourseTag = (course: Course) => {
        if (course.ebdTrack === 'teologico') return "Fase Buscar | 12/03 a 16/04 às 09h00";
        if (course.ebdTrack === 'biblico' || course.ebdTrack === 'discipulado' || course.name.toLowerCase().includes('crescer')) return "Todo domingo às 09h00";
        return null;
    };

    if (isLoadingCourses) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary size-10" /></div>;

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 flex flex-col items-center">
            <div className="max-w-4xl w-full">
                {/* Header Dinâmico */}
                <div className="text-center mb-10 space-y-4 animate-in fade-in slide-in-from-top-4 duration-700">
                    <div className="size-16 bg-primary text-white rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-primary/20 mb-6">
                        <Sparkles size={32} />
                    </div>
                    <h1 className="text-4xl font-black italic tracking-tighter text-slate-900 uppercase">
                        Portal de Inscrições IBM
                    </h1>
                    <p className="text-slate-500 font-medium">Garanta sua vaga na próxima jornada de crescimento e ensino.</p>
                </div>

                <Card className="border-none shadow-2xl overflow-hidden rounded-[2rem] bg-white">
                    <CardContent className="p-0">
                        {step === 'identity' && (
                            <div className="p-8 sm:p-12 space-y-8 animate-in fade-in zoom-in-95">
                                <div className="space-y-2">
                                    <h2 className="text-2xl font-black text-slate-900">Comece por aqui</h2>
                                    <p className="text-sm text-slate-500">Informe seu e-mail para iniciarmos sua inscrição.</p>
                                </div>
                                <form onSubmit={handleSearchEmail} className="space-y-6">
                                    <div className="space-y-3">
                                        <Label htmlFor="email" className="text-[10px] font-black uppercase text-primary tracking-widest ml-1">E-mail Principal *</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-400" />
                                            <Input 
                                                id="email" 
                                                type="email" 
                                                required 
                                                className="h-14 pl-12 rounded-xl text-lg font-medium border-slate-200 focus:border-primary focus:ring-primary shadow-sm"
                                                placeholder="seu@email.com"
                                                value={email}
                                                onChange={e => setEmail(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <Button className="w-full h-14 text-lg font-black italic rounded-xl shadow-lg shadow-primary/20 group" disabled={isSearching}>
                                        {isSearching ? <Loader2 className="animate-spin mr-2" /> : null}
                                        AVANÇAR <ChevronRight className="ml-2 size-5 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </form>
                            </div>
                        )}

                        {step === 'profile' && (
                            <div className="p-8 sm:p-12 space-y-8 animate-in slide-in-from-right-4 duration-500">
                                <div className="space-y-2">
                                    <h2 className="text-2xl font-black text-slate-900">Seja bem-vindo(a)!</h2>
                                    <p className="text-sm text-slate-500">Não encontramos seu e-mail. Preencha seus dados para criar seu perfil.</p>
                                </div>
                                <form onSubmit={handleProfileSubmit} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nome Completo</Label>
                                            <div className="relative">
                                                <User className="absolute left-3 top-3 size-4 text-slate-400" />
                                                <Input required className="pl-10 h-11" value={profileData.name} onChange={e => setProfileData(p => ({...p, name: e.target.value}))} />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Celular (WhatsApp)</Label>
                                            <div className="relative">
                                                <Smartphone className="absolute left-3 top-3 size-4 text-slate-400" />
                                                <Input required className="pl-10 h-11" value={profileData.phone} onChange={e => setProfileData(p => ({...p, phone: e.target.value}))} placeholder="(21) 9..." />
                                            </div>
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">CPF (Para Certificados)</Label>
                                            <div className="relative">
                                                <IdCard className="absolute left-3 top-3 size-4 text-slate-400" />
                                                <Input className="pl-10 h-11" value={profileData.cpf} onChange={e => setProfileData(p => ({...p, cpf: e.target.value}))} placeholder="000.000.000-00" />
                                            </div>
                                        </div>
                                    </div>
                                    <Button className="w-full h-14 text-lg font-black italic rounded-xl group">
                                        ESCOLHER CURSO <ChevronRight className="ml-2 size-5 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </form>
                            </div>
                        )}

                        {step === 'selection' && (
                            <div className="animate-in slide-in-from-right-4 duration-500">
                                <div className="p-8 sm:p-12 border-b bg-slate-50/50">
                                    <div className="flex items-center gap-4">
                                        <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black">
                                            {(foundMember?.name || profileData.name).charAt(0)}
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-black text-slate-900">Olá, {foundMember?.name || profileData.name.split(' ')[0]}!</h2>
                                            <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">Selecione o curso que deseja participar</p>
                                        </div>
                                    </div>
                                </div>

                                <Tabs defaultValue="discipulado" className="w-full">
                                    <div className="px-8 pt-6">
                                        <TabsList className="bg-slate-100 p-1 h-12 w-full justify-start overflow-x-auto no-scrollbar flex-nowrap mb-8 rounded-xl">
                                            <TabsTrigger value="discipulado" className="rounded-lg px-6 font-bold text-xs uppercase data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">Discipulado</TabsTrigger>
                                            <TabsTrigger value="teologico" className="rounded-lg px-6 font-bold text-xs uppercase data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">Teológico</TabsTrigger>
                                            <TabsTrigger value="biblico" className="rounded-lg px-6 font-bold text-xs uppercase data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">Bíblico</TabsTrigger>
                                            <TabsTrigger value="escolas" className="rounded-lg px-6 font-bold text-xs uppercase data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">Escolas</TabsTrigger>
                                            <TabsTrigger value="outros" className="rounded-lg px-6 font-bold text-xs uppercase data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">Eletivos</TabsTrigger>
                                        </TabsList>
                                    </div>

                                    {Object.entries(groupedCourses).map(([key, list]) => (
                                        <TabsContent key={key} value={key} className="p-8 pt-0 min-h-[400px]">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {list.length === 0 ? (
                                                    <div className="col-span-full py-20 text-center border-2 border-dashed rounded-2xl">
                                                        <BookOpen className="size-12 mx-auto mb-4 text-slate-300" />
                                                        <p className="text-slate-400 font-medium">Nenhum curso disponível neste trilho no momento.</p>
                                                    </div>
                                                ) : (
                                                    list.map(course => (
                                                        <Card 
                                                            key={course.id} 
                                                            className={cn(
                                                                "group relative overflow-hidden transition-all duration-300 cursor-pointer border-2 hover:border-primary shadow-sm hover:shadow-xl",
                                                                selectedCourseId === course.id ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-slate-100"
                                                            )}
                                                            onClick={() => setSelectedCourseId(course.id)}
                                                        >
                                                            <CardContent className="p-6">
                                                                <div className="flex justify-between items-start mb-4">
                                                                    <div className="p-2.5 bg-slate-100 rounded-xl group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                                                        {key === 'discipulado' ? <HeartHandshake size={24} /> : 
                                                                         key === 'teologico' ? <ShieldCheck size={24} /> :
                                                                         key === 'escolas' ? <Sparkles size={24} /> : <BookOpen size={24} />}
                                                                    </div>
                                                                    {selectedCourseId === course.id && <CheckCircle2 className="text-primary size-6 animate-in zoom-in-50" />}
                                                                </div>
                                                                <h3 className="font-black text-lg text-slate-900 uppercase italic tracking-tighter leading-none mb-2">{course.name}</h3>
                                                                <p className="text-sm text-slate-500 line-clamp-2 mb-4 h-10 font-medium leading-tight">{course.description}</p>
                                                                
                                                                {getCourseTag(course) && (
                                                                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px] uppercase font-black py-1">
                                                                        <GraduationCap className="size-3 mr-1.5" />
                                                                        {getCourseTag(course)}
                                                                    </Badge>
                                                                )}
                                                            </CardContent>
                                                        </Card>
                                                    ))
                                                )}
                                            </div>
                                        </TabsContent>
                                    ))}
                                </Tabs>

                                <div className="p-8 pt-0 flex flex-col sm:flex-row gap-4">
                                    <Button variant="outline" className="h-14 font-black uppercase text-xs tracking-widest flex-1" onClick={() => setStep('identity')}>
                                        Voltar
                                    </Button>
                                    <Button 
                                        className="h-14 font-black italic text-xl flex-[2] shadow-xl shadow-primary/20" 
                                        disabled={!selectedCourseId || isSubmitting}
                                        onClick={() => handleEnroll(selectedCourseId)}
                                    >
                                        {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : null}
                                        CONFIRMAR INSCRIÇÃO
                                    </Button>
                                </div>
                            </div>
                        )}

                        {step === 'success' && (
                            <div className="p-12 text-center space-y-8 animate-in zoom-in-95 duration-500">
                                <div className="size-24 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/30">
                                    <CheckCircle2 size={48} />
                                </div>
                                <div className="space-y-3">
                                    <h2 className="text-3xl font-black italic tracking-tighter uppercase">Inscrição Recebida!</h2>
                                    <p className="text-lg text-slate-600 font-medium max-w-md mx-auto">
                                        Parabéns pela decisão! Sua solicitação foi enviada para a coordenação. Em breve você receberá um contato no WhatsApp.
                                    </p>
                                </div>
                                <div className="pt-4">
                                    <Button size="lg" className="rounded-full px-10 font-bold" onClick={() => window.location.reload()}>
                                        Fazer outra inscrição
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <p className="mt-8 text-center text-xs text-slate-400 font-bold uppercase tracking-[0.2em]">
                    Igreja Batista da Manhã • OikoApp v5.0
                </p>
            </div>
        </div>
    );
}

export default function EnrollmentPublicPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary size-10" /></div>}>
            <VolunteeringProvider>
                <EnrollmentFormContent />
            </VolunteeringProvider>
        </Suspense>
    );
}
