'use client';

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { 
    collection, 
    query, 
    where, 
    getDocs, 
    doc, 
    setDoc, 
    serverTimestamp, 
    Timestamp,
    addDoc 
} from 'firebase/firestore';
import { 
    signInWithRedirect, 
    GoogleAuthProvider, 
    getRedirectResult,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword
} from 'firebase/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CheckCircle, Mail, Lock, UserPlus, LogIn, Smartphone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/icons';

type Course = { id: string; name: string; ministryName: string };
type Class = { id: string; name: string; courseId: string };

function EnrollmentPortalContent() {
    const { firestore, auth, user, isUserLoading } = useFirebase();
    const searchParams = useSearchParams();
    const router = useRouter();
    const { toast } = useToast();

    // Data fetching
    const coursesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'courses')) : null, [firestore]);
    const classesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'classes')) : null, [firestore]);
    const { data: courses } = useCollection<Course>(coursesQuery);
    const { data: classes } = useCollection<Class>(classesQuery);

    // States
    const [step, setStep] = useState<'identify' | 'auth' | 'enroll' | 'success'>('identify');
    const [isNewUser, setIsNewUser] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Enrollment Form State
    const [selectedCourseId, setSelectedCourseId] = useState(searchParams.get('courseId') || '');
    const [selectedClassId, setSelectedClassId] = useState('');
    const [phone, setPhone] = useState('');

    const filteredClasses = useMemo(() => 
        classes?.filter(c => c.courseId === selectedCourseId) || [], 
    [classes, selectedCourseId]);

    // Handle Google Redirect Result
    useEffect(() => {
        if (!auth) return;
        getRedirectResult(auth).then(async (result) => {
            if (result?.user) {
                await ensureUserDoc(result.user);
                setStep('enroll');
            }
        }).catch((error) => {
            console.error("Redirect result error:", error);
        });
    }, [auth]);

    // Auto-advance if already logged in
    useEffect(() => {
        if (!isUserLoading && user) {
            setStep('enroll');
        }
    }, [user, isUserLoading]);

    const ensureUserDoc = async (authUser: any) => {
        if (!firestore) return;
        const userDocRef = doc(firestore, 'users', authUser.uid);
        const snapshot = await getDocs(query(collection(firestore, 'users'), where('email', '==', authUser.email)));
        
        if (snapshot.empty) {
            await setDoc(userDocRef, {
                name: authUser.displayName || 'Novo Aluno',
                email: authUser.email,
                phone: authUser.phoneNumber || '',
                integrationStatus: 'visitante_culto',
                hierarchy: { role: 'member' },
                createdAt: serverTimestamp(),
            }, { merge: true });
        }
    };

    const handleIdentify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !firestore) return;
        setIsAuthenticating(true);

        const snapshot = await getDocs(query(collection(firestore, 'users'), where('email', '==', email)));
        setIsNewUser(snapshot.empty);
        setStep('auth');
        setIsAuthenticating(false);
    };

    const handleGoogleSignIn = () => {
        if (!auth) return;
        setIsAuthenticating(true);
        const provider = new GoogleAuthProvider();
        signInWithRedirect(auth, provider);
    };

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth || !email || !password) return;
        setIsAuthenticating(true);

        try {
            if (isNewUser) {
                const result = await createUserWithEmailAndPassword(auth, email, password);
                await ensureUserDoc(result.user);
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
            setStep('enroll');
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Erro na autenticação',
                description: 'Verifique sua senha ou tente novamente.',
            });
        } finally {
            setIsAuthenticating(false);
        }
    };

    const handleEnroll = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firestore || !user || !selectedCourseId) return;
        setIsSubmitting(true);

        try {
            await addDoc(collection(firestore, 'enrollment_requests'), {
                name: user.displayName || 'Aluno',
                email: user.email,
                phone: phone,
                courseId: selectedCourseId,
                classId: selectedClassId,
                status: 'pending',
                createdAt: Timestamp.now(),
            });
            setStep('success');
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Erro ao enviar inscrição',
                description: 'Por favor, tente novamente em instantes.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center flex flex-col items-center">
                    <Logo className="h-12 w-12 text-primary mb-2" />
                    <h1 className="text-2xl font-bold tracking-tight">Portal de Inscrições</h1>
                    <p className="text-muted-foreground">OikoApp • Ministério de Ensino</p>
                </div>

                {step === 'identify' && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Identificação</CardTitle>
                            <CardDescription>Para começar, informe seu e-mail.</CardDescription>
                        </CardHeader>
                        <form onSubmit={handleIdentify}>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">E-mail</Label>
                                    <Input 
                                        id="email" 
                                        type="email" 
                                        value={email} 
                                        onChange={e => setEmail(e.target.value)} 
                                        placeholder="exemplo@email.com" 
                                        required 
                                    />
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button type="submit" className="w-full" disabled={isAuthenticating}>
                                    {isAuthenticating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Continuar
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>
                )}

                {step === 'auth' && (
                    <Card>
                        <CardHeader>
                            <CardTitle>{isNewUser ? 'Criar sua conta' : 'Fazer Login'}</CardTitle>
                            <CardDescription>
                                {isNewUser 
                                    ? 'Não encontramos seu cadastro. Defina uma senha para continuar.' 
                                    : 'Bem-vindo de volta! Insira sua senha.'}
                            </CardDescription>
                        </CardHeader>
                        <form onSubmit={handleEmailAuth}>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="pass">Senha</Label>
                                    <Input 
                                        id="pass" 
                                        type="password" 
                                        value={password} 
                                        onChange={e => setPassword(e.target.value)} 
                                        required 
                                    />
                                </div>
                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Ou use sua conta</span></div>
                                </div>
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    className="w-full" 
                                    onClick={handleGoogleSignIn}
                                    disabled={isAuthenticating}
                                >
                                    <LogIn className="mr-2 h-4 w-4" /> Entrar com Google
                                </Button>
                            </CardContent>
                            <CardFooter className="flex flex-col gap-2">
                                <Button type="submit" className="w-full" disabled={isAuthenticating}>
                                    {isAuthenticating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {isNewUser ? 'Cadastrar e Prosseguir' : 'Entrar e Prosseguir'}
                                </Button>
                                <Button variant="link" size="sm" onClick={() => setStep('identify')}>Usar outro e-mail</Button>
                            </CardFooter>
                        </form>
                    </Card>
                )}

                {step === 'enroll' && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Dados da Inscrição</CardTitle>
                            <CardDescription>Olá, {user?.displayName || 'aluno'}! Quase lá.</CardDescription>
                        </CardHeader>
                        <form onSubmit={handleEnroll}>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="course">Curso Desejado</Label>
                                    <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                                        <SelectTrigger id="course"><SelectValue placeholder="Selecione o curso" /></SelectTrigger>
                                        <SelectContent>
                                            {courses?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="class">Turma Preferencial (Opcional)</Label>
                                    <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                                        <SelectTrigger id="class"><SelectValue placeholder="Selecione a turma" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="null">A definir</SelectItem>
                                            {filteredClasses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="wa">WhatsApp para Contato</Label>
                                    <Input 
                                        id="wa" 
                                        placeholder="(21) 9..." 
                                        value={phone} 
                                        onChange={e => setPhone(e.target.value)} 
                                        required 
                                    />
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button type="submit" className="w-full" disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Concluir Inscrição
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>
                )}

                {step === 'success' && (
                    <Card className="border-green-200 bg-green-50/30">
                        <CardHeader className="text-center">
                            <div className="mx-auto bg-green-100 p-3 rounded-full w-fit mb-4">
                                <CheckCircle className="h-8 w-8 text-green-600" />
                            </div>
                            <CardTitle className="text-green-800">Inscrição Recebida!</CardTitle>
                            <CardDescription className="text-green-700">
                                Sua solicitação foi enviada com sucesso. Nossa equipe entrará em contato em breve via WhatsApp.
                            </CardDescription>
                        </CardHeader>
                        <CardFooter>
                            <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => router.push('/')}>
                                Voltar ao Início
                            </Button>
                        </CardFooter>
                    </Card>
                )}
            </div>
        </div>
    );
}

export default function EnrollmentPortalPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>}>
            <EnrollmentPortalContent />
        </Suspense>
    );
}
