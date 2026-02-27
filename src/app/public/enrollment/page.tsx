
'use client';

import React, { useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useVolunteering, VolunteeringProvider } from '@/contexts/volunteering-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
    Loader2, 
    ChevronRight, 
    BookOpen, 
    GraduationCap, 
    Music, 
    HeartHandshake, 
    Lightbulb, 
    Clock, 
    MapPin, 
    CheckCircle2, 
    ArrowLeft,
    School,
    Waves
} from 'lucide-react';
import { PublicNavbar } from '@/components/public/navbar';
import { PublicFooter } from '@/components/public/footer';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Image from 'next/image';

function EnrollmentPageContent() {
    const searchParams = useSearchParams();
    const { courses, classes, addUser, enrollStudent, isLoading } = useVolunteering();
    const { toast } = useToast();

    const [selectedCourseId, setSelectedCourseId] = useState<string | null>(searchParams.get('courseId'));
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        cpf: '',
        sexo: '',
        classId: ''
    });

    const selectedCourse = useMemo(() => 
        courses.find(c => c.id === selectedCourseId), 
    [courses, selectedCourseId]);

    const filteredClasses = useMemo(() => 
        classes.filter(cls => cls.courseId === selectedCourseId), 
    [classes, selectedCourseId]);

    const groupedCourses = useMemo(() => {
        const groups = {
            lumine_discipulado: courses.filter(c => c.ministryName?.toLowerCase().includes('lumine') && c.ebdTrack === 'discipulado'),
            lumine_biblia: courses.filter(c => c.ministryName?.toLowerCase().includes('lumine') && c.ebdTrack === 'biblico'),
            lumine_teologia: courses.filter(c => c.ministryName?.toLowerCase().includes('lumine') && c.ebdTrack === 'teologico'),
            schools: courses.filter(c => c.ministryName?.toLowerCase().includes('wave') || c.ministryName?.toLowerCase().includes('dis')),
            others: courses.filter(c => 
                !c.ministryName?.toLowerCase().includes('lumine') && 
                !c.ministryName?.toLowerCase().includes('wave') && 
                !c.ministryName?.toLowerCase().includes('dis')
            )
        };
        return groups;
    }, [courses]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleEnroll = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCourseId) return;
        
        setIsSubmitting(true);
        try {
            const userId = await addUser({
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                cpf: formData.cpf,
                sexo: formData.sexo,
                integrationStatus: 'nao_alcancado'
            });

            await enrollStudent(userId, selectedCourseId, formData.classId || undefined);
            
            toast({
                title: "Inscrição Realizada!",
                description: `Bem-vindo ao curso ${selectedCourse?.name}. Em breve entraremos em contato.`,
            });
            setStep(3);
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: "Erro na Inscrição",
                description: error.message || "Tente novamente mais tarde.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary size-10" /></div>;
    }

    if (step === 3) {
        return (
            <div className="min-h-screen flex flex-col bg-slate-50">
                <PublicNavbar />
                <main className="flex-1 container mx-auto px-4 py-20">
                    <Card className="max-w-md mx-auto text-center p-8 border-t-8 border-emerald-500">
                        <CheckCircle2 className="size-16 text-emerald-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-black uppercase italic tracking-tighter mb-2">Inscrição Confirmada!</h2>
                        <p className="text-muted-foreground mb-6">Obrigado por iniciar sua jornada no curso <strong>{selectedCourse?.name}</strong>. Nossa secretaria entrará em contato via WhatsApp.</p>
                        <Button asChild className="w-full h-12 font-bold uppercase"><a href="/">Voltar ao Início</a></Button>
                    </Card>
                </main>
                <PublicFooter />
            </div>
        );
    }

    if (selectedCourse) {
        return (
            <div className="min-h-screen flex flex-col bg-slate-50">
                <PublicNavbar />
                <main className="flex-1 container mx-auto px-4 py-12">
                    <Button variant="ghost" onClick={() => setSelectedCourseId(null)} className="mb-6">
                        <ArrowLeft className="mr-2 size-4" /> Voltar para a Lista
                    </Button>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        <div className="space-y-6">
                            <Badge className="bg-primary text-white px-4 py-1 font-black uppercase tracking-widest text-[10px]">
                                {selectedCourse.ministryName}
                            </Badge>
                            <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-900 italic uppercase">
                                {selectedCourse.name}
                            </h1>
                            <p className="text-lg text-muted-foreground leading-relaxed">
                                {selectedCourse.description || "Inicie sua jornada de capacitação e discipulado neste curso fundamental para seu crescimento."}
                            </p>
                            
                            <div className="space-y-4 pt-6">
                                <h3 className="font-black text-xs uppercase text-primary tracking-widest">Informações Importantes</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border border-slate-100">
                                        <Clock className="size-5 text-primary" />
                                        <div>
                                            <p className="text-[10px] font-black uppercase text-muted-foreground">Formato</p>
                                            <p className="text-sm font-bold">Presencial / Híbrido</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border border-slate-100">
                                        <CheckCircle2 className="size-5 text-primary" />
                                        <div>
                                            <p className="text-[10px] font-black uppercase text-muted-foreground">Vagas</p>
                                            <p className="text-sm font-bold">Limitadas</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Card className="shadow-2xl border-2">
                            <CardHeader className="bg-muted/30 border-b">
                                <CardTitle className="flex items-center gap-2">
                                    <BookOpen className="size-5 text-primary" />
                                    Formulário de Inscrição
                                </CardTitle>
                                <CardDescription>Preencha seus dados para garantir sua vaga.</CardDescription>
                            </CardHeader>
                            <form onSubmit={handleEnroll}>
                                <CardContent className="space-y-4 pt-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Nome Completo *</Label>
                                        <Input id="name" name="name" required value={formData.name} onChange={handleInputChange} />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="phone">Celular (WhatsApp) *</Label>
                                            <Input id="phone" name="phone" required value={formData.phone} onChange={handleInputChange} placeholder="(21) 9..." />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="cpf">CPF (para certificação) *</Label>
                                            <Input id="cpf" name="cpf" required value={formData.cpf} onChange={handleInputChange} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="email">E-mail</Label>
                                            <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="sexo">Sexo</Label>
                                            <Select value={formData.sexo} onValueChange={(v) => setFormData(p => ({...p, sexo: v}))}>
                                                <SelectTrigger><SelectValue placeholder="Selecione..."/></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Masculino">Masculino</SelectItem>
                                                    <SelectItem value="Feminino">Feminino</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    {filteredClasses.length > 0 && (
                                        <div className="space-y-2 pt-2 border-t">
                                            <Label htmlFor="classId">Selecione uma Turma Disponível</Label>
                                            <Select value={formData.classId} onValueChange={(v) => setFormData(p => ({...p, classId: v}))}>
                                                <SelectTrigger className="h-12 bg-white">
                                                    <SelectValue placeholder="Selecione o melhor horário..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {filteredClasses.map(cls => (
                                                        <SelectItem key={cls.id} value={cls.id}>
                                                            {cls.name} ({cls.dayOfWeek} às {cls.startTime})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                </CardContent>
                                <CardFooter className="bg-muted/10 border-t pt-6">
                                    <Button type="submit" disabled={isSubmitting} className="w-full h-14 font-black text-lg uppercase shadow-xl">
                                        {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <ChevronRight className="mr-2" />}
                                        Efetivar Inscrição
                                    </Button>
                                </CardFooter>
                            </form>
                        </Card>
                    </div>
                </main>
                <PublicFooter />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-slate-50">
            <PublicNavbar />
            
            <main className="flex-1 container mx-auto px-4 py-16 md:py-24">
                <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 py-1 px-4 font-black uppercase tracking-widest text-[10px]">
                        Ensino & Discipulado
                    </Badge>
                    <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-900 italic">
                        Plataforma <span className="text-primary">Lumine</span>
                    </h1>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                        Escolha sua trilha de crescimento. Da integração à membresia até a formação teológica profunda.
                    </p>
                </div>

                <Tabs defaultValue="lumine" className="w-full">
                    <div className="flex justify-center mb-12">
                        <TabsList className="bg-white border shadow-sm p-1 h-14 rounded-full w-full max-w-md">
                            <TabsTrigger value="lumine" className="rounded-full px-8 font-bold data-[state=active]:bg-primary data-[state=active]:text-white">Lumine</TabsTrigger>
                            <TabsTrigger value="schools" className="rounded-full px-8 font-bold data-[state=active]:bg-primary data-[state=active]:text-white">Escolas</TabsTrigger>
                            <TabsTrigger value="others" className="rounded-full px-8 font-bold data-[state=active]:bg-primary data-[state=active]:text-white">Outros</TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="lumine" className="animate-in fade-in-50 duration-500">
                        <Tabs defaultValue="discipulado" className="w-full">
                            <div className="flex justify-center mb-8">
                                <TabsList className="bg-slate-100 p-1 rounded-lg">
                                    <TabsTrigger value="discipulado" className="text-xs font-black uppercase tracking-tighter">Trilho Discipulado</TabsTrigger>
                                    <TabsTrigger value="biblia" className="text-xs font-black uppercase tracking-tighter">Trilho Bíblico</TabsTrigger>
                                    <TabsTrigger value="teologia" className="text-xs font-black uppercase tracking-tighter">Trilho Teológico</TabsTrigger>
                                </TabsList>
                            </div>

                            <TabsContent value="discipulado" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {groupedCourses.lumine_discipulado.map(course => (
                                    <CourseCard key={course.id} course={course} onClick={() => setSelectedCourseId(course.id)} />
                                ))}
                            </TabsContent>
                            <TabsContent value="biblia" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {groupedCourses.lumine_biblia.map(course => (
                                    <CourseCard key={course.id} course={course} onClick={() => setSelectedCourseId(course.id)} />
                                ))}
                            </TabsContent>
                            <TabsContent value="teologia" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {groupedCourses.lumine_teologia.map(course => (
                                    <CourseCard key={course.id} course={course} onClick={() => setSelectedCourseId(course.id)} />
                                ))}
                            </TabsContent>
                        </Tabs>
                    </TabsContent>

                    <TabsContent value="schools" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in-50 duration-500">
                        {groupedCourses.schools.map(course => (
                            <CourseCard key={course.id} course={course} onClick={() => setSelectedCourseId(course.id)} />
                        ))}
                    </TabsContent>

                    <TabsContent value="others" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in-50 duration-500">
                        {groupedCourses.others.map(course => (
                            <CourseCard key={course.id} course={course} onClick={() => setSelectedCourseId(course.id)} />
                        ))}
                    </TabsContent>
                </Tabs>
            </main>

            <PublicFooter />
        </div>
    );
}

function CourseCard({ course, onClick }: { course: any, onClick: () => void }) {
    const isWave = course.ministryName?.toLowerCase().includes('wave');
    const isDis = course.ministryName?.toLowerCase().includes('dis');
    
    const Icon = isWave ? Waves : isDis ? HandHeart : GraduationCap;
    
    // Simple placeholder logic
    const imageSeed = course.id || 'default';
    const imageUrl = `https://picsum.photos/seed/${imageSeed}/800/450`;

    return (
        <Card className="group overflow-hidden border-none shadow-xl hover:shadow-2xl transition-all duration-500 cursor-pointer hover:translate-y-[-8px] bg-white" onClick={onClick}>
            <div className="relative aspect-video overflow-hidden">
                <Image 
                    src={imageUrl} 
                    alt={course.name} 
                    fill 
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60" />
                <Badge className="absolute top-4 right-4 bg-white/90 text-slate-900 border-none font-black text-[9px] uppercase tracking-widest">
                    {course.ministryName}
                </Badge>
            </div>
            <CardContent className="p-6">
                <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors uppercase italic tracking-tighter leading-tight">
                    {course.name}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                    {course.description || "Inicie este treinamento fundamental e avance na sua caminhada ministerial."}
                </p>
            </CardContent>
            <CardFooter className="px-6 pb-6 pt-0 flex justify-between items-center">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                    <Clock size={14} /> 
                    <span>Inscrições Abertas</span>
                </div>
                <Button variant="ghost" className="p-0 font-black text-primary text-xs uppercase tracking-widest group-hover:gap-2 transition-all">
                    Matricular <ChevronRight size={14} />
                </Button>
            </CardFooter>
        </Card>
    );
}

function HandHeart(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M11 14h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 16" />
            <path d="m7 20 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-5.4a2 2 0 0 0-1.6-3.4H17c-1.1 0-2.1.4-2.8 1.2l-1.4 1.4" />
            <path d="M16 3 9 3c-1.1 0-2.1.4-2.8 1.2L2 9" />
        </svg>
    )
}

export default function EnrollmentPage() {
    return (
        <VolunteeringProvider>
            <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary size-10" /></div>}>
                <EnrollmentPageContent />
            </Suspense>
        </VolunteeringProvider>
    );
}
