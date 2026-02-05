
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useFirebase, useCollection, useMemoFirebase, useDoc, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc, Timestamp, getDocs, limit } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithRedirect, GoogleAuthProvider, getRedirectResult } from 'firebase/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CheckCircle, Mail, User, Phone, BookOpen, LogIn, Lock, Info, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/icons';

type Course = { id: string; name: string; ministryName: string };
type Class = { id: string; name: string; courseId: string; dayOfWeek?: string; startTime?: string };

function EnrollmentForm({ user, preselectedCourseId }: { user: any, preselectedCourseId: string | null }) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    // Form states
    const [name, setName] = useState(user?.displayName || '');
    const [phone, setPhone] = useState('');
    const [cpf, setCpf] = useState('');
    const [sexo, setSexo] = useState('');
    const [dataNascimento, setDataNascimento] = useState('');
    const [selectedCourseId, setSelectedCourseId] = useState(preselectedCourseId || '');
    const [selectedClassId, setSelectedClassId] = useState('');

    const coursesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'courses')) : null, [firestore]);
    const { data: courses } = useCollection<Course>(coursesQuery);

    const classesQuery = useMemoFirebase(() => {
        if (!firestore || !selectedCourseId) return null;
        return query(collection(firestore, 'classes'), where('courseId', '==', selectedCourseId));
    }, [firestore, selectedCourseId]);
    const { data: availableClasses, isLoading: loadingClasses } = useCollection<Class>(classesQuery);

    // Pre-fill from existing profile if available
    const { data: profile } = useDoc(user ? `users/${user.uid}` : null);
    useEffect(() => {
        if (profile) {
            if (!name) setName(profile.name || '');
            setPhone(profile.phone || '');
            setCpf(profile.cpf || '');
            setSexo(profile.sexo || '');
            setDataNascimento(profile.dataNascimento || '');
        }
    }, [profile]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCourseId) {
            toast({ variant: 'destructive', title: 'Campo obrigatório', description: 'Por favor, selecione um curso.' });
            return;
        }
        setLoading(true);

        const requestData = {
            userId: user.uid,
            name,
            email: user.email,
            phone,
            cpf,
            sexo,
            dataNascimento,
            courseId: selectedCourseId,
            classId: selectedClassId,
            status: 'pending',
            createdAt: Timestamp.now(),
        };

        try {
            // 1. Gravar a solicitação de inscrição
            const requestsCol = collection(firestore!, 'enrollment_requests');
            await addDocumentNonBlocking(requestsCol, requestData);

            // 2. Atualizar os dados do perfil do usuário para que fiquem salvos permanentemente
            const userRef = doc(firestore!, 'users', user.uid);
            await updateDocumentNonBlocking(userRef, {
                name,
                phone,
                cpf,
                sexo,
                dataNascimento,
            });

            setSuccess(true);
            toast({ title: 'Inscrição enviada!', description: 'Sua solicitação será analisada pela secretaria.' });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Erro ao enviar', description: 'Tente novamente em alguns instantes.' });
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="text-center py-10 space-y-4">
                <div className="flex justify-center"><CheckCircle className="size-16 text-green-500" /></div>
                <h2 className="text-2xl font-bold">Solicitação Recebida!</h2>
                <p className="text-muted-foreground">Obrigado por se inscrever. Em breve entraremos em contato via WhatsApp para confirmar sua matrícula.</p>
                <Button onClick={() => window.location.reload()} variant="outline">Fazer outra inscrição</Button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo</Label>
                    <Input id="name" value={name} onChange={e => setName(e.target.value)} required />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">E-mail (Identificado)</Label>
                        <Input id="email" value={user.email} disabled className="bg-muted" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="phone">WhatsApp / Celular</Label>
                        <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(21) 9...." required />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="cpf">CPF</Label>
                        <Input id="cpf" value={cpf} onChange={e => setCpf(e.target.value)} placeholder="000.000.000-00" required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="dataNasc">Data de Nascimento</Label>
                        <Input id="dataNasc" type="date" value={dataNascimento} onChange={e => setDataNascimento(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="sexo">Sexo</Label>
                        <Select value={sexo} onValueChange={setSexo} required>
                            <SelectTrigger id="sexo"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="M">Masculino</SelectItem>
                                <SelectItem value="F">Feminino</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="pt-4 border-t space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="course">Curso Desejado</Label>
                        <Select value={selectedCourseId} onValueChange={id => { setSelectedCourseId(id); setSelectedClassId(''); }}>
                            <SelectTrigger id="course"><SelectValue placeholder="Selecione um curso..." /></SelectTrigger>
                            <SelectContent>
                                {courses?.map(c => <SelectItem key={c.id} value={c.id}>{c.name} ({c.ministryName})</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="class">Turma Preferencial</Label>
                        <Select value={selectedClassId} onValueChange={setSelectedClassId} disabled={!selectedCourseId || loadingClasses}>
                            <SelectTrigger id="class">
                                <SelectValue placeholder={loadingClasses ? "Carregando turmas..." : "Selecione o horário..."} />
                            </SelectTrigger>
                            <SelectContent>
                                {availableClasses?.map(cls => (
                                    <SelectItem key={cls.id} value={cls.id}>
                                        {cls.name} {cls.dayOfWeek ? `- ${cls.dayOfWeek} às ${cls.startTime}` : ''}
                                    </SelectItem>
                                ))}
                                {availableClasses?.length === 0 && <SelectItem value="null" disabled>Nenhuma turma aberta no momento</SelectItem>}
                            </SelectContent>
                        </Select>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Info className="size-3" /> A escolha da turma está sujeita à disponibilidade de vagas.
                        </p>
                    </div>
                </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Concluir Inscrição
            </Button>
        </form>
    );
}

function PortalContent() {
    const { auth, user, firestore, isUserLoading } = useFirebase();
    const searchParams = useSearchParams();
    const preselectedCourseId = searchParams.get('courseId');
    const { toast } = useToast();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [step, setStep] = useState<'identify' | 'login' | 'signup' | 'form'>('identify');
    const [loading, setLoading] = useState(false);

    // Detect return from Google Redirect
    useEffect(() => {
        if (!auth) return;
        getRedirectResult(auth).then((result) => {
            if (result?.user) {
                setStep('form');
            }
        }).catch((error) => {
            console.error("Auth error:", error);
        });
    }, [auth]);

    // Handle initial state if already logged in
    useEffect(() => {
        if (!isUserLoading && user) {
            setStep('form');
        }
    }, [user, isUserLoading]);

    const handleCheckEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // No Firebase Client SDK, não há checkEmail direto sem admin. 
            // Vamos simular a verificação buscando no banco se o usuário já existe.
            const q = query(collection(firestore!, 'users'), where('email', '==', email.toLowerCase().trim()), limit(1));
            const snap = await getDocs(q);
            
            if (!snap.empty) {
                setStep('login');
            } else {
                setStep('signup');
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao verificar e-mail.' });
        } finally {
            setLoading(false);
        }
    };

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (step === 'login') {
                await signInWithEmailAndPassword(auth!, email, password);
            } else {
                await createUserWithEmailAndPassword(auth!, email, password);
            }
            setStep('form');
        } catch (error: any) {
            const msg = error.code === 'auth/wrong-password' ? 'Senha incorreta.' : 'Falha na autenticação.';
            toast({ variant: 'destructive', title: 'Erro', description: msg });
        } finally {
            setLoading(false);
        }
    };

    const handleGoogle = () => {
        const provider = new GoogleAuthProvider();
        signInWithRedirect(auth!, provider);
    };

    if (isUserLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <Loader2 className="size-10 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">Carregando portal...</p>
            </div>
        );
    }

    return (
        <Card className="w-full border-none shadow-2xl overflow-hidden">
            <CardHeader className="bg-slate-900 text-white pb-8">
                <div className="flex justify-center mb-4"><Logo className="size-10" /></div>
                <CardTitle className="text-2xl text-center">Portal de Inscrições</CardTitle>
                <CardDescription className="text-slate-400 text-center">Identifique-se para garantir sua vaga no organismo.</CardDescription>
            </CardHeader>
            <CardContent className="pt-8">
                {step === 'identify' && (
                    <form onSubmit={handleCheckEmail} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="id-email">Seu E-mail</Label>
                            <Input id="id-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="exemplo@gmail.com" required />
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? <Loader2 className="animate-spin" /> : 'Continuar'}
                        </Button>
                        <div className="relative py-4">
                            <div className="absolute inset-0 flex items-center"><span className="w-full border-t"></span></div>
                            <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Ou use</span></div>
                        </div>
                        <Button type="button" variant="outline" className="w-full" onClick={handleGoogle}>
                            Entrar com Google
                        </Button>
                    </form>
                )}

                {(step === 'login' || step === 'signup') && (
                    <form onSubmit={handleAuth} className="space-y-4">
                        <div className="bg-blue-50 p-3 rounded-md flex items-center gap-3 text-sm text-blue-700 mb-4 border border-blue-100">
                            <Info className="size-4 shrink-0" />
                            {step === 'login' ? 'E-mail reconhecido! Digite sua senha.' : 'Novo por aqui? Crie uma senha para seu cadastro.'}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="auth-email">E-mail</Label>
                            <Input id="auth-email" value={email} disabled className="bg-muted" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Sua Senha</Label>
                            <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? <Loader2 className="animate-spin" /> : (step === 'login' ? 'Entrar' : 'Cadastrar e Continuar')}
                        </Button>
                        <Button type="button" variant="ghost" className="w-full text-xs" onClick={() => setStep('identify')}>Usar outro e-mail</Button>
                    </form>
                )}

                {step === 'form' && user && (
                    <EnrollmentForm user={user} preselectedCourseId={preselectedCourseId} />
                )}
            </CardContent>
        </Card>
    );
}

export default function EnrollmentPortalPage() {
    return (
        <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6">
            <div className="w-full max-w-xl">
                <Suspense fallback={<div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>}>
                    <PortalContent />
                </Suspense>
                <p className="mt-8 text-center text-xs text-muted-foreground">
                    &copy; {new Date().getFullYear()} OikoApp - Sistema de Gestão Ministerial
                </p>
            </div>
        </main>
    );
}
