
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, CheckCircle, GraduationCap, UserPlus, LogIn, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/icons';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

type Course = { id: string; name: string; ministryName: string; };
type Class = { id: string; name: string; courseId: string; dayOfWeek: string; startTime: string; };

function EnrollmentForm({ user, courses, classes }: { user: any, courses: Course[], classes: Class[] }) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const searchParams = useSearchParams();
    const preselectedCourseId = searchParams.get('courseId');

    const [formData, setFormData] = useState({
        name: user?.displayName || '',
        phone: '',
        cpf: '',
        dataNascimento: '',
        sexo: '',
        selectedCourse: preselectedCourseId || '',
        selectedClass: '',
    });

    const filteredClasses = classes.filter(c => c.courseId === formData.selectedCourse);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.selectedCourse || !formData.selectedClass) {
            toast({ variant: 'destructive', title: 'Campos obrigatórios', description: 'Por favor, selecione o curso e a turma.' });
            return;
        }
        setIsSubmitting(true);

        try {
            const requestsCollection = collection(firestore, 'enrollment_requests');
            const userDocRef = doc(firestore, 'users', user.uid);

            // 1. Save enrollment request
            const requestData = {
                userId: user.uid,
                name: formData.name,
                email: user.email,
                phone: formData.phone,
                cpf: formData.cpf,
                dataNascimento: formData.dataNascimento,
                sexo: formData.sexo,
                courseId: formData.selectedCourse,
                classId: formData.selectedClass,
                status: 'pending',
                createdAt: serverTimestamp(),
            };
            await setDoc(doc(requestsCollection), requestData);

            // 2. Update user profile with new info (Set with merge to avoid permission errors if doc doesn't exist)
            await setDoc(userDocRef, {
                name: formData.name,
                phone: formData.phone,
                cpf: formData.cpf,
                dataNascimento: formData.dataNascimento,
                sexo: formData.sexo,
            }, { merge: true });

            setIsSuccess(true);
            toast({ title: 'Inscrição enviada!', description: 'Sua solicitação está em análise.' });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Erro ao enviar', description: 'Não foi possível completar sua inscrição.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <Card className="max-w-md mx-auto border-t-8 border-green-600">
                <CardContent className="pt-8 text-center space-y-4">
                    <div className="size-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle className="text-green-600 size-8" />
                    </div>
                    <CardTitle className="text-2xl">Inscrição Protocolada!</CardTitle>
                    <p className="text-muted-foreground">
                        Sua solicitação para o curso foi recebida com sucesso. Em breve, a secretaria entrará em contato para confirmar sua vaga na turma selecionada.
                    </p>
                    <Button variant="outline" onClick={() => window.location.reload()} className="w-full">
                        Voltar
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="max-w-2xl mx-auto shadow-xl">
            <CardHeader className="bg-primary/5 pb-8">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-2xl">Dados de Matrícula</CardTitle>
                        <CardDescription>Preencha os dados abaixo para reservar sua vaga.</CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-background">E-mail: {user.email}</Badge>
                </div>
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent className="space-y-6 pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Nome Completo</Label>
                            <Input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} required />
                        </div>
                        <div className="space-y-2">
                            <Label>Celular (WhatsApp)</Label>
                            <Input placeholder="(99) 99999-9999" value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} required />
                        </div>
                        <div className="space-y-2">
                            <Label>CPF</Label>
                            <Input placeholder="000.000.000-00" value={formData.cpf} onChange={e => setFormData(p => ({ ...p, cpf: e.target.value }))} required />
                        </div>
                        <div className="space-y-2">
                            <Label>Data de Nascimento</Label>
                            <Input type="date" value={formData.dataNascimento} onChange={e => setFormData(p => ({ ...p, dataNascimento: e.target.value }))} required />
                        </div>
                        <div className="space-y-2">
                            <Label>Sexo</Label>
                            <Select value={formData.sexo} onValueChange={v => setFormData(p => ({ ...p, sexo: v }))}>
                                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="M">Masculino</SelectItem>
                                    <SelectItem value="F">Feminino</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="pt-4 border-t space-y-4">
                        <div className="space-y-2">
                            <Label>Curso Desejado</Label>
                            <Select value={formData.selectedCourse} onValueChange={v => setFormData(p => ({ ...p, selectedCourse: v, selectedClass: '' }))}>
                                <SelectTrigger className="h-12 border-primary/20"><SelectValue placeholder="Escolha o curso..." /></SelectTrigger>
                                <SelectContent>
                                    {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Turma e Horário</Label>
                            <Select value={formData.selectedClass} onValueChange={v => setFormData(p => ({ ...p, selectedClass: v }))} disabled={!formData.selectedCourse}>
                                <SelectTrigger className="h-12 border-primary/20"><SelectValue placeholder={formData.selectedCourse ? "Escolha a melhor turma para você..." : "Selecione um curso primeiro"} /></SelectTrigger>
                                <SelectContent>
                                    {filteredClasses.map(c => (
                                        <SelectItem key={c.id} value={c.id}>{c.name} ({c.dayOfWeek} às {c.startTime})</SelectItem>
                                    ))}
                                    {formData.selectedCourse && filteredClasses.length === 0 && (
                                        <SelectItem value="none" disabled>Nenhuma turma aberta no momento</SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="bg-muted/30 p-6 flex flex-col gap-4">
                    <Button type="submit" className="w-full h-12 text-lg" disabled={isSubmitting}>
                        {isSubmitting ? <><Loader2 className="mr-2 animate-spin" /> Processando...</> : 'Concluir Minha Inscrição'}
                    </Button>
                    <p className="text-[10px] text-muted-foreground text-center">
                        Ao se inscrever, você concorda com os termos de uso e política de privacidade da IBM.
                    </p>
                </CardFooter>
            </form>
        </Card>
    );
}

function EnrollmentPageContent() {
    const { firestore, auth, user, isUserLoading } = useFirebase();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setPasswordConfirm] = useState('');
    const [step, setStep] = useState<'email' | 'auth' | 'form'>('email');
    const [isNewUser, setIsNewUser] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    const [isAuthing, setIsAuthing] = useState(false);

    const coursesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'courses')) : null, [firestore]);
    const classesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'classes')) : null, [firestore]);
    const { data: courses } = useCollection<Course>(coursesQuery);
    const { data: classes } = useCollection<Class>(classesQuery);

    useEffect(() => {
        if (!isUserLoading && user) setStep('form');
    }, [user, isUserLoading]);

    const handleVerifyEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;
        setIsChecking(true);
        // Simulate checking if email exists in Auth (Firebase doesn't allow direct check without security risks)
        // For simplicity, we'll proceed to the auth step
        setTimeout(() => {
            setStep('auth');
            setIsChecking(false);
        }, 800);
    };

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth || !email || !password) return;
        setIsAuthing(true);
        try {
            if (isNewUser) {
                if (password !== confirmPassword) throw new Error("Senhas não conferem.");
                await createUserWithEmailAndPassword(auth, email, password);
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
        } catch (error: any) {
            alert(error.message || "Falha na autenticação.");
        } finally {
            setIsAuthing(false);
        }
    };

    if (isUserLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="animate-spin size-8 text-primary" />
                <p className="text-muted-foreground animate-pulse">Carregando portal...</p>
            </div>
        );
    }

    if (step === 'form' && user && courses && classes) {
        return <EnrollmentForm user={user} courses={courses} classes={classes} />;
    }

    return (
        <Card className="max-w-md mx-auto shadow-2xl border-none">
            <CardHeader className="text-center pt-8">
                <div className="flex justify-center mb-4"><Logo className="size-10 text-primary" /></div>
                <CardTitle className="text-3xl font-black tracking-tight">Portal de Inscrições</CardTitle>
                <CardDescription>
                    {step === 'email' ? 'Informe seu e-mail para começar' : 'Complete sua identificação'}
                </CardDescription>
            </CardHeader>
            <CardContent className="pt-2 pb-8">
                {step === 'email' ? (
                    <form onSubmit={handleVerifyEmail} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Seu melhor e-mail</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="exemplo@email.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="h-12 text-lg"
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full h-12 text-lg" disabled={isChecking}>
                            {isChecking ? <Loader2 className="animate-spin" /> : <><ArrowRight className="mr-2" /> Continuar</>}
                        </Button>
                    </form>
                ) : (
                    <form onSubmit={handleAuth} className="space-y-4">
                        <div className="bg-muted/50 p-3 rounded-lg border flex justify-between items-center mb-4">
                            <span className="text-xs font-medium truncate max-w-[200px]">{email}</span>
                            <Button variant="ghost" size="sm" onClick={() => setStep('email')} className="text-[10px] h-6">Trocar</Button>
                        </div>

                        {isNewUser ? (
                            <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg mb-4">
                                <p className="text-sm font-bold text-blue-800">Cadastro não encontrado</p>
                                <p className="text-xs text-blue-600">Crie uma senha para registrar seu perfil e prosseguir com a inscrição.</p>
                            </div>
                        ) : (
                            <p className="text-sm text-center text-muted-foreground mb-4 font-medium">Bem-vindo de volta! Digite sua senha.</p>
                        )}

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="pass">Senha</Label>
                                <Input id="pass" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                            </div>
                            {isNewUser && (
                                <div className="space-y-2 animate-in slide-in-from-top-2">
                                    <Label htmlFor="pass-confirm">Confirmar Senha</Label>
                                    <Input id="pass-confirm" type="password" value={confirmPassword} onChange={e => setPasswordConfirm(e.target.value)} required />
                                </div>
                            )}
                        </div>

                        <Button type="submit" className="w-full h-12 text-lg mt-4" disabled={isAuthing}>
                            {isAuthing ? <Loader2 className="animate-spin" /> : (isNewUser ? 'Criar Conta e Continuar' : 'Entrar e Continuar')}
                        </Button>

                        <div className="text-center pt-2">
                            <Button variant="link" type="button" onClick={() => setIsNewUser(!isNewUser)} className="text-xs">
                                {isNewUser ? 'Já sou cadastrado' : 'Não tenho cadastro'}
                            </Button>
                        </div>
                    </form>
                )}
            </CardContent>
        </Card>
    );
}

export default function EnrollmentPage() {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 py-12">
            <Suspense fallback={<Loader2 className="animate-spin size-8 text-primary" />}>
                <EnrollmentPageContent />
            </Suspense>
        </div>
    );
}
