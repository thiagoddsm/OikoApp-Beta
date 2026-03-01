'use client';

import React, { useState, useMemo } from 'react';
import { useVolunteering, VolunteeringProvider } from '@/contexts/volunteering-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
    Loader2, 
    BookOpen, 
    CheckCircle2, 
    ArrowRight, 
    Clock, 
    Mail,
    Search,
    ChevronRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { PublicNavbar } from '@/components/public/navbar';
import { PublicFooter } from '@/components/public/footer';

// Função auxiliar para calcular o resumo de horários sem usar hooks
// Isso evita o erro "Rules of Hooks" reportado pelo React ao mapear cursos
const calculateScheduleSummary = (courseClasses: any[]) => {
    if (!courseClasses || courseClasses.length === 0) return [];
    
    const scheduleMap: Record<string, { days: Set<string>, capacity: number, occupied: number }> = {};
    
    courseClasses.forEach(cls => {
        const time = cls.startTime || '00:00';
        const day = cls.dayOfWeek || 'Data a definir';
        const key = time;
        
        if (!scheduleMap[key]) {
            scheduleMap[key] = { 
                days: new Set(), 
                capacity: 0, 
                occupied: 0 
            };
        }
        
        scheduleMap[key].days.add(day);
        scheduleMap[key].capacity += (cls.maxStudents || 0);
        scheduleMap[key].occupied += (cls.students?.length || 0);
    });

    return Object.entries(scheduleMap).map(([time, data]) => ({
        time,
        days: Array.from(data.days).join(', '),
        vacancies: Math.max(0, data.capacity - data.occupied)
    }));
};

