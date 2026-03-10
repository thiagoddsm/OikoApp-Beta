
'use client';

import React, { useState, useMemo } from 'react';
import { useFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, Timestamp, query, where, getDocs } from 'firebase/firestore';
import { useVolunteering, type Class, type Course } from '@/contexts/volunteering-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { 
    Loader2, 
    CheckCircle2, 
    BookOpen, 
    User, 
    Phone, 
    Mail, 
    ArrowRight, 
    Calendar,
    ArrowLeft,
    Layers,
    Award
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function PublicEnrollmentForm({ initialCourseId }: { initialCourseId?: string }) {
    const { courses, classes, isLoading } = useVolunteering();
    const { firestore } = useFirebase();
    const { toast } = useToast();

    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        courseId: initialCourseId || '',
        classId: '',
    });

    const selectedCourse = useMemo(() => courses.find(c => c.id === formData.courseId), [courses, formData.courseId]);
    
    const isMemberCourse = useMemo(() => 
        selectedCourse?.name.toLowerCase().includes('membro') || 
        selectedCourse?.name.toLowerCase().includes('pertencer') ||
        selectedCourse?.name.toLowerCase().includes('integração'),
    [selectedCourse]);

    const availableClasses = useMemo(() => {
        if (!formData.courseId) return [];
        return classes.filter(c => c.courseId === formData.courseId);
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
        if (!firestore) return;

        setIsSubmitting(true);
        try {
            const requestsRef = collection(firestore, 'enrollment_requests');
            await addDocumentNonBlocking(requestsRef, {
                ...formData,
                status: 'pending',
                createdAt: Timestamp.now(),
            });
            setSuccess(true);
            toast({ title: "Inscrição Enviada!", description: "Seu interesse foi registrado. Em breve entraremos em contato." });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: "Erro", description: "Não foi possível enviar sua inscrição agora." });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>;
    }

    if (success) {
        return (
            <Card className="max-w-md mx-auto border-none shadow-2xl overflow-hidden animate-in zoom-in-95">
                <div className="h-2 bg-emerald-500" />
                <CardContent className="p-12 text-center space-y-6">
                    <div className="size-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                        <CheckCircle2 size={40} />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-3xl font-black italic tracking-tighter uppercase text-slate-900">Inscrição Enviada!</h2>
                        <p className="text-muted-foreground text-sm font-medium">
                            Obrigado, <strong>{formData.name}</strong>. Nossa equipe pedagógica analisará sua solicitação para o curso <strong>{selectedCourse?.name}</strong> e entrará em contato via WhatsApp.
                        </p>
                    </div>
                    <Button onClick={() => window.location.reload()} variant="outline" className="w-full font-bold">Voltar ao Início</Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            <header className="text-center mb-10 space-y-2">
                <Badge variant="outline" className="text-primary border-primary/30 bg-primary/5 font-black uppercase text-[10px] mb-4">Inscrição Lumine</Badge>
                <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter uppercase text-slate-900">
                    Trilha de <span className="text-primary">Crescimento</span>
                </h1>
                <p className="text-muted-foreground text-sm font-medium max-w-lg mx-auto leading-relaxed">
                    Escolha o seu próximo passo na jornada com Deus. Do curso de membresia à escola de líderes.
                </p>
            </header>

            <div className="flex items-center gap-2 mb-8 max-w-sm mx-auto">
                <div className={cn("h-1.5 flex-1 rounded-full transition-all duration-500", step >= 1 ? "bg-primary" : "bg-slate-100")} />
                <div className={cn("h-1.5 flex-1 rounded-full transition-all duration-500", step >= 2 ? "bg-primary" : "bg-slate-100")} />
                <div className={cn("h-1.5 flex-1 rounded-full transition-all duration-500", step >= 3 ? "bg-primary" : "bg-slate-100")} />
            </div>

            {step === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-bottom-4">
                    {courses.map(course => (
                        <Card 
                            key={course.id} 
                            className={cn(
                                "cursor-pointer transition-all hover:border-primary/50 hover:shadow-xl group",
                                formData.courseId === course.id ? "border-primary ring-2 ring-primary/20 shadow-lg" : ""
                            )}
                            onClick={() => handleCourseSelect(course.id)}
                        >
                            <CardHeader className="pb-4">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="p-2 bg-primary/5 rounded-xl text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                        <BookOpen size={20} />
                                    </div>
                                    <Badge variant="secondary" className="text-[8px] font-black uppercase tracking-widest">{course.ministryName}</Badge>
                                </div>
                                <CardTitle className="text-lg font-black uppercase italic tracking-tighter leading-none">{course.name}</CardTitle>
                                <CardDescription className="text-xs line-clamp-2 mt-2">{course.description}</CardDescription>
                            </CardHeader>
                            <CardFooter className="pt-0 justify-end">
                                <ArrowRight size={16} className="text-primary opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0" />
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}

            {step === 2 && (
                <div className="animate-in slide-in-from-right-4 space-y-6">
                    <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="font-bold -ml-2">
                        <ArrowLeft className="mr-2 size-4" /> Alterar Curso
                    </Button>
                    
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-primary rounded-2xl text-white shadow-lg shadow-primary/20">
                                <Calendar size={24} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black uppercase italic tracking-tighter">Escolha sua Turma</h2>
                                <p className="text-xs text-muted-foreground font-bold uppercase">{selectedCourse?.name}</p>
                            </div>
                        </div>

                        {isMemberCourse ? (
                            <Card className="bg-primary/5 border-primary/20 border-2">
                                <CardHeader>
                                    <div className="size-10 bg-primary text-white rounded-xl flex items-center justify-center mb-4">
                                        <Layers size={20} />
                                    </div>
                                    <CardTitle className="text-lg font-black uppercase italic tracking-tighter">Ciclo Mensal (Modular)</CardTitle>
                                    <CardDescription className="text-sm font-medium">
                                        O curso de membresia funciona por ciclos. Ao se inscrever, você poderá frequentar as aulas em qualquer domingo do mês às 09h00.
                                    </CardDescription>
                                </CardHeader>
                                <CardFooter>
                                    <Button onClick={() => setStep(3)} className="w-full h-12 font-black shadow-lg">Continuar para Cadastro</Button>
                                </CardFooter>
                            </Card>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {availableClasses.length === 0 ? (
                                    <div className="col-span-full py-12 text-center bg-muted/30 rounded-2xl border-2 border-dashed">
                                        <p className="text-muted-foreground font-bold">Nenhuma turma aberta para inscrição no momento.</p>
                                    </div>
                                ) : (
                                    availableClasses.map(cls => (
                                        <button
                                            key={cls.id}
                                            onClick={() => handleClassSelect(cls.id)}
                                            className={cn(
                                                "p-6 rounded-2xl border-2 text-left transition-all hover:border-primary group",
                                                formData.classId === cls.id ? "bg-primary border-primary text-white" : "bg-white border-slate-100 shadow-sm"
                                            )}
                                        >
                                            <div className="flex justify-between items-start mb-4">
                                                <Badge variant="outline" className={cn("text-[9px] font-black border-none", formData.classId === cls.id ? "bg-white/20 text-white" : "bg-primary/10 text-primary")}>
                                                    ABERTA
                                                </Badge>
                                                <div className={cn("size-6 rounded-full border-2 flex items-center justify-center transition-all", formData.classId === cls.id ? "bg-primary border-primary text-white" : "border-slate-300 group-hover:border-primary")}>
                                                    {formData.classId === cls.id && <div className="size-2 bg-white rounded-full" />}
                                                </div>
                                            </div>
                                            <p className={cn("text-lg font-black uppercase italic tracking-tighter leading-none mb-1", formData.classId === cls.id ? "text-white" : "text-slate-900")}>{cls.name}</p>
                                            <p className={cn("text-xs font-bold uppercase tracking-widest", formData.classId === cls.id ? "text-white/70" : "text-muted-foreground")}>
                                                {cls.dayOfWeek} às {cls.startTime}
                                            </p>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {step === 3 && (
                <form onSubmit={handleSubmit} className="animate-in fade-in-50 duration-500 max-w-xl mx-auto">
                    <Button variant="ghost" size="sm" onClick={() => setStep(2)} className="font-bold -ml-2 mb-6" type="button">
                        <ArrowLeft className="mr-2 size-4" /> Alterar Turma
                    </Button>

                    <Card className="border-none shadow-2xl overflow-hidden rounded-[2rem]">
                        <CardHeader className="bg-slate-900 text-white p-8">
                            <div className="flex items-center gap-4">
                                <div className="size-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                                    <Award size={24} />
                                </div>
                                <div>
                                    <CardTitle className="text-xl font-black uppercase italic tracking-tighter">Dados do Interessado</CardTitle>
                                    <CardDescription className="text-white/60 text-xs font-bold uppercase tracking-widest">Etapa Final de Inscrição</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-8 space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nome Completo</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-3 size-4 text-primary" />
                                    <Input 
                                        id="name" 
                                        required 
                                        className="pl-10 h-12 bg-muted/30 border-none focus-visible:ring-primary font-bold" 
                                        placeholder="Seu nome"
                                        value={formData.name}
                                        onChange={e => setFormData(p => ({...p, name: e.target.value}))}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">E-mail</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-3 size-4 text-primary" />
                                        <Input 
                                            id="email" 
                                            type="email" 
                                            required 
                                            className="pl-10 h-12 bg-muted/30 border-none focus-visible:ring-primary font-bold" 
                                            placeholder="seu@email.com"
                                            value={formData.email}
                                            onChange={e => setFormData(p => ({...p, email: e.target.value}))}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">WhatsApp</Label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-3 size-4 text-primary" />
                                        <Input 
                                            id="phone" 
                                            required 
                                            className="pl-10 h-12 bg-muted/30 border-none focus-visible:ring-primary font-bold" 
                                            placeholder="(21) 9..."
                                            value={formData.phone}
                                            onChange={e => setFormData(p => ({...p, phone: e.target.value}))}
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="p-8 bg-muted/20 border-t">
                            <Button type="submit" disabled={isSubmitting} className="w-full h-14 text-lg font-black shadow-xl shadow-primary/20">
                                {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2" />}
                                FINALIZAR MINHA INSCRIÇÃO
                            </Button>
                        </CardFooter>
                    </Card>
                </form>
            )}
        </div>
    );
}
