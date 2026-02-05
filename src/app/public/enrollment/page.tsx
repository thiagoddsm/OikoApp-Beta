
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useFirebase, useCollection, useMemoFirebase, initiateEmailSignIn, initiateEmailSignUp } from '@/firebase';
import { collection, query, where, Timestamp, getDocs, limit, doc, setDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CheckCircle, Mail, User, Phone, BookOpen, LogIn, UserPlus, Key } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/icons';
import { GoogleAuthProvider, signInWithRedirect, getRedirectResult } from 'firebase/auth';

type Step = 'identify' | 'authenticate' | 'enroll' | 'success';

function EnrollmentPortalContent() {
    const searchParams = useSearchParams();
    const { firestore, auth, user, isUserLoading } = useFirebase();
    const { toast } = useToast();

    // State
    const [step, setStep] = useState<Step>('identify');
    const [isProcessing, setIsProcessing] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [userExists, setUserExists] = useState(false);
    
    // Enrollment Form State
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        courseId: searchParams.get('courseId') || '',
        classId: '',
    });

    // Queries
    const coursesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'courses')) : null, [firestore]);
    const { data: courses, isLoading: isLoadingCourses } = useCollection(coursesQuery);

    const classesQuery = useMemoFirebase(() => {
        if (!firestore || !formData.courseId) return null;
        return query(collection(firestore, 'classes'), where('courseId', '==', formData.courseId));
    }, [firestore, formData.courseId]);
    const { data: classes, isLoading: isLoadingClasses } = useCollection(classesQuery);

    // Handle Google Redirect Result on Mount
    useEffect(() => {
        if (!auth) return;
        getRedirectResult(auth).then((result) => {
            if (result?.user) {
                handlePostAuth(result.user);
            }
        }).catch(err => {
            console.error("Auth error:", err);
        });
    }, [auth]);

    // Transition to enroll step if user is logged in
    useEffect(() => {
        if (user && step !== 'success') {
            setFormData(prev => ({ ...prev, name: user.displayName || '', email: user.email || '' }));
            setStep('enroll');
        }
    }, [user]);

    const handlePostAuth = async (authUser: any) => {
        if (!firestore) return;
        const userRef = doc(firestore, 'users', authUser.uid);
        // Create user profile if it doesn't exist
        await setDoc(userRef, {
            name: authUser.displayName || 'Novo Aluno',
            email: authUser.email || '',
            createdAt: Timestamp.now(),
            integrationStatus: 'visitante_celula',
            hierarchy: { role: 'member' }
        }, { merge: true });
    };

    const handleIdentify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !firestore) return;
        setIsProcessing(true);

        try {
            const q = query(collection(firestore, 'users'), where('email', '==', email), limit(1));
            const snap = await getDocs(q);
            setUserExists(!snap.empty);
            setStep('authenticate');
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao verificar e-mail.' });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth) return;
        setIsProcessing(true);

        if (!userExists && password !== confirmPassword) {
            toast({ variant: 'destructive', title: 'Erro', description: 'As senhas não coincidem.' });
            setIsProcessing(false);
            return;
        }

        try {
            if (userExists) {
                initiateEmailSignIn(auth, email, password);
            } else {
                initiateEmailSignUp(auth, email, password);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Erro na autenticação', description: error.message });
            setIsProcessing(false);
        }
    };

    const handleGoogleLogin = () => {
        if (!auth) return;
        setIsProcessing(true);
        const provider = new GoogleAuthProvider();
        signInWithRedirect(auth, provider);
    };

    const handleEnrollment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firestore || !user) return;
        setIsProcessing(true);

        try {
            const requestsRef = collection(firestore, 'enrollment_requests');
            await setDoc(doc(requestsRef), {
                ...formData,
                email: user.email,
                status: 'pending',
                createdAt: Timestamp.now(),
            });
            setStep('success');
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível salvar sua inscrição.' });
        } finally {
            setIsProcessing(false);
        }
    };

    if (isUserLoading || isLoadingCourses) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <Loader2 className="animate-spin text-primary size-10" />
                <p className="mt-4 text-muted-foreground font-medium">Carregando portal...</p>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6">
            <div className="w-full max-w-md space-y-8">
                <div className="flex flex-col items-center text-center">
                    <Logo className="size-12 text-primary mb-4" />
                    <h1 className="text-3xl font-black tracking-tight text-slate-900">IBM College</h1>
                    <p className="text-slate-500 mt-2">Sua jornada de crescimento começa aqui.</p>
                </div>

                {step === 'identify' && (
                    <Card className="shadow-xl border-none">
                        <form onSubmit={handleIdentify}>
                            <CardHeader>
                                <CardTitle className="text-xl">Identificação</CardTitle>
                                <CardDescription>Insira seu e-mail para continuar com a inscrição.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="email">E-mail</Label>
                                        <Input 
                                            id="email" 
                                            type="email" 
                                            placeholder="seu@email.com" 
                                            value={email} 
                                            onChange={e => setEmail(e.target.value)} 
                                            required 
                                        />
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button type="submit" className="w-full" disabled={isProcessing}>
                                    {isProcessing ? <Loader2 className="animate-spin mr-2" /> : <LogIn className="mr-2 size-4" />}
                                    Continuar
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>
                )}

                {step === 'authenticate' && (
                    <Card className="shadow-xl border-none">
                        <form onSubmit={handleEmailAuth}>
                            <CardHeader>
                                <CardTitle className="text-xl">
                                    {userExists ? 'Bem-vindo de volta!' : 'Criar sua conta'}
                                </CardTitle>
                                <CardDescription>
                                    {userExists 
                                        ? 'Identificamos seu cadastro. Digite sua senha para acessar.' 
                                        : 'Não encontramos seu e-mail. Defina uma senha para se cadastrar.'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="pass">Senha</Label>
                                    <div className="relative">
                                        <Key className="absolute left-3 top-3 size-4 text-muted-foreground" />
                                        <Input 
                                            id="pass" 
                                            type="password" 
                                            className="pl-9"
                                            value={password} 
                                            onChange={e => setPassword(e.target.value)} 
                                            required 
                                        />
                                    </div>
                                </div>
                                {!userExists && (
                                    <div className="space-y-2">
                                        <Label htmlFor="conf">Confirmar Senha</Label>
                                        <Input 
                                            id="conf" 
                                            type="password" 
                                            value={confirmPassword} 
                                            onChange={e => setConfirmPassword(e.target.value)} 
                                            required 
                                        />
                                    </div>
                                )}
                                
                                <div className="relative py-2">
                                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                                    <div className="relative flex justify-center text-xs uppercase">
                                        <span className="bg-background px-2 text-muted-foreground">Ou use sua conta</span>
                                    </div>
                                </div>

                                <Button type="button" variant="outline" className="w-full" onClick={handleGoogleLogin} disabled={isProcessing}>
                                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                    </svg>
                                    Entrar com Google
                                </Button>
                            </CardContent>
                            <CardFooter className="flex flex-col gap-3">
                                <Button type="submit" className="w-full" disabled={isProcessing}>
                                    {isProcessing && <Loader2 className="animate-spin mr-2" />}
                                    {userExists ? 'Entrar' : 'Cadastrar e Continuar'}
                                </Button>
                                <Button type="button" variant="ghost" className="w-full text-xs" onClick={() => setStep('identify')}>
                                    Usar outro e-mail
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>
                )}

                {step === 'enroll' && (
                    <Card className="shadow-xl border-none">
                        <form onSubmit={handleEnrollment}>
                            <CardHeader>
                                <CardTitle className="text-xl">Formulário de Inscrição</CardTitle>
                                <CardDescription>Olá, {user?.displayName || 'aluno'}! Complete os dados abaixo para sua matrícula.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Nome Completo</Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-3 size-4 text-muted-foreground" />
                                        <Input 
                                            id="name" 
                                            className="pl-9"
                                            value={formData.name} 
                                            onChange={e => setFormData(p => ({...p, name: e.target.value}))} 
                                            required 
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">WhatsApp</Label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-3 size-4 text-muted-foreground" />
                                        <Input 
                                            id="phone" 
                                            className="pl-9"
                                            placeholder="(21) 9..."
                                            value={formData.phone} 
                                            onChange={e => setFormData(p => ({...p, phone: e.target.value}))} 
                                            required 
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="course">Curso</Label>
                                    <Select value={formData.courseId} onValueChange={v => setFormData(p => ({...p, courseId: v, classId: ''}))}>
                                        <SelectTrigger id="course">
                                            <SelectValue placeholder="Selecione o curso" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {courses?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {formData.courseId && (
                                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                        <Label htmlFor="class">Turma Preferencial (Opcional)</Label>
                                        <Select value={formData.classId} onValueChange={v => setFormData(p => ({...p, classId: v}))}>
                                            <SelectTrigger id="class">
                                                <SelectValue placeholder="Selecione uma turma" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="null">A definir</SelectItem>
                                                {classes?.map(c => <SelectItem key={c.id} value={c.id}>{c.name} ({c.dayOfWeek} às {c.startTime})</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter>
                                <Button type="submit" className="w-full" disabled={isProcessing || !formData.courseId}>
                                    {isProcessing ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle className="mr-2 size-4" />}
                                    Concluir Inscrição
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>
                )}

                {step === 'success' && (
                    <Card className="shadow-xl border-none text-center p-8">
                        <div className="bg-emerald-100 text-emerald-600 size-16 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle size={32} />
                        </div>
                        <CardTitle className="text-2xl font-bold text-slate-900">Inscrição Recebida!</CardTitle>
                        <CardContent className="px-0 pt-4">
                            <p className="text-slate-600 leading-relaxed">
                                Obrigado, <strong>{formData.name}</strong>! Sua solicitação para o curso foi enviada com sucesso.
                            </p>
                            <p className="text-slate-500 mt-4 text-sm">
                                Nossa equipe pedagógica entrará em contato em breve via WhatsApp para confirmar sua matrícula e turma.
                            </p>
                        </CardContent>
                        <CardFooter className="px-0 pt-6">
                            <Button variant="outline" className="w-full" onClick={() => window.location.reload()}>
                                Fazer outra inscrição
                            </Button>
                        </CardFooter>
                    </Card>
                )}
            </div>
        </main>
    );
}

export default function EnrollmentPortal() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin" /></div>}>
            <EnrollmentPortalContent />
        </Suspense>
    );
}
