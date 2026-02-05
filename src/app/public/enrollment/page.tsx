
'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useFirebase, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CheckCircle, ArrowLeft, GraduationCap, Phone, Mail, User } from 'lucide-react';
import { Logo } from '@/components/icons';
import { useToast } from '@/hooks/use-toast';

type Course = { id: string; name: string; ministryName: string };
type Class = { id: string; courseId: string; name: string };

function EnrollmentForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  
  const courseIdParam = searchParams.get('courseId');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    courseId: courseIdParam || '',
    classId: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Fetch courses and classes
  const coursesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'courses')) : null, [firestore]);
  const classesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'classes')) : null, [firestore]);
  
  const { data: courses, isLoading: isLoadingCourses } = useCollection<Course>(coursesQuery);
  const { data: classes, isLoading: isLoadingClasses } = useCollection<Class>(classesQuery);

  const filteredClasses = useMemo(() => {
    if (!classes || !formData.courseId) return [];
    return classes.filter(c => c.courseId === formData.courseId);
  }, [classes, formData.courseId]);

  useEffect(() => {
    if (courseIdParam) {
        setFormData(prev => ({ ...prev, courseId: courseIdParam }));
    }
  }, [courseIdParam]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value, ...(name === 'courseId' ? { classId: '' } : {}) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.courseId) {
      toast({ variant: 'destructive', title: 'Campos obrigatórios', description: 'Por favor, preencha pelo menos Nome, Telefone e o Curso.' });
      return;
    }

    setIsSubmitting(true);

    try {
      const requestsCollection = collection(firestore, 'enrollment_requests');
      await addDocumentNonBlocking(requestsCollection, {
        ...formData,
        status: 'pending',
        createdAt: Timestamp.now(), // Usando instância real do Timestamp
      });

      setIsSuccess(true);
      toast({ title: 'Inscrição Enviada!', description: 'Recebemos sua solicitação. Entraremos em contato em breve.' });
    } catch (error) {
      console.error("Erro na inscrição:", error);
      toast({ variant: 'destructive', title: 'Erro ao enviar', description: 'Ocorreu um erro técnico. Por favor, tente novamente.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <Card className="border-t-8 border-primary animate-fade-in">
        <CardContent className="pt-10 pb-10 text-center space-y-6">
          <div className="mx-auto w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
            <CheckCircle size={48} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Inscrição Protocolada!</h2>
            <p className="text-muted-foreground">
              Obrigado pelo seu interesse, <strong>{formData.name}</strong>. <br/>
              Nossa equipe pedagógica analisará sua solicitação e entrará em contato via WhatsApp.
            </p>
          </div>
          <Button variant="outline" onClick={() => window.location.reload()} className="w-full">
            Fazer outra inscrição
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-2xl border-none">
      <CardHeader className="bg-primary text-primary-foreground rounded-t-lg">
        <CardTitle className="text-2xl flex items-center gap-2">
          <GraduationCap /> Ficha de Inscrição
        </CardTitle>
        <CardDescription className="text-primary-foreground/80">
          Preencha os dados abaixo para iniciar sua jornada de aprendizado conosco.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6 pt-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2"><User size={14}/> Nome Completo *</Label>
              <Input id="name" name="name" value={formData.name} onChange={handleChange} placeholder="Seu nome" required />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2"><Phone size={14}/> WhatsApp *</Label>
                <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} placeholder="(21) 99999-9999" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2"><Mail size={14}/> E-mail</Label>
                <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="seu@email.com" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="courseId">Curso de Interesse *</Label>
              <Select value={formData.courseId} onValueChange={(v) => handleSelectChange('courseId', v)}>
                <SelectTrigger id="courseId">
                  <SelectValue placeholder={isLoadingCourses ? "Carregando cursos..." : "Selecione o curso"} />
                </SelectTrigger>
                <SelectContent>
                  {courses?.map(course => (
                    <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.courseId && filteredClasses.length > 0 && (
              <div className="space-y-2 animate-in slide-in-from-top-2">
                <Label htmlFor="classId">Turma Preferencial</Label>
                <Select value={formData.classId} onValueChange={(v) => handleSelectChange('classId', v)}>
                  <SelectTrigger id="classId">
                    <SelectValue placeholder="Selecione uma turma (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredClasses.map(cls => (
                      <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full h-12 text-lg font-bold" disabled={isSubmitting}>
            {isSubmitting ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processando...</> : "Confirmar Inscrição"}
          </Button>
          <p className="text-[10px] text-center text-muted-foreground">
            Ao se inscrever, você concorda com nossa política de privacidade e tratamento de dados para fins ministeriais.
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function EnrollmentPortalPage() {
  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-xl space-y-8">
        <div className="flex flex-col items-center gap-4">
          <div className="p-3 bg-white rounded-2xl shadow-sm">
            <Logo className="h-12 w-12 text-primary" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-black tracking-tight text-slate-900">OikoApp Ensino</h1>
            <p className="text-slate-500 font-medium uppercase tracking-widest text-xs">Igreja Batista da Manhã</p>
          </div>
        </div>

        <Suspense fallback={<div className="flex justify-center p-10"><Loader2 className="animate-spin text-primary" /></div>}>
            <EnrollmentForm />
        </Suspense>

        <footer className="text-center">
            <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
                <a href="/"><ArrowLeft className="mr-2 h-4 w-4" /> Voltar para o início</a>
            </Button>
        </footer>
      </div>
    </main>
  );
}
