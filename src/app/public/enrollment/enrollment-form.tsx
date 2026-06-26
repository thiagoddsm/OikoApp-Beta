
'use client';

import React, { useState, useMemo } from 'react';
import { useVolunteering } from '@/contexts/volunteering-context';
import { useFirebase } from '@/firebase';
import { addDoc, collection } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
    Loader2, 
    CheckCircle, 
    BookOpen, 
    User, 
    Mail, 
    Phone, 
    ArrowRight, 
    ArrowLeft,
    Clock,
    School
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useCoursesData } from "@/hooks/useDomainData";

export function EnrollmentForm({ initialCourseId }: { initialCourseId?: string }) {
    const { courses, classes, enrollmentRequests, pedagogicalLogs, theoflixCourses } = useCoursesData();

    const { isLoading } = useVolunteering();
    const { firestore } = useFirebase();
    const { toast } = useToast();
    
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        courseId: initialCourseId || '',
        classId: '',
    });

    const selectedCourse = useMemo(() => 
        courses.find(c => c.id === formData.courseId),
    [courses, formData.courseId]);

    const availableClasses = useMemo(() => 
        classes.filter(cls => cls.courseId === formData.courseId),
    [classes, formData.courseId]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectCourse = (id: string) => {
        setFormData(prev => ({ ...prev, courseId: id, classId: '' }));
        setStep(2);
    };

    const handleSubmit = async () => {
        if (!formData.name || !formData.email || !formData.phone || !formData.courseId) {
            toast({ variant: 'destructive', title: 'Campos obrigatórios', description: 'Por favor, preencha todos os seus dados.' });
            return;
        }

        setIsSubmitting(true);
        try {
            await addDoc(collection(firestore!, 'enrollment_requests'), {
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                courseId: formData.courseId,
                classId: formData.classId,
                status: 'pending',
                createdAt: new Date() as any,
            });
            setSubmitted(true);
            toast({ title: "Solicitação Enviada!", description: "Em breve entraremos em contato para confirmar sua vaga." });
        } catch (error) {
            toast({ variant: 'destructive', title: "Erro ao enviar", description: "Tente novamente em instantes." });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <Card className="max-w-md mx-auto text-center p-8 border-none shadow-2xl bg-white animate-in zoom-in-95">
                <div className="size-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                    <CheckCircle size={40} />
                </div>
                <CardTitle className="text-2xl font-black italic tracking-tighter uppercase mb-2">Inscrição Recebida!</CardTitle>
                <CardDescription className="text-base font-medium leading-relaxed">
                    Olá <strong>{formData.name}</strong>, recebemos seu interesse no curso <strong>{selectedCourse?.name}</strong>. 
                    Nossa equipe pedagógica analisará sua solicitação e entrará em contato via WhatsApp.
                </CardDescription>
                <Button className="mt-8 w-full h-12 font-black uppercase tracking-widest" variant="outline" onClick={() => window.location.reload()}>
                    Fazer outra inscrição
                </Button>
            </Card>
        );
    }

    return (
        <Card className="max-w-2xl mx-auto border-none shadow-2xl overflow-hidden bg-white">
            <div className="bg-slate-900 p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12">
                    <School size={120} />
                </div>
                <Badge variant="outline" className="text-primary border-primary/30 bg-primary/5 font-black uppercase text-[10px] mb-4">Portal de Inscrições</Badge>
                <CardTitle className="text-3xl font-black italic tracking-tighter uppercase leading-none">Faça parte do crescimento</CardTitle>
                <CardDescription className="text-slate-400 font-medium mt-2">Escolha seu curso e comece sua jornada ministerial na IBM.</CardDescription>
                
                <div className="flex gap-2 mt-8">
                    <div className={cn("h-1.5 flex-1 rounded-full transition-all duration-500", step >= 1 ? "bg-primary" : "bg-slate-100/20")} />
                    <div className={cn("h-1.5 flex-1 rounded-full transition-all duration-500", step >= 2 ? "bg-primary" : "bg-slate-100/20")} />
                    <div className={cn("h-1.5 flex-1 rounded-full transition-all duration-500", step >= 3 ? "bg-primary" : "bg-slate-100/20")} />
                </div>
            </div>

            <CardContent className="p-8">
                {step === 1 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="flex items-center gap-2 text-primary font-black uppercase text-xs tracking-widest mb-4">
                            <BookOpen size={16} /> 1. Escolha seu curso
                        </div>
                        <div className="grid gap-4">
                            {courses.map(course => (
                                <button 
                                    key={course.id}
                                    onClick={() => handleSelectCourse(course.id)}
                                    className={cn(
                                        "w-full p-5 rounded-2xl border-2 text-left transition-all hover:border-primary/50 group flex items-center justify-between",
                                        formData.courseId === course.id ? "border-primary bg-primary/5" : "border-slate-100 bg-slate-50/50"
                                    )}
                                >
                                    <div className="min-w-0 pr-4">
                                        <p className="font-black text-slate-900 uppercase italic tracking-tighter group-hover:text-primary transition-colors">{course.name}</p>
                                        <p className="text-xs text-slate-500 line-clamp-1 mt-1">{course.description}</p>
                                        <Badge variant="secondary" className="mt-3 text-[9px] font-black uppercase h-5">{course.ministryName}</Badge>
                                    </div>
                                    <ArrowRight size={20} className="text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="flex items-center gap-2 text-primary font-black uppercase text-xs tracking-widest mb-4">
                            <Clock size={16} /> 2. Selecione a Turma
                        </div>
                        <div className="p-4 bg-primary/5 rounded-2xl border-2 border-primary/10 mb-6">
                            <p className="text-[10px] font-black uppercase text-primary/60 tracking-widest leading-none mb-1">Curso Selecionado</p>
                            <p className="font-black text-xl italic tracking-tighter uppercase text-slate-900">{selectedCourse?.name}</p>
                        </div>

                        {availableClasses.length === 0 ? (
                            <div className="py-12 text-center border-2 border-dashed rounded-2xl bg-muted/5">
                                <p className="text-slate-500 font-bold">Não há turmas com inscrições abertas no momento.</p>
                                <p className="text-xs text-slate-400 mt-1">Você pode prosseguir para deixar seu interesse registrado.</p>
                                <Button variant="link" className="mt-4 font-black uppercase text-xs tracking-widest" onClick={() => setStep(3)}>Prosseguir mesmo assim</Button>
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                {availableClasses.map(cls => (
                                    <button 
                                        key={cls.id}
                                        onClick={() => { setFormData(p => ({...p, classId: cls.id})); setStep(3); }}
                                        className={cn(
                                            "w-full p-4 rounded-xl border-2 text-left transition-all hover:border-primary group flex items-center justify-between",
                                            formData.classId === cls.id ? "border-primary bg-primary/5" : "border-slate-100"
                                        )}
                                    >
                                        <div>
                                            <p className="font-bold text-slate-900">{cls.name}</p>
                                            <p className="text-xs text-slate-500 mt-1">{cls.dayOfWeek} às {cls.startTime}</p>
                                        </div>
                                        <div className={cn("size-6 rounded-full border-2 flex items-center justify-center transition-all", formData.classId === cls.id ? "bg-primary border-primary text-white" : "border-slate-300 group-hover:border-primary")}>
                                            {formData.classId === cls.id && <CheckCircle size={14} />}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                        <Button variant="ghost" className="w-full text-xs font-bold" onClick={() => setStep(1)}><ArrowLeft className="mr-2 size-3" /> Voltar para cursos</Button>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="flex items-center gap-2 text-primary font-black uppercase text-xs tracking-widest mb-4">
                            <User size={16} /> 3. Seus Dados
                        </div>
                        
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Nome Completo</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-3 size-4 text-slate-400" />
                                    <Input name="name" value={formData.name} onChange={handleInputChange} className="pl-10 h-11" placeholder="Como devemos te chamar?" />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">E-mail</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-3 size-4 text-slate-400" />
                                        <Input type="email" name="email" value={formData.email} onChange={handleInputChange} className="pl-10 h-11" placeholder="seu@email.com" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">WhatsApp</Label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-3 size-4 text-slate-400" />
                                        <Input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className="pl-10 h-11" placeholder="(21) 99999-9999" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 flex flex-col gap-3">
                            <Button size="lg" className="w-full h-14 font-black uppercase tracking-widest text-base shadow-xl shadow-primary/20" onClick={handleSubmit} disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : null}
                                Finalizar Inscrição
                            </Button>
                            <Button variant="ghost" className="w-full text-xs font-bold" onClick={() => setStep(2)}><ArrowLeft className="mr-2 size-3" /> Voltar</Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
