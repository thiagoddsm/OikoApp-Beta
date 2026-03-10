'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useVolunteering } from '@/contexts/volunteering-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Loader2, BookOpen, User, Phone, Mail, CheckCircle2, ChevronRight, Waves, Lightbulb, School, HandHelping } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function PublicEnrollmentForm() {
    const { courses, classes, addEnrollmentRequest, isLoading: isContextLoading } = useVolunteering();
    const { toast } = useToast();
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        courseId: '',
        classId: '',
        name: '',
        email: '',
        phone: '',
    });

    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => { setIsMounted(true); }, []);

    const selectedCourse = useMemo(() => courses.find(c => c.id === formData.courseId), [courses, formData.courseId]);
    const filteredClasses = useMemo(() => classes.filter(c => c.courseId === formData.courseId), [classes, formData.courseId]);

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
            toast({ variant: 'destructive', title: 'Campos obrigatórios', description: 'Por favor, preencha seus dados de contato.' });
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
            setStep(4);
            toast({ title: 'Solicitação Enviada!', description: 'Nossa equipe entrará em contato em breve.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro ao enviar', description: 'Tente novamente em instantes.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isMounted) return null;

    if (step === 4) {
        return (
            <div className="text-center py-12 space-y-6 animate-in zoom-in-95 duration-500">
                <div className="size-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-lg">
                    <CheckCircle2 size={40} />
                </div>
                <h2 className="text-3xl font-black text-slate-900 italic tracking-tighter uppercase">Inscrição Protocolada!</h2>
                <p className="text-slate-600 max-w-md mx-auto">
                    Recebemos seu interesse no curso <strong>{selectedCourse?.name}</strong>. Fique atento ao seu WhatsApp, enviaremos as instruções de confirmação em breve.
                </p>
                <Button variant="outline" onClick={() => window.location.reload()} className="h-12 px-8 font-black uppercase tracking-widest">Fazer outra inscrição</Button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            <header className="text-center mb-10">
                <Badge variant="outline" className="text-primary border-primary/30 bg-primary/5 font-black uppercase text-[10px] mb-4 px-3 py-1">Inscrições Abertas</Badge>
                <h1 className="text-4xl sm:text-5xl font-black text-slate-900 italic tracking-tighter uppercase leading-none">
                    Faça parte da <span className="text-primary">IBM</span>
                </h1>
                <p className="text-slate-500 mt-4 font-medium">Sua jornada de crescimento começa aqui.</p>
                
                <div className="flex justify-center gap-2 mt-8 max-w-xs mx-auto">
                    {[1, 2, 3].map(i => (
                        <div key={i} className={cn("h-1.5 flex-1 rounded-full transition-all duration-500", step >= i ? "bg-primary" : "bg-slate-100")} />
                    ))}
                </div>
            </header>

            <Card className="border-none shadow-2xl rounded-[2rem] overflow-hidden">
                <CardContent className="p-0">
                    {step === 1 && (
                        <div className="p-6 sm:p-10 space-y-6 animate-in fade-in slide-in-from-bottom-4">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-primary/10 rounded-lg text-primary"><BookOpen size={20}/></div>
                                <h2 className="text-xl font-black uppercase tracking-tight">Escolha seu Curso</h2>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {courses.map(course => (
                                    <button
                                        key={course.id}
                                        onClick={() => handleCourseSelect(course.id)}
                                        className="text-left p-5 rounded-2xl border-2 border-slate-100 hover:border-primary hover:bg-primary/5 transition-all group flex flex-col justify-between h-full"
                                    >
                                        <div>
                                            <p className="text-[10px] font-black uppercase text-primary mb-1 tracking-widest">{course.ministryName}</p>
                                            <h3 className="font-bold text-lg text-slate-900 group-hover:text-primary transition-colors">{course.name}</h3>
                                            <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">{course.description}</p>
                                        </div>
                                        <ChevronRight className="size-5 mt-4 text-slate-300 group-hover:text-primary transition-all group-hover:translate-x-1" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="p-6 sm:p-10 space-y-6 animate-in fade-in slide-in-from-right-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-lg text-primary"><School size={20}/></div>
                                    <h2 className="text-xl font-black uppercase tracking-tight">Selecione uma Turma</h2>
                                </div>
                                <Button variant="ghost" onClick={() => setStep(1)} className="text-xs uppercase font-bold">Voltar</Button>
                            </div>
                            <div className="space-y-3">
                                {filteredClasses.length > 0 ? (
                                    filteredClasses.map(cls => (
                                        <button
                                            key={cls.id}
                                            onClick={() => handleClassSelect(cls.id)}
                                            className={cn(
                                                "w-full p-5 rounded-2xl border-2 text-left transition-all flex items-center justify-between group",
                                                formData.classId === cls.id ? "border-primary bg-primary/5 ring-4 ring-primary/10" : "border-slate-100 hover:border-slate-200"
                                            )}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={cn("size-6 rounded-full border-2 flex items-center justify-center transition-all", formData.classId === cls.id ? "bg-primary border-primary text-white" : "border-slate-300 group-hover:border-primary")}>
                                                    {formData.classId === cls.id && <CheckCircle2 size={14} />}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900">{cls.name}</p>
                                                    <p className="text-xs text-slate-500">{cls.dayOfWeek} às {cls.startTime}</p>
                                                </div>
                                            </div>
                                            <Badge variant="secondary" className="text-[10px] font-bold">Vagas Disponíveis</Badge>
                                        </button>
                                    ))
                                ) : (
                                    <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed">
                                        <p className="text-slate-500">Nenhuma turma com inscrições abertas para este curso.</p>
                                        <Button variant="link" onClick={() => setStep(1)}>Ver outros cursos</Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <form onSubmit={handleSubmit} className="p-6 sm:p-10 space-y-8 animate-in fade-in slide-in-from-right-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-lg text-primary"><User size={20}/></div>
                                    <h2 className="text-xl font-black uppercase tracking-tight">Seus Dados</h2>
                                </div>
                                <Button type="button" variant="ghost" onClick={() => setStep(2)} className="text-xs uppercase font-bold">Voltar</Button>
                            </div>

                            <div className="grid grid-cols-1 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-[10px] uppercase font-black tracking-widest text-slate-500">Nome Completo</Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-3 size-4 text-slate-400" />
                                        <Input 
                                            required 
                                            placeholder="Ex: João Silva" 
                                            className="h-12 pl-10 rounded-xl"
                                            value={formData.name}
                                            onChange={e => setFormData(p => ({...p, name: e.target.value}))}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] uppercase font-black tracking-widest text-slate-500">E-mail</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-3 size-4 text-slate-400" />
                                            <Input 
                                                required 
                                                type="email"
                                                placeholder="joao@exemplo.com" 
                                                className="h-12 pl-10 rounded-xl"
                                                value={formData.email}
                                                onChange={e => setFormData(p => ({...p, email: e.target.value}))}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] uppercase font-black tracking-widest text-slate-500">WhatsApp</Label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-3 size-4 text-slate-400" />
                                            <Input 
                                                required 
                                                placeholder="(21) 9..." 
                                                className="h-12 pl-10 rounded-xl"
                                                value={formData.phone}
                                                onChange={e => setFormData(p => ({...p, phone: e.target.value}))}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <Button 
                                type="submit" 
                                disabled={isSubmitting} 
                                className="w-full h-14 font-black uppercase tracking-widest text-lg shadow-xl shadow-primary/20 rounded-2xl"
                            >
                                {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : null}
                                Finalizar Inscrição
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
