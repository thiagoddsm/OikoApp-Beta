
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useFirebase, useCollection, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { collection, query, doc, where, getDocs, limit, Timestamp, getDoc } from 'firebase/firestore';
import { signInWithRedirect, GoogleAuthProvider, getRedirectResult } from 'firebase/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CheckCircle, LogIn, UserPlus, Mail, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/icons';

// --- SUB-COMPONENTES DE ETAPAS ---

function IdentificationStep({ email, setEmail, onCheckEmail, isLoading }) {
    return (
        <Card className="w-full max-w-md mx-auto">
            <CardHeader>
                <CardTitle>Identificação</CardTitle>
                <CardDescription>Insira seu e-mail para iniciar a inscrição.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input 
                        id="email" 
                        type="email" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        placeholder="seu@email.com"
                        required
                    />
                </div>
            </CardContent>
            <CardFooter>
                <Button className="w-full" onClick={onCheckEmail} disabled={isLoading || !email.includes('@')}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Continuar
                </Button>
            </CardFooter>
        </Card>
    );
}

function AuthStep({ type, email, onLogin, onBack, isLoading }) {
    const isNew = type === 'new';
    return (
        <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center">
                <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-4">
                    {isNew ? <UserPlus className="size-6 text-primary" /> : <LogIn className="size-6 text-primary" />}
                </div>
                <CardTitle>{isNew ? 'Cadastro não encontrado' : 'Bem-vindo de volta!'}</CardTitle>
                <CardDescription>
                    {isNew 
                        ? `Não encontramos um cadastro para ${email}. Clique abaixo para criar sua conta usando o Google.` 
                        : `Encontramos seu cadastro! Entre com sua conta Google para continuar.`}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Button className="w-full py-6 text-lg" onClick={onLogin} disabled={isLoading}>
                    <Logo className="mr-2 size-5" />
                    {isNew ? 'Cadastre-se com Google' : 'Entrar com Google'}
                </Button>
                <Button variant="ghost" className="w-full" onClick={onBack} disabled={isLoading}>
                    <ArrowLeft className="mr-2 size-4" /> Voltar
                </Button>
            </CardContent>
        </Card>
    );
}

