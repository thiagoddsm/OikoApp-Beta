'use client';

import React, { useState, useMemo } from 'react';
import { useVolunteering } from '@/contexts/volunteering-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, ArrowRight, User, Phone, Mail, BookOpen, Clock, MapPin, ChevronRight, Waves, Lightbulb, School } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function EnrollmentForm({ initialCourseId }: { initialCourseId?: string }) {
    const { courses, classes, isLoading, addEnrollmentRequest } = useVolunteering();
    const { toast } = useToast();
    
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const [formData, setFormData] = useState({
        courseId: initialCourseId || '',
        classId: '',
        name: '',
        email: '',
        phone: '',
    });

    const selectedCourse = useMemo(() => courses.find(c => c.id === formData.courseId), [courses, formData.courseId]);
    
    const courseClasses = useMemo(() => {
        if (!formData.courseId) return [];
        return classes.filter(cls => cls.courseId === formData.courseId);
    }, [classes, formData.courseId]);

    const handleCourseSelect = (id: string) => {
        setFormData(prev => ({ ...prev, courseId: id, classId: '' }));
        setStep(2);
    };

    const handleClassSelect = (id: string) => {
        setFormData(prev => ({ ...prev, classId: id }));
        setStep(3);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.email || !formData.phone) {
            toast({ variant: 'destructive', title: 'Campos obrigatórios', description: 'Por favor, preencha todos os seus dados.' });
            return;
        }

        setIsSubmitting(true);
        try {
            await addEnrollmentRequest({
                courseId: formData.courseId,
                classId: formData.classId,
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                status: 'pending',
            });
            setIsSuccess(true);
            toast({ title: 'Solicitação Enviada!', description: 'Nossa equipe entrará em contato em breve.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro ao enviar', description: 'Não foi possível processar sua inscrição agora.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const getMinistryIcon = (name: string) => {
        const n = name?.toLowerCase() || '';
        if (n.includes('wave')) return Waves;
        if (n.includes('lumine') || n.includes('ebd')) return Lightbulb;
        if (n.includes('college') || n.includes('escola')) return School;
        return BookOpen;
    };

    if (isSuccess) {
        return (
            <div className="text-center py-12 space-y-6 animate-in zoom-in-95">
                <div className="size-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                    <CheckCircle size={40} />
                </div>
                <div className="space-y-2">
                    <h2 className="text-2xl font-black uppercase italic tracking-tighter">Inscrição Recebida!</h2>
                    <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                        Obrigado pelo seu interesse, <strong>{formData.name}</strong>. Recebemos seus dados e o responsável pelo curso entrará em contato via WhatsApp em breve.
                    </p>
                </div>
                <Button variant="outline" onClick={() => window.location.reload()} className="rounded-full">Fazer outra inscrição</Button>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <header className="text-center space-y-2">
                <Badge variant="outline" className="text-primary border-primary/30 bg-primary/5 font-black uppercase text-[10px] mb-4">Inscrição Lumine</Badge>
                <h1 className="text-3xl font-black italic tracking-tighter uppercase leading-none">Faça parte</h1>
                <p className="text-muted-foreground text-xs uppercase font-bold tracking-widest">Sua jornada de crescimento começa aqui</p>
            </header>

            <div className="relative">
                <div className="flex justify-between mb-8 gap-2">
                    <div className="flex-1 space-y-2">
                        <div className={cn("h-1.5 flex-1 rounded-full transition-all duration-500", step >= 1 ? "bg-primary" : "bg-slate-100")} />
                        <p className="text-[8px] font-black uppercase text-center opacity-50">Escolha</p>
                    </div>
                    <div className="flex-1 space-y-2">
                        <div className={cn("h-1.5 flex-1 rounded-full transition-all duration-500", step >= 2 ? "bg-primary" : "bg-slate-100")} />
                        <p className="text-[8px] font-black uppercase text-center opacity-50">Turma</p>
                    </div>
                    <div className="flex-1 space-y-2">
                        <div className={cn("h-1.5 flex-1 rounded-full transition-all duration-500", step >= 3 ? "bg-primary" : "bg-slate-100")} />
                        <p className="text-[8px] font-black uppercase text-center opacity-50">Dados</p>
                    </div>
                </div>

                {step === 1 && (
                    <div className="grid grid-cols-1 gap-3 animate-in slide-in-from-left-4 duration-500">
                        {courses.map(course => {
                            const Icon = getMinistryIcon(course.ministryName);
                            return (
                                <button
                                    key={course.id}
                                    onClick={() => handleCourseSelect(course.id)}
                                    className={cn(
                                        "p-4 rounded-2xl border-2 text-left transition-all group flex items-center gap-4",
                                        formData.courseId === course.id ? "border-primary bg-primary/5 shadow-md" : "border-slate-100 hover:border-slate-200 bg-white"
                                    )}
                                >
                                    <div className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Icon size={24} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-black text-sm uppercase italic leading-tight">{course.name}</p>
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter mt-1 line-clamp-1">{course.ministryName}</p>
                                    </div>
                                    <ChevronRight className="size-4 text-slate-300 group-hover:text-primary transition-colors" />
                                </button>
                            );
                        })}
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-4 animate-in slide-in-from-right-4 duration-500">
                        <div className="flex items-center justify-between">
                            <h3 className="font-black text-xs uppercase tracking-widest text-primary">Selecione a Turma</h3>
                            <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="text-[10px] font-black uppercase h-6">Alterar Curso</Button>
                        </div>
                        {courseClasses.length === 0 ? (
                            <div className="p-8 text-center border-2 border-dashed rounded-2xl bg-slate-50">
                                <p className="text-sm text-muted-foreground font-medium">Não há turmas abertas para este curso no momento.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3">
                                {courseClasses.map(cls => (
                                    <button
                                        key={cls.id}
                                        onClick={() => handleClassSelect(cls.id)}
                                        className={cn(
                                            "p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between group",
                                            formData.classId === cls.id ? "border-primary bg-primary/5" : "border-slate-100 bg-white"
                                        )}
                                    >
                                        <div className="space-y-1">
                                            <p className="font-black text-sm uppercase italic">{cls.name}</p>
                                            <div className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground uppercase">
                                                <span className="flex items-center gap-1"><Clock size={12}/> {cls.dayOfWeek} às {cls.startTime}</span>
                                                <span className="flex items-center gap-1"><MapPin size={12}/> {cls.locationId === 'the_school' ? 'The School' : 'IBM'}</span>
                                            </div>
                                        </div>
                                        <div className={cn("size-6 rounded-full border-2 flex items-center justify-center transition-all", formData.classId === cls.id ? "bg-primary border-primary text-white" : "border-slate-300 group-hover:border-primary")}>
                                            {formData.classId === cls.id && <CheckCircle size={14} />}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {step === 3 && (
                    <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in-50 duration-500">
                        <div className="flex items-center justify-between">
                            <h3 className="font-black text-xs uppercase tracking-widest text-primary">Seus Dados</h3>
                            <Button variant="ghost" size="sm" onClick={() => setStep(2)} className="text-[10px] font-black uppercase h-6">Alterar Turma</Button>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Nome Completo</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-3 size-4 text-slate-400" />
                                    <Input 
                                        className="h-11 pl-10 rounded-xl"
                                        placeholder="Como devemos te chamar?"
                                        value={formData.name}
                                        onChange={e => setFormData(p => ({...p, name: e.target.value}))}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">WhatsApp</Label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-3 size-4 text-slate-400" />
                                        <Input 
                                            className="h-11 pl-10 rounded-xl"
                                            placeholder="(21) 99999-9999"
                                            value={formData.phone}
                                            onChange={e => setFormData(p => ({...p, phone: e.target.value}))}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">E-mail</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-3 size-4 text-slate-400" />
                                        <Input 
                                            className="h-11 pl-10 rounded-xl"
                                            type="email"
                                            placeholder="seu@email.com"
                                            value={formData.email}
                                            onChange={e => setFormData(p => ({...p, email: e.target.value}))}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Button type="submit" className="w-full h-12 rounded-xl font-black text-base shadow-lg shadow-primary/20" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle className="mr-2" />}
                            Finalizar Inscrição
                        </Button>
                    </form>
                )}
            </div>
        </div>
    );
}
