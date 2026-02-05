
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, doc, getDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { GoogleAuthProvider, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CheckCircle, Mail, UserPlus, LogIn, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/icons';

type Course = { id: string; name: string; ministryName: string };
type Class = { id: string; name: string; courseId: string; dayOfWeek?: string; startTime?: string };

function EnrollmentForm({ user, initialCourseId, courses, classes }: { user: any, initialCourseId: string | null, courses: Course[], classes: Class[] }) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    const [formData, setFormData] = useState({
        name: user?.displayName || '',
        email: user?.email || '',
        phone: '',
        courseId: initialCourseId || '',
        classId: '',
    });

    const availableClasses = classes.filter(c => c.courseId === formData.courseId);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.courseId || !formData.phone) {
            toast({ variant: 'destructive', title: 'Campos obrigatórios', description: 'Por favor, preencha o WhatsApp e selecione o curso.' });
            return;
        }

        setIsSubmitting(true);
        try {
            const requestsRef = collection(firestore!, 'enrollment_requests');
            await setDoc(doc(requestsRef), {
                ...formData,
                status: 'pending',
                createdAt: Timestamp.now(),
                userId: user?.uid || null,
            });
            setSuccess(true);
            toast({ title: 'Inscrição Enviada!', description: 'Sua solicitação foi recebida com sucesso.' });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Erro ao enviar', description: 'Ocorreu um erro. Tente novamente.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (success) {
        return (
            <Card className="w-full max-w-md border-t-4 border-green-500">
                <CardContent className="pt-10 pb-10 text-center space-y-4">
                    <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle className="text-green-600 size-10" />
                    </div>
                    <CardTitle className="text-2xl">Tudo pronto!</CardTitle>
                    <CardDescription className="text-base">
                        Sua inscrição para <strong>{courses.find(c => c.id === formData.courseId)?.name}</strong> foi enviada. Entraremos em contato em breve via WhatsApp.
                    </CardDescription>
                    <Button className="w-full mt-6" onClick={() => window.location.href = '/'}>Voltar ao Início</Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-full max-w-lg shadow-xl">
            <CardHeader>
                <CardTitle>Dados da Inscrição</CardTitle>
                <CardDescription>Confirme seus dados e escolha sua turma.</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                    <div className="grid gap-2">
                        <Label>Nome Completo</Label>
                        <Input value={formData.name} disabled className="bg-muted" />
                    </div>
                    <div className="grid gap-2">
                        <Label>E-mail</Label>
                        <Input value={formData.email} disabled className="bg-muted" />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="phone">WhatsApp (com DDD) *</Label>
                        <Input id="phone" placeholder="(21) 99999-9999" value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} required />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="courseId">Curso de Interesse *</Label>
                        <Select value={formData.courseId} onValueChange={v => setFormData(p => ({ ...p, courseId: v, classId: '' }))}>
                            <SelectTrigger id="courseId"><SelectValue placeholder="Selecione o curso" /></SelectTrigger>
                            <SelectContent>
                                {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    {availableClasses.length > 0 && (
                        <div className="grid gap-2">
                            <Label htmlFor="classId">Turma Desejada</Label>
                            <Select value={formData.classId} onValueChange={v => setFormData(p => ({ ...p, classId: v }))}>
                                <SelectTrigger id="classId"><SelectValue placeholder="Selecione a turma (opcional)" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="null">A definir</SelectItem>
                                    {availableClasses.map(c => (
                                        <SelectItem key={c.id} value={c.id}>
                                            {c.name} {c.dayOfWeek ? `(${c.dayOfWeek} às ${c.startTime})` : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </CardContent>
                <CardFooter>
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Concluir Inscrição
                    </Button>
                </form>
            </CardFooter>
        </Card>
    );
}

function EnrollmentPageContent() {
    const { firestore, auth } = useFirebase();
    const searchParams = useSearchParams();
    const initialCourseId = searchParams.get('courseId');
    const { toast } = useToast();

    const [email, setEmail] = useState('');
    const [user, setUser] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [step, setStep] = useState<'identifying' | 'found' | 'not_found' | 'enrolling' | 'success'>('identifying');

    const coursesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'courses')) : null, [firestore]);
    const classesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'classes')) : null, [firestore]);
    const { data: courses } = useCollection<Course>(coursesQuery);
    const { data: classes } = useCollection<Class>(classesQuery);

    // 1. Monitorar estado de autenticação e capturar resultado de redirecionamento
    useEffect(() => {
        if (!auth || !firestore) return;

        const checkRedirect = async () => {
            try {
                const result = await getRedirectResult(auth);
                if (result?.user) {
                    const firebaseUser = result.user;
                    
                    // Garantir que o perfil existe no Firestore
                    const userRef = doc(firestore, 'users', firebaseUser.uid);
                    const userSnap = await getDoc(userRef);
                    
                    if (!userSnap.exists()) {
                        await setDoc(userRef, {
                            name: firebaseUser.displayName || 'Novo Aluno',
                            email: firebaseUser.email || '',
                            phone: firebaseUser.phoneNumber || '',
                            integrationStatus: 'visitante_interessado',
                            createdAt: serverTimestamp(),
                            hierarchy: { role: 'member' }
                        });
                    }
                    
                    setUser(firebaseUser);
                    setStep('enrolling');
                } else if (auth.currentUser) {
                    // Já está logado
                    setUser(auth.currentUser);
                    setStep('enrolling');
                }
            } catch (error) {
                console.error("Erro no redirect:", error);
            } finally {
                setIsLoading(false);
            }
        };

        checkRedirect();
    }, [auth, firestore]);

    const handleIdentify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !firestore) return;

        setIsLoading(true);
        try {
            const usersRef = collection(firestore, 'users');
            const q = query(usersRef, where('email', '==', email.toLowerCase().trim()));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                setStep('found');
            } else {
                setStep('not_found');
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro na verificação', description: 'Não foi possível consultar seu e-mail.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = () => {
        if (!auth) return;
        const provider = new GoogleAuthProvider();
        // Adicionar hint de login para facilitar se o usuário já digitou o email
        if (email) {
            provider.setCustomParameters({ login_hint: email.trim() });
        }
        signInWithRedirect(auth, provider);
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground animate-pulse">Preparando seu acesso...</p>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="mb-8 flex flex-col items-center gap-2">
                <Logo className="size-12 text-primary" />
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">OikoApp</h1>
                <p className="text-slate-500 font-medium">Portal de Inscrições Ministeriais</p>
            </div>

            {step === 'identifying' && (
                <Card className="w-full max-w-md shadow-lg border-none">
                    <CardHeader className="text-center">
                        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                            <Mail className="text-primary size-6" />
                        </div>
                        <CardTitle>Para começar, identifique-se</CardTitle>
                        <CardDescription>Informe seu e-mail para verificarmos seu cadastro.</CardDescription>
                    </CardHeader>
                    <form onSubmit={handleIdentify}>
                        <CardContent>
                            <div className="grid gap-2">
                                <Label htmlFor="email">E-mail</Label>
                                <Input id="email" type="email" placeholder="seuemail@exemplo.com" value={email} onChange={e => setEmail(e.target.value)} required />
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" className="w-full">Verificar E-mail</Button>
                        </CardFooter>
                    </form>
                </Card>
            )}

            {step === 'found' && (
                <Card className="w-full max-w-md shadow-lg border-none animate-in fade-in zoom-in-95">
                    <CardContent className="pt-10 pb-10 text-center space-y-6">
                        <div className="mx-auto w-16 h-16 bg-green-50 rounded-full flex items-center justify-center">
                            <LogIn className="text-green-600 size-8" />
                        </div>
                        <div className="space-y-2">
                            <CardTitle className="text-2xl">Cadastro encontrado!</CardTitle>
                            <CardDescription className="text-base">
                                Encontramos seus dados para: <strong>{email}</strong>
                            </CardDescription>
                        </div>
                        <p className="text-sm text-muted-foreground px-4">
                            Faça login com sua conta Google para confirmar sua identidade e realizar sua inscrição.
                        </p>
                        <Button className="w-full bg-primary" size="lg" onClick={handleGoogleLogin}>
                            <LogIn className="mr-2 size-5" /> Entrar com Google
                        </Button>
                        <button onClick={() => setStep('identifying')} className="text-sm text-muted-foreground underline hover:text-primary">Tentar outro e-mail</button>
                    </CardContent>
                </Card>
            )}

            {step === 'not_found' && (
                <Card className="w-full max-w-md shadow-lg border-none animate-in fade-in zoom-in-95">
                    <CardContent className="pt-10 pb-10 text-center space-y-6">
                        <div className="mx-auto w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center">
                            <UserPlus className="text-blue-600 size-8" />
                        </div>
                        <div className="space-y-2">
                            <CardTitle className="text-2xl">Ainda não te conhecemos!</CardTitle>
                            <CardDescription className="text-base">
                                O e-mail <strong>{email}</strong> não está no nosso sistema.
                            </CardDescription>
                        </div>
                        <p className="text-sm text-muted-foreground px-4">
                            Não se preocupe! Você pode criar sua conta agora mesmo usando seu Google.
                        </p>
                        <Button className="w-full" size="lg" onClick={handleGoogleLogin}>
                            <UserPlus className="mr-2 size-5" /> Cadastre-se com Google
                        </Button>
                        <button onClick={() => setStep('identifying')} className="text-sm text-muted-foreground underline hover:text-primary">Tentar outro e-mail</button>
                    </CardContent>
                </Card>
            )}

            {step === 'enrolling' && (
                <EnrollmentForm 
                    user={user} 
                    initialCourseId={initialCourseId} 
                    courses={courses || []} 
                    classes={classes || []} 
                />
            )}
        </main>
    );
}

export default function PublicEnrollmentPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin"/></div>}>
            <EnrollmentPageContent />
        </Suspense>
    );
}
