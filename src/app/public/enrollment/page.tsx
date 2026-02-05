
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, Timestamp, addDoc } from 'firebase/firestore';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CheckCircle, GraduationCap, LogIn } from 'lucide-react';
import { Logo } from '@/components/icons';
import { useToast } from '@/hooks/use-toast';

type Course = { id: string; name: string; ministryName: string };
type Class = { id: string; name: string; courseId: string };

function EnrollmentFormContent() {
  const { firestore, auth, user, isUserLoading } = useFirebase();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const preSelectedCourseId = searchParams.get('courseId');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    courseId: '',
    classId: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const coursesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'courses')) : null, [firestore]);
  const classesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'classes')) : null, [firestore]);

  const { data: courses, isLoading: isLoadingCourses } = useCollection<Course>(coursesQuery);
  const { data: classes, isLoading: isLoadingClasses } = useCollection<Class>(classesQuery);

  // Pre-fill user data and course from URL
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.displayName || '',
        email: user.email || '',
      }));
    }
    if (preSelectedCourseId) {
      setFormData(prev => ({ ...prev, courseId: preSelectedCourseId }));
    }
  }, [user, preSelectedCourseId]);

  const availableClasses = classes?.filter(c => c.courseId === formData.courseId) || [];

  const handleGoogleLogin = async () => {
    if (!auth) return;
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
      toast({ variant: 'destructive', title: 'Erro no Login', description: 'Não foi possível autenticar com o Google.' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !user) return;

    setIsSubmitting(true);

    try {
      const requestsCollection = collection(firestore, 'enrollment_requests');
      await addDoc(requestsCollection, {
        ...formData,
        userId: user.uid,
        status: 'pending',
        createdAt: Timestamp.now(),
      });

      setIsSuccess(true);
      toast({ title: "Inscrição Enviada!", description: "Sua solicitação foi recebida com sucesso." });
    } catch (error: any) {
      console.error("Error submitting enrollment:", error);
      toast({
        variant: 'destructive',
        title: "Erro ao Enviar",
        description: "Ocorreu um problema ao salvar sua inscrição. Tente novamente.",
      });
    } finally {
      setIsSubmitting(true);
      // Mantemos o loading true para evitar cliques duplos se o estado de sucesso não for imediato
      setIsSubmitting(false);
    }
  };

  if (isUserLoading || isLoadingCourses) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Preparando seu formulário...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <Card className="border-primary/20 shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary/10 p-4 rounded-full w-16 h-16 flex items-center justify-center mb-4 text-primary">
            <LogIn className="size-8" />
          </div>
          <CardTitle className="text-2xl">Quase lá!</CardTitle>
          <CardDescription>
            Para garantir a segurança dos seus dados e agilizar sua inscrição, precisamos que você se identifique.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-6">
          <p className="text-sm text-muted-foreground mb-8">
            Usaremos apenas seu nome e e-mail públicos do Google para preencher o formulário.
          </p>
          <Button onClick={handleGoogleLogin} size="lg" className="w-full sm:w-auto px-12">
            Entrar com Google e Continuar
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isSuccess) {
    return (
      <Card className="border-green-200 bg-green-50/30 text-center py-12 px-6">
        <div className="mx-auto bg-green-100 p-4 rounded-full w-20 h-20 flex items-center justify-center mb-6 text-green-600">
          <CheckCircle className="size-12" />
        </div>
        <CardTitle className="text-3xl font-bold text-green-800 mb-4">Inscrição Protocolada!</CardTitle>
        <CardDescription className="text-lg text-green-700 max-w-md mx-auto">
          Obrigado, <strong>{formData.name}</strong>! Recebemos seu interesse e a equipe do ministério entrará em contato em breve para confirmar sua matrícula.
        </CardDescription>
        <CardFooter className="justify-center mt-8">
          <Button asChild variant="outline" className="border-green-200 hover:bg-green-100">
            <a href="/">Voltar para o Início</a>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 shadow-2xl">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          <GraduationCap className="text-primary" />
          Formulário de Inscrição
        </CardTitle>
        <CardDescription>
          Olá {user.displayName?.split(' ')[0]}, preencha os detalhes abaixo para solicitar sua vaga.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Seu Nome</Label>
              <Input id="name" value={formData.name} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={formData.email} disabled className="bg-muted" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefone / WhatsApp *</Label>
            <Input
              id="phone"
              required
              placeholder="(21) 9..."
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="course">Curso Desejado *</Label>
            <Select
              required
              value={formData.courseId}
              onValueChange={(v) => setFormData({ ...formData, courseId: v, classId: '' })}
            >
              <SelectTrigger id="course">
                <SelectValue placeholder="Selecione o curso" />
              </SelectTrigger>
              <SelectContent>
                {courses?.map(course => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.name} ({course.ministryName})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.courseId && availableClasses.length > 0 && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
              <Label htmlFor="class">Turma de Preferência</Label>
              <Select
                value={formData.classId}
                onValueChange={(v) => setFormData({ ...formData, classId: v })}
              >
                <SelectTrigger id="class">
                  <SelectValue placeholder="Selecione a turma (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="null">Ainda não decidi</SelectItem>
                  {availableClasses.map(cls => (
                    <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando...</>
            ) : 'Enviar Solicitação de Matrícula'}
          </Button>
          <p className="text-[10px] text-center text-muted-foreground uppercase tracking-widest">
            Ao se inscrever, você concorda com nossa política de privacidade.
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function EnrollmentPage() {
  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="flex justify-center items-center gap-2 mb-8">
          <Logo className="h-10 w-10 text-primary" />
          <h1 className="text-4xl font-black tracking-tighter text-slate-900">OikoApp</h1>
        </div>

        <Suspense fallback={
          <div className="flex justify-center p-12">
            <Loader2 className="animate-spin text-primary h-8 w-8" />
          </div>
        }>
          <EnrollmentFormContent />
        </Suspense>

        <div className="text-center mt-12">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} IBM - Garantindo que a Organização sirva ao Organismo.
          </p>
        </div>
      </div>
    </main>
  );
}
