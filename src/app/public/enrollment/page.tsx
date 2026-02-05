
'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useFirebase, addDocumentNonBlocking, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CheckCircle, GraduationCap, ArrowLeft, Send } from 'lucide-react';
import { Logo } from '@/components/icons';
import Link from 'next/link';

type Course = { id: string; name: string; ministryName: string };
type Class = { id: string; name: string; courseId: string };

function EnrollmentForm() {
  const { firestore } = useFirebase();
  const searchParams = useSearchParams();
  const preSelectedCourseId = searchParams.get('courseId') || '';

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    courseId: preSelectedCourseId,
    classId: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch Courses
  const coursesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'courses')) : null, [firestore]);
  const { data: courses, isLoading: isLoadingCourses } = useCollection<Course>(coursesQuery);

  // Fetch Classes for selected course
  const classesQuery = useMemoFirebase(() => {
    if (!firestore || !formData.courseId) return null;
    return query(collection(firestore, 'classes')); // We filter locally for simplicity in public view
  }, [firestore, formData.courseId]);
  const { data: allClasses, isLoading: isLoadingClasses } = useCollection<Class>(classesQuery);

  const availableClasses = React.useMemo(() => {
    return allClasses?.filter(c => c.courseId === formData.courseId) || [];
  }, [allClasses, formData.courseId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.courseId) {
        setErrorMessage("Por favor, preencha todos os campos obrigatórios.");
        return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const requestsCollection = collection(firestore, 'enrollment_requests');
      
      // Enviando os dados. Note que usamos o firestore diretamente aqui para garantir
      // que o erro seja capturado pelo try/catch local se possível.
      await addDocumentNonBlocking(requestsCollection, {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        courseId: formData.courseId,
        classId: formData.classId || '',
        status: 'pending',
        createdAt: Timestamp.now(), // Usando o objeto Timestamp nativo
      });

      setIsSuccess(true);
    } catch (error: any) {
      console.error("Erro na inscrição:", error);
      setErrorMessage("Ocorreu um erro ao enviar sua inscrição. Por favor, tente novamente ou entre em contato com a secretaria.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <Card className="border-t-8 border-green-500">
        <CardContent className="pt-8 text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="text-green-600 size-10" />
          </div>
          <CardTitle className="text-2xl">Inscrição Recebida!</CardTitle>
          <CardDescription className="text-base">
            Olá <strong>{formData.name}</strong>, sua solicitação foi enviada com sucesso. 
            Em breve nossa equipe entrará em contato para confirmar sua matrícula.
          </CardDescription>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/"><ArrowLeft className="mr-2 size-4" /> Voltar para o início</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Formulário de Inscrição</CardTitle>
          <CardDescription>Preencha seus dados abaixo para iniciar sua jornada de aprendizado.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-md">
              {errorMessage}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Nome Completo *</Label>
            <Input id="name" name="name" value={formData.name} onChange={handleChange} placeholder="Seu nome" required />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone / WhatsApp *</Label>
              <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} placeholder="(99) 99999-9999" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="seu@email.com" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="courseId">Curso de Interesse *</Label>
            <Select 
              value={formData.courseId} 
              onValueChange={(v) => setFormData(p => ({...p, courseId: v, classId: ''}))}
              disabled={isLoadingCourses || !!preSelectedCourseId}
            >
              <SelectTrigger id="courseId">
                <SelectValue placeholder={isLoadingCourses ? "Carregando cursos..." : "Selecione o curso"} />
              </SelectTrigger>
              <SelectContent>
                {courses?.map(course => (
                  <SelectItem key={course.id} value={course.id}>{course.name} ({course.ministryName})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.courseId && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
              <Label htmlFor="classId">Turma Preferencial (Opcional)</Label>
              <Select value={formData.classId} onValueChange={(v) => setFormData(p => ({...p, classId: v}))} disabled={isLoadingClasses}>
                <SelectTrigger id="classId">
                  <SelectValue placeholder={isLoadingClasses ? "Carregando turmas..." : "Selecione uma turma (opcional)"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="null">Qualquer horário</SelectItem>
                  {availableClasses.map(cls => (
                    <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</>
            ) : (
              <><Send className="mr-2 h-4 w-4" /> Concluir Inscrição</>
            )}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}

export default function EnrollmentPage() {
  return (
    <div className="min-h-screen bg-muted/30 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-xl space-y-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Logo className="size-10 text-primary" />
          <h1 className="text-3xl font-bold text-primary">OikoApp</h1>
        </div>
        
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
            <GraduationCap className="size-6" />
            Portal de Inscrições
          </h2>
          <p className="text-muted-foreground">Bem-vindo(a)! Escolha seu curso e comece hoje mesmo.</p>
        </div>

        <Suspense fallback={<div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>}>
          <EnrollmentForm />
        </Suspense>

        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} OikoApp - Sistema Operacional da Igreja. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