function EnrollmentForm({ user, courseId, courses, classes, onSuccess }) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [selectedCourseId, setSelectedCourseId] = useState(courseId || '');
    const [selectedClassId, setSelectedClassId] = useState('');
    const [phone, setPhone] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const availableClasses = classes?.filter(c => c.courseId === selectedCourseId) || [];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCourseId) return;
        setIsSubmitting(true);

        try {
            const requestsCollection = collection(firestore!, 'enrollment_requests');
            await addDocumentNonBlocking(requestsCollection, {
                name: user.name,
                email: user.email,
                phone,
                courseId: selectedCourseId,
                classId: selectedClassId,
                status: 'pending',
                createdAt: Timestamp.now(),
            });
            onSuccess();
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Erro na Inscrição', description: 'Ocorreu um erro ao salvar sua inscrição. Tente novamente.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card className="w-full max-w-md mx-auto">
            <form onSubmit={handleSubmit}>
                <CardHeader>
                    <CardTitle>Inscrição no Curso</CardTitle>
                    <CardDescription>Olá, {user.name}! Complete seus dados para finalizar a inscrição.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>WhatsApp / Celular</Label>
                        <Input 
                            value={phone} 
                            onChange={(e) => setPhone(e.target.value)} 
                            placeholder="(21) 99999-9999" 
                            required 
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Selecione o Curso</Label>
                        <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                            <SelectTrigger><SelectValue placeholder="Escolha um curso..." /></SelectTrigger>
                            <SelectContent>
                                {courses?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    {selectedCourseId && availableClasses.length > 0 && (
                        <div className="space-y-2">
                            <Label>Prefere alguma turma?</Label>
                            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                                <SelectTrigger><SelectValue placeholder="Selecione a turma (opcional)" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Tanto faz / Ver depois</SelectItem>
                                    {availableClasses.map(c => <SelectItem key={c.id} value={c.id}>{c.name} ({c.dayOfWeek} às {c.startTime})</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </CardContent>
                <CardFooter>
                    <Button type="submit" className="w-full" disabled={isSubmitting || !selectedCourseId || !phone}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Concluir Inscrição
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}

// --- COMPONENTE PRINCIPAL ---

function EnrollmentContent() {
    const { firestore, auth, user: fbUser } = useFirebase();
    const searchParams = useSearchParams();
    const courseId = searchParams.get('courseId');
    const { toast } = useToast();

    const [step, setStep] = useState<'id' | 'auth' | 'form' | 'success'>('id');
    const [authType, setAuthStepType] = useState<'new' | 'existing'>('new');
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [profile, setProfile] = useState<any>(null);

    const coursesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'courses') : null, [firestore]);
    const classesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'classes') : null, [firestore]);
    const { data: courses } = useCollection(coursesQuery);
    const { data: classes } = useCollection(classesQuery);

    // Efeito para lidar com o retorno do login do Google (Redirect)
    useEffect(() => {
        if (!auth || !firestore) return;

        const checkRedirect = async () => {
            try {
                const result = await getRedirectResult(auth);
                if (result?.user) {
                    const user = result.user;
                    const userDoc = await getDoc(doc(firestore, 'users', user.uid));
                    
                    if (!userDoc.exists()) {
                        // Cadastro automático estilo "Eklesia"
                        const newProfile = {
                            name: user.displayName || 'Novo Aluno',
                            email: user.email || '',
                            phone: '',
                            integrationStatus: 'nao_alcancado',
                            hierarchy: { role: 'member' },
                            createdAt: Timestamp.now(),
                        };
                        await setDocumentNonBlocking(doc(firestore, 'users', user.uid), newProfile);
                        setProfile({ ...newProfile, id: user.uid });
                    } else {
                        setProfile({ ...userDoc.data(), id: user.uid });
                    }
                    setStep('form');
                } else if (fbUser) {
                    // Já estava logado de antes
                    const userDoc = await getDoc(doc(firestore, 'users', fbUser.uid));
                    if (userDoc.exists()) {
                        setProfile({ ...userDoc.data(), id: fbUser.uid });
                        setStep('form');
                    }
                }
            } catch (error) {
                console.error("Erro no retorno do login:", error);
            }
        };

        checkRedirect();
    }, [auth, firestore, fbUser]);

    const handleCheckEmail = async () => {
        if (!email || !firestore) return;
        setIsLoading(true);
        try {
            const q = query(collection(firestore, 'users'), where('email', '==', email.toLowerCase().trim()), limit(1));
            const snapshot = await getDocs(q);
            setAuthStepType(snapshot.empty ? 'new' : 'existing');
            setStep('auth');
        } catch (e) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível verificar seu e-mail.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogin = () => {
        if (!auth) return;
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ login_hint: email });
        signInWithRedirect(auth, provider);
    };

    return (
        <div className="min-h-screen bg-muted/30 flex flex-col items-center justify-center p-4">
            <div className="flex items-center gap-2 mb-8">
                <Logo className="size-8 text-primary" />
                <h1 className="text-2xl font-bold">OikoApp Inscrições</h1>
            </div>

            {step === 'id' && (
                <IdentificationStep 
                    email={email} 
                    setEmail={setEmail} 
                    onCheckEmail={handleCheckEmail} 
                    isLoading={isLoading} 
                />
            )}

            {step === 'auth' && (
                <AuthStep 
                    type={authType} 
                    email={email} 
                    onLogin={handleLogin} 
                    onBack={() => setStep('id')} 
                    isLoading={isLoading} 
                />
            )}

            {step === 'form' && profile && (
                <EnrollmentForm 
                    user={profile} 
                    courseId={courseId} 
                    courses={courses} 
                    classes={classes} 
                    onSuccess={() => setStep('success')} 
                />
            )}

            {step === 'success' && (
                <Card className="w-full max-w-md mx-auto text-center p-8">
                    <CardContent className="space-y-4 pt-6">
                        <div className="mx-auto bg-green-100 p-3 rounded-full w-fit mb-4">
                            <CheckCircle className="size-12 text-green-600" />
                        </div>
                        <CardTitle className="text-2xl">Inscrição Enviada!</CardTitle>
                        <CardDescription>
                            Recebemos sua solicitação. Em breve a secretaria entrará em contato para confirmar sua matrícula e enviar os detalhes da primeira aula.
                        </CardDescription>
                        <Button className="w-full mt-6" onClick={() => window.location.href = '/'}>
                            Voltar para o Início
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

export default function EnrollmentPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>}>
            <EnrollmentContent />
        </Suspense>
    );
}
