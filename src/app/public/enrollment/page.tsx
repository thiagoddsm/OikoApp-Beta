'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, doc, serverTimestamp, setDoc, getDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, UserPlus, CheckCircle, GraduationCap, ChevronRight, LogIn, Mail, Search } from 'lucide-react';
import { Logo } from '@/components/icons';
import { useToast } from '@/hooks/use-toast';
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, fetchSignInMethodsForEmail } from 'firebase/auth';

type Course = { id: string; name: string; ministryName: string; };
type Class = { id: string; courseId: string; name: string; dayOfWeek?: string; startTime?: string; };

function EnrollmentForm() {
  const searchParams = useSearchParams();
  const initialCourseId = searchParams.get('courseId');
  const { firestore, user, auth } = useFirebase();
  const { toast } = useToast();

  const [step, setStep] = useState<'email' | 'auth' | 'form' | 'success'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    cpf: '',
    dataNascimento: '',
    sexo: '',
    courseId: initialCourseId || '',
    classId: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const coursesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'courses')) : null, [firestore]);
  const { data: courses } = useCollection<Course>(coursesQuery);

  const classesQuery = useMemoFirebase(() => {
    if (!firestore || !formData.courseId) return null;
    return query(collection(firestore, 'classes'));
  }, [firestore, formData.courseId]);
  const { data: allClasses } = useCollection<Class>(classesQuery);

  const availableClasses = React.useMemo(() => {
    return allClasses?.filter(c => c.courseId === formData.courseId) || [];
  }, [allClasses, formData.courseId]);

  // Pre-fill name if user is already logged in
  useEffect(() => {
    if (user && step === 'email') {
        setFormData(prev => ({ ...prev, name: user.displayName || '' }));
        setStep('form');
    }
  }, [user, step]);

  const checkEmail = async () => {
    if (!email.trim() || !auth) return;
    setIsLoadingAuth(true);
    try {
      const methods = await fetchSignInMethodsForEmail(auth, email);
      setIsNewUser(methods.length === 0);
      setStep('auth');
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: "Erro", description: "Falha ao verificar e-mail." });
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleEmailAuth = async () => {
    if (!auth || !password) return;
    setIsLoadingAuth(true);
    try {
      if (isNewUser) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      setStep('form');
    } catch (error: any) {
      toast({ variant: 'destructive', title: "Erro na autenticação", description: "Senha incorreta ou erro no servidor." });
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!auth) return;
    setIsLoadingAuth(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setStep('form');
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !firestore) return;
    setIsSubmitting(true);

    try {
      const requestData = {
        ...formData,
        userId: user.uid,
        status: 'pending',
        createdAt: serverTimestamp(),
      };

      // 1. Save enrollment request
      await setDoc(doc(collection(firestore, 'enrollment_requests')), requestData);

      // 2. Update/Set user profile with extra info (CPF, birth, etc)
      const userDocRef = doc(firestore, 'users', user.uid);
      await setDoc(userDocRef, {
        name: formData.name,
        phone: formData.phone,
        cpf: formData.cpf,
        dataNascimento: formData.dataNascimento,
        sexo: formData.sexo,
        email: user.email,
      }, { merge: true });

      setStep('success');
      toast({ title: "Inscrição Enviada!", description: "Sua solicitação está em análise pela secretaria." });
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: "Erro ao enviar", description: "Não foi possível salvar sua inscrição." });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="mx-auto bg-green-100 p-3 rounded-full w-fit mb-4 text-green-600">
              <CheckCircle size={48} />
            </div>
            <CardTitle>Inscrição Protocolada!</CardTitle>
            <CardDescription>
              Tudo certo, {formData.name.split(' ')[0]}! Recebemos seu pedido de inscrição para {courses?.find(c => c.id === formData.courseId)?.name}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Em breve a secretaria da escola entrará em contato com você para confirmar sua matrícula e fornecer os próximos passos.
            </p>
          </CardContent>
          <CardFooter>
            <Button className="w-full" variant="outline" onClick={() => window.location.href = '/'}>
              Voltar para o Início
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-muted/30">
      <div className="max-w-xl w-full space-y-6">
        <div className="flex justify-center items-center gap-2 mb-2">
          <Logo className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-black tracking-tighter">OikoApp | Portal de Inscrição</h1>
        </div>

        <Card className="shadow-xl">
          {step === 'email' && (
            <>
              <CardHeader>
                <CardTitle>Bem-vindo ao Portal</CardTitle>
                <CardDescription>Para começar, informe seu e-mail institucional ou pessoal.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" />
                </div>
                <Button className="w-full" onClick={checkEmail} disabled={isLoadingAuth || !email.includes('@')}>
                  {isLoadingAuth ? <Loader2 className="animate-spin" /> : <ChevronRight className="mr-2" />}
                  Continuar
                </Button>
              </CardContent>
            </>
          )}

          {step === 'auth' && (
            <>
              <CardHeader>
                <CardTitle>{isNewUser ? 'Criar sua Conta' : 'Fazer Login'}</CardTitle>
                <CardDescription>
                  {isNewUser ? 'Não encontramos seu cadastro. Crie uma senha para prosseguir.' : 'Encontramos seu cadastro! Digite sua senha.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
                </div>
                <Button className="w-full" onClick={handleEmailAuth} disabled={isLoadingAuth}>
                  {isLoadingAuth ? <Loader2 className="animate-spin" /> : <LogIn className="mr-2" />}
                  {isNewUser ? 'Criar Conta e Continuar' : 'Entrar'}
                </Button>
                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t"></span></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Ou use o Google</span></div>
                </div>
                <Button variant="outline" className="w-full" onClick={handleGoogleLogin} disabled={isLoadingAuth}>
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="mr-2 h-4 w-4" alt="Google" />
                  Entrar com Google
                </Button>
              </CardContent>
              <CardFooter>
                <Button variant="ghost" size="sm" onClick={() => setStep('email')}>Alterar e-mail</Button>
              </CardFooter>
            </>
          )}

          {step === 'form' && (
            <form onSubmit={handleSubmit}>
              <CardHeader>
                <CardTitle>Dados da Matrícula</CardTitle>
                <CardDescription>Olá, {user?.displayName || user?.email}! Complete seus dados para finalizar a inscrição.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo</Label>
                    <Input id="name" required value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Celular (WhatsApp)</Label>
                    <Input id="phone" required placeholder="(21) 9..." value={formData.phone} onChange={e => setFormData(p => ({...p, phone: e.target.value}))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cpf">CPF</Label>
                    <Input id="cpf" required placeholder="000.000.000-00" value={formData.cpf} onChange={e => setFormData(p => ({...p, cpf: e.target.value}))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="birth">Data de Nascimento</Label>
                    <Input id="birth" type="date" required value={formData.dataNascimento} onChange={e => setFormData(p => ({...p, dataNascimento: e.target.value}))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Sexo</Label>
                    <Select value={formData.sexo} onValueChange={v => setFormData(p => ({...p, sexo: v}))} required>
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
                    <Select value={formData.courseId} onValueChange={v => setFormData(p => ({...p, courseId: v, classId: ''}))} required>
                      <SelectTrigger><SelectValue placeholder="Selecione o curso..." /></SelectTrigger>
                      <SelectContent>
                        {courses?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.courseId && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                      <Label>Turma e Horário Disponível</Label>
                      <Select value={formData.classId} onValueChange={v => setFormData(p => ({...p, classId: v}))} required>
                        <SelectTrigger><SelectValue placeholder="Escolha um horário..." /></SelectTrigger>
                        <SelectContent>
                          {availableClasses.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name} - {c.dayOfWeek} às {c.startTime}</SelectItem>
                          ))}
                          {availableClasses.length === 0 && <SelectItem value="null" disabled>Nenhuma turma aberta no momento</SelectItem>}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" disabled={isSubmitting || !formData.classId}>
                  {isSubmitting ? <Loader2 className="animate-spin" /> : <UserPlus className="mr-2" />}
                  Finalizar Inscrição
                </Button>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function EnrollmentPage() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="animate-spin text-primary h-8 w-8" /></div>}>
      <EnrollmentForm />
    </Suspense>
  );
}