function EnrollmentPortal() {
    const { courses, classes, isLoading } = useVolunteering();
    const [searchTerm, setSearchTerm] = useState('');
    const [step, setStep] = useState<'selection' | 'info' | 'success'>('selection');
    const [selectedCourse, setSelectedCourse] = useState<any>(null);
    const [email, setEmail] = useState('');
    const { toast } = useToast();

    // Hooks de alto nível (correto)
    const filteredCourses = useMemo(() => {
        if (!courses) return [];
        return courses.filter(c => 
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.ministryName.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [courses, searchTerm]);

    const trilhoCourses = useMemo(() => filteredCourses.filter(c => c.type === 'trilho'), [filteredCourses]);
    const escolaCourses = useMemo(() => filteredCourses.filter(c => c.ministryName.toLowerCase().includes('escola') || c.ministryName.toLowerCase().includes('wave') || c.ministryName.toLowerCase().includes('dis')), [filteredCourses]);
    const outroCourses = useMemo(() => filteredCourses.filter(c => c.type !== 'trilho' && !escolaCourses.includes(c)), [filteredCourses, escolaCourses]);

    const handleSelectCourse = (course: any) => {
        setSelectedCourse(course);
        setStep('info');
    };

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (step === 'success') {
        return (
            <div className="container mx-auto px-4 py-20 text-center space-y-6">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <CheckCircle2 className="h-10 w-10" />
                </div>
                <h2 className="text-3xl font-bold">Solicitação Enviada!</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                    Obrigado pelo seu interesse no curso <strong>{selectedCourse?.name}</strong>. 
                    Nossa equipe entrará em contato em breve através do e-mail {email} para confirmar sua matrícula.
                </p>
                <Button onClick={() => setStep('selection')} variant="outline">Voltar ao Início</Button>
            </div>
        );
    }

    const renderCourseGrid = (courseList: any[]) => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {courseList.length === 0 ? (
                <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                    Nenhum curso disponível nesta categoria.
                </div>
            ) : (
                courseList.map(course => {
                    const courseClasses = classes.filter(cls => cls.courseId === course.id);
                    const hasClasses = courseClasses.length > 0;
                    
                    // Correção: Não usamos hook aqui, apenas uma função auxiliar chamada durante o mapeamento
                    const scheduleSummary = calculateScheduleSummary(courseClasses);
                    const totalVacancies = scheduleSummary.reduce((acc, curr) => acc + curr.vacancies, 0);
                    const isFull = hasClasses && totalVacancies === 0;

                    return (
                        <Card key={course.id} className={cn(
                            "flex flex-col h-full transition-all hover:shadow-md",
                            !hasClasses && "opacity-60 grayscale"
                        )}>
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start mb-2">
                                    <Badge variant="outline" className="text-[10px] uppercase font-black tracking-widest">{course.ministryName}</Badge>
                                    {hasClasses && (
                                        <Badge variant={isFull ? "destructive" : "secondary"} className="text-[10px] font-bold">
                                            {isFull ? "Esgotado" : `${totalVacancies} vagas`}
                                        </Badge>
                                    )}
                                </div>
                                <CardTitle className="text-xl font-bold">{course.name}</CardTitle>
                                <CardDescription className="line-clamp-2 min-h-[40px]">{course.description || "Inicie sua jornada de aprendizado conosco."}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1 space-y-4">
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1">
                                        <Clock className="size-3"/> Horários Disponíveis
                                    </p>
                                    {hasClasses ? (
                                        <div className="space-y-1">
                                            {scheduleSummary.map((s, i) => (
                                                <div key={i} className="flex items-center justify-between text-sm bg-muted/30 p-2 rounded">
                                                    <span className="font-medium">{s.days} às {s.time}</span>
                                                    <span className={cn("text-[10px] font-bold", s.vacancies === 0 ? "text-destructive" : "text-emerald-600")}>
                                                        {s.vacancies === 0 ? "Lotado" : `${s.vacancies} vagas`}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs italic text-muted-foreground">Nenhuma turma aberta no momento.</p>
                                    )}
                                </div>
                            </CardContent>
                            <CardFooter className="pt-4 border-t">
                                <Button 
                                    className="w-full font-bold" 
                                    disabled={!hasClasses || isFull}
                                    onClick={() => handleSelectCourse(course)}
                                >
                                    {isFull ? "Vagas Esgotadas" : !hasClasses ? "Em Breve" : "Quero me Inscrever"}
                                    <ArrowRight className="ml-2 size-4" />
                                </Button>
                            </CardFooter>
                        </Card>
                    );
                })
            )}
        </div>
    );

    return (
        <div className="min-h-screen flex flex-col bg-slate-50">
            <PublicNavbar />
            <main className="flex-1">
                {step === 'selection' ? (
                    <div className="container mx-auto px-4 py-12">
                        <div className="text-center mb-12 space-y-4">
                            <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-900">
                                Portal de <span className="text-primary underline decoration-primary/30">Inscrições</span>
                            </h1>
                            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                                Escolha seu próximo passo na caminhada com Cristo. Trilhos de discipulado, escolas ministeriais e muito mais.
                            </p>
                            
                            <div className="relative max-w-md mx-auto mt-8">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                <Input 
                                    placeholder="Pesquisar por curso ou ministério..." 
                                    className="pl-10 h-12 rounded-full border-2 focus:border-primary"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <Tabs defaultValue="trilhos" className="w-full">
                            <div className="flex justify-center mb-8">
                                <TabsList className="bg-white border-2 p-1 h-auto rounded-xl shadow-sm">
                                    <TabsTrigger value="trilhos" className="px-8 py-3 rounded-lg font-bold data-[state=active]:bg-primary data-[state=active]:text-white">
                                        Trilhos
                                    </TabsTrigger>
                                    <TabsTrigger value="escolas" className="px-8 py-3 rounded-lg font-bold data-[state=active]:bg-primary data-[state=active]:text-white">
                                        Escolas
                                    </TabsTrigger>
                                    <TabsTrigger value="outros" className="px-8 py-3 rounded-lg font-bold data-[state=active]:bg-primary data-[state=active]:text-white">
                                        Outros
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            <TabsContent value="trilhos" className="mt-0">
                                <Tabs defaultValue="discipulado" className="w-full">
                                    <div className="flex justify-center mb-6">
                                        <TabsList className="bg-muted/50 p-1 h-auto">
                                            <TabsTrigger value="discipulado" className="text-[10px] uppercase font-bold tracking-tight">Discipulado</TabsTrigger>
                                            <TabsTrigger value="biblico" className="text-[10px] uppercase font-bold tracking-tight">BÍBLICO</TabsTrigger>
                                            <TabsTrigger value="teologico" className="text-[10px] uppercase font-bold tracking-tight">Teológico</TabsTrigger>
                                        </TabsList>
                                    </div>
                                    <TabsContent value="discipulado">
                                        {renderCourseGrid(trilhoCourses.filter(c => c.ebdTrack === 'discipulado' || c.name.toLowerCase().includes('pertencer') || c.name.toLowerCase().includes('crescer')))}
                                    </TabsContent>
                                    <TabsContent value="biblico">
                                        {renderCourseGrid(trilhoCourses.filter(c => c.ebdTrack === 'biblico' || c.name.toLowerCase().includes('biblia')))}
                                    </TabsContent>
                                    <TabsContent value="teologico">
                                        {renderCourseGrid(trilhoCourses.filter(c => c.ebdTrack === 'teologico' || c.name.toLowerCase().includes('teologia')))}
                                    </TabsContent>
                                </Tabs>
                            </TabsContent>

                            <TabsContent value="escolas" className="mt-0">
                                {renderCourseGrid(escolaCourses)}
                            </TabsContent>

                            <TabsContent value="outros" className="mt-0">
                                {renderCourseGrid(outroCourses)}
                            </TabsContent>
                        </Tabs>
                    </div>
                ) : (
                    <div className="container mx-auto px-4 py-12 max-w-xl">
                        <Button variant="ghost" onClick={() => setStep('selection')} className="mb-6 -ml-2 text-muted-foreground">
                            <ChevronRight className="rotate-180 mr-2 size-4" /> Voltar para a lista
                        </Button>
                        <Card className="border-2 border-primary/20 shadow-xl overflow-hidden">
                            <div className="bg-primary p-8 text-white text-center">
                                <Badge className="bg-white/20 text-white border-white/30 mb-4 font-bold tracking-widest uppercase text-[10px]">Inscrição Aberta</Badge>
                                <h2 className="text-3xl font-black italic tracking-tighter uppercase">{selectedCourse?.name}</h2>
                                <p className="text-white/80 mt-2 text-sm">{selectedCourse?.ministryName}</p>
                            </div>
                            <CardContent className="p-8 space-y-6 bg-white">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="email" className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Seu melhor e-mail</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-3 size-4 text-muted-foreground" />
                                            <Input 
                                                id="email" 
                                                type="email" 
                                                placeholder="exemplo@gmail.com" 
                                                className="pl-10 h-12"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                            />
                                        </div>
                                        <p className="text-[10px] text-muted-foreground">
                                            Usaremos seu e-mail para validar seu acesso e confirmar sua vaga.
                                        </p>
                                    </div>
                                </div>
                                <Button 
                                    className="w-full h-14 text-lg font-black" 
                                    onClick={() => setStep('success')}
                                    disabled={!email.includes('@')}
                                >
                                    Solicitar Matrícula
                                </Button>
                            </CardContent>
                        </Card>
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
            <EnrollmentPortal />
        </VolunteeringProvider>
    );
}
