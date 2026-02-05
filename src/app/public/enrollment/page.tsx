
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useFirebase, useCollection, useMemoFirebase, setDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { collection, query, doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, CheckCircle, ArrowRight, UserPlus, LogIn, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { signInWithRedirect, GoogleAuthProvider, getRedirectResult, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

type Course = { id: string; name: string; ministryName: string; };
type Class = { id: string; name: string; courseId: string; startTime: string; dayOfWeek: string; };

export default function PublicEnrollmentPage() {
    const { user, auth, firestore, isUserLoading } = useFirebase();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const initialCourseId = searchParams.get('courseId');

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [step, setPhase] = useState<'identify' | 'auth' | 'form' | 'success'>('identify');
    const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const coursesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'courses')) : null, [firestore]);
    const classesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'classes')) : null, [firestore]);

    const { data: courses, isLoading: loadingCourses } = useCollection<Course>(coursesQuery);
    const { data: classes, isLoading: loadingClasses } = useCollection<Class>(classesQuery);

    const [selectedCourseId, setSelectedCourseId] = useState(initialCourseId || '');
    const [selectedClassId, setSelectedClassId] = useState('');

    const availableClasses = useMemo(() => {
        if (!selectedCourseId || !classes) return [];
        return classes.filter(c => c.courseId === selectedCourseId);
    }, [selectedCourseId, classes]);

    // Handle Auth Redirect Result
    useEffect(() => {
        if (auth) {
            getRedirectResult(auth).catch((error) => {
                console.error("Redirect auth error:", error);
            });
        }
    }, [auth]);

    // Check if user exists and move to next step
    useEffect(() => {
        if (user && !isSuccess) {
            setPhase('form');
        }
    }, [user, isSuccess]);

    const handleIdentify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !firestore) return;
        setIsProcessing(true);

        try {
            const userDoc = await getDoc(doc(firestore, 'users_lookup', email.toLowerCase()));
            if (userDoc.exists()) {
                setAuthMode('login');
            } else {
                setAuthMode('signup');
            }
            setPhase('auth');
        } catch (error) {
            setAuthMode('signup'); // Default to signup if lookup fails
            setPhase('auth');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleGoogleLogin = () => {
        if (!auth) return;
        const provider = new GoogleAuthProvider();
        signInWithRedirect(auth, provider);
    };

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth || !password) return;
        setIsProcessing(true);

        try {
            if (authMode === 'login') {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                const result = await createUserWithEmailAndPassword(auth, email, password);
                // Create lookup entry
                if (firestore) {
                    await setDoc(doc(firestore, 'users_lookup', email.toLowerCase()), { uid: result.user.uid });
                }
            }
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Erro na Autenticação',
                description: error.message === 'Firebase: Error (auth/wrong-password).' ? 'Senha incorreta.' : 'Falha ao autenticar. Tente novamente.'
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !firestore) return;
        setIsProcessing(true);

        const formData = new FormData(e.currentTarget as HTMLFormElement);
        
        const userProfileUpdate = {
            name: formData.get('name') as string,
            phone: formData.get('phone') as string,
            cpf: formData.get('cpf') as string,
            dataNascimento: formData.get('dataNascimento') as string,
            sexo: formData.get('sexo') as string,
            email: user.email,
            updatedAt: Timestamp.now()
        };

        const enrollmentRequest = {
            ...userProfileUpdate,
            courseId: selectedCourseId,
            classId: selectedClassId,
            status: 'pending',
            createdAt: Timestamp.now(),
        };

        try {
            // Use setDocumentNonBlocking with merge:true to avoid "not found" errors on update
            const userDocRef = doc(firestore, 'users', user.uid);
            setDocumentNonBlocking(userDocRef, userProfileUpdate, { merge: true });
            
            // Add enrollment request
            const requestsCol = collection(firestore, 'enrollment_requests');
            await addDocumentNonBlocking(requestsCol, enrollmentRequest);

            setIsSuccess(true);
            setPhase('success');
            toast({ title: "Inscrição Enviada!", description: "Sua solicitação foi recebida com sucesso." });
        } catch (error) {
            console.error("Submission error:", error);
            toast({
                variant: 'destructive',
                title: 'Erro ao enviar',
                description: 'Ocorreu um erro ao processar sua inscrição. Tente novamente.'
            });
        } finally {
            setIsProcessing(false);
        }
    };

    if (isUserLoading || loadingCourses || loadingClasses) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <div className="text-center space-y-4">
                    <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
                    <p className="text-muted-foreground animate-pulse">Carregando portal...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 md:p-8">
            <div className="w-full max-w-md">
                {step === 'identify' && (
                    <Card className="shadow-xl border-t-4 border-primary">
                        <CardHeader>
                            <CardTitle className="text-2xl">Inscrição em Cursos</CardTitle>
                            <CardDescription>Para começar, digite seu e-mail abaixo.</CardDescription>
                        </CardHeader>
                        <form onSubmit={handleIdentify}>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Seu melhor e-mail</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-3 size-4 text-muted-foreground" />
                                        <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} className="pl-10" placeholder="exemplo@gmail.com" required />
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button type="submit" className="w-full" disabled={isProcessing}>
                                    {isProcessing ? <Loader2 className="mr-2 animate-spin" /> : <ArrowRight className="mr-2" />}
                                    Continuar
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>
                )}

                {step === 'auth' && (
                    <Card className="shadow-xl border-t-4 border-primary">
                        <CardHeader>
                            <CardTitle className="text-xl">
                                {authMode === 'login' ? 'Boas-vindas de volta!' : 'Criar sua conta'}
                            </CardTitle>
                            <CardDescription>
                                {authMode === 'login' 
                                    ? 'Identificamos seu cadastro. Por favor, faça login para continuar.' 
                                    : 'Não encontramos seu e-mail. Crie uma senha para realizar sua inscrição.'}
                            </CardDescription>
                        </CardHeader>
                        <form onSubmit={handleEmailAuth}>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="password">Sua Senha</Label>
                                    <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
                                </div>
                                <div className="relative py-2">
                                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Ou use sua conta Google</span></div>
                                </div>
                                <Button type="button" variant="outline" className="w-full" onClick={handleGoogleLogin}>
                                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                                    Entrar com Google
                                </Button>
                            </CardContent>
                            <CardFooter className="flex flex-col gap-3">
                                <Button type="submit" className="w-full" disabled={isProcessing}>
                                    {isProcessing && <Loader2 className="mr-2 animate-spin" />}
                                    {authMode === 'login' ? 'Entrar' : 'Criar Conta e Continuar'}
                                </Button>
                                <Button type="button" variant="link" className="text-xs" onClick={() => setPhase('identify')}>
                                    Usar outro e-mail
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>
                )}

                {step === 'form' && user && (
                    <Card className="shadow-xl border-t-4 border-primary">
                        <CardHeader>
                            <CardTitle className="text-2xl">Dados da Matrícula</CardTitle>
                            <CardDescription>Olá, {user.displayName || 'aluno'}! Complete seus dados para finalizar a inscrição.</CardDescription>
                        </CardHeader>
                        <form onSubmit={handleSubmit}>
                            <CardContent className="space-y-6">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Nome Completo</Label>
                                        <Input id="name" name="name" defaultValue={user.displayName || ''} required />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="phone">WhatsApp</Label>
                                            <Input id="phone" name="phone" placeholder="(21) 9..." required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="cpf">CPF</Label>
                                            <Input id="cpf" name="cpf" placeholder="000.000.000-00" required />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="dataNascimento">Data de Nascimento</Label>
                                            <Input id="dataNascimento" name="dataNascimento" type="date" required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="sexo">Sexo</Label>
                                            <Select name="sexo" required>
                                                <SelectTrigger id="sexo"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="M">Masculino</SelectItem>
                                                    <SelectItem value="F">Feminino</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="courseId">Curso Desejado</Label>
                                        <Select value={selectedCourseId} onValueChange={setSelectedCourseId} required>
                                            <SelectTrigger id="courseId"><SelectValue placeholder="Selecione o curso..." /></SelectTrigger>
                                            <SelectContent>
                                                {courses?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {selectedCourseId && (
                                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                            <Label htmlFor="classId">Turma / Horário</Label>
                                            <Select value={selectedClassId} onValueChange={setSelectedClassId} required>
                                                <SelectTrigger id="classId">
                                                    <SelectValue placeholder={availableClasses.length > 0 ? "Selecione o horário..." : "Nenhuma turma disponível"} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {availableClasses.map(c => (
                                                        <SelectItem key={c.id} value={c.id}>{c.name} ({c.dayOfWeek} às {c.startTime})</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button type="submit" className="w-full py-6 text-lg" disabled={isProcessing || !selectedClassId}>
                                    {isProcessing ? <Loader2 className="mr-2 animate-spin" /> : <CheckCircle className="mr-2" />}
                                    Concluir Inscrição
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>
                )}

                {step === 'success' && (
                    <Card className="shadow-xl border-t-4 border-green-500 text-center animate-in zoom-in-95">
                        <CardHeader>
                            <div className="mx-auto bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle className="text-green-600 size-10" />
                            </div>
                            <CardTitle className="text-2xl text-green-700">Inscrição Enviada!</CardTitle>
                            <CardDescription>Tudo certo com sua solicitação.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-muted-foreground">
                                Recebemos sua inscrição para o curso. Em breve, o responsável entrará em contato para confirmar sua vaga e passar mais detalhes.
                            </p>
                            <div className="bg-slate-50 p-4 rounded-lg text-sm text-left">
                                <p><strong>Próximos passos:</strong></p>
                                <ul className="list-disc list-inside mt-2 space-y-1 text-slate-600">
                                    <li>Aguarde o contato via WhatsApp</li>
                                    <li>Prepare seu material de estudo</li>
                                    <li>Seja bem-vindo(a) à nossa escola!</li>
                                </ul>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button variant="outline" className="w-full" onClick={() => window.location.reload()}>Fazer outra inscrição</Button>
                        </CardFooter>
                    </Card>
                )}
            </div>
        </div>
    );
}
