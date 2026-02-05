
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useFirebase, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, where, getDocs, doc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { GoogleAuthProvider, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CheckCircle, ArrowRight, Mail, UserPlus, LogIn, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/icons';

type Course = { id: string; name: string; ministryName: string };
type Class = { id: string; name: string; courseId: string };

function EnrollmentFormContent() {
  const searchParams = useSearchParams();
  const initialCourseId = searchParams.get('courseId') || '';
  const { firestore, auth, user, isUserLoading } = useFirebase();
  const { toast } = useToast();

  // Estados do Fluxo
  const [step, setStep] = useState<'email' | 'check' | 'form' | 'success'>('email');
  const [emailInput, setEmailInput] = useState('');
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [userExists, setUserExists] = useState(false);
  
  // Estados do Formulário
  const [selectedCourseId, setSelectedCourseId] = useState(initialCourseId);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dados do Firebase
  const coursesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'courses')) : null, [firestore]);
  const classesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'classes')) : null, [firestore]);
  const { data: courses } = useCollection<Course>(coursesQuery);
  const { data: allClasses } = useCollection<Class>(classesQuery);

  const availableClasses = allClasses?.filter(c => c.courseId === selectedCourseId) || [];

  // 1. Lidar com o retorno do Redirecionamento Google
  useEffect(() => {
    if (!auth) return;

    const handleRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          // Se o usuário logou, mas não tem documento no Firestore, cria agora
          const userDocRef = doc(firestore!, 'users', result.user.uid);
          const userSnap = await getDocs(query(collection(firestore!, 'users'), where('email', '==', result.user.email)));
          
          if (userSnap.empty) {
            await setDoc(userDocRef, {
              name: result.user.displayName || 'Novo Aluno',
              email: result.user.email || '',
              phone: result.user.phoneNumber || '',
              integrationStatus: 'visitante_culto',
              createdAt: serverTimestamp(),
              hierarchy: { role: '' }
            });
          }
          setStep('form');
        }
      } catch (error) {
        console.error("Erro no retorno do login:", error);
      }
    };

    handleRedirect();
  }, [auth, firestore]);

  // 2. Se o usuário já estiver logado, pula para o formulário
  useEffect(() => {
    if (user && !isUserLoading) {
      setStep('form');
    }
  }, [user, isUserLoading]);

  // Passo 1: Verificar e-mail (Estilo Eklesia)
  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim() || !firestore) return;

    setIsCheckingEmail(true);
    try {
      const q = query(collection(firestore, 'users'), where('email', '==', emailInput.toLowerCase().trim()));
      const querySnapshot = await getDocs(q);
      
      setUserExists(!querySnapshot.empty);
      setStep('check');
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao verificar e-mail' });
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const handleGoogleLogin = () => {
    if (!auth) return;
    const provider = new GoogleAuthProvider();
    signInWithRedirect(auth, provider);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedCourseId) return;

    setIsSubmitting(true);
    try {
      const collectionRef = collection(firestore!, 'enrollment_requests');
      await addDocumentNonBlocking(collectionRef, {
        name: user.displayName,
        email: user.email,
        phone: phone,
        courseId: selectedCourseId,
        classId: selectedClassId,
        status: 'pending',
        createdAt: Timestamp.now(),
      });

      setStep('success');
      toast({ title: "Inscrição enviada!", description: "Aguarde o contato da nossa equipe." });
    } catch (error) {
      toast({ 
        variant: 'destructive', 
        title: "Erro ao enviar", 
        description: "Ocorreu um erro de permissão ou conexão. Tente novamente." 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Renderização por Etapas
  if (step === 'email') {
    return (
      <Card className="w-full">
        <CardHeader className="text-center">
          <CardTitle>Inscrição em Cursos</CardTitle>
          <CardDescription>Para começar, informe seu e-mail para identificação.</CardDescription>
        </CardHeader>
        <form onSubmit={handleVerifyEmail}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email-check">Seu melhor e-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="email-check" 
                  type="email" 
                  placeholder="exemplo@gmail.com" 
                  className="pl-10"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  required 
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isCheckingEmail}>
              {isCheckingEmail ? <Loader2 className="animate-spin mr-2" /> : <ArrowRight className="mr-2" />}
              Continuar
            </Button>
          </CardFooter>
        </form>
      </Card>
    );
  }

  if (step === 'check') {
    return (
      <Card className="w-full border-primary/20 bg-primary/5">
        <CardHeader className="text-center">
          {userExists ? (
            <>
              <div className="mx-auto bg-green-100 p-3 rounded-full w-fit mb-4 text-green-600"><LogIn size={32} /></div>
              <CardTitle>Cadastro encontrado!</CardTitle>
              <CardDescription>Encontramos seus dados para: <strong>{emailInput}</strong></CardDescription>
            </>
          ) : (
            <>
              <div className="mx-auto bg-amber-100 p-3 rounded-full w-fit mb-4 text-amber-600"><AlertCircle size={32} /></div>
              <CardTitle>Cadastro não encontrado!</CardTitle>
              <CardDescription>Não encontramos um cadastro para: <strong>{emailInput}</strong></CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          {userExists 
            ? "Faça login com sua conta Google para confirmar sua identidade e realizar sua inscrição."
            : "Você pode criar uma nova conta agora mesmo para realizar sua inscrição no curso."}
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button onClick={handleGoogleLogin} className="w-full">
            {userExists ? <LogIn className="mr-2" /> : <UserPlus className="mr-2" />}
            {userExists ? "Entrar com Google" : "Cadastre-se com Google"}
          </Button>
          <Button variant="ghost" onClick={() => setStep('email')} className="w-full">
            Tentar outro e-mail
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (step === 'form') {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Detalhes da Inscrição</CardTitle>
          <CardDescription>Olá, {user?.displayName}! Complete os dados abaixo.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={user?.displayName || ''} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input value={user?.email || ''} disabled className="bg-muted" />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">WhatsApp (com DDD) *</Label>
              <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(21) 99999-9999" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="course">Curso Desejado *</Label>
              <Select value={selectedCourseId} onValueChange={setSelectedCourseId} required>
                <SelectTrigger id="course">
                  <SelectValue placeholder="Selecione o curso" />
                </SelectTrigger>
                <SelectContent>
                  {courses?.map(c => <SelectItem key={c.id} value={c.id}>{c.name} ({c.ministryName})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="class">Turma Preferencial (Opcional)</Label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger id="class">
                  <SelectValue placeholder="Selecione a turma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="null">Ainda não sei / Ver turmas disponíveis</SelectItem>
                  {availableClasses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : null}
              Finalizar Inscrição
            </Button>
          </CardFooter>
        </form>
      </Card>
    );
  }

  if (step === 'success') {
    return (
      <Card className="w-full text-center py-10">
        <CardContent className="space-y-4">
          <div className="mx-auto bg-green-100 p-4 rounded-full w-fit text-green-600 mb-4">
            <CheckCircle size={48} />
          </div>
          <CardTitle className="text-2xl">Tudo pronto!</CardTitle>
          <p className="text-muted-foreground">
            Sua solicitação de inscrição foi recebida com sucesso. <br/>
            Nossa equipe entrará em contato em breve pelo WhatsApp.
          </p>
          <Button variant="outline" onClick={() => window.close()} className="mt-6">
            Fechar esta página
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex justify-center p-10">
      <Loader2 className="animate-spin h-8 w-8 text-primary" />
      <span className="ml-3 font-medium">Autenticando...</span>
    </div>
  );
}

export default function EnrollmentPage() {
  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-8">
        <div className="flex flex-col items-center gap-2">
          <Logo className="h-12 w-12 text-primary" />
          <h1 className="text-3xl font-bold">OikoApp</h1>
          <p className="text-muted-foreground text-sm">Portal de Inscrições Ministeriais</p>
        </div>
        
        <Suspense fallback={<div className="flex justify-center p-10"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>}>
          <EnrollmentFormContent />
        </Suspense>
      </div>
    </main>
  );
}
