
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useFirebase, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CheckCircle2, BookOpen, User, Phone, Mail, ArrowRight, GraduationCap, Lightbulb, School } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Course = {
    id: string;
    name: string;
    description: string;
    ministryName: string;
    ebdTrack?: 'teologico' | 'biblico' | 'discipulado';
};

export default function PublicEnrollmentPage() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Form State
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        courseId: '',
    });

    const coursesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'courses')) : null, [firestore]);
    const { data: courses, isLoading: isLoadingCourses } = useCollection<Course>(coursesQuery);

    const filteredCourses = useMemo(() => {
        if (!courses) return [];
        // Filtramos para mostrar apenas cursos relevantes para inscrição pública (EBD, Trilhos, etc)
        return courses.filter(c => 
            c.ministryName.toLowerCase().includes('lumine') || 
            c.ministryName.toLowerCase().includes('ebd') ||
            c.ministryName.toLowerCase().includes('college') ||
            c.name.toLowerCase().includes('pertencer')
        ).sort((a, b) => a.name.localeCompare(b.name));
    }, [courses]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCourseSelect = (courseId: string) => {
        setFormData(prev => ({ ...prev, courseId }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.phone || !formData.courseId) {
            toast({ variant: 'destructive', title: 'Campos obrigatórios', description: 'Por favor, preencha nome, telefone e escolha um curso.' });
            return;
        }

        setIsSubmitting(true);
        try {
            // 1. Criar ou identificar usuário (simplificado para o formulário público)
            // No mundo real, poderíamos checar se o email/fone já existe
            const requestRef = collection(firestore!, 'enrollment_requests');
            await addDocumentNonBlocking(requestRef, {
                ...formData,
                status: 'pending',
                createdAt: Timestamp.now(),
                userId: 'public_visitor' // Identificador temporário
            });

            setStep(3); // Sucesso
            toast({ title: "Solicitação Enviada!", description: "Em breve um líder entrará em contato." });
        } catch (error) {
            toast({ variant: 'destructive', title: "Erro no envio", description: "Tente novamente em alguns instantes." });
        } finally {
            setIsSubmitting(false);
        }
    };

    const getCourseBadge = (course: Course) => {
        if (course.ebdTrack === 'teologico') {
            return (
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] font-black uppercase">
                    Fase Buscar | 12/03 a 16/04 às 09h00
                </Badge>
            );
        }
        if (course.ebdTrack === 'biblico' || course.ebdTrack === 'discipulado') {
            return (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-black uppercase">
                    Todo domingo às 09h00
                </Badge>
            );
        }
        return null;
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-6">
            <div className="w-full max-w-xl space-y-8">
                <div className="flex flex-col items-center gap-4 text-center">
                    <div className="bg-white p-4 rounded-2xl shadow-xl">
                        <Logo className="size-12 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-slate-900 italic">OikoApp Inscrições</h1>
                        <p className="text-muted-foreground font-medium">Faça parte da nossa trilha de crescimento.</p>
                    </div>
                </div>

                <Card className="border-none shadow-2xl overflow-hidden rounded-[2rem]">
                    {step === 1 && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <CardHeader className="bg-primary text-primary-foreground p-8">
                                <CardTitle className="text-2xl font-black uppercase tracking-tighter italic">1. Identificação</CardTitle>
                                <CardDescription className="text-primary-foreground/80 font-medium">Comece preenchendo seus dados de contato.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-8 space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-xs font-black uppercase text-muted-foreground tracking-widest">Nome Completo</Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-3 size-4 text-primary/40" />
                                        <Input id="name" name="name" value={formData.name} onChange={handleInputChange} placeholder="Como quer ser chamado?" className="pl-10 h-12" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="phone" className="text-xs font-black uppercase text-muted-foreground tracking-widest">WhatsApp</Label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-3 size-4 text-primary/40" />
                                            <Input id="phone" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="(21) 9..." className="pl-10 h-12" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email" className="text-xs font-black uppercase text-muted-foreground tracking-widest">E-mail (Opcional)</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-3 size-4 text-primary/40" />
                                            <Input id="email" name="email" value={formData.email} onChange={handleInputChange} type="email" placeholder="seu@email.com" className="pl-10 h-12" />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="p-8 bg-muted/30">
                                <Button onClick={() => setStep(2)} disabled={!formData.name || !formData.phone} className="w-full h-14 text-lg font-black shadow-lg">
                                    Próximo Passo <ArrowRight className="ml-2" />
                                </Button>
                            </CardFooter>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                            <CardHeader className="bg-primary text-primary-foreground p-8">
                                <div className="flex justify-between items-center">
                                    <CardTitle className="text-2xl font-black uppercase tracking-tighter italic">2. Escolha seu Curso</CardTitle>
                                    <Button variant="ghost" onClick={() => setStep(1)} className="text-white hover:bg-white/10 h-8 px-2 text-xs">Voltar</Button>
                                </div>
                                <CardDescription className="text-primary-foreground/80 font-medium">Selecione qual trilha você deseja iniciar.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <ScrollArea className="h-[400px]">
                                    <div className="p-6 space-y-3">
                                        {isLoadingCourses ? (
                                            <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>
                                        ) : filteredCourses.map(course => (
                                            <button 
                                                key={course.id}
                                                onClick={() => handleCourseSelect(course.id)}
                                                className={cn(
                                                    "w-full p-5 rounded-2xl border-2 text-left transition-all group relative",
                                                    formData.courseId === course.id 
                                                        ? "bg-primary/5 border-primary shadow-md ring-1 ring-primary/20" 
                                                        : "bg-white border-slate-100 hover:border-primary/30"
                                                )}
                                            >
                                                <div className="flex justify-between items-start gap-4">
                                                    <div className="min-w-0">
                                                        <p className={cn("font-black uppercase tracking-tighter text-base transition-colors", formData.courseId === course.id ? "text-primary" : "text-slate-900")}>
                                                            {course.name}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">{course.description}</p>
                                                        <div className="mt-3 flex flex-wrap gap-2">
                                                            {getCourseBadge(course)}
                                                            <Badge variant="secondary" className="text-[9px] uppercase font-black px-2 h-5 bg-slate-100">{course.ministryName}</Badge>
                                                        </div>
                                                    </div>
                                                    <div className={cn(
                                                        "size-6 rounded-full border-2 shrink-0 transition-all flex items-center justify-center",
                                                        formData.courseId === course.id ? "bg-primary border-primary" : "border-slate-200"
                                                    )}>
                                                        {formData.courseId === course.id && <div className="size-2 bg-white rounded-full" />}
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                            <CardFooter className="p-8 bg-muted/30">
                                <Button onClick={handleSubmit} disabled={isSubmitting || !formData.courseId} className="w-full h-14 text-lg font-black shadow-xl">
                                    {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2" />}
                                    Finalizar Inscrição
                                </Button>
                            </CardFooter>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="p-12 text-center animate-in zoom-in-95 duration-500">
                            <div className="size-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/20">
                                <CheckCircle2 size={40} />
                            </div>
                            <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Inscrição Protocolada!</h2>
                            <p className="text-slate-600 mt-4 leading-relaxed max-w-sm mx-auto">
                                Olá <strong>{formData.name.split(' ')[0]}</strong>, sua solicitação foi enviada com sucesso para a coordenação do curso.
                            </p>
                            <div className="mt-10 p-6 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 text-left space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white rounded-lg shadow-sm"><Lightbulb className="size-5 text-amber-500" /></div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-slate-400">O que acontece agora?</p>
                                        <p className="text-sm font-bold text-slate-700 leading-tight">Um líder do ministério entrará em contato pelo seu WhatsApp.</p>
                                    </div>
                                </div>
                            </div>
                            <Button asChild variant="outline" className="mt-8 rounded-full font-bold h-12 px-8">
                                <a href="/">Voltar ao Início</a>
                            </Button>
                        </div>
                    )}
                </Card>

                <div className="text-center">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em]">Igreja Batista da Manhã • 2026</p>
                </div>
            </div>
        </div>
    );
}
