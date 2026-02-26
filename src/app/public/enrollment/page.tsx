
'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useFirebase, addDocumentNonBlocking, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/icons';
import { CheckCircle2, ChevronRight, Loader2, ArrowLeft, BookOpen, GraduationCap, Users, Mail, UserCheck, ShieldCheck, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Step = 'identity' | 'personal_data' | 'course_selection' | 'success';

function EnrollmentForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { firestore } = useFirebase();
    const { toast } = useToast();

    const [step, setStep] = useState<Step>('identity');
    const [isExistingMember, setIsExistingMember] = useState(false);
    const [existingMemberData, setExistingMemberData] = useState<any>(null);
    
    // Form States
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [cpf, setCpf] = useState('');
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    // Fetch Courses
    const coursesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'courses')) : null, [firestore]);
    const { data: courses, isLoading: isLoadingCourses } = useCollection<any>(coursesQuery);

    useEffect(() => {
        const initialCourseId = searchParams.get('courseId');
        if (initialCourseId) setSelectedCourseId(initialCourseId);
    }, [searchParams]);

    const handleCheckIdentity = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !firestore) return;

        setIsSearching(true);
        try {
            const q = query(collection(firestore, 'users'), where('email', '==', email.trim().toLowerCase()));
            const snap = await getDocs(q);
            
            if (!snap.empty) {
                const userDoc = snap.docs[0];
                const userData = { id: userDoc.id, ...userDoc.data() };
                setExistingMemberData(userData);
                setIsExistingMember(true);
                setName(userData.name);
                setStep('course_selection');
                toast({ title: `Olá, ${userData.name}!`, description: "Identificamos seu cadastro. Escolha o curso para continuar." });
            } else {
                setIsExistingMember(false);
                setStep('personal_data');
            }
        } catch (error) {
            toast({ variant: 'destructive', title: "Erro na busca", description: "Tente novamente em instantes." });
        } finally {
            setIsSearching(false);
        }
    };

    const handleRegisterAndMatriculate = async () => {
        if (!selectedCourseId || !firestore) return;
        setIsSubmitting(true);

        try {
            let userId = existingMemberData?.id;

            // Se for novo, criamos o registro básico
            if (!isExistingMember) {
                const userRef = await addDocumentNonBlocking(collection(firestore, 'users'), {
                    name,
                    email: email.trim().toLowerCase(),
                    phone,
                    cpf,
                    integrationStatus: 'nao_alcancado',
                    createdAt: Timestamp.now()
                });
                userId = userRef.id;
            }

            // Criar solicitação de matrícula
            await addDocumentNonBlocking(collection(firestore, 'enrollment_requests'), {
                userId,
                name: existingMemberData?.name || name,
                email: email.trim().toLowerCase(),
                phone: existingMemberData?.phone || phone,
                courseId: selectedCourseId,
                status: 'pending',
                createdAt: Timestamp.now()
            });

            setStep('success');
        } catch (error) {
            toast({ variant: 'destructive', title: "Erro na inscrição", description: "Não foi possível processar sua solicitação." });
        } finally {
            setIsSubmitting(false);
        }
    };

    const getTrackInfo = (course: any) => {
        if (course.ebdTrack === 'teologico') return "Fase Buscar | 12/03 a 16/04 às 09h00";
        if (course.ebdTrack === 'biblico' || course.ebdTrack === 'discipulado') return "Todo domingo às 09h00";
        return null;
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-xl space-y-8">
                <div className="flex flex-col items-center gap-4">
                    <div className="p-3 bg-primary rounded-2xl shadow-xl shadow-primary/20">
                        <Logo className="size-10 text-white" />
                    </div>
                    <div className="text-center">
                        <h1 className="text-3xl font-black tracking-tight text-slate-900">Inscrição de Cursos</h1>
                        <p className="text-muted-foreground font-medium">Igreja Batista da Manhã</p>
                    </div>
                </div>

                <Card className="border-none shadow-2xl overflow-hidden rounded-[2rem]">
                    <CardHeader className="bg-primary/5 border-b border-primary/10 py-8 px-10">
                        <div className="flex justify-between items-center">
                            <div className="space-y-1">
                                <CardTitle className="text-xl font-black uppercase italic tracking-tighter">
                                    {step === 'identity' && 'Comece por aqui'}
                                    {step === 'personal_data' && 'Quase lá...'}
                                    {step === 'course_selection' && 'Escolha seu curso'}
                                    {step === 'success' && 'Tudo pronto!'}
                                </CardTitle>
                                <CardDescription>
                                    {step === 'identity' && 'Informe seu e-mail para identificarmos você.'}
                                    {step === 'personal_data' && 'Preencha seus dados para criar seu perfil.'}
                                    {step === 'course_selection' && `Bem-vindo(a), ${name.split(' ')[0]}!`}
                                    {step === 'success' && 'Sua solicitação foi enviada.'}
                                </CardDescription>
                            </div>
                            <div className="text-primary font-black text-2xl opacity-20">
                                {step === 'identity' && '01'}
                                {step === 'personal_data' && '02'}
                                {step === 'course_selection' && (isExistingMember ? '02' : '03')}
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-10">
                        {step === 'identity' && (
                            <form onSubmit={handleCheckIdentity} className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">E-mail de Cadastro</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
                                        <Input 
                                            id="email" 
                                            type="email" 
                                            required 
                                            value={email} 
                                            onChange={e => setEmail(e.target.value)}
                                            placeholder="seu@email.com"
                                            className="h-14 pl-12 rounded-xl text-lg font-medium bg-muted/20 border-transparent focus:border-primary transition-all"
                                        />
                                    </div>
                                </div>
                                <Button type="submit" className="w-full h-14 text-lg font-black rounded-xl shadow-lg" disabled={isSearching}>
                                    {isSearching ? <Loader2 className="animate-spin mr-2" /> : <ChevronRight className="mr-2" />}
                                    Continuar Inscrição
                                </Button>
                            </form>
                        )}

                        {step === 'personal_data' && (
                            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black text-muted-foreground uppercase">Nome Completo</Label>
                                        <Input value={name} onChange={e => setName(e.target.value)} className="h-12 rounded-xl" placeholder="Ex: João Silva" />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black text-muted-foreground uppercase">Telefone/WhatsApp</Label>
                                            <Input value={phone} onChange={e => setPhone(e.target.value)} className="h-12 rounded-xl" placeholder="(21) 99999-9999" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black text-muted-foreground uppercase">CPF</Label>
                                            <Input value={cpf} onChange={e => setCpf(e.target.value)} className="h-12 rounded-xl" placeholder="000.000.000-00" />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <Button variant="ghost" onClick={() => setStep('identity')} className="h-12 rounded-xl"><ArrowLeft className="mr-2" /> Voltar</Button>
                                    <Button className="flex-1 h-12 rounded-xl font-bold" onClick={() => setStep('course_selection')}>Próximo Passo</Button>
                                </div>
                            </div>
                        )}

                        {step === 'course_selection' && (
                            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Escolha a Escola / Curso</Label>
                                    <div className="grid gap-3">
                                        {isLoadingCourses ? (
                                            <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                                        ) : (
                                            courses?.filter(c => c.type !== 'online').map(course => {
                                                const isSelected = selectedCourseId === course.id;
                                                const trackLabel = getTrackInfo(course);
                                                
                                                return (
                                                    <button
                                                        key={course.id}
                                                        onClick={() => setSelectedCourseId(course.id)}
                                                        className={cn(
                                                            "flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all",
                                                            isSelected ? "border-primary bg-primary/5 ring-4 ring-primary/10" : "border-slate-100 hover:border-primary/30 bg-white"
                                                        )}
                                                    >
                                                        <div className={cn("p-3 rounded-xl", isSelected ? "bg-primary text-white" : "bg-slate-100 text-slate-400")}>
                                                            <GraduationCap size={24} />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-black text-sm uppercase tracking-tighter text-slate-900">{course.name}</p>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <Badge variant="secondary" className="text-[8px] font-black h-4 px-1.5">{course.ministryName}</Badge>
                                                                {trackLabel && (
                                                                    <span className="text-[9px] font-bold text-primary uppercase animate-pulse">{trackLabel}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {isSelected && <CheckCircle2 className="ml-auto text-primary size-6" />}
                                                    </button>
                                                )
                                            })
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <Button variant="ghost" onClick={() => setStep(isExistingMember ? 'identity' : 'personal_data')} className="h-12 rounded-xl"><ArrowLeft className="mr-2" /> Voltar</Button>
                                    <Button 
                                        className="flex-1 h-12 rounded-xl font-black shadow-lg" 
                                        onClick={handleRegisterAndMatriculate}
                                        disabled={!selectedCourseId || isSubmitting}
                                    >
                                        {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <UserCheck className="mr-2" />}
                                        Finalizar Inscrição
                                    </Button>
                                </div>
                            </div>
                        )}

                        {step === 'success' && (
                            <div className="text-center py-10 space-y-6 animate-in zoom-in-95 duration-500">
                                <div className="size-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20">
                                    <CheckCircle2 size={48} />
                                </div>
                                <div className="space-y-2">
                                    <h2 className="text-3xl font-black text-slate-900 italic tracking-tighter">Inscrição Enviada!</h2>
                                    <p className="text-slate-600 max-w-xs mx-auto">Sua solicitação foi protocolada. O responsável pelo curso entrará em contato com você em breve.</p>
                                </div>
                                <Button className="w-full h-12 rounded-xl" onClick={() => router.push('/')}>Voltar ao Site</Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <p className="text-center text-[10px] text-muted-foreground uppercase font-black tracking-[0.3em]">OikoApp Governance System</p>
            </div>
        </div>
    );
}

export default function PublicEnrollmentPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin size-10 text-primary" /></div>}>
            <EnrollmentForm />
        </Suspense>
    );
}
