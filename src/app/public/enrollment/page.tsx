'use client';

import React, { useState, useMemo } from 'react';
import { useFirebase, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, where, getDocs, Timestamp, limit } from 'firebase/firestore';
import { PublicNavbar } from '@/components/public/navbar';
import { PublicFooter } from '@/components/public/footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Loader2, BookOpen, User, Mail, Phone, ChevronRight, GraduationCap, ArrowLeft, Search, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export default function EnrollmentPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  
  const coursesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'courses')) : null, [firestore]);
  const classesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'classes')) : null, [firestore]);
  
  const { data: courses, isLoading: loadingCourses } = useCollection(coursesQuery);
  const { data: classes, isLoading: loadingClasses } = useCollection(classesQuery);

  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [step, setStep] = useState<'list' | 'email' | 'form' | 'success'>('list');
  const [email, setEmail] = useState('');
  const [existingUser, setExistingUser] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    classId: ''
  });

  const lumineCourses = useMemo(() => {
    if (!courses) return [];
    return courses.filter(c => 
      c.ministryName?.toLowerCase().includes('lumine') || 
      c.ministryName?.toLowerCase().includes('ebd')
    );
  }, [courses]);

  const filteredByTrack = (track: string) => {
    return lumineCourses.filter(c => c.ebdTrack === track);
  };

  const handleCourseSelect = (course: any) => {
    const courseClasses = classes?.filter(cls => cls.courseId === course.id) || [];
    if (courseClasses.length === 0) return;
    setSelectedCourse(course);
    setStep('email');
  };

  const handleEmailCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !firestore) return;
    
    setIsVerifying(true);
    try {
      const usersRef = collection(firestore, 'users');
      const q = query(usersRef, where('email', '==', email.toLowerCase().trim()), limit(1));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        setExistingUser({ ...snap.docs[0].data(), id: snap.docs[0].id });
      } else {
        setExistingUser(null);
      }
      setStep('form');
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao verificar e-mail' });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !selectedCourse || !formData.classId) return;
    
    setIsVerifying(true);
    try {
      let userId = existingUser?.id;
      
      if (!userId) {
        const newUserRef = await addDocumentNonBlocking(collection(firestore, 'users'), {
          name: formData.name,
          email: email.toLowerCase().trim(),
          phone: formData.phone,
          integrationStatus: 'nao_alcancado',
          createdAt: Timestamp.now()
        });
        userId = newUserRef.id;
      }

      await addDocumentNonBlocking(collection(firestore, 'enrollment_requests'), {
        userId,
        courseId: selectedCourse.id,
        classId: formData.classId,
        name: existingUser?.name || formData.name,
        email: email.toLowerCase().trim(),
        phone: existingUser?.phone || formData.phone,
        status: 'pending',
        createdAt: Timestamp.now()
      });

      setStep('success');
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro na inscrição' });
    } finally {
      setIsVerifying(false);
    }
  };

  if (loadingCourses || loadingClasses) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <PublicNavbar />
      <main className="flex-1 container mx-auto px-4 py-12">
        {step === 'list' && (
          <div className="space-y-12">
            <div className="text-center">
              <h1 className="text-4xl md:text-6xl font-black text-slate-900 italic tracking-tighter">LUMINE</h1>
              <p className="text-slate-500 mt-2 font-medium">Escola Bíblica Discipuladora - IBM</p>
            </div>

            <Tabs defaultValue="discipulado" className="w-full">
              <div className="flex justify-center mb-8">
                <TabsList className="bg-white border p-1 rounded-xl shadow-sm">
                  <TabsTrigger value="discipulado" className="rounded-lg text-[10px] uppercase font-bold tracking-tight px-6">Discipulado</TabsTrigger>
                  <TabsTrigger value="biblico" className="rounded-lg text-[10px] uppercase font-bold tracking-tight px-6">BÍBLICO</TabsTrigger>
                  <TabsTrigger value="teologia" className="rounded-lg text-[10px] uppercase font-bold tracking-tight px-6">Teologia</TabsTrigger>
                </TabsList>
              </div>

              {['discipulado', 'biblico', 'teologico'].map(track => (
                <TabsContent key={track} value={track === 'teologico' ? 'teologia' : track} className="animate-in fade-in-50 duration-500">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredByTrack(track).map(course => {
                      const courseClasses = classes?.filter(cls => cls.courseId === course.id) || [];
                      const isAvailable = courseClasses.length > 0;
                      
                      return (
                        <Card key={course.id} className={cn(
                          "group transition-all duration-300 hover:shadow-xl border-none overflow-hidden h-full flex flex-col",
                          !isAvailable && "grayscale opacity-60"
                        )}>
                          <div className="h-40 bg-slate-200 relative overflow-hidden shrink-0">
                            <CardHeader className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex justify-end pb-4">
                              <CardTitle className="text-white text-xl font-bold">{course.name}</CardTitle>
                            </CardHeader>
                          </div>
                          <CardContent className="p-6 flex-1">
                            <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed">{course.description}</p>
                            <div className="mt-4 flex items-center justify-between">
                              <Badge variant="outline" className="text-[10px] uppercase font-black">
                                {isAvailable ? `${courseClasses.length} Turmas` : 'Sem Turmas'}
                              </Badge>
                            </div>
                          </CardContent>
                          <CardFooter className="p-6 pt-0">
                            <Button 
                              className="w-full font-bold h-11" 
                              disabled={!isAvailable}
                              onClick={() => handleCourseSelect(course)}
                            >
                              {isAvailable ? 'Inscrever-se' : 'Indisponível'}
                            </Button>
                          </CardFooter>
                        </Card>
                      )
                    })}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        )}

        {step === 'email' && (
          <Card className="max-w-md mx-auto shadow-2xl border-none rounded-2xl overflow-hidden">
            <CardHeader className="bg-primary text-white p-8">
              <div className="flex items-center gap-2 mb-2">
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 -ml-2 h-8 w-8" onClick={() => setStep('list')}>
                  <ArrowLeft className="size-5" />
                </Button>
                <CardTitle className="text-2xl font-black italic tracking-tighter uppercase">Identificação</CardTitle>
              </div>
              <CardDescription className="text-primary-foreground/80">Insira seu e-mail para validar seu cadastro no curso <strong>{selectedCourse.name}</strong>.</CardDescription>
            </CardHeader>
            <form onSubmit={handleEmailCheck}>
              <CardContent className="p-8 pt-10 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[10px] font-black uppercase text-muted-foreground">E-mail de Cadastro</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    required 
                    placeholder="seu@email.com" 
                    className="h-12 text-base"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
              </CardContent>
              <CardFooter className="p-8 pt-0">
                <Button type="submit" className="w-full h-12 font-black uppercase" disabled={isVerifying}>
                  {isVerifying ? <Loader2 className="animate-spin mr-2" /> : <ChevronRight className="mr-2" />}
                  Próximo Passo
                </Button>
              </CardFooter>
            </form>
          </Card>
        )}

        {step === 'form' && (
          <Card className="max-w-md mx-auto shadow-2xl border-none rounded-2xl overflow-hidden">
            <CardHeader className="bg-primary text-white p-8">
              <CardTitle className="text-2xl font-black italic tracking-tighter uppercase">Matrícula</CardTitle>
              <CardDescription className="text-primary-foreground/80">
                {existingUser 
                  ? `Olá, ${existingUser.name.split(' ')[0]}! Confirme sua turma abaixo.` 
                  : `Complete seus dados para participar do curso ${selectedCourse.name}.`
                }
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleEnroll}>
              <CardContent className="p-8 pt-10 space-y-6">
                {!existingUser && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-[10px] font-black uppercase text-muted-foreground">Nome Completo</Label>
                      <Input id="name" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="h-12" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-[10px] font-black uppercase text-muted-foreground">Telefone/WhatsApp</Label>
                      <Input id="phone" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="(21) 9..." className="h-12" />
                    </div>
                  </>
                )}
                <div className="space-y-2">
                  <Label htmlFor="class" className="text-[10px] font-black uppercase text-muted-foreground">Escolha a Turma</Label>
                  <Select value={formData.classId} onValueChange={v => setFormData({...formData, classId: v})}>
                    <SelectTrigger className="h-12"><SelectValue placeholder="Selecione um horário..." /></SelectTrigger>
                    <SelectContent>
                      {classes?.filter(c => c.courseId === selectedCourse.id).map(cls => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name} ({cls.dayOfWeek} às {cls.startTime})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
              <CardFooter className="p-8 pt-0">
                <Button type="submit" className="w-full h-12 font-black uppercase" disabled={isVerifying || !formData.classId}>
                  {isVerifying ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2" />}
                  Finalizar Inscrição
                </Button>
              </CardFooter>
            </form>
          </Card>
        )}

        {step === 'success' && (
          <Card className="max-w-md mx-auto text-center p-12 shadow-2xl border-none rounded-2xl">
            <div className="size-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <CheckCircle2 size={40} />
            </div>
            <CardTitle className="text-3xl font-black italic tracking-tighter uppercase mb-2">Inscrição Enviada!</CardTitle>
            <CardDescription className="text-base">
              Sua solicitação para o curso <strong>{selectedCourse.name}</strong> foi recebida. Em breve o líder responsável entrará em contato.
            </CardDescription>
            <Button className="mt-8 w-full h-12 font-black uppercase" onClick={() => window.location.reload()}>
              Voltar ao Portal
            </Button>
          </Card>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}
