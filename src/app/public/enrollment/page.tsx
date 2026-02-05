
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useFirebase, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Logo } from '@/components/icons';
import { Loader2, CheckCircle, ArrowRight, User, Mail, Phone, BookOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Course = { id: string; name: string; ministryName: string; };
type Class = { id: string; courseId: string; name: string; dayOfWeek?: string; startTime?: string; };

export default function PublicEnrollmentPage() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const preselectedCourseId = searchParams.get('courseId');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        courseId: '',
        classId: '',
    });

    const coursesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'courses')) : null, [firestore]);
    const classesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'classes')) : null, [firestore]);

    const { data: courses, isLoading: isLoadingCourses } = useCollection<Course>(coursesQuery);
    const { data: classes, isLoading: isLoadingClasses } = useCollection<Class>(classesQuery);

    useEffect(() => {
        if (preselectedCourseId && courses) {
            const courseExists = courses.some(c => c.id === preselectedCourseId);
            if (courseExists) {
                setFormData(prev => ({ ...prev, courseId: preselectedCourseId }));
            }
        }
    }, [preselectedCourseId, courses]);

    const availableClasses = useMemo(() => {
        if (!formData.courseId || !classes) return [];
        return classes.filter(cls => cls.courseId === formData.courseId);
    }, [formData.courseId, classes]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value, ...(name === 'courseId' ? { classId: '' } : {}) }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.phone || !formData.courseId) {
            toast({ variant: 'destructive', title: 'Campos obrigatórios', description: 'Por favor, preencha os dados de contato e o curso desejado.' });
            return;
        }

        setIsSubmitting(true);
        try {
            const requestsCollection = collection(firestore!, 'enrollment_requests');
            await addDocumentNonBlocking(requestsCollection, {
                ...formData,
                status: 'pending',
                createdAt: Timestamp.now(),
            });
            setIsSuccess(true);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro ao enviar', description: 'Não foi possível completar sua inscrição. Tente novamente mais tarde.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
                <Card className="max-w-md w-full text-center p-8 border-t-8 border-primary">
                    <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
                        <CheckCircle className="text-green-600 w-10 h-10" />
                    </div>
                    <CardTitle className="text-2xl mb-2">Inscrição Enviada!</CardTitle>
                    <CardDescription className="text-base">
                        Olá, {formData.name.split(' ')[0]}! Sua solicitação de inscrição foi recebida com sucesso.
                    </CardDescription>
                    <CardContent className="mt-6">
                        <p className="text-muted-foreground text-sm">
                            Nossa equipe ministerial entrará em contato em breve via WhatsApp ou E-mail para confirmar sua vaga e os próximos passos.
                        </p>
                    </CardContent>
                    <CardFooter className="flex justify-center">
                        <Button variant="outline" onClick={() => window.location.reload()}>Fazer outra inscrição</Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-muted/30 flex flex-col items-center py-12 px-4">
            <div className="flex items-center gap-2 mb-8">
                <Logo className="size-8 text-primary" />
                <h1 className="text-2xl font-bold tracking-tight">OikoApp</h1>
            </div>

            <Card className="max-w-xl w-full shadow-lg">
                <CardHeader className="text-center border-b bg-primary/5">
                    <CardTitle className="text-2xl">Ficha de Inscrição</CardTitle>
                    <CardDescription>
                        Preencha os dados abaixo para iniciar sua jornada de aprendizado na IBM.
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-6 pt-8">
                        <section className="space-y-4">
                            <h3 className="text-sm font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                                <User className="size-4" /> Dados de Contato
                            </h3>
                            <div className="grid gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Nome Completo</Label>
                                    <Input id="name" name="name" value={formData.name} onChange={handleInputChange} placeholder="Como gostaria de ser chamado(a)?" required />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="email">E-mail</Label>
                                        <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} placeholder="seu@email.com" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">WhatsApp / Celular</Label>
                                        <Input id="phone" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="(00) 00000-0000" required />
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="space-y-4 pt-4 border-t">
                            <h3 className="text-sm font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                                <BookOpen className="size-4" /> Escolha o Curso
                            </h3>
                            <div className="grid gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="courseId">Curso Desejado</Label>
                                    <Select 
                                        value={formData.courseId} 
                                        onValueChange={(v) => handleSelectChange('courseId', v)}
                                        disabled={isLoadingCourses}
                                    >
                                        <SelectTrigger id="courseId">
                                            <SelectValue placeholder={isLoadingCourses ? "Carregando cursos..." : "Selecione um curso..."} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {courses?.map(course => (
                                                <SelectItem key={course.id} value={course.id}>{course.name} ({course.ministryName})</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {availableClasses.length > 0 && (
                                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                        <Label htmlFor="classId">Turma / Horário Disponível</Label>
                                        <Select value={formData.classId} onValueChange={(v) => handleSelectChange('classId', v)}>
                                            <SelectTrigger id="classId">
                                                <SelectValue placeholder="Selecione um horário..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availableClasses.map(cls => (
                                                    <SelectItem key={cls.id} value={cls.id}>
                                                        {cls.name} {cls.dayOfWeek ? `- ${cls.dayOfWeek} às ${cls.startTime}` : ''}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>
                        </section>
                    </CardContent>
                    <CardFooter className="bg-muted/50 border-t p-6">
                        <Button type="submit" className="w-full h-12 text-lg" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processando...</>
                            ) : (
                                <><ArrowRight className="mr-2 h-5 w-5" /> Enviar Minha Inscrição</>
                            )}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
            <p className="mt-8 text-sm text-muted-foreground">
                © {new Date().getFullYear()} Igreja Batista da Manhã. Todos os direitos reservados.
            </p>
        </div>
    );
}
