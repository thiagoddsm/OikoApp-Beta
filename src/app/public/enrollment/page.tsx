
'use client';

import React, { useState, useMemo } from 'react';
import { useFirebase, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
    Loader2, 
    BookOpen, 
    User, 
    Phone, 
    Mail, 
    CheckCircle2, 
    ArrowRight, 
    ArrowLeft,
    Lightbulb,
    Waves,
    GraduationCap,
    Clock,
    School
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';

type Course = {
    id: string;
    name: string;
    description: string;
    ministryName: string;
    ebdTrack?: 'teologico' | 'biblico' | 'discipulado';
};

export default function EnrollmentPublicPage() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const initialCourseId = searchParams.get('courseId');

    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        courseId: initialCourseId || '',
    });

    const coursesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'courses')) : null, [firestore]);
    const { data: courses, isLoading: isLoadingCourses } = useCollection<Course>(coursesQuery);

    const filteredCourses = useMemo(() => {
        if (!courses) return [];
        return courses.sort((a, b) => a.ministryName.localeCompare(b.ministryName));
    }, [courses]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleNext = () => {
        if (step === 1 && (!formData.name || !formData.phone)) {
            toast({ variant: 'destructive', title: 'Campos obrigatórios', description: 'Preencha seu nome e telefone para continuar.' });
            return;
        }
        setStep(prev => prev + 1);
    };

    const handleSubmit = async () => {
        if (!formData.courseId) {
            toast({ variant: 'destructive', title: 'Selecione um curso', description: 'Você precisa escolher uma das opções para se inscrever.' });
            return;
        }

        setIsLoading(true);
        try {
            await addDocumentNonBlocking(collection(firestore!, 'enrollment_requests'), {
                ...formData,
                status: 'pending',
                createdAt: Timestamp.now(),
            });
            setSuccess(true);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro ao enviar', description: 'Não foi possível processar sua inscrição. Tente novamente.' });
        } finally {
            setIsLoading(false);
        }
    };

    const getTrackInfo = (course: Course) => {
        if (course.ebdTrack === 'teologico') {
            return "Durante a Fase Buscar | 1ª Edição: 12/03 a 16/04 às 09h00";
        }
        if (course.ebdTrack === 'biblico' || course.ebdTrack === 'discipulado') {
            return "Todo domingo às 09h00";
        }
        return null;
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
                <Card className="max-w-md w-full text-center p-8 animate-in zoom-in-95 duration-300">
                    <div className="size-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 size={48} />
                    </div>
                    <CardTitle className="text-2xl font-black mb-2">Solicitação Enviada!</CardTitle>
                    <CardDescription className="text-base">
                        Olá {formData.name.split(' ')[0]}, recebemos seu interesse no curso. 
                        O responsável entrará em contato em breve para confirmar sua vaga na turma.
                    </CardDescription>
                    <Button className="mt-8 w-full" onClick={() => window.location.reload()}>Fazer outra inscrição</Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4">
            <div className="max-w-3xl mx-auto space-y-8">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-black tracking-tight text-slate-900">Inscrição em Cursos IBM</h1>
                    <p className="text-muted-foreground">Faça parte do organismo. Cresça através do ensino.</p>
                </div>

                <div className="flex justify-between items-center max-w-xs mx-auto mb-8">
                    {[1, 2].map(i => (
                        <div key={i} className="flex items-center">
                            <div className={cn(
                                "size-8 rounded-full flex items-center justify-center font-bold text-sm transition-all",
                                step === i ? "bg-primary text-white scale-110 ring-4 ring-primary/20" : 
                                step > i ? "bg-emerald-500 text-white" : "bg-white text-slate-400 border"
                            )}>
                                {step > i ? <CheckCircle2 size={16} /> : i}
                            </div>
                            {i === 1 && <div className={cn("w-24 h-1 mx-2 rounded", step > 1 ? "bg-emerald-500" : "bg-slate-200")} />}
                        </div>
                    ))}
                </div>

                <Card className="shadow-xl border-none">
                    {step === 1 ? (
                        <>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <User className="text-primary size-5" />
                                    Dados Pessoais
                                </CardTitle>
                                <CardDescription>Identifique-se para que possamos entrar em contato.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Nome Completo</Label>
                                    <Input id="name" name="name" value={formData.name} onChange={handleInputChange} placeholder="Ex: João da Silva" className="h-12" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">WhatsApp / Celular</Label>
                                        <Input id="phone" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="(21) 99999-9999" className="h-12" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">E-mail (Opcional)</Label>
                                        <Input id="email" name="email" value={formData.email} onChange={handleInputChange} type="email" placeholder="seu@email.com" className="h-12" />
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button className="w-full h-12 text-base font-bold" onClick={handleNext}>
                                    Continuar <ArrowRight className="ml-2 size-4" />
                                </Button>
                            </CardFooter>
                        </>
                    ) : (
                        <>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <BookOpen className="text-primary size-5" />
                                    Escolha seu Curso
                                </CardTitle>
                                <CardDescription>Selecione a trilha que você deseja percorrer agora.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {isLoadingCourses ? (
                                    <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-3">
                                        {filteredCourses.map(course => {
                                            const isSelected = formData.courseId === course.id;
                                            const trackInfo = getTrackInfo(course);
                                            return (
                                                <button
                                                    key={course.id}
                                                    onClick={() => setFormData(p => ({...p, courseId: course.id}))}
                                                    className={cn(
                                                        "p-4 rounded-xl border-2 text-left transition-all group flex flex-col gap-2",
                                                        isSelected ? "border-primary bg-primary/5 ring-4 ring-primary/10 shadow-md" : "hover:border-primary/30 hover:bg-slate-50"
                                                    )}
                                                >
                                                    <div className="flex justify-between items-start">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-black uppercase text-primary/60 tracking-widest">{course.ministryName}</span>
                                                                {isSelected && <Badge className="h-4 text-[8px] font-black uppercase">Selecionado</Badge>}
                                                            </div>
                                                            <h4 className="font-bold text-lg text-slate-900 group-hover:text-primary transition-colors">{course.name}</h4>
                                                        </div>
                                                        <div className={cn("size-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all", isSelected ? "bg-primary border-primary" : "border-slate-300")}>
                                                            {isSelected && <div className="size-2 bg-white rounded-full" />}
                                                        </div>
                                                    </div>
                                                    
                                                    {trackInfo && (
                                                        <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 w-fit px-2 py-1 rounded border border-emerald-100">
                                                            <Clock size={12} className="shrink-0" />
                                                            <span className="text-[10px] font-black uppercase tracking-tighter">{trackInfo}</span>
                                                        </div>
                                                    )}
                                                    
                                                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1 italic leading-relaxed">
                                                        {course.description || "Inscrições abertas para novas turmas."}
                                                    </p>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter className="flex gap-3">
                                <Button variant="ghost" onClick={() => setStep(1)} className="h-12"><ArrowLeft className="mr-2 size-4" /> Voltar</Button>
                                <Button className="flex-1 h-12 text-base font-bold shadow-lg" disabled={isLoading || !formData.courseId} onClick={handleSubmit}>
                                    {isLoading ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2" />}
                                    Finalizar Inscrição
                                </Button>
                            </CardFooter>
                        </>
                    )}
                </Card>

                <div className="text-center">
                    <p className="text-xs text-muted-foreground">
                        Ao se inscrever, você concorda com os termos de convivência da Igreja Batista da Manhã.
                    </p>
                </div>
            </div>
        </div>
    );
}
