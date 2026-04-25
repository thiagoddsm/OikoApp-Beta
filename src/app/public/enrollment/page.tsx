'use client';

import React, { useState, useMemo } from 'react';
import { VolunteeringProvider, useVolunteering } from '@/contexts/volunteering-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Loader2, ArrowRight, CheckCircle, Search,
    BookOpen, Layers, Clock, CalendarDays, Sparkles, ChevronLeft, Info,
    GraduationCap, Briefcase, ListChecks, ChevronRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/icons';
import { cn } from '@/lib/utils';
import { verifyMemberEmail, submitEnrollmentRequest } from './actions';

const STEPS = [
    { id: 1, name: 'Identificação', icon: Sparkles },
    { id: 2, name: 'Categoria', icon: Layers },
    { id: 3, name: 'Catálogo', icon: BookOpen },
    { id: 4, name: 'Turma', icon: Clock },
    { id: 5, name: 'Resumo', icon: CheckCircle }
];

function Stepper({ currentStep }: { currentStep: number }) {
    return (
        <div className="flex justify-center mb-12 mt-4 px-4 overflow-hidden">
            <div className="flex items-center w-full max-w-2xl">
                {STEPS.map((step, idx) => (
                    <React.Fragment key={step.id}>
                        <div className="flex flex-col items-center gap-2 relative z-10 shrink-0">
                            <div className={cn(
                                "size-10 md:size-12 rounded-full border-2 flex items-center justify-center transition-all bg-white",
                                currentStep === step.id ? "border-primary text-primary scale-110 shadow-lg" :
                                    currentStep > step.id ? "bg-primary border-primary text-white" : "border-slate-200 text-slate-300"
                            )}>
                                <step.icon className="size-4 md:size-5" />
                            </div>
                            <span className={cn(
                                "absolute -bottom-6 text-[9px] md:text-[10px] font-black uppercase tracking-widest whitespace-nowrap",
                                currentStep === step.id ? "text-primary" : "text-muted-foreground"
                            )}>{step.name}</span>
                        </div>
                        {idx < STEPS.length - 1 && (
                            <div className={cn(
                                "flex-1 h-1 mx-1 md:mx-3 rounded-full transition-all duration-500",
                                currentStep > step.id ? "bg-primary" : "bg-slate-200"
                            )} />
                        )}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
}

function EnrollmentForm() {
    const { courses, classes } = useVolunteering();
    const { toast } = useToast();

    // Global Flow State
    const [currentStep, setCurrentStep] = useState(1);
    const [isSuccess, setIsSuccess] = useState(false);

    // Step 1: Identification
    const [mode, setMode] = useState<'existing' | 'new'>('existing');
    const [isVerifying, setIsVerifying] = useState(false);
    const [emailInput, setEmailInput] = useState('');
    const [foundUser, setFoundUser] = useState<{ userId: string; maskedName: string; maskedPhone: string } | null>(null);
    const [formData, setFormData] = useState({ name: '', phone: '' });

    // Step 2: Category
    const [selectedCategory, setSelectedCategory] = useState<'lumine' | 'escolas' | 'ministerios' | 'eventos' | null>(null);

    // Step 3: Catalog
    const [trailFilter, setTrailFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

    // Step 4: Class Selection
    const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

    // Step 5: Submission
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Navigation Data
    const courseClasses = useMemo(() => classes.filter(cls => cls.courseId === selectedCourseId), [classes, selectedCourseId]);
    const selectedCourse = useMemo(() => courses.find(c => c.id === selectedCourseId), [courses, selectedCourseId]);
    const selectedClassObj = useMemo(() => classes.find(c => c.id === selectedClassId), [classes, selectedClassId]);

    const filteredCourses = useMemo(() => {
        if (!courses || selectedCategory === 'eventos' || !selectedCategory) return [];
        return courses.filter(c => {
            const ministry = c.ministryName?.toLowerCase() || '';
            const isLumine = ministry.includes('lumine') || ministry.includes('ebd');
            const isEscola = ministry.includes('wave') || ministry === 'dis';

            if (selectedCategory === 'lumine' && !isLumine) return false;
            if (selectedCategory === 'escolas' && !isEscola) return false;
            if (selectedCategory === 'ministerios' && (isLumine || isEscola)) return false;

            if (selectedCategory === 'lumine' && trailFilter !== 'all' && c.ebdTrack !== trailFilter) return false;

            if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase();
                return c.name.toLowerCase().includes(term) || (c.description || '').toLowerCase().includes(term);
            }
            return true;
        });
    }, [courses, selectedCategory, trailFilter, searchTerm]);

    // Handlers
    const handleVerifyEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!emailInput.trim()) return;

        setIsVerifying(true);
        const result = await verifyMemberEmail(emailInput);
        setIsVerifying(false);

        if (result.error) {
            toast({ variant: 'destructive', title: "Erro", description: result.error });
            return;
        }

        if (result.found) {
            setFoundUser({
                userId: result.userId!,
                maskedName: result.maskedName!,
                maskedPhone: result.maskedPhone!
            });
            setMode('existing');
        } else {
            setFoundUser(null);
            setMode('new');
        }
    };

    const nextStep = () => {
        setCurrentStep(p => Math.min(p + 1, 5));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const prevStep = () => {
        setCurrentStep(p => Math.max(p - 1, 1));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleFinalSubmit = async () => {
        if (!selectedCourseId) return;
        setIsSubmitting(true);
        try {
            await submitEnrollmentRequest({
                userId: foundUser?.userId,
                name: mode === 'new' ? formData.name : undefined,
                email: emailInput.toLowerCase().trim(),
                phone: mode === 'new' ? formData.phone : undefined,
                courseId: selectedCourseId,
                classId: selectedClassId || undefined
            });
            setIsSuccess(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (error) {
            toast({ variant: 'destructive', title: "Erro ao processar", description: "Não foi possível enviar sua inscrição." });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Rendered Views
    if (isSuccess) {
        return (
            <div className="max-w-md mx-auto py-20 px-4 text-center space-y-6 animate-in zoom-in-95 duration-500">
                <div className="size-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                    <CheckCircle size={40} />
                </div>
                <h2 className="text-4xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">Protocolo<br />Enviado!</h2>
                <p className="text-muted-foreground font-medium">Sua solicitação para <strong>{selectedCourse?.name}</strong> foi recebida. Em breve a secretaria entrará em contato.</p>
                <Button onClick={() => window.location.reload()} variant="outline" className="w-full font-bold h-12 rounded-xl">Fazer Outra Inscrição</Button>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
            {/* Header Global */}
            <div className="text-center space-y-4 mb-2">
                <Logo className="size-12 text-primary mx-auto mb-4" />
                <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase text-slate-900 leading-none">Sistema de<br />Inscrições</h1>
            </div>

            {/* Stepper Wizard Indicator */}
            <Stepper currentStep={currentStep} />

            {/* Passo 1: Identificação */}
            {currentStep === 1 && (
                <Card className="shadow-xl border-dashed border-2 overflow-hidden rounded-[2.5rem] animate-in slide-in-from-right-8">
                    <CardHeader className="bg-primary/5 p-8 border-b text-center">
                        <CardTitle className="text-2xl font-black uppercase italic tracking-tighter">Quem é você?</CardTitle>
                        <CardDescription>Precisamos do seu e-mail para vincular a inscrição.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8">
                        {!mode || (mode === 'existing' && !foundUser) ? (
                            <form onSubmit={handleVerifyEmail} className="space-y-6">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground">E-mail Principal</Label>
                                    <Input
                                        required
                                        type="email"
                                        placeholder="seu@email.com"
                                        value={emailInput}
                                        onChange={e => setEmailInput(e.target.value)}
                                        className="h-14 rounded-2xl text-lg font-medium border-slate-200"
                                    />
                                </div>
                                <Button disabled={isVerifying || !emailInput} className="w-full h-14 rounded-2xl font-black text-base uppercase tracking-widest shadow-xl">
                                    {isVerifying ? <Loader2 className="animate-spin mr-2" /> : <ArrowRight className="mr-2" />}
                                    Buscar Cadastro
                                </Button>
                            </form>
                        ) : mode === 'existing' && foundUser ? (
                            <div className="space-y-8 animate-in fade-in zoom-in-95">
                                <div className="p-6 bg-primary/5 rounded-3xl border-2 border-dashed border-primary/20 flex items-center gap-4">
                                    <div className="size-14 bg-white rounded-2xl shadow-sm flex items-center justify-center text-primary shrink-0">
                                        <Sparkles size={28} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-primary tracking-widest leading-none mb-1">Encontramos você</p>
                                        <h3 className="text-lg font-black text-slate-900 leading-none">{foundUser.maskedName}</h3>
                                        <p className="text-xs font-medium text-muted-foreground mt-1">{foundUser.maskedPhone}</p>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <Button onClick={() => nextStep()} className="w-full h-14 rounded-2xl font-black text-base uppercase tracking-widest shadow-xl">
                                        Sim, Sou Eu
                                    </Button>
                                    <Button variant="ghost" onClick={() => { setFoundUser(null); setMode('new'); }} className="w-full font-bold text-muted-foreground">
                                        Não sou eu / Informar outro
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={(e) => { e.preventDefault(); nextStep(); }} className="space-y-6 animate-in fade-in">
                                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3 items-center mb-6">
                                    <Info className="size-5 text-amber-600 shrink-0" />
                                    <p className="text-xs font-bold text-amber-800">E-mail não cadastrado. Preencha seus dados para criar um protocolo.</p>
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-muted-foreground">Nome Completo</Label>
                                        <Input required value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} className="h-12 rounded-xl" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-muted-foreground">WhatsApp</Label>
                                        <Input required type="tel" value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} placeholder="(21) 9..." className="h-12 rounded-xl" />
                                    </div>
                                </div>
                                <Button className="w-full h-14 rounded-2xl font-black text-base uppercase tracking-widest shadow-xl">
                                    Avançar
                                </Button>
                            </form>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Passo 2: Categoria */}
            {currentStep === 2 && (
                <div className="space-y-6 animate-in slide-in-from-right-8">
                    <Button variant="ghost" size="sm" onClick={prevStep} className="text-muted-foreground -ml-2 mb-2 font-bold uppercase tracking-widest text-[10px]">
                        <ChevronLeft className="mr-1 size-3" /> Voltar
                    </Button>
                    <h3 className="text-2xl font-black italic tracking-tighter uppercase text-center mb-8">O que você está buscando?</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button
                            onClick={() => { setSelectedCategory('lumine'); setSelectedCourseId(null); setSelectedClassId(null); nextStep(); }}
                            className="bg-white p-6 rounded-[2rem] border-2 shadow-sm hover:border-primary hover:shadow-xl hover:-translate-y-1 transition-all text-left flex flex-col group"
                        >
                            <div className="size-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><BookOpen size={24} /></div>
                            <h4 className="text-lg font-black uppercase tracking-tighter italic leading-none mb-2">Cursos Lumine</h4>
                            <p className="text-xs text-muted-foreground font-medium">Trilhos teológicos, bíblicos e de discipulado da igreja local.</p>
                        </button>

                        <button
                            onClick={() => { setSelectedCategory('escolas'); setSelectedCourseId(null); setSelectedClassId(null); nextStep(); }}
                            className="bg-white p-6 rounded-[2rem] border-2 shadow-sm hover:border-primary hover:shadow-xl hover:-translate-y-1 transition-all text-left flex flex-col group"
                        >
                            <div className="size-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><GraduationCap size={24} /></div>
                            <h4 className="text-lg font-black uppercase tracking-tighter italic leading-none mb-2">Escolas Especiais</h4>
                            <p className="text-xs text-muted-foreground font-medium">Wave School e programa DIS de aperfeiçoamento.</p>
                        </button>

                        <button
                            onClick={() => { setSelectedCategory('ministerios'); setSelectedCourseId(null); setSelectedClassId(null); nextStep(); }}
                            className="bg-white p-6 rounded-[2rem] border-2 shadow-sm hover:border-primary hover:shadow-xl hover:-translate-y-1 transition-all text-left flex flex-col group"
                        >
                            <div className="size-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><Briefcase size={24} /></div>
                            <h4 className="text-lg font-black uppercase tracking-tighter italic leading-none mb-2">Ministérios</h4>
                            <p className="text-xs text-muted-foreground font-medium">Treinamentos focados em capacitação de voluntariado.</p>
                        </button>

                        <button
                            onClick={() => { setSelectedCategory('eventos'); setSelectedCourseId(null); setSelectedClassId(null); nextStep(); }}
                            className="bg-white p-6 rounded-[2rem] border-2 shadow-sm hover:border-primary hover:shadow-xl hover:-translate-y-1 transition-all text-left flex flex-col group"
                        >
                            <div className="size-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><CalendarDays size={24} /></div>
                            <h4 className="text-lg font-black uppercase tracking-tighter italic leading-none mb-2">Eventos</h4>
                            <p className="text-xs text-muted-foreground font-medium">Inscrições pontuais para retiros, conferências e mais.</p>
                        </button>
                    </div>
                </div>
            )}

            {/* Passo 3: Catálogo */}
            {currentStep === 3 && (
                <div className="space-y-6 animate-in slide-in-from-right-8">
                    <Button variant="ghost" size="sm" onClick={prevStep} className="text-muted-foreground -ml-2 mb-2 font-bold uppercase tracking-widest text-[10px]">
                        <ChevronLeft className="mr-1 size-3" /> Escolher Categoria
                    </Button>

                    {selectedCategory === 'eventos' ? (
                        <div className="py-20 text-center space-y-4 bg-white rounded-[2rem] border-2 border-dashed">
                            <CalendarDays className="size-12 mx-auto text-slate-300" />
                            <h3 className="text-xl font-bold text-slate-400 uppercase tracking-widest italic">Sem Eventos</h3>
                            <p className="text-sm text-muted-foreground max-w-xs mx-auto">Nenhum evento com inscrições abertas no momento.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="space-y-4">
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground size-5" />
                                    <Input
                                        placeholder="Buscar curso por nome..."
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        className="h-14 pl-12 rounded-2xl bg-white border-2 shadow-sm text-lg focus-visible:ring-primary/20"
                                    />
                                </div>
                                {selectedCategory === 'lumine' && (
                                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 pt-1">
                                        <Button variant={trailFilter === 'all' ? 'default' : 'secondary'} size="sm" onClick={() => setTrailFilter('all')} className="rounded-full font-bold h-9 px-4 text-[10px] uppercase whitespace-nowrap">Todos</Button>
                                        <Button variant={trailFilter === 'biblico' ? 'default' : 'secondary'} size="sm" onClick={() => setTrailFilter('biblico')} className="rounded-full font-bold h-9 px-4 text-[10px] uppercase whitespace-nowrap">Bíblico</Button>
                                        <Button variant={trailFilter === 'teologico' ? 'default' : 'secondary'} size="sm" onClick={() => setTrailFilter('teologico')} className="rounded-full font-bold h-9 px-4 text-[10px] uppercase whitespace-nowrap">Teológico</Button>
                                        <Button variant={trailFilter === 'discipulado' ? 'default' : 'secondary'} size="sm" onClick={() => setTrailFilter('discipulado')} className="rounded-full font-bold h-9 px-4 text-[10px] uppercase whitespace-nowrap">Discipulado</Button>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {filteredCourses.map(course => (
                                    <Card
                                        key={course.id}
                                        className="overflow-hidden rounded-[2rem] cursor-pointer transition-all duration-300 hover:shadow-xl border-2 hover:border-primary group bg-white"
                                        onClick={() => {
                                            setSelectedCourseId(course.id);
                                            setSelectedClassId(null);
                                            nextStep();
                                        }}
                                    >
                                        <div className="relative aspect-video bg-slate-100">
                                            <img src={`https://picsum.photos/seed/${course.id}/600/300`} alt="" className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-700" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent z-10" />
                                            <div className="absolute bottom-4 left-5 z-20 pr-4">
                                                <Badge className="bg-primary backdrop-blur-md text-white border-none mb-2 text-[8px] font-black uppercase tracking-widest">{course.ministryName}</Badge>
                                                <h4 className="text-white font-black uppercase italic tracking-tighter leading-tight text-lg shadow-sm">{course.name}</h4>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                                {filteredCourses.length === 0 && (
                                    <div className="col-span-full py-16 text-center text-muted-foreground border-2 border-dashed rounded-[2rem]">
                                        Nenhum curso encontrado nesta categoria.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Passo 4: Turma */}
            {currentStep === 4 && (
                <div className="space-y-6 animate-in slide-in-from-right-8">
                    <Button variant="ghost" size="sm" onClick={prevStep} className="text-muted-foreground -ml-2 mb-2 font-bold uppercase tracking-widest text-[10px]">
                        <ChevronLeft className="mr-1 size-3" /> Escolher Outro Curso
                    </Button>

                    <div className="bg-white p-6 rounded-[2rem] border-2 shadow-sm text-center">
                        <Badge className="bg-slate-100 text-slate-800 border bg-primary/10 text-primary hover:bg-primary/20 mb-3">{selectedCourse?.ministryName}</Badge>
                        <h3 className="text-2xl md:text-3xl font-black italic tracking-tighter uppercase mb-2 text-slate-900">{selectedCourse?.name}</h3>
                        <p className="text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">{selectedCourse?.description}</p>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2 mb-4 ml-2">
                            <Clock className="size-4" /> Turmas Disponíveis
                        </Label>

                        {courseClasses.length > 0 ? (
                            <div className="grid gap-3">
                                {courseClasses.map(cls => (
                                    <button
                                        key={cls.id}
                                        onClick={() => { setSelectedClassId(cls.id); nextStep(); }}
                                        className="w-full bg-white p-5 rounded-2xl text-left border-2 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-primary hover:shadow-lg group"
                                    >
                                        <div>
                                            <p className="text-base font-black uppercase tracking-tighter text-slate-900">{cls.name}</p>
                                            <div className="flex items-center gap-2 text-xs font-bold mt-1 uppercase text-slate-500">
                                                <CalendarDays className="size-4" /> {cls.dayOfWeek} às {cls.startTime}
                                            </div>
                                        </div>
                                        <div className="size-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-colors shrink-0">
                                            <ArrowRight className="size-5" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="p-8 bg-white rounded-2xl border-2 border-dashed text-center">
                                <p className="text-sm font-bold text-muted-foreground">Opa! Nenhuma turma aberta para este curso no momento.</p>
                                <Button variant="link" onClick={prevStep} className="mt-2 text-primary font-bold">Voltar aos Cursos</Button>
                            </div>
                        )}

                        {/* Option to enroll without class if it's an online course or interest list */}
                        {courseClasses.length === 0 && (
                            <Button
                                variant="outline"
                                onClick={() => { setSelectedClassId(null); nextStep(); }}
                                className="w-full h-14 rounded-2xl border-2 border-primary text-primary hover:bg-primary/5 font-black uppercase tracking-widest text-xs"
                            >
                                Entrar na Fila de Espera
                            </Button>
                        )}
                    </div>
                </div>
            )}

            {/* Passo 5: Resumo e Finalização */}
            {currentStep === 5 && (
                <div className="space-y-6 animate-in slide-in-from-right-8">
                    <Button variant="ghost" size="sm" onClick={prevStep} className="text-muted-foreground -ml-2 mb-2 font-bold uppercase tracking-widest text-[10px]">
                        <ChevronLeft className="mr-1 size-3" /> Alterar Turma
                    </Button>

                    <Card className="shadow-xl border-none overflow-hidden rounded-[2.5rem] bg-slate-900 text-white">
                        <CardHeader className="p-8 pb-4 text-center">
                            <div className="size-16 bg-white/10 rounded-full mx-auto flex items-center justify-center mb-4">
                                <ListChecks className="size-8 text-primary-foreground" />
                            </div>
                            <CardTitle className="text-2xl font-black uppercase italic tracking-tighter text-white">Confirme sua Inscrição</CardTitle>
                            <CardDescription className="text-slate-400">Verifique os dados antes de finalizar.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-8 pt-0 space-y-6">
                            <div className="p-5 bg-white/5 rounded-2xl space-y-4">
                                <div>
                                    <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Aluno(a)</Label>
                                    <p className="font-bold text-lg">{mode === 'existing' ? foundUser?.maskedName : formData.name}</p>
                                    <p className="text-sm text-slate-400">{emailInput}</p>
                                </div>

                                <div className="h-px bg-white/10" />

                                <div>
                                    <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Curso Selecionado</Label>
                                    <p className="font-bold text-lg text-primary-foreground italic uppercase tracking-tighter leading-none mt-1">{selectedCourse?.name}</p>
                                </div>

                                {selectedClassObj && (
                                    <>
                                        <div className="h-px bg-white/10" />
                                        <div>
                                            <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Turma / Horário</Label>
                                            <p className="font-bold">{selectedClassObj.name}</p>
                                            <p className="text-sm text-slate-400 uppercase">{selectedClassObj.dayOfWeek} às {selectedClassObj.startTime}</p>
                                        </div>
                                    </>
                                )}
                            </div>

                            <Button
                                onClick={handleFinalSubmit}
                                disabled={isSubmitting}
                                className="w-full h-16 rounded-2xl font-black text-lg uppercase tracking-[0.2em] shadow-2xl bg-primary hover:bg-primary/90 text-white"
                            >
                                {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <ChevronRight className="mr-2" />}
                                Finalizar Inscrição
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}

export default function EnrollmentPage() {
    return (
        <main className="min-h-screen bg-[#F8F9FA] pb-24 selection:bg-primary/20">
            <VolunteeringProvider>
                <EnrollmentForm />
            </VolunteeringProvider>
        </main>
    );
}
