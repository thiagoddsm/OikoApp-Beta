
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useFirebase, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, Timestamp } from 'firebase/firestore';
import { GoogleAuthProvider, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CheckCircle, GraduationCap, User, Phone, Mail, Send, LogIn } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/icons';

type Course = { id: string; name: string };

function EnrollmentFormContent() {
  const { auth, firestore, user, isUserLoading } = useFirebase();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const courseIdParam = searchParams.get('courseId');
  const [selectedCourseId, setSelectedCourseId] = useState(courseIdParam || '');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const coursesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'courses')) : null, [firestore]);
  const { data: courses, isLoading: isLoadingCourses } = useCollection<Course>(coursesQuery);

  // Lidar com o resultado do redirecionamento do Google
  useEffect(() => {
    if (auth) {
      setIsAuthenticating(true);
      getRedirectResult(auth)
        .then(() => {
          setIsAuthenticating(false);
        })
        .catch((error) => {
          console.error("Erro ao processar retorno do Google:", error);
          setIsAuthenticating(false);
          if (error.code !== 'auth/popup-closed-by-user') {
             toast({
                variant: 'destructive',
                title: 'Erro no Login',
                description: 'Não foi possível completar a autenticação com o Google.',
            });
          }
        });
    }
  }, [auth, toast]);

  useEffect(() => {
    if (courseIdParam) {
      setSelectedCourseId(courseIdParam);
    }
  }, [courseIdParam]);

  const handleGoogleLogin = async () => {
    if (!auth) return;
    const provider = new GoogleAuthProvider();
    try {
      // Usar Redirect em vez de Popup para evitar problemas em ambientes de container/mobile
      await signInWithRedirect(auth, provider);
    } catch (error) {
      console.error("Erro ao iniciar login:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedCourseId || !phone) {
        toast({ variant: 'destructive', title: 'Campos Obrigatórios', description: 'Por favor, preencha todos os campos.' });
        return;
    }

    setIsSubmitting(true);
    try {
        const collectionRef = collection(firestore, 'enrollment_requests');
        await addDocumentNonBlocking(collectionRef, {
            name: user.displayName || 'Sem nome',
            email: user.email || '',
            phone,
            courseId: selectedCourseId,
            classId: '', // Será atribuído pelo admin
            status: 'pending',
            createdAt: Timestamp.now(),
        });
        setIsSubmitted(true);
        toast({ title: 'Sucesso!', description: 'Sua solicitação foi enviada.' });
    } catch (error) {
        console.error("Erro ao enviar:", error);
        toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível enviar sua inscrição.' });
    } finally {
        setIsSubmitting(false);
    }
  };

  if (isUserLoading || isAuthenticating) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground animate-pulse">
            {isAuthenticating ? "Autenticando com o Google..." : "Carregando portal..."}
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center space-y-6 py-10">
        <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <User className="size-10 text-primary" />
        </div>
        <div className="space-y-2">
            <h2 className="text-2xl font-bold">Identifique-se para continuar</h2>
            <p className="text-muted-foreground max-w-sm mx-auto">
                Para garantir a segurança dos seus dados, utilize sua conta Google para realizar a inscrição.
            </p>
        </div>
        <Button onClick={handleGoogleLogin} size="lg" className="w-full max-w-xs h-12 text-lg">
            <LogIn className="mr-2 size-5" />
            Entrar com Google
        </Button>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="text-center py-12 space-y-6">
        <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="size-10 text-green-600" />
        </div>
        <div className="space-y-2">
            <h2 className="text-2xl font-bold text-green-800">Inscrição Recebida!</h2>
            <p className="text-muted-foreground">
                Obrigado, <strong>{user.displayName}</strong>. Recebemos seu interesse e entraremos em contato em breve via WhatsApp.
            </p>
        </div>
        <Button variant="outline" onClick={() => window.location.reload()}>
            Fazer outra inscrição
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label className="flex items-center gap-2"><User className="size-4 text-primary"/> Nome Completo</Label>
                <Input value={user.displayName || ''} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
                <Label className="flex items-center gap-2"><Mail className="size-4 text-primary"/> E-mail</Label>
                <Input value={user.email || ''} disabled className="bg-muted" />
            </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone" className="flex items-center gap-2"><Phone className="size-4 text-primary"/> WhatsApp (com DDD) *</Label>
          <Input 
            id="phone" 
            placeholder="(21) 99999-9999" 
            value={phone} 
            onChange={e => setPhone(e.target.value)} 
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="course" className="flex items-center gap-2"><GraduationCap className="size-4 text-primary"/> Curso Desejado *</Label>
          <Select value={selectedCourseId} onValueChange={setSelectedCourseId} required>
            <SelectTrigger id="course">
              <SelectValue placeholder="Selecione o curso" />
            </SelectTrigger>
            <SelectContent>
              {isLoadingCourses ? (
                <div className="flex items-center justify-center p-2"><Loader2 className="size-4 animate-spin" /></div>
              ) : (
                courses?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button type="submit" className="w-full h-12 text-lg" disabled={isSubmitting}>
        {isSubmitting ? (
          <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Enviando...</>
        ) : (
          <><Send className="mr-2 h-5 w-5" /> Confirmar Inscrição</>
        )}
      </Button>
    </form>
  );
}

export default function EnrollmentPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Logo className="size-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">OikoApp</h1>
        </div>

        <Card className="shadow-xl border-t-4 border-primary">
          <CardHeader className="bg-white">
            <CardTitle className="text-2xl">Portal de Inscrições</CardTitle>
            <CardDescription>
              Preencha os dados abaixo para manifestar seu interesse em nossos cursos.
            </CardDescription>
          </CardHeader>
          <CardContent className="bg-white">
            <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>}>
                <EnrollmentFormContent />
            </Suspense>
          </CardContent>
          <CardFooter className="bg-slate-50 border-t flex justify-center py-4">
            <p className="text-xs text-muted-foreground">Igreja Batista da Manhã • Gestão Ministerial Inteligente</p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
