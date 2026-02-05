
'use client';

import React, { useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useFirebase, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CheckCircle, GraduationCap, Phone, Mail, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/icons';

type Course = { id: string; name: string; ministryName: string };
type Class = { id: string; name: string; courseId: string };

function EnrollmentForm() {
    const searchParams = useSearchParams();
    const courseIdParam = searchParams.get('courseId');
    
    const { firestore } = useFirebase();
    const { toast } = useToast();
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        courseId: courseIdParam || '',
        classId: '',
    });

    const coursesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'courses')) : null, [firestore]);
    const classesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'classes')) : null, [firestore]);

    const { data: courses, isLoading: isLoadingCourses } = useCollection<Course>(coursesQuery);
    const { data: classes, isLoading: isLoadingClasses } = useCollection<Class>(classesQuery);

    const filteredClasses = useMemo(() => {
        if (!classes || !formData.courseId) return [];
        return classes.filter(c => c.courseId === formData.courseId);
    }, [classes, formData.courseId]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.phone || !formData.courseId) {
            toast({ variant: 'destructive', title: 'Campos Obrigatórios', description: 'Por favor, preencha pelo menos nome, telefone e o curso desejado.' });
            return;
        }

        setIsSubmitting(true);
        const requestsCollection = collection(firestore, 'enrollment_requests');

        try {
            await addDocumentNonBlocking(requestsCollection, {
                ...formData,
                status: 'pending',
                createdAt: Timestamp.now(), // Garantindo que seja um Timestamp real do Firebase
            });
            setIsSuccess(true);
            toast({ title: 'Solicitação Enviada!', description: 'Recebemos seu interesse e entraremos em contato em breve.' });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Erro ao Enviar', description: 'Ocorreu um erro técnico. Por favor, tente novamente.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <Card className="border-t-8 border-primary">
                <CardHeader className="text-center">
                    <div className="mx-auto bg-green-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mb-4 text-green-600">
                        <CheckCircle size={32} />
                    </div>
                    <CardTitle className="text-2xl">Inscrição Recebida!</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Obrigado por seu interesse, <strong>{formData.name}</strong>! <br/>
                        Nossa equipe pedagógica analisará sua solicitação e entrará em contato via WhatsApp ou e-mail em breve.
                    </CardDescription>
                </CardHeader>
                <CardFooter className="justify-center">
                    <Button variant="outline" onClick={() => window.location.reload()}>Fazer outra inscrição</Button>
                </CardFooter>
            </Card>
        );
    }

    return (
        <Card className="border-t-8 border-primary shadow-2xl">
            <CardHeader>
                <CardTitle className="text-2xl">Ficha de Inscrição</CardTitle>
                <CardDescription>Preencha os dados abaixo para iniciar sua jornada de aprendizado na IBM.</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent className="space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="flex items-center gap-2"><User size={14} /> Nome Completo *</Label>
                            <Input id="name" name="name" value={formData.name} onChange={handleInputChange} placeholder="Seu nome completo" required />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="phone" className="flex items-center gap-2"><Phone size={14} /> WhatsApp (com DDD) *</Label>
                                <Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleInputChange} placeholder="(21) 99999-9999" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email" className="flex items-center gap-2"><Mail size={14} /> E-mail</Label>
                                <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} placeholder="seu@email.com" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t">
                        <div className="space-y-2">
                            <Label htmlFor="courseId" className="flex items-center gap-2"><GraduationCap size={14} /> Curso Desejado *</Label>
                            <Select value={formData.courseId} onValueChange={(v) => handleSelectChange('courseId', v)} disabled={isLoadingCourses}>
                                <SelectTrigger id="courseId"><SelectValue placeholder={isLoadingCourses ? "Carregando cursos..." : "Selecione o curso"}/></SelectTrigger>
                                <SelectContent>
                                    {courses?.map(course => (
                                        <SelectItem key={course.id} value={course.id}>{course.name} ({course.ministryName})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {formData.courseId && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                <Label htmlFor="classId">Preferência de Turma (Opcional)</Label>
                                <Select value={formData.classId} onValueChange={(v) => handleSelectChange('classId', v)} disabled={isLoadingClasses}>
                                    <SelectTrigger id="classId"><SelectValue placeholder="Selecione uma turma (se houver)"/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="null">A definir pela escola</SelectItem>
                                        {filteredClasses.map(cls => (
                                            <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                </CardContent>
                <CardFooter>
                    <Button type="submit" className="w-full text-lg h-12" disabled={isSubmitting}>
                        {isSubmitting ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processando...</> : "Concluir Inscrição"}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}

export default function EnrollmentPage() {
    return (
        <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 py-12">
            <div className="w-full max-w-2xl space-y-8">
                <div className="flex flex-col items-center text-center space-y-2">
                    <Logo className="size-16 text-primary mb-2" />
                    <h1 className="text-4xl font-black tracking-tight text-slate-900 uppercase">IBM ENSINO</h1>
                    <p className="text-slate-500 font-medium max-w-sm">Capacitação, Comunhão e Crescimento Espiritual.</p>
                </div>
                
                <Suspense fallback={<div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>}>
                    <EnrollmentForm />
                </Suspense>

                <p className="text-center text-xs text-slate-400">
                    Ao se inscrever, você concorda com nossa política de privacidade e tratamento de dados para fins ministeriais.
                </p>
            </div>
        </main>
    );
}
