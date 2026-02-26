
'use client';

import React, { useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, User, BookOpen, ArrowRight, ArrowLeft, Mail, Phone, GraduationCap, MapPin, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/icons';

function EnrollmentFlow() {
    const searchParams = useSearchParams();
    const { firestore } = useFirebase();
    const { toast } = useToast();
    
    // Configurações Globais
    const coursesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'courses')) : null, [firestore]);
    const { data: allCourses, isLoading: isLoadingCourses } = useCollection<any>(coursesQuery);

    // Estados do Fluxo
    const [step, setStep] = useState<'identity' | 'profile' | 'course' | 'success'>('identity');
    const [isLoadingUser, setIsLoadingUser] = useState(false);
    const [existingMember, setExistingMember] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Dados do Formulário
    const [formData, setFormData] = useState({
        email: '',
        name: '',
        phone: '',
        cpf: '',
        courseId: searchParams.get('courseId') || '',
    });

    const handleCheckEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.email.includes('@')) {
            toast({ variant: 'destructive', title: "E-mail inválido" });
            return;
        }

        setIsLoadingUser(true);
        try {
            const q = query(collection(firestore!, 'users'), where('email', '==', formData.email.toLowerCase().trim()));
            const snap = await getDocs(q);
            
            if (!snap.empty) {
                const userData = snap.docs[0].data();
                setExistingMember({ id: snap.docs[0].id, ...userData });
                setFormData(p => ({ ...p, name: userData.name, phone: userData.phone || '', cpf: userData.cpf || '' }));
                setStep('course'); // Pula perfil se já existe
                toast({ title: `Olá, ${userData.name}!`, description: "Reconhecemos seu cadastro. Escolha seu curso abaixo." });
            } else {
                setExistingMember(null);
                setStep('profile'); // Vai para cadastro se não existe
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoadingUser(false);
        }
    };

    const handleProfileSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.phone) {
            toast({ variant: 'destructive', title: "Preencha os campos obrigatórios." });
            return;
        }
        setStep('course');
    };

    const handleFinalSubmit = async (selectedCourseId: string) => {
        setIsSubmitting(true);
        try {
            let finalUserId = existingMember?.id;

            // 1. Criar usuário se for novo
            if (!finalUserId) {
                const userRef = await addDoc(collection(firestore!, 'users'), {
                    name: formData.name,
                    email: formData.email.toLowerCase().trim(),
                    phone: formData.phone,
                    cpf: formData.cpf,
                    integrationStatus: 'nao_alcancado',
                    createdAt: Timestamp.now()
                });
                finalUserId = userRef.id;
            }

            // 2. Registrar solicitação de inscrição
            await addDoc(collection(firestore!, 'enrollment_requests'), {
                userId: finalUserId,
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                courseId: selectedCourseId,
                status: 'pending',
                createdAt: Timestamp.now()
            });

            setStep('success');
        } catch (e) {
            toast({ variant: 'destructive', title: "Erro ao processar inscrição." });
        } finally {
            setIsSubmitting(false);
        }
    };

    const getCourseLabel = (course: any) => {
        if (course.ebdTrack === 'teologico') return "Fase Buscar | 12/03 a 16/04 às 09h00";
        if (course.ebdTrack === 'biblico' || course.ebdTrack === 'discipulado') return "Todo domingo às 09h00";
        return null;
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-4">
            <div className="w-full max-w-xl space-y-8">
                <div className="flex flex-col items-center gap-4 text-center">
                    <Logo className="size-12 text-primary" />
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase italic">
                        Inscrição em Cursos IBM
                    </h1>
                    <div className="flex items-center gap-2">
                        {[1, 2, 3].map(i => (
                            <div key={i} className={cn(
                                "h-1.5 w-12 rounded-full transition-all duration-500",
                                (i === 1 && step === 'identity') || (i === 2 && step === 'profile') || (i === 3 && step === 'course') ? "bg-primary w-20" : "bg-slate-200"
                            )} />
                        ))}
                    </div>
                </div>

                {step === 'identity' && (
                    <Card className="shadow-2xl border-none animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <CardHeader>
                            <CardTitle>Identificação</CardTitle>
                            <CardDescription>Insira seu e-mail para começarmos. Se você já tem cadastro, nós te reconheceremos.</CardDescription>
                        </CardHeader>
                        <form onSubmit={handleCheckEmail}>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">E-mail Principal *</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-3 size-4 text-muted-foreground" />
                                        <Input 
                                            id="email" 
                                            type="email" 
                                            required 
                                            value={formData.email} 
                                            onChange={e => setFormData(p => ({...p, email: e.target.value}))}
                                            className="pl-10 h-11"
                                            placeholder="seu@email.com"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button type="submit" className="w-full h-12 font-bold text-base" disabled={isLoadingUser}>
                                    {isLoadingUser ? <Loader2 className="animate-spin mr-2" /> : "Continuar"}
                                    <ArrowRight className="ml-2 size-4" />
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>
                )}

                {step === 'profile' && (
                    <Card className="shadow-2xl border-none animate-in slide-in-from-right-4 duration-500">
                        <CardHeader>
                            <CardTitle>Seus Dados</CardTitle>
                            <CardDescription>Parece que é sua primeira vez por aqui! Complete seu perfil.</CardDescription>
                        </CardHeader>
                        <form onSubmit={handleProfileSubmit}>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Nome Completo *</Label>
                                    <Input id="name" required value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} className="h-11" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">WhatsApp *</Label>
                                        <Input id="phone" required value={formData.phone} onChange={e => setFormData(p => ({...p, phone: e.target.value}))} className="h-11" placeholder="(21) 99999-9999" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="cpf">CPF</Label>
                                        <Input id="cpf" value={formData.cpf} onChange={e => setFormData(p => ({...p, cpf: e.target.value}))} className="h-11" />
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="flex gap-3">
                                <Button type="button" variant="outline" onClick={() => setStep('identity')}>Voltar</Button>
                                <Button type="submit" className="flex-1 h-12 font-bold text-base">Continuar para Cursos</Button>
                            </CardFooter>
                        </form>
                    </Card>
                )}

                {step === 'course' && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                        <div className="flex justify-between items-center px-2">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <GraduationCap className="text-primary" />
                                Escolha seu Curso
                            </h2>
                            <Button variant="ghost" size="sm" onClick={() => setStep(existingMember ? 'identity' : 'profile')}>
                                <ArrowLeft className="mr-2 size-3" /> Alterar Dados
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            {isLoadingCourses ? (
                                <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>
                            ) : (
                                allCourses?.map(course => (
                                    <Card key={course.id} className="group hover:border-primary/50 transition-all cursor-pointer overflow-hidden shadow-sm" onClick={() => handleFinalSubmit(course.id)}>
                                        <CardContent className="p-0">
                                            <div className="flex flex-col sm:flex-row">
                                                <div className="w-full sm:w-32 h-24 bg-muted relative shrink-0">
                                                    <BookOpen className="absolute inset-0 m-auto text-muted-foreground/30 size-8" />
                                                </div>
                                                <div className="p-4 flex-1 flex flex-col justify-center">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <Badge variant="outline" className="text-[9px] uppercase font-black">{course.ministryName}</Badge>
                                                        {getCourseLabel(course) && (
                                                            <Badge className="bg-primary/10 text-primary border-none text-[9px] font-black uppercase">
                                                                {getCourseLabel(course)}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <h3 className="font-bold text-slate-900 group-hover:text-primary transition-colors">{course.name}</h3>
                                                    <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{course.description}</p>
                                                </div>
                                                <div className="p-4 flex items-center justify-center bg-slate-50 group-hover:bg-primary/5 transition-colors border-l shrink-0">
                                                    {isSubmitting ? <Loader2 className="animate-spin size-5" /> : <ArrowRight className="size-5 text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {step === 'success' && (
                    <Card className="shadow-2xl border-none text-center p-8 animate-in zoom-in-95 duration-500">
                        <CardContent className="space-y-6 pt-6">
                            <div className="size-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-lg">
                                <CheckCircle2 size={48} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 uppercase italic">Inscrição Recebida!</h2>
                                <p className="text-muted-foreground mt-2">
                                    Obrigado por seu interesse, <strong>{formData.name}</strong>. Sua solicitação foi protocolada e a coordenação do curso entrará em contato em breve via WhatsApp.
                                </p>
                            </div>
                            <Button asChild className="w-full h-12 font-bold" variant="outline">
                                <a href="/">Voltar ao Site</a>
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}

export default function EnrollmentPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>}>
            <EnrollmentFlow />
        </Suspense>
    );
}
