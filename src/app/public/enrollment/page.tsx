
'use client';

import React, { useState, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useVolunteering, VolunteeringProvider } from '@/contexts/volunteering-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, BookOpen, User, Phone, Mail, ArrowRight, GraduationCap } from 'lucide-react';
import { Logo } from '@/components/icons';
import { addDocumentNonBlocking, useFirebase } from '@/firebase';
import { collection, Timestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';

function EnrollmentFormContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { courses, isLoading } = useVolunteering();
    const { firestore } = useFirebase();
    
    const initialCourseId = searchParams.get('courseId') || '';
    
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        courseId: initialCourseId,
    });

    const selectedCourse = useMemo(() => courses.find(c => c.id === formData.courseId), [courses, formData.courseId]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCourseSelect = (courseId: string) => {
        setFormData(prev => ({ ...prev, courseId }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.phone || !formData.courseId) return;
        
        setIsSubmitting(true);
        try {
            const col = collection(firestore!, 'enrollment_requests');
            await addDocumentNonBlocking(col, {
                ...formData,
                status: 'pending',
                createdAt: Timestamp.now()
            });
            setStep(3);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (step === 3) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <Card className="max-w-md w-full text-center p-8 border-t-8 border-primary">
                    <div className="flex justify-center mb-6">
                        <div className="bg-emerald-100 p-4 rounded-full text-emerald-600">
                            <CheckCircle2 size={48} />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-black mb-4">Solicitação Enviada!</CardTitle>
                    <CardDescription className="text-base">
                        Olá, {formData.name.split(' ')[0]}! Sua inscrição no curso <strong>{selectedCourse?.name}</strong> foi protocolada.
                    </CardDescription>
                    <p className="mt-6 text-sm text-muted-foreground leading-relaxed">
                        Em breve, um de nossos líderes entrará em contato via WhatsApp para confirmar sua matrícula e informar sobre os próximos passos.
                    </p>
                    <Button className="mt-8 w-full font-bold" variant="outline" onClick={() => router.push('/')}>
                        Voltar para o Início
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 py-10 px-4">
            <div className="max-w-2xl mx-auto">
                <div className="flex justify-center items-center gap-2 mb-8">
                    <Logo className="size-8 text-primary" />
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">OikoApp</h1>
                </div>

                <Card className="shadow-2xl border-none">
                    <CardHeader className="bg-white rounded-t-xl border-b">
                        <div className="flex justify-between items-center mb-4">
                            <Badge variant="secondary" className="font-bold uppercase tracking-wider text-[10px] px-3 py-1">PASSO {step} DE 2</Badge>
                            <div className="flex gap-1.5">
                                <div className={cn("h-1.5 w-12 rounded-full transition-colors", step >= 1 ? "bg-primary" : "bg-slate-200")} />
                                <div className={cn("h-1.5 w-12 rounded-full transition-colors", step >= 2 ? "bg-primary" : "bg-slate-200")} />
                            </div>
                        </div>
                        <CardTitle className="text-2xl font-black text-slate-900">Inscrição em Cursos e Trilhos</CardTitle>
                        <CardDescription className="text-slate-500">Faça parte da nossa trilha de crescimento espiritual na IBM.</CardDescription>
                    </CardHeader>
                    
                    <form onSubmit={handleSubmit}>
                        <CardContent className="p-6 sm:p-8 space-y-8">
                            {step === 1 ? (
                                <div className="space-y-6 animate-in fade-in-50 duration-500">
                                    <div className="space-y-2">
                                        <Label htmlFor="name" className="text-xs font-bold uppercase text-slate-500">Seu Nome Completo</Label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                                            <Input id="name" name="name" className="pl-10 h-12 text-base font-medium" value={formData.name} onChange={handleInputChange} placeholder="Ex: João da Silva" required />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="phone" className="text-xs font-bold uppercase text-slate-500">WhatsApp (com DDD)</Label>
                                            <div className="relative">
                                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                                                <Input id="phone" name="phone" className="pl-10 h-12 text-base font-medium" value={formData.phone} onChange={handleInputChange} placeholder="(21) 9..." required />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="email" className="text-xs font-bold uppercase text-slate-500">E-mail (Opcional)</Label>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                                                <Input id="email" name="email" className="pl-10 h-12 text-base font-medium" value={formData.email} onChange={handleInputChange} type="email" placeholder="seu@email.com" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                                    <Label className="text-sm font-bold text-slate-700">Escolha o seu próximo passo:</Label>
                                    <div className="grid gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                        {isLoading ? (
                                            <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>
                                        ) : (
                                            courses.map(course => {
                                                const isSelected = formData.courseId === course.id;
                                                const isTeologico = course.ebdTrack === 'teologico';
                                                const isBiblico = course.ebdTrack === 'biblico' || course.ebdTrack === 'discipulado';
                                                
                                                return (
                                                    <div 
                                                        key={course.id}
                                                        onClick={() => handleCourseSelect(course.id)}
                                                        className={cn(
                                                            "p-5 border-2 rounded-2xl cursor-pointer transition-all flex items-start gap-4",
                                                            isSelected ? "border-primary bg-primary/5 shadow-inner ring-1 ring-primary/20" : "bg-white hover:border-slate-300 border-slate-100"
                                                        )}
                                                    >
                                                        <div className={cn("mt-1 p-3 rounded-xl transition-colors", isSelected ? "bg-primary text-white" : "bg-slate-100 text-slate-400")}>
                                                            <BookOpen size={24} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex justify-between items-start gap-2 mb-1">
                                                                <p className="font-black text-slate-900 leading-tight uppercase text-sm tracking-tight">{course.name}</p>
                                                                <Badge variant="secondary" className="text-[8px] h-4 uppercase font-black px-1.5">{course.ministryName}</Badge>
                                                            </div>
                                                            
                                                            <div className="flex flex-col gap-1.5 mt-2">
                                                                {isBiblico && (
                                                                    <Badge variant="outline" className="w-fit bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-black h-5 uppercase">
                                                                        <GraduationCap className="size-3 mr-1" /> Todo domingo às 09h00
                                                                    </Badge>
                                                                )}
                                                                {isTeologico && (
                                                                    <Badge variant="outline" className="w-fit bg-purple-50 text-purple-700 border-purple-200 text-[10px] font-black h-5 uppercase">
                                                                        <GraduationCap className="size-3 mr-1" /> Fase Buscar | 12/03 a 16/04 às 09h00
                                                                    </Badge>
                                                                )}
                                                                <p className="text-xs text-slate-500 line-clamp-2 italic leading-relaxed">
                                                                    {course.description || "Inicie sua jornada neste curso ministerial."}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            })
                                        )}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                        <CardFooter className="p-6 sm:p-8 bg-slate-50 rounded-b-xl flex gap-4">
                            {step === 2 && (
                                <Button type="button" variant="outline" className="h-12 px-6" onClick={() => setStep(1)}>Voltar</Button>
                            )}
                            {step === 1 ? (
                                <Button type="button" className="flex-1 h-12 font-black text-base shadow-lg shadow-primary/20" onClick={() => formData.name && formData.phone && setStep(2)} disabled={!formData.name || !formData.phone}>
                                    Próximo Passo <ArrowRight className="ml-2 size-5" />
                                </Button>
                            ) : (
                                <Button type="submit" className="flex-1 h-12 font-black text-base shadow-lg shadow-primary/20" disabled={isSubmitting || !formData.courseId}>
                                    {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : "Confirmar Inscrição"}
                                </Button>
                            )}
                        </CardFooter>
                    </form>
                </Card>
            </div>
        </div>
    );
}

export default function EnrollmentPage() {
    return (
        <VolunteeringProvider>
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-slate-50"><Loader2 className="animate-spin size-8 text-primary" /></div>}>
                <EnrollmentFormContent />
            </Suspense>
        </VolunteeringProvider>
    );
}
