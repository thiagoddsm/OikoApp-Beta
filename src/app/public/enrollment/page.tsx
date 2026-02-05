
'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useFirebase, addDocumentNonBlocking, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CheckCircle2, GraduationCap, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/icons';
import Link from 'next/link';

function EnrollmentForm() {
    const searchParams = useSearchParams();
    const courseIdParam = searchParams.get('courseId');
    const { firestore } = useFirebase();
    const { toast } = useToast();

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
    const { data: courses, isLoading: isLoadingCourses } = useCollection<any>(coursesQuery);

    const classesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'classes')) : null, [firestore]);
    const { data: allClasses, isLoading: isLoadingClasses } = useCollection<any>(classesQuery);

    useEffect(() => {
        if (courseIdParam) {
            setFormData(prev => ({ ...prev, courseId: courseIdParam }));
        }
    }, [courseIdParam]);

    const availableClasses = useMemo(() => {
        if (!formData.courseId || !allClasses) return [];
        return allClasses.filter(c => c.courseId === formData.courseId);
    }, [formData.courseId, allClasses]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.phone || !formData.courseId) {
            toast({ variant: 'destructive', title: 'Campos Obrigatórios', description: 'Por favor, preencha nome, telefone e escolha um curso.' });
            return;
        }

        setIsSubmitting(true);
        try {
            const collectionRef = collection(firestore, 'enrollment_requests');
            await addDocumentNonBlocking(collectionRef, {
                ...formData,
                status: 'pending',
                createdAt: Timestamp.now(),
            });
            setIsSuccess(true);
            window.scrollTo(0, 0);
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Erro ao enviar', description: 'Não foi possível enviar sua inscrição. Tente novamente.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <Card className="border-t-8 border-green-600">
                <CardHeader className="text-center">
                    <div className="mx-auto bg-green-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mb-4">
                        <CheckCircle2 className="text-green-600 size-10" />
                    </div>
                    <CardTitle className="text-2xl">Inscrição Enviada!</CardTitle>
                    <CardDescription>
                        Recebemos sua solicitação com sucesso. Nossa equipe entrará em contato em breve para confirmar sua matrícula.
                    </CardDescription>
                </CardHeader>
                <CardFooter className="justify-center">
                    <Button asChild variant="outline">
                        <Link href="/">Voltar para o Início</Link>
                    </Button>
                </CardFooter>
            </Card>
        );
    }

    return (
        <Card className="shadow-2xl border-none">
            <CardHeader className="bg-primary text-primary-foreground rounded-t-lg">
                <div className="flex items-center gap-3 mb-2">
                    <GraduationCap className="size-8" />
                    <CardTitle className="text-2xl">Portal de Inscrições</CardTitle>
                </div>
                <CardDescription className="text-primary-foreground/80">
                    Preencha os dados abaixo para solicitar sua participação em um de nossos cursos.
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent className="space-y-6 pt-6">
                    <div className="space-y-2">
                        <Label htmlFor="courseId">Curso de Interesse *</Label>
                        <Select 
                            value={formData.courseId} 
                            onValueChange={(v) => handleSelectChange('courseId', v)}
                            disabled={isLoadingCourses}
                        >
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

                    {availableClasses.length > 0 && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                            <Label htmlFor="classId">Turma Disponível (Opcional)</Label>
                            <Select value={formData.classId} onValueChange={(v) => handleSelectChange('classId', v)}>
                                <SelectTrigger id="classId">
                                    <SelectValue placeholder="Escolha uma turma" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="null">Ainda não sei / Qualquer uma</SelectItem>
                                    {availableClasses.map(cls => (
                                        <SelectItem key={cls.id} value={cls.id}>{cls.name} ({cls.dayOfWeek} às {cls.startTime})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="space-y-4 pt-4 border-t">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nome Completo *</Label>
                            <Input id="name" name="name" value={formData.name} onChange={handleChange} placeholder="Seu nome" required />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="phone">Telefone / WhatsApp *</Label>
                                <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} placeholder="(00) 00000-0000" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">E-mail</Label>
                                <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="seu@email.com" />
                            </div>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="bg-muted/30 rounded-b-lg flex flex-col gap-4 border-t pt-6">
                    <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? <><Loader2 className="mr-2 animate-spin" /> Processando...</> : "Confirmar Solicitação de Inscrição"}
                    </Button>
                    <p className="text-[10px] text-center text-muted-foreground">
                        Ao se inscrever, você concorda em ser contatado pela nossa equipe ministerial.
                    </p>
                </CardFooter>
            </form>
        </Card>
    );
}

export default function EnrollmentPage() {
    return (
        <main className="min-h-screen bg-[#F2F0F7] py-12 px-4 flex flex-col items-center">
            <div className="w-full max-w-xl space-y-8">
                <div className="flex flex-col items-center gap-2 mb-4">
                    <Logo className="size-12 text-primary" />
                    <h1 className="text-3xl font-bold tracking-tight">OikoApp</h1>
                </div>
                <Suspense fallback={<div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary size-10" /></div>}>
                    <EnrollmentForm />
                </Suspense>
                <div className="text-center">
                    <Button variant="link" asChild>
                        <Link href="/"><ArrowLeft className="mr-2 size-4" /> Voltar para o Site</Link>
                    </Button>
                </div>
            </div>
        </main>
    );
}
