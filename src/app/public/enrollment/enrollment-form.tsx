
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useVolunteering } from '@/contexts/volunteering-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
    Loader2, 
    BookOpen, 
    User, 
    Phone, 
    Mail, 
    CheckCircle, 
    Layers, 
    ChevronRight, 
    ArrowLeft,
    GraduationCap,
    Info,
    Calendar,
    HeartHandshake
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function EnrollmentForm({ initialCourseId }: { initialCourseId?: string }) {
    const { courses, classes, addEnrollmentRequest, isLoading } = useVolunteering();
    const { toast } = useToast();

    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const [formData, setFormData] = useState({
        courseId: initialCourseId || '',
        classId: '',
        name: '',
        email: '',
        phone: '',
        agreeTerms: false
    });

    const selectedCourse = useMemo(() => courses.find(c => c.id === formData.courseId), [courses, formData.courseId]);
    const filteredClasses = useMemo(() => classes.filter(c => c.courseId === formData.courseId), [classes, formData.courseId]);

    const handleNext = () => setStep(prev => prev + 1);
    const handleBack = () => setStep(prev => prev - 1);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.agreeTerms) {
            toast({ variant: 'destructive', title: 'Termos de Uso', description: 'Você precisa aceitar os termos para continuar.' });
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
                status: 'pending'
            });
            setSubmitted(true);
            toast({ title: 'Solicitação Enviada!', description: 'Recebemos seu interesse e entraremos em contato em breve.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro ao enviar', description: 'Por favor, tente novamente.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
    }

    if (submitted) {
        return (
            <Card className="max-w-md mx-auto text-center p-8 border-t-8 border-primary animate-in zoom-in-95">
                <div className="size-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="text-primary size-10" />
                </div>
                <CardTitle className="text-2xl font-black italic tracking-tighter uppercase mb-2">Quase lá!</CardTitle>
                <CardDescription className="text-base">
                    Sua solicitação para o curso <strong>{selectedCourse?.name}</strong> foi protocolada. 
                    Nossa equipe entrará em contato via WhatsApp/E-mail para confirmar sua vaga e início das aulas.
                </CardDescription>
                <CardFooter className="flex justify-center pt-8">
                    <Button onClick={() => window.location.reload()} variant="outline">Voltar ao início</Button>
                </CardFooter>
            </Card>
        );
    }

    return (
        <Card className="max-w-xl mx-auto shadow-2xl overflow-hidden border-none">
            <div className="bg-slate-900 p-8 text-white relative">
                <Badge variant="outline" className="text-primary border-primary/30 bg-primary/5 font-black uppercase text-[10px] mb-4">Inscrição Lumine</Badge>
                <h2 className="text-3xl font-black italic tracking-tighter uppercase leading-none">Matrícula Escolar</h2>
                <p className="text-slate-400 text-sm mt-2">Dê o próximo passo na sua jornada de crescimento.</p>
                
                <div className="flex gap-2 mt-8">
                    <div className={cn("h-1.5 flex-1 rounded-full transition-all duration-500", step >= 1 ? "bg-primary" : "bg-slate-100/20")} />
                    <div className={cn("h-1.5 flex-1 rounded-full transition-all duration-500", step >= 2 ? "bg-primary" : "bg-slate-100/20")} />
                    <div className={cn("h-1.5 flex-1 rounded-full transition-all duration-500", step >= 3 ? "bg-primary" : "bg-slate-100/20")} />
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <CardContent className="p-8">
                    {step === 1 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Selecione o Curso</Label>
                                <div className="grid gap-3">
                                    {courses.map(course => (
                                        <button
                                            key={course.id}
                                            type="button"
                                            onClick={() => setFormData(p => ({...p, courseId: course.id, classId: ''}))}
                                            className={cn(
                                                "flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all hover:border-primary/50 group",
                                                formData.courseId === course.id ? "border-primary bg-primary/5 ring-4 ring-primary/10" : "border-slate-100 bg-slate-50/50"
                                            )}
                                        >
                                            <div className={cn("p-2 rounded-lg transition-colors", formData.courseId === course.id ? "bg-primary text-white" : "bg-white text-slate-400 group-hover:text-primary")}>
                                                <GraduationCap size={20} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-sm text-slate-900 truncate uppercase">{course.name}</p>
                                                <p className="text-[10px] text-muted-foreground truncate uppercase font-bold tracking-tighter">{course.ministryName}</p>
                                            </div>
                                            {formData.courseId === course.id && <CheckCircle className="size-5 text-primary" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <Button type="button" className="w-full h-12 font-black uppercase tracking-widest" disabled={!formData.courseId} onClick={handleNext}>Continuar <ChevronRight className="ml-2 size-4"/></Button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Escolha sua Turma</Label>
                                <div className="grid gap-3">
                                    {filteredClasses.length > 0 ? (
                                        filteredClasses.map(cls => (
                                            <button
                                                key={cls.id}
                                                type="button"
                                                onClick={() => setFormData(p => ({...p, classId: cls.id}))}
                                                className={cn(
                                                    "flex items-center justify-between p-4 rounded-xl border-2 text-left transition-all hover:border-primary/50 group",
                                                    formData.classId === cls.id ? "border-primary bg-primary/5 ring-4 ring-primary/10" : "border-slate-100 bg-slate-50/50"
                                                )}
                                            >
                                                <div>
                                                    <p className="font-bold text-sm text-slate-900 uppercase">{cls.name}</p>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <span className="text-[10px] font-black text-muted-foreground uppercase flex items-center gap-1">
                                                            <Calendar size={12}/> {cls.dayOfWeek}
                                                        </span>
                                                        <span className="text-[10px] font-black text-primary uppercase flex items-center gap-1">
                                                            <Clock size={12}/> {cls.startTime}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className={cn("size-6 rounded-full border-2 flex items-center justify-center transition-all", formData.classId === cls.id ? "bg-primary border-primary text-white" : "border-slate-300 group-hover:border-primary")}>
                                                    {formData.classId === cls.id && <CheckCircle className="size-4" />}
                                                </div>
                                            </button>
                                        ))
                                    ) : (
                                        <div className="p-12 text-center border-2 border-dashed rounded-xl bg-slate-50">
                                            <Info className="mx-auto size-8 text-muted-foreground mb-4 opacity-20"/>
                                            <p className="text-sm font-bold text-slate-500 uppercase tracking-tighter">Nenhuma turma disponível agora</p>
                                            <p className="text-xs text-muted-foreground mt-1">Continue o cadastro e te avisaremos assim que abrirmos novas vagas.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <Button type="button" variant="outline" className="h-12 w-20" onClick={handleBack}><ArrowLeft size={20}/></Button>
                                <Button type="button" className="flex-1 h-12 font-black uppercase tracking-widest" onClick={handleNext}>Confirmar <ChevronRight className="ml-2 size-4"/></Button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Nome Completo</Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-3 size-4 text-slate-400" />
                                        <Input id="name" required placeholder="Digite seu nome..." className="pl-10 h-11" value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">E-mail</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-3 size-4 text-slate-400" />
                                        <Input id="email" type="email" required placeholder="seu@email.com" className="pl-10 h-11" value={formData.email} onChange={e => setFormData(p => ({...p, email: e.target.value}))} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone" className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">WhatsApp</Label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-3 size-4 text-slate-400" />
                                        <Input id="phone" required placeholder="(21) 99999-9999" className="pl-10 h-11" value={formData.phone} onChange={e => setFormData(p => ({...p, phone: e.target.value}))} />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-start space-x-2 pt-2 border-t">
                                <Checkbox id="terms" checked={formData.agreeTerms} onCheckedChange={(v) => setFormData(p => ({...p, agreeTerms: !!v}))} />
                                <Label htmlFor="terms" className="text-[10px] leading-tight text-muted-foreground cursor-pointer font-bold uppercase">
                                    Estou ciente que meus dados serão processados pela secretaria da IBM apenas para fins de gestão acadêmica e ministerial.
                                </Label>
                            </div>

                            <div className="flex gap-3">
                                <Button type="button" variant="outline" className="h-12 w-20" onClick={handleBack} disabled={isSubmitting}><ArrowLeft size={20}/></Button>
                                <Button type="submit" className="flex-1 h-12 font-black uppercase tracking-widest shadow-xl shadow-primary/20" disabled={isSubmitting}>
                                    {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle className="mr-2" />}
                                    Finalizar Matrícula
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </form>
        </Card>
    );
}
