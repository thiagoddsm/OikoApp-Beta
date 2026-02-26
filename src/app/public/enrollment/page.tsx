
'use client';

import React, { useState, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useVolunteering, VolunteeringProvider } from '@/contexts/volunteering-context';
import { useFirebase } from '@/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, User, BookOpen, ArrowRight, ArrowLeft, Phone, Mail, MapPin, Lightbulb, School, GraduationCap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/icons';

function EnrollmentContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { courses, classes, isLoading } = useVolunteering();
    const { firestore } = useFirebase();
    const { toast } = useToast();

    const initialCourseId = searchParams.get('courseId') || '';
    
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        courseId: initialCourseId,
    });

    const selectedCourse = useMemo(() => courses.find(c => c.id === formData.courseId), [courses, formData.courseId]);

    const handleNext = () => {
        if (step === 1 && (!formData.name || !formData.phone)) {
            toast({ variant: 'destructive', title: 'Campos obrigatórios', description: 'Por favor, preencha seu nome e telefone.' });
            return;
        }
        setStep(step + 1);
    };

    const handleBack = () => setStep(step - 1);

    const handleSubmit = async () => {
        if (!formData.courseId || !firestore) return;
        setIsSubmitting(true);

        try {
            await addDoc(collection(firestore, 'enrollment_requests'), {
                ...formData,
                status: 'pending',
                createdAt: Timestamp.now(),
            });
            setSubmitted(true);
            toast({ title: 'Solicitação Enviada!', description: 'Recebemos seu interesse e entraremos em contato em breve.' });
        } catch (e) {
            toast({ variant: 'destructive', title: 'Erro no envio', description: 'Não foi possível processar sua inscrição agora.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const getTrackInfo = (course: any) => {
        if (course.ebdTrack === 'teologico') {
            return "Fase Buscar | 12/03 a 16/04 às 09h00";
        }
        if (course.ebdTrack === 'biblico' || course.ebdTrack === 'discipulado') {
            return "Todo domingo às 09h00";
        }
        return null;
    };

    if (submitted) {
        return (
            <Card className="border-none shadow-2xl animate-in zoom-in-95 duration-500">
                <CardContent className="pt-12 pb-12 text-center space-y-6">
                    <div className="size-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                        <CheckCircle2 size={48} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Inscrição Recebida!</h2>
                        <p className="text-slate-500 mt-2 max-w-xs mx-auto">
                            Obrigado, <strong>{formData.name.split(' ')[0]}</strong>! Sua vaga para o curso <strong>{selectedCourse?.name}</strong> está sendo processada pela secretaria.
                        </p>
                    </div>
                    <Button className="w-full h-12 rounded-xl font-bold" onClick={() => router.push('/')}>
                        Voltar ao Início
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-none shadow-2xl overflow-hidden">
            <div className="h-2 bg-muted">
                <div 
                    className="h-full bg-primary transition-all duration-500" 
                    style={{ width: `${(step / 2) * 100}%` }}
                />
            </div>
            <CardHeader className="space-y-1 pb-8">
                <CardTitle className="text-2xl font-black text-slate-900">
                    {step === 1 ? 'Conte-nos quem é você' : 'Escolha seu Curso'}
                </CardTitle>
                <CardDescription>
                    {step === 1 ? 'Precisamos de alguns dados básicos para o seu registro.' : 'Selecione a disciplina ou trilho que deseja cursar.'}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {step === 1 ? (
                    <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-xs font-black uppercase text-slate-500">Nome Completo</Label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 size-4 text-muted-foreground" />
                                <Input 
                                    id="name" 
                                    placeholder="Como prefere ser chamado?" 
                                    className="pl-10 h-12 rounded-xl"
                                    value={formData.name}
                                    onChange={e => setFormData(p => ({...p, name: e.target.value}))}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone" className="text-xs font-black uppercase text-slate-500">WhatsApp</Label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-3 size-4 text-muted-foreground" />
                                <Input 
                                    id="phone" 
                                    placeholder="(21) 99999-9999" 
                                    className="pl-10 h-12 rounded-xl"
                                    value={formData.phone}
                                    onChange={e => setFormData(p => ({...p, phone: e.target.value}))}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-xs font-black uppercase text-slate-500">E-mail (Opcional)</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 size-4 text-muted-foreground" />
                                <Input 
                                    id="email" 
                                    type="email"
                                    placeholder="seu@email.com" 
                                    className="pl-10 h-12 rounded-xl"
                                    value={formData.email}
                                    onChange={e => setFormData(p => ({...p, email: e.target.value}))}
                                />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                        <div className="space-y-2">
                            <Label className="text-xs font-black uppercase text-slate-500">Disciplinas Disponíveis</Label>
                            <div className="grid gap-3">
                                {isLoading ? (
                                    <div className="py-10 text-center"><Loader2 className="animate-spin mx-auto text-primary" /></div>
                                ) : (
                                    courses.map(course => {
                                        const isSelected = formData.courseId === course.id;
                                        const trackInfo = getTrackInfo(course);
                                        return (
                                            <button
                                                key={course.id}
                                                type="button"
                                                onClick={() => setFormData(p => ({...p, courseId: course.id}))}
                                                className={cn(
                                                    "w-full p-4 rounded-2xl border-2 text-left transition-all flex items-center gap-4 group",
                                                    isSelected ? "border-primary bg-primary/5 ring-4 ring-primary/10" : "bg-card hover:border-slate-300"
                                                )}
                                            >
                                                <div className={cn(
                                                    "p-3 rounded-xl transition-colors",
                                                    isSelected ? "bg-primary text-white" : "bg-muted text-slate-400 group-hover:bg-slate-200"
                                                )}>
                                                    <BookOpen size={20} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-slate-900 truncate leading-tight">{course.name}</p>
                                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                                        <Badge variant="secondary" className="text-[8px] uppercase font-black h-4">{course.ministryName}</Badge>
                                                        {trackInfo && (
                                                            <span className="text-[10px] text-primary font-black uppercase tracking-tighter">
                                                                {trackInfo}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                {isSelected && <CheckCircle2 className="text-primary size-5 shrink-0" />}
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
            <CardFooter className="flex gap-3 bg-muted/20 p-6">
                {step > 1 && (
                    <Button variant="outline" className="h-12 rounded-xl px-6" onClick={handleBack}>
                        <ArrowLeft className="size-4" />
                    </Button>
                )}
                {step === 1 ? (
                    <Button className="flex-1 h-12 rounded-xl font-bold shadow-lg shadow-primary/20" onClick={handleNext}>
                        Próximo Passo <ArrowRight className="ml-2 size-4" />
                    </Button>
                ) : (
                    <Button 
                        className="flex-1 h-12 rounded-xl font-bold shadow-lg shadow-primary/20" 
                        onClick={handleSubmit}
                        disabled={isSubmitting || !formData.courseId}
                    >
                        {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2 size-4" />}
                        Concluir Inscrição
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}

export default function PublicEnrollmentPage() {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-4">
            <div className="w-full max-w-lg space-y-8">
                <div className="flex flex-col items-center text-center space-y-4 mb-4">
                    <div className="p-3 bg-white rounded-2xl shadow-xl border border-slate-100">
                        <Logo className="size-10 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Matrícula IBM</h1>
                        <p className="text-sm text-slate-500 font-medium">Inscreva-se nos cursos e trilhos da nossa igreja.</p>
                    </div>
                </div>

                <VolunteeringProvider>
                    <Suspense fallback={<Card className="h-96 flex items-center justify-center"><Loader2 className="animate-spin text-primary"/></Card>}>
                        <EnrollmentContent />
                    </Suspense>
                </VolunteeringProvider>

                <p className="text-center text-[10px] text-slate-400 uppercase font-black tracking-[0.2em] pt-4">
                    Organização servindo ao organismo • IBM 2026
                </p>
            </div>
        </div>
    );
}
