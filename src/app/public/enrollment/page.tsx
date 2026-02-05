'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useFirebase, useCollection, useMemoFirebase, setDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc, Timestamp, getDoc } from 'firebase/firestore';
import { signInWithRedirect, GoogleAuthProvider, getRedirectResult, signInWithEmailAndPassword, createUserWithEmailAndPassword, fetchSignInMethodsForEmail } from 'firebase/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, CheckCircle, AlertCircle, LogIn, UserPlus, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/icons';

type Course = { id: string; name: string; ministryName: string; };
type Class = { id: string; name: string; courseId: string; dayOfWeek?: string; startTime?: string; };

function EnrollmentPortalContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { firestore, auth, user, isUserLoading } = useFirebase();
    const { toast } = useToast();

    // URL State
    const initialCourseId = searchParams.get('courseId') || '';

    // Form State
    const [step, setPhase] = useState<'identify' | 'auth' | 'form' | 'success'>('identify');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isNewUser, setIsNewUser] = useState(false);
    const [authLoading, setAuthLoading] = useState(false);
    
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        cpf: '',
        sexo: '',
        dataNascimento: '',
        courseId: initialCourseId,
        classId: '',
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Data Fetching
    const coursesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'courses')) : null, [firestore]);
    const { data: courses, isLoading: isLoadingCourses } = useCollection<Course>(coursesQuery);

    const classesQuery = useMemoFirebase(() => {
        if (!firestore || !formData.courseId) return null;
        return query(collection(firestore, 'classes'), where('courseId', '==', formData.courseId));
    }, [firestore, formData.courseId]);
    const { data: classes, isLoading: isLoadingClasses } = useCollection<Class>(classesQuery);

    // Auto-detect user and redirect result
    useEffect(() => {
        if (auth) {
            getRedirectResult(auth).catch(err => console.error("Redirect result error:", err));
        }
    }, [auth]);

    useEffect(() => {
        if (user && step !== 'success') {
            setPhase('form');
            setFormData(prev => ({
                ...prev,
                name: prev.name || user.displayName || '',
            }));
        }
    }, [user, step]);

    const handleCheckEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !auth) return;
        setAuthLoading(true);
        try {
            const methods = await fetchSignInMethodsForEmail(auth, email);
            setIsNewUser(methods.length === 0);
            setPhase('auth');
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao verificar e-mail.' });
        } finally {
            setAuthLoading(false);
        }
    };

    const handleGoogleLogin = () => {
        if (!auth) return;
        const provider = new GoogleAuthProvider();
        signInWithRedirect(auth, provider);
    };

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth) return;
        setAuthLoading(true);
        try {
            if (isNewUser) {
                await createUserWithEmailAndPassword(auth, email, password);
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Erro na Autenticação', description: 'Verifique sua senha ou tente novamente.' });
        } finally {
            setAuthLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !firestore) return;
        
        if (!formData.name || !formData.phone || !formData.cpf || !formData.courseId || !formData.classId) {
            toast({ variant: 'destructive', title: 'Campos obrigatórios', description: 'Por favor, preencha todos os dados.' });
            return;
        }

        setIsSubmitting(true);

        try {
            // 1. Create enrollment request
            const requestsCol = collection(firestore, 'enrollment_requests');
            await addDocumentNonBlocking(requestsCol, {
                ...formData,
                email: user.email,
                userId: user.uid,
                status: 'pending',
                createdAt: Timestamp.now(),
            });

            // 2. Update/Set User Profile (Resilient update)
            const userRef = doc(firestore, 'users', user.uid);
            await setDocumentNonBlocking(userRef, {
                name: formData.name,
                phone: formData.phone,
                cpf: formData.cpf,
                sexo: formData.sexo,
                dataNascimento: formData.dataNascimento,
                email: user.email,
                updatedAt: Timestamp.now(),
            }, { merge: true });

            setPhase('success');
            toast({ title: 'Sucesso!', description: 'Sua inscrição foi recebida com sucesso.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro ao salvar', description: 'Não foi possível completar sua inscrição.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isUserLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    if (step === 'success') {
        return (
            <div className="flex min-h-screen items-center justify-center p-4">
                <Card className="w-full max-w-md text-center border-t-8 border-green-500">
                    <CardHeader>
                        <div className="mx-auto bg-green-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mb-4">
                            <CheckCircle className="text-green-600 size-10" />
                        </div>
                        <CardTitle className="text-2xl">Inscrição Realizada!</CardTitle>
                        <CardDescription>
                            Parabéns, {formData.name}! Sua solicitação para o curso foi enviada com sucesso.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground text-sm">
                            Nossa equipe entrará em contato em breve através do WhatsApp fornecido ({formData.phone}) para confirmar os detalhes e materiais.
                        </p>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full" onClick={() => window.location.reload()}>Fazer outra inscrição</Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-4">
            <div className="mb-8 flex items-center gap-3">
                <Logo className="size-10 text-primary" />
                <h1 className="text-3xl font-bold">OikoApp</h1>
            </div>

            {step === 'identify' && (
                <Card className="w-full max-w-md shadow-xl">
                    <CardHeader>
                        <CardTitle>Inscrição em Cursos</CardTitle>
                        <CardDescription>Para começar, identifique-se com seu e-mail.</CardDescription>
                    </CardHeader>
                    <form onSubmit={handleCheckEmail}>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">E-mail</Label>
                                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required />
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col gap-4">
                            <Button type="submit" className="w-full" disabled={authLoading}>
                                {authLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Continuar
                            </Button>
                            <div className="relative w-full">
                                <div className="absolute inset-0 flex items-center"><span className="w-full border-t"></span></div>
                                <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Ou use sua conta</span></div>
                            </div>
                            <Button type="button" variant="outline" className="w-full" onClick={handleGoogleLogin}>
                                Entrar com Google
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            )}

            {step === 'auth' && (
                <Card className="w-full max-w-md shadow-xl border-t-4 border-primary">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            {isNewUser ? <UserPlus className="text-primary"/> : <LogIn className="text-primary"/>}
                            {isNewUser ? 'Criar sua conta' : 'Acesse sua conta'}
                        </CardTitle>
                        <CardDescription>
                            {isNewUser ? 'Não encontramos seu cadastro. Defina uma senha para continuar.' : 'Você já é cadastrado! Digite sua senha.'}
                        </CardDescription>
                    </CardHeader>
                    <form onSubmit={handleEmailAuth}>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>E-mail</Label>
                                <Input value={email} disabled className="bg-muted" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Senha</Label>
                                <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col gap-3">
                            <Button type="submit" className="w-full" disabled={authLoading}>
                                {authLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isNewUser ? 'Cadastrar e Continuar' : 'Entrar'}
                            </Button>
                            <Button type="button" variant="ghost" className="w-full text-xs" onClick={() => setPhase('identify')}>Usar outro e-mail</Button>
                        </CardFooter>
                    </form>
                </Card>
            )}

            {step === 'form' && (
                <Card className="w-full max-w-2xl shadow-xl">
                    <CardHeader className="bg-primary/5">
                        <CardTitle>Dados de Inscrição</CardTitle>
                        <CardDescription>Complete as informações abaixo para garantir sua vaga.</CardDescription>
                    </CardHeader>
                    <form onSubmit={handleSubmit}>
                        <CardContent className="space-y-6 pt-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Nome Completo</Label>
                                    <Input id="name" value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">WhatsApp</Label>
                                    <Input id="phone" value={formData.phone} onChange={e => setFormData(p => ({...p, phone: e.target.value}))} placeholder="(21) 9..." required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="cpf">CPF</Label>
                                    <Input id="cpf" value={formData.cpf} onChange={e => setFormData(p => ({...p, cpf: e.target.value}))} placeholder="000.000.000-00" required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="dataNascimento">Data de Nascimento</Label>
                                    <Input id="dataNascimento" type="date" value={formData.dataNascimento} onChange={e => setFormData(p => ({...p, dataNascimento: e.target.value}))} required />
                                </div>
                                <div className="space-y-2">
                                    <Label>Sexo</Label>
                                    <RadioGroup value={formData.sexo} onValueChange={v => setFormData(p => ({...p, sexo: v}))} className="flex gap-4 mt-2">
                                        <div className="flex items-center space-x-2"><RadioGroupItem value="M" id="sexo-m" /><Label htmlFor="sexo-m">Masc.</Label></div>
                                        <div className="flex items-center space-x-2"><RadioGroupItem value="F" id="sexo-f" /><Label htmlFor="sexo-f">Fem.</Label></div>
                                    </RadioGroup>
                                </div>
                            </div>

                            <div className="border-t pt-6 space-y-4">
                                <h3 className="font-bold flex items-center gap-2"><User className="size-4 text-primary" /> Escolha do Curso</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="courseId">Curso</Label>
                                        <Select value={formData.courseId} onValueChange={v => setFormData(p => ({...p, courseId: v, classId: ''}))}>
                                            <SelectTrigger id="courseId"><SelectValue placeholder="Selecione o curso" /></SelectTrigger>
                                            <SelectContent>
                                                {courses?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="classId">Turma Disponível</Label>
                                        <Select value={formData.classId} onValueChange={v => setFormData(p => ({...p, classId: v}))} disabled={!formData.courseId || isLoadingClasses}>
                                            <SelectTrigger id="classId"><SelectValue placeholder={isLoadingClasses ? "Buscando turmas..." : "Selecione o horário"} /></SelectTrigger>
                                            <SelectContent>
                                                {classes?.map(c => <SelectItem key={c.id} value={c.id}>{c.name} ({c.dayOfWeek} às {c.startTime})</SelectItem>)}
                                                {classes?.length === 0 && <SelectItem value="none" disabled>Nenhuma turma aberta</SelectItem>}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="bg-muted/30 pt-6">
                            <Button type="submit" className="w-full py-6 text-lg font-bold" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                                Concluir Inscrição
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            )}
        </div>
    );
}

export default function EnrollmentPortal() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary h-12 w-12" /></div>}>
            <EnrollmentPortalContent />
        </Suspense>
    );
}
