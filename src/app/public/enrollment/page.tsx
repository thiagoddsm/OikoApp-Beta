
'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useFirebase, useCollection, useMemoFirebase, setDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { collection, query, where, getDocs, Timestamp, doc } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithRedirect, GoogleAuthProvider, getRedirectResult } from 'firebase/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, CheckCircle, UserPlus, LogIn, Search, Mail, Key } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/icons';

// --- TYPES ---
type Course = { id: string; name: string; ministryName: string };
type Class = { id: string; courseId: string; name: string; dayOfWeek: string; startTime: string };

function EnrollmentPortalContent() {
    const { firestore, auth, user, isUserLoading } = useFirebase();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const initialCourseId = searchParams.get('courseId') || '';

    // Flow State
    const [step, setStep] = useState<'id' | 'auth' | 'form' | 'success'>('id');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isNewUser, setIsNewUser] = useState(false);
    const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form Data
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        cpf: '',
        dataNascimento: '',
        sexo: '',
        courseId: initialCourseId,
        classId: '',
    });

    // Data Fetching
    const coursesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'courses')) : null, [firestore]);
    const { data: courses } = useCollection<Course>(coursesQuery);

    const classesQuery = useMemoFirebase(() => {
        if (!firestore || !formData.courseId) return null;
        return query(collection(firestore, 'classes'), where('courseId', '==', formData.courseId));
    }, [firestore, formData.courseId]);
    const { data: classes } = useCollection<Class>(classesQuery);

    // Handle Redirect Result (Google Login)
    useEffect(() => {
        if (auth && !user) {
            getRedirectResult(auth).catch((error) => {
                console.error("Erro no redirecionamento do Google:", error);
            });
        }
    }, [auth, user]);

    // If user is already logged in, skip to form
    useEffect(() => {
        if (user && step !== 'success') {
            setFormData(prev => ({ 
                ...prev, 
                name: user.displayName || prev.name,
                email: user.email || prev.email 
            }));
            setStep('form');
        }
    }, [user, step]);

    // --- STEP 1: VERIFY EMAIL ---
    const handleVerifyEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !firestore) return;

        setIsVerifyingEmail(true);
        try {
            const usersRef = collection(firestore, 'users');
            const q = query(usersRef, where('email', '==', email.toLowerCase().trim()));
            const querySnapshot = await getDocs(q);

            setIsNewUser(querySnapshot.empty);
            setStep('auth');
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao verificar e-mail.' });
        } finally {
            setIsVerifyingEmail(false);
        }
    };

    // --- STEP 2: AUTHENTICATION ---
    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth) return;

        setIsAuthenticating(true);
        try {
            if (isNewUser) {
                await createUserWithEmailAndPassword(auth, email, password);
                toast({ title: 'Bem-vindo!', description: 'Sua conta foi criada com sucesso.' });
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
        } catch (error: any) {
            const msg = error.code === 'auth/wrong-password' ? 'Senha incorreta.' : 'Falha na autenticação.';
            toast({ variant: 'destructive', title: 'Erro', description: msg });
        } finally {
            setIsAuthenticating(false);
        }
    };

    const handleGoogleLogin = () => {
        if (!auth) return;
        const provider = new GoogleAuthProvider();
        signInWithRedirect(auth, provider);
    };

    // --- STEP 3: ENROLLMENT FORM ---
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmitEnrollment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !firestore) return;

        setIsSubmitting(true);
        try {
            // 1. Sync User Profile
            const userDocRef = doc(firestore, 'users', user.uid);
            await setDocumentNonBlocking(userDocRef, {
                name: formData.name,
                phone: formData.phone,
                cpf: formData.cpf,
                dataNascimento: formData.dataNascimento,
                sexo: formData.sexo,
                email: user.email,
                updatedAt: Timestamp.now()
            }, { merge: true });

            // 2. Create Enrollment Request
            const requestsRef = collection(firestore, 'enrollment_requests');
            await addDocumentNonBlocking(requestsRef, {
                userId: user.uid,
                name: formData.name,
                email: user.email,
                phone: formData.phone,
                cpf: formData.cpf,
                dataNascimento: formData.dataNascimento,
                sexo: formData.sexo,
                courseId: formData.courseId,
                classId: formData.classId,
                status: 'pending',
                createdAt: Timestamp.now()
            });

            setStep('success');
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro no Envio', description: 'Não foi possível completar sua inscrição.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- RENDERERS ---
    if (isUserLoading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
    }

    if (step === 'success') {
        return (
            <Card className="w-full max-w-md mx-auto mt-20 text-center">
                <CardHeader>
                    <div className="mx-auto bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle className="text-green-600 size-8" />
                    </div>
                    <CardTitle className="text-2xl">Inscrição Recebida!</CardTitle>
                    <CardDescription>
                        Obrigado, {formData.name.split(' ')[0]}! Sua solicitação foi enviada para a secretaria da igreja. Em breve entraremos em contato.
                    </CardDescription>
                </CardHeader>
                <CardFooter>
                    <Button className="w-full" variant="outline" onClick={() => window.location.reload()}>Fazer outra inscrição</Button>
                </CardFooter>
            </Card>
        );
    }

    return (
        <main className="min-h-screen bg-muted/30 p-4 flex items-center justify-center">
            <div className="w-full max-w-md space-y-6">
                <div className="flex justify-center items-center gap-2 mb-2">
                    <Logo className="h-8 w-8 text-primary" />
                    <h1 className="text-3xl font-bold">OikoApp</h1>
                </div>

                {step === 'id' && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Inscrição em Cursos</CardTitle>
                            <CardDescription>Para começar, informe seu e-mail de cadastro.</CardDescription>
                        </CardHeader>
                        <form onSubmit={handleVerifyEmail}>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Seu E-mail</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-3 size-4 text-muted-foreground" />
                                        <Input 
                                            id="email" 
                                            type="email" 
                                            className="pl-10"
                                            placeholder="exemplo@email.com" 
                                            value={email} 
                                            onChange={e => setEmail(e.target.value)} 
                                            required 
                                        />
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button type="submit" className="w-full" disabled={isVerifyingEmail}>
                                    {isVerifyingEmail ? <Loader2 className="animate-spin mr-2" /> : <Search className="mr-2" />}
                                    Verificar Cadastro
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>
                )}

                {step === 'auth' && (
                    <Card className={isNewUser ? "border-amber-200" : ""}>
                        <CardHeader>
                            <CardTitle>{isNewUser ? "Cadastro não encontrado" : "Bem-vindo de volta!"}</CardTitle>
                            <CardDescription>
                                {isNewUser 
                                    ? "Não localizamos seu e-mail. Crie uma senha para continuar." 
                                    : "Localizamos seu cadastro. Digite sua senha para entrar."}
                            </CardDescription>
                        </CardHeader>
                        <form onSubmit={handleAuth}>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="password">Sua Senha</Label>
                                    <div className="relative">
                                        <Key className="absolute left-3 top-3 size-4 text-muted-foreground" />
                                        <Input 
                                            id="password" 
                                            type="password" 
                                            className="pl-10"
                                            value={password} 
                                            onChange={e => setPassword(e.target.value)} 
                                            required 
                                            minLength={6}
                                        />
                                    </div>
                                </div>
                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Ou continue com</span></div>
                                </div>
                                <Button type="button" variant="outline" className="w-full" onClick={handleGoogleLogin}>
                                    Entrar com Google
                                </Button>
                            </CardContent>
                            <CardFooter className="flex flex-col gap-2">
                                <Button type="submit" className="w-full" disabled={isAuthenticating}>
                                    {isAuthenticating ? <Loader2 className="animate-spin mr-2" /> : (isNewUser ? <UserPlus className="mr-2" /> : <LogIn className="mr-2" />)}
                                    {isNewUser ? "Cadastre-se e Continuar" : "Entrar e Continuar"}
                                </Button>
                                <Button type="button" variant="link" className="text-xs" onClick={() => setStep('id')}>Usar outro e-mail</Button>
                            </CardFooter>
                        </form>
                    </Card>
                )}

                {step === 'form' && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Dados da Matrícula</CardTitle>
                            <CardDescription>Olá, {user?.displayName || 'aluno'}! Complete os dados abaixo.</CardDescription>
                        </CardHeader>
                        <form onSubmit={handleSubmitEnrollment}>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Nome Completo</Label>
                                    <Input id="name" name="name" value={formData.name} onChange={handleInputChange} required />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="cpf">CPF</Label>
                                        <Input id="cpf" name="cpf" placeholder="000.000.000-00" value={formData.cpf} onChange={handleInputChange} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">WhatsApp</Label>
                                        <Input id="phone" name="phone" type="tel" placeholder="(21) 9..." value={formData.phone} onChange={handleInputChange} required />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="dataNascimento">Data de Nascimento</Label>
                                        <Input id="dataNascimento" name="dataNascimento" type="date" value={formData.dataNascimento} onChange={handleInputChange} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Sexo</Label>
                                        <RadioGroup value={formData.sexo} onValueChange={(v) => setFormData(p => ({...p, sexo: v}))} className="flex gap-4 mt-2">
                                            <div className="flex items-center space-x-2"><RadioGroupItem value="M" id="m" /><Label htmlFor="m">M</Label></div>
                                            <div className="flex items-center space-x-2"><RadioGroupItem value="F" id="f" /><Label htmlFor="f">F</Label></div>
                                        </RadioGroup>
                                    </div>
                                </div>

                                <div className="space-y-2 pt-4 border-t">
                                    <Label htmlFor="courseId">Curso de Interesse</Label>
                                    <Select value={formData.courseId} onValueChange={(v) => setFormData(p => ({...p, courseId: v, classId: ''}))}>
                                        <SelectTrigger id="courseId"><SelectValue placeholder="Selecione o curso..." /></SelectTrigger>
                                        <SelectContent>
                                            {courses?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {formData.courseId && (
                                    <div className="space-y-2">
                                        <Label htmlFor="classId">Turma Desejada</Label>
                                        <Select value={formData.classId} onValueChange={(v) => setFormData(p => ({...p, classId: v}))}>
                                            <SelectTrigger id="classId"><SelectValue placeholder="Selecione o horário..." /></SelectTrigger>
                                            <SelectContent>
                                                {classes?.map(cls => (
                                                    <SelectItem key={cls.id} value={cls.id}>{cls.name} ({cls.dayOfWeek} às {cls.startTime})</SelectItem>
                                                ))}
                                                {classes?.length === 0 && <SelectItem value="none" disabled>Nenhuma turma aberta</SelectItem>}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter>
                                <Button type="submit" className="w-full" disabled={isSubmitting || !formData.classId}>
                                    {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle className="mr-2" />}
                                    Finalizar Inscrição
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>
                )}
            </div>
        </main>
    );
}

export default function EnrollmentPortalPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>}>
            <EnrollmentPortalContent />
        </Suspense>
    );
}
