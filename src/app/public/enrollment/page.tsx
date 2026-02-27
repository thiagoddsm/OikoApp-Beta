
'use client';

import React, { useState, useMemo, Suspense } from 'react';
import { useVolunteering, VolunteeringProvider } from '@/contexts/volunteering-context';
import { PublicNavbar } from '@/components/public/navbar';
import { PublicFooter } from '@/components/public/footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
    BookOpen, 
    GraduationCap, 
    Music, 
    Users, 
    ChevronRight, 
    Loader2, 
    CheckCircle2, 
    Waves, 
    HandHelping,
    Lightbulb,
    Lock,
    Search,
    UserCheck,
    IdCard
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, Timestamp } from 'firebase/firestore';

function EnrollmentPageContent() {
    const { courses, classes, isLoading } = useVolunteering();
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [selectedCourse, setSelectedCourse] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [step, setStep] = useState(1);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        cpf: '',
        sexo: '',
        classId: '',
    });

    const lumineCourses = useMemo(() => 
        courses.filter(c => c.ministryName?.toLowerCase().includes('lumine') || c.ministryName?.toLowerCase().includes('ebd')),
    [courses]);

    const otherSchools = useMemo(() => 
        courses.filter(c => c.ministryName?.toLowerCase().includes('wave') || c.ministryName?.toLowerCase().includes('dis')),
    [courses]);

    const electiveCourses = useMemo(() => 
        courses.filter(c => !lumineCourses.includes(c) && !otherSchools.includes(c)),
    [courses, lumineCourses, otherSchools]);

    const courseClasses = useMemo(() => {
        if (!selectedCourse) return [];
        return classes.filter(cls => cls.courseId === selectedCourse.id);
    }, [selectedCourse, classes]);

    const handleStartEnrollment = (course: any) => {
        const hasClasses = classes.some(cls => cls.courseId === course.id);
        if (!hasClasses) {
            toast({
                variant: "destructive",
                title: "Inscrições Indisponíveis",
                description: "Este curso não possui turmas com inscrições abertas no momento."
            });
            return;
        }
        setSelectedCourse(course);
        setStep(1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleNextStep = (e: React.FormEvent) => {
        e.preventDefault();
        if (step === 1) setStep(2);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firestore || !selectedCourse) return;

        setIsSubmitting(true);
        try {
            const requestData = {
                userId: '', // Public users don't have ID yet
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                courseId: selectedCourse.id,
                classId: formData.classId,
                status: 'pending',
                createdAt: Timestamp.now(),
                metadata: {
                    cpf: formData.cpf,
                    sexo: formData.sexo
                }
            };

            await addDocumentNonBlocking(collection(firestore, 'enrollment_requests'), requestData);
            
            toast({
                title: "Solicitação Enviada!",
                description: "Recebemos sua inscrição. Nossa equipe entrará em contato em breve!",
            });
            setSelectedCourse(null);
            setFormData({ name: '', email: '', phone: '', cpf: '', sexo: '', classId: '' });
        } catch (error) {
            toast({
                variant: 'destructive',
                title: "Erro ao enviar",
                description: "Ocorreu uma falha técnica. Por favor, tente novamente."
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    const renderCourseCard = (course: any) => {
        const hasClasses = classes.some(cls => cls.courseId === course.id);
        
        return (
            <Card key={course.id} className={cn(
                "overflow-hidden flex flex-col transition-all duration-300 border-none shadow-xl",
                !hasClasses ? "opacity-60 grayscale filter contrast-75 bg-slate-50" : "hover:scale-[1.02] hover:shadow-2xl"
            )}>
                <div className="relative aspect-video w-full">
                    <Image 
                        src={course.image || `https://picsum.photos/seed/${course.id}/800/450`} 
                        alt={course.name} 
                        fill 
                        className="object-cover"
                    />
                    {!hasClasses && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[1px]">
                            <Badge variant="secondary" className="bg-white/90 text-slate-900 font-black border-none shadow-lg">
                                <Lock className="size-3 mr-1.5" /> EM BREVE
                            </Badge>
                        </div>
                    )}
                </div>
                <CardHeader className="p-5 pb-2">
                    <div className="flex justify-between items-start gap-2 mb-2">
                        <Badge variant="outline" className="text-[9px] uppercase font-black tracking-widest border-primary/20 text-primary">
                            {course.ministryName}
                        </Badge>
                    </div>
                    <CardTitle className="text-lg font-black text-slate-900 uppercase italic tracking-tighter leading-none">
                        {course.name}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-5 pt-2 flex-grow">
                    <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                        {course.description || "Inicie sua jornada de crescimento neste curso fundamental da nossa trilha de discipulado."}
                    </p>
                </CardContent>
                <CardFooter className="p-5 pt-0">
                    <Button 
                        onClick={() => handleStartEnrollment(course)} 
                        className={cn(
                            "w-full font-black uppercase text-xs h-11 tracking-widest",
                            !hasClasses && "bg-slate-300 text-slate-500 hover:bg-slate-300 cursor-not-allowed"
                        )}
                        disabled={!hasClasses}
                    >
                        {hasClasses ? "Quero me Inscrever" : "Sem Turmas Abertas"}
                        {hasClasses && <ChevronRight className="ml-2 size-4" />}
                    </Button>
                </CardFooter>
            </Card>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <PublicNavbar />
            
            <main className="container mx-auto px-4 py-12 md:py-20">
                {selectedCourse ? (
                    <div className="max-w-2xl mx-auto animate-in zoom-in-95 duration-300">
                        <Button variant="ghost" onClick={() => setSelectedCourse(null)} className="mb-6 group">
                            <ChevronRight className="rotate-180 mr-2 group-hover:-translate-x-1 transition-transform" /> Voltar ao catálogo
                        </Button>
                        
                        <Card className="border-none shadow-2xl overflow-hidden">
                            <div className="h-3 bg-primary w-full" />
                            <CardHeader className="bg-muted/30 pb-8">
                                <Badge className="w-fit mb-2">{selectedCourse.ministryName}</Badge>
                                <CardTitle className="text-3xl font-black italic tracking-tighter text-slate-900">
                                    INSCRIÇÃO: {selectedCourse.name}
                                </CardTitle>
                                <CardDescription>Preencha seus dados para garantir sua vaga nesta jornada.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-8">
                                <div className="flex gap-4 mb-8">
                                    <div className={cn("flex-1 h-1.5 rounded-full transition-colors", step >= 1 ? "bg-primary" : "bg-muted")} />
                                    <div className={cn("flex-1 h-1.5 rounded-full transition-colors", step >= 2 ? "bg-primary" : "bg-muted")} />
                                </div>

                                <form onSubmit={step === 1 ? handleNextStep : handleSubmit} className="space-y-6">
                                    {step === 1 ? (
                                        <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                                            <div className="grid gap-2">
                                                <Label htmlFor="name">Nome Completo *</Label>
                                                <Input required id="name" value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} placeholder="Como quer ser chamado?" />
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="grid gap-2">
                                                    <Label htmlFor="phone">WhatsApp *</Label>
                                                    <Input required id="phone" value={formData.phone} onChange={e => setFormData(p => ({...p, phone: e.target.value}))} placeholder="(21) 99999-9999" />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label htmlFor="email">E-mail *</Label>
                                                    <Input required type="email" id="email" value={formData.email} onChange={e => setFormData(p => ({...p, email: e.target.value}))} placeholder="seu@email.com" />
                                                </div>
                                            </div>
                                            <Button type="submit" className="w-full h-12 font-bold text-base">Próximo Passo</Button>
                                        </div>
                                    ) : (
                                        <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="grid gap-2">
                                                    <Label htmlFor="cpf">CPF</Label>
                                                    <Input id="cpf" value={formData.cpf} onChange={e => setFormData(p => ({...p, cpf: e.target.value}))} placeholder="000.000.000-00" />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label htmlFor="sexo">Sexo</Label>
                                                    <Select value={formData.sexo} onValueChange={v => setFormData(p => ({...p, sexo: v}))}>
                                                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="Masculino">Masculino</SelectItem>
                                                            <SelectItem value="Feminino">Feminino</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                            <div className="grid gap-2 pt-2">
                                                <Label htmlFor="classId">Turma Disponível *</Label>
                                                <Select required value={formData.classId} onValueChange={v => setFormData(p => ({...p, classId: v}))}>
                                                    <SelectTrigger className="h-14">
                                                        <SelectValue placeholder="Selecione o melhor horário" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {courseClasses.map(cls => (
                                                            <SelectItem key={cls.id} value={cls.id}>
                                                                <div className="flex flex-col">
                                                                    <span className="font-bold">{cls.name}</span>
                                                                    <span className="text-[10px] text-muted-foreground uppercase">{cls.dayOfWeek} às {cls.startTime}</span>
                                                                </div>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="flex gap-3 pt-4">
                                                <Button type="button" variant="outline" onClick={() => setStep(1)} className="h-12 px-6">Voltar</Button>
                                                <Button type="submit" disabled={isSubmitting} className="flex-1 h-12 font-black text-lg shadow-xl">
                                                    {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2" />}
                                                    Finalizar Inscrição
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                ) : (
                    <div className="space-y-12">
                        <div className="text-center space-y-4 max-w-3xl mx-auto">
                            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 py-1 px-4 font-black uppercase tracking-widest text-[10px]">
                                Ensino & Discipulado
                            </Badge>
                            <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-900 italic">
                                Trilha de <span className="text-primary">Crescimento</span>
                            </h1>
                            <p className="text-lg text-muted-foreground">
                                Escolha o próximo passo da sua jornada espiritual na IBM. Do curso de membresia às escolas de música e inclusão.
                            </p>
                        </div>

                        <Tabs defaultValue="lumine" className="w-full">
                            <div className="flex justify-center mb-10">
                                <TabsList className="bg-white border-2 p-1 h-14 rounded-2xl shadow-sm">
                                    <TabsTrigger value="lumine" className="rounded-xl px-8 font-black uppercase text-xs data-[state=active]:bg-primary data-[state=active]:text-white">Lumine (Trilhas)</TabsTrigger>
                                    <TabsTrigger value="schools" className="rounded-xl px-8 font-black uppercase text-xs data-[state=active]:bg-primary data-[state=active]:text-white">Escolas IBM</TabsTrigger>
                                    <TabsTrigger value="other" className="rounded-xl px-8 font-black uppercase text-xs data-[state=active]:bg-primary data-[state=active]:text-white">Outros</TabsTrigger>
                                </TabsList>
                            </div>

                            <TabsContent value="lumine" className="animate-in fade-in-50 duration-500">
                                <Tabs defaultValue="discipulado" className="w-full">
                                    <div className="flex justify-center mb-8">
                                        <TabsList className="bg-muted/50 p-1 h-10 rounded-full">
                                            <TabsTrigger value="discipulado" className="rounded-full px-6 text-[10px] font-bold uppercase">Discipulado</TabsTrigger>
                                            <TabsTrigger value="biblia" className="rounded-full px-6 text-[10px] font-bold uppercase">Bíblia</TabsTrigger>
                                            <TabsTrigger value="teologia" className="rounded-full px-6 text-[10px] font-bold uppercase">Teologia</TabsTrigger>
                                        </TabsList>
                                    </div>
                                    
                                    <TabsContent value="discipulado">
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                            {lumineCourses.filter(c => c.ebdTrack === 'discipulado' || c.name.toLowerCase().includes('pertencer') || c.name.toLowerCase().includes('crescer')).map(renderCourseCard)}
                                        </div>
                                    </TabsContent>
                                    <TabsContent value="biblia">
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                            {lumineCourses.filter(c => c.ebdTrack === 'biblico').map(renderCourseCard)}
                                        </div>
                                    </TabsContent>
                                    <TabsContent value="teologia">
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                            {lumineCourses.filter(c => c.ebdTrack === 'teologico').map(renderCourseCard)}
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </TabsContent>

                            <TabsContent value="schools" className="animate-in fade-in-50 duration-500">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {otherSchools.map(renderCourseCard)}
                                </div>
                            </TabsContent>

                            <TabsContent value="other" className="animate-in fade-in-50 duration-500">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {electiveCourses.map(renderCourseCard)}
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                )}
            </main>

            <PublicFooter />
        </div>
    );
}

export default function EnrollmentPage() {
    return (
        <VolunteeringProvider>
            <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="animate-spin" /></div>}>
                <EnrollmentPageContent />
            </Suspense>
        </VolunteeringProvider>
    );
}
