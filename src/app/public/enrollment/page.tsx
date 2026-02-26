
'use client';

import React, { useState, useMemo, Suspense } from 'react';
import { useFirebase, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2, GraduationCap, ArrowRight, User, BookOpen, AlertCircle, Mail, Phone, Fingerprint } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/icons';
import Link from 'next/link';

type Course = {
    id: string;
    name: string;
    description: string;
    ministryName: string;
    ebdTrack?: 'teologico' | 'biblico' | 'discipulado';
};

function EnrollmentForm() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [step, setStep] = useState(1);
    const [isLoadingUser, setIsLoadingUser] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const [formData, setFormData] = useState({
        email: '',
        name: '',
        phone: '',
        cpf: '',
        courseId: '',
        userId: '',
    });

    const coursesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'courses')) : null, [firestore]);
    const { data: courses, isLoading: isLoadingCourses } = useCollection<Course>(coursesQuery);

    const handleCheckEmail = async () => {
        if (!formData.email || !formData.email.includes('@')) {
            toast({ variant: 'destructive', title: 'E-mail inválido', description: 'Por favor, insira um e-mail válido.' });
            return;
        }

        setIsLoadingUser(true);
        try {
            const usersRef = collection(firestore!, 'users');
            const q = query(usersRef, where('email', '==', formData.email.trim().toLowerCase()));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const existingUser = querySnapshot.docs[0];
                const userData = existingUser.data();
                setFormData(prev => ({ 
                    ...prev, 
                    name: userData.name, 
                    userId: existingUser.id,
                    phone: userData.phone || prev.phone,
                    cpf: userData.cpf || prev.cpf
                }));
                toast({ title: `Olá, ${userData.name}!`, description: 'Identificamos seu cadastro. Vamos direto para a escolha do curso.' });
                setStep(3); // Pula para escolha do curso
            } else {
                setStep(2); // Vai para preenchimento de dados
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro na busca', description: 'Não foi possível verificar seu cadastro.' });
        } finally {
            setIsLoadingUser(false);
        }
    };

    const handleNextStep = () => {
        if (step === 2 && (!formData.name || !formData.phone)) {
            toast({ variant: 'destructive', title: 'Campos obrigatórios', description: 'Nome e Telefone são necessários.' });
            return;
        }
        setStep(prev => prev + 1);
    };

    const handleSubmit = async () => {
        if (!formData.courseId) {
            toast({ variant: 'destructive', title: 'Selecione um curso', description: 'Você precisa escolher qual curso deseja cursar.' });
            return;
        }

        setIsSubmitting(true);
        try {
            let finalUserId = formData.userId;

            // Se for novo usuário, criamos o registro básico
            if (!finalUserId) {
                const newUserRef = await addDocumentNonBlocking(collection(firestore!, 'users'), {
                    name: formData.name,
                    email: formData.email.trim().toLowerCase(),
                    phone: formData.phone,
                    cpf: formData.cpf,
                    integrationStatus: 'nao_alcancado',
                    createdAt: Timestamp.now(),
                });
                finalUserId = newUserRef.id;
            }

            // Criamos a solicitação de inscrição
            await addDocumentNonBlocking(collection(firestore!, 'enrollment_requests'), {
                userId: finalUserId,
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                courseId: formData.courseId,
                status: 'pending',
                createdAt: Timestamp.now(),
            });

            setIsSuccess(true);
            toast({ title: 'Solicitação enviada!', description: 'Em breve você receberá o retorno da coordenação.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Falha na inscrição', description: 'Ocorreu um erro ao processar sua matrícula.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const getCourseLabel = (course: Course) => {
        if (course.ebdTrack === 'teologico') return "Durante a Fase Buscar | 1ª Edição: 12/03 a 16/04 às 09h00";
        if (course.ebdTrack === 'biblico' || course.ebdTrack === 'discipulado') return "Todo domingo às 09h00";
        return null;
    };

    if (isSuccess) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center animate-in zoom-in-95 duration-500">
                <div className="size-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-lg">
                    <CheckCircle2 size={48} />
                </div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Inscrição Protocolada!</h2>
                <p className="text-slate-600 max-w-md mt-4 text-lg">
                    Obrigado, <strong>{formData.name}</strong>! Sua solicitação foi enviada para a coordenação. Em breve entraremos em contato via WhatsApp ou E-mail.
                </p>
                <Button className="mt-10 h-12 px-8 rounded-full font-bold shadow-xl" asChild>
                    <Link href="/">Voltar ao Site</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Indicador de Progresso */}
            <div className="flex justify-between max-w-xs mx-auto mb-8">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="flex flex-col items-center gap-2">
                        <div className={cn(
                            "size-8 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                            step >= i ? "bg-primary text-white shadow-lg" : "bg-muted text-muted-foreground"
                        )}>{i}</div>
                        <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">
                            {i === 1 ? 'ID' : i === 2 ? 'Dados' : 'Curso'}
                        </span>
                    </div>
                ))}
            </div>

            {/* Passo 1: Identificação por E-mail */}
            {step === 1 && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                    <div className="text-center">
                        <h3 className="text-xl font-bold text-slate-900">Comece pelo seu e-mail</h3>
                        <p className="text-sm text-muted-foreground mt-1">Isso nos ajuda a encontrar seu cadastro na IBM.</p>
                    </div>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="font-bold flex items-center gap-2"><Mail size={14}/> E-mail Principal *</Label>
                            <Input 
                                id="email" 
                                type="email" 
                                placeholder="seu@email.com" 
                                className="h-12 text-lg shadow-inner"
                                value={formData.email}
                                onChange={e => setFormData(p => ({...p, email: e.target.value}))}
                                onKeyDown={e => e.key === 'Enter' && handleCheckEmail()}
                            />
                        </div>
                        <Button className="w-full h-12 text-base font-black shadow-lg" onClick={handleCheckEmail} disabled={isLoadingUser}>
                            {isLoadingUser ? <Loader2 className="animate-spin mr-2" /> : <ArrowRight className="mr-2" />}
                            Continuar Inscrição
                        </Button>
                    </div>
                </div>
            )}

            {/* Passo 2: Dados Pessoais (Apenas novos) */}
            {step === 2 && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                    <div className="text-center">
                        <h3 className="text-xl font-bold text-slate-900">Complete seu Perfil</h3>
                        <p className="text-sm text-muted-foreground mt-1">Parece que este é seu primeiro acesso!</p>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="font-bold flex items-center gap-2"><User size={14}/> Nome Completo *</Label>
                            <Input id="name" value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} placeholder="Como quer ser chamado?" className="h-11" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="phone" className="font-bold flex items-center gap-2"><Phone size={14}/> WhatsApp *</Label>
                                <Input id="phone" value={formData.phone} onChange={e => setFormData(p => ({...p, phone: e.target.value}))} placeholder="(99) 99999-9999" className="h-11" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="cpf" className="font-bold flex items-center gap-2"><Fingerprint size={14}/> CPF</Label>
                                <Input id="cpf" value={formData.cpf} onChange={e => setFormData(p => ({...p, cpf: e.target.value}))} placeholder="000.000.000-00" className="h-11" />
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" className="flex-1 h-11 font-bold" onClick={() => setStep(1)}>Voltar</Button>
                        <Button className="flex-[2] h-11 font-black shadow-lg" onClick={handleNextStep}>Continuar para Cursos</Button>
                    </div>
                </div>
            )}

            {/* Passo 3: Seleção de Curso */}
            {step === 3 && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                    <div className="text-center">
                        <h3 className="text-xl font-bold text-slate-900">Escolha o seu Curso</h3>
                        <p className="text-sm text-muted-foreground mt-1">Selecione uma das opções abaixo para iniciar sua jornada.</p>
                    </div>
                    
                    <ScrollArea className="h-[400px] pr-4">
                        <div className="space-y-3">
                            {isLoadingCourses ? (
                                <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                            ) : courses?.map(course => {
                                const label = getCourseLabel(course);
                                return (
                                    <button
                                        key={course.id}
                                        type="button"
                                        onClick={() => setFormData(p => ({...p, courseId: course.id}))}
                                        className={cn(
                                            "w-full p-4 rounded-2xl border-2 text-left transition-all group",
                                            formData.courseId === course.id 
                                                ? "border-primary bg-primary/5 ring-4 ring-primary/10" 
                                                : "border-slate-100 hover:border-slate-300 bg-white"
                                        )}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-[10px] font-black uppercase text-primary/60 tracking-widest">{course.ministryName}</span>
                                                    {label && (
                                                        <Badge variant="outline" className="text-[9px] h-4 font-black border-primary/20 bg-primary/5 text-primary uppercase">
                                                            {label}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <h4 className="font-bold text-slate-900 group-hover:text-primary transition-colors">{course.name}</h4>
                                                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{course.description}</p>
                                            </div>
                                            <div className={cn(
                                                "size-5 rounded-full border-2 shrink-0 ml-4 flex items-center justify-center transition-all",
                                                formData.courseId === course.id ? "border-primary bg-primary" : "border-slate-300"
                                            )}>
                                                {formData.courseId === course.id && <div className="size-2 bg-white rounded-full" />}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </ScrollArea>

                    <div className="flex gap-3 pt-4">
                        <Button variant="outline" className="flex-1 h-12 font-bold" onClick={() => setStep(formData.userId ? 1 : 2)}>Voltar</Button>
                        <Button className="flex-[2] h-12 font-black text-lg shadow-xl" onClick={handleSubmit} disabled={isSubmitting || !formData.courseId}>
                            {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <BookOpen className="mr-2" />}
                            Confirmar Inscrição
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function PublicEnrollmentPage() {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-2xl">
                <div className="flex flex-col items-center mb-8 gap-4">
                    <Logo className="size-12 text-primary" />
                    <div className="text-center">
                        <h1 className="text-3xl font-black text-slate-900 italic tracking-tighter">OikoApp Enrollment</h1>
                        <p className="text-muted-foreground font-medium">Jornada de Ensino & Integração IBM</p>
                    </div>
                </div>

                <Card className="shadow-2xl border-none overflow-hidden rounded-[2rem]">
                    <div className="bg-primary h-2 w-full" />
                    <CardHeader className="bg-white pb-2">
                        <CardTitle className="text-2xl font-black text-slate-900">Inscrição de Membros</CardTitle>
                        <CardDescription>Preencha os campos abaixo para garantir sua vaga.</CardDescription>
                    </CardHeader>
                    <CardContent className="bg-white">
                        <Suspense fallback={<div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>}>
                            <EnrollmentForm />
                        </Suspense>
                    </CardContent>
                    <CardFooter className="bg-slate-50 p-6 flex justify-center border-t">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                            <GraduationCap size={14} />
                            IBM Ensino • 2025
                        </div>
                    </CardFooter>
                </Card>

                <p className="text-center mt-8 text-xs text-muted-foreground">
                    Ao se inscrever, você concorda com o tratamento de seus dados para fins de gestão ministerial da IBM.
                </p>
            </div>
        </div>
    );
}
