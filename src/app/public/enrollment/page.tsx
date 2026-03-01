'use client';

import React, { useState } from 'react';
import { useVolunteering, VolunteeringProvider, type Course, type Class } from '@/contexts/volunteering-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, Clock, Users, CheckCircle2 } from 'lucide-react';
import { PublicNavbar } from '@/components/public/navbar';
import { PublicFooter } from '@/components/public/footer';
import { EnrollmentDialog } from '@/components/teaching/enrollment-dialog';
import { cn } from '@/lib/utils';

/**
 * Função utilitária para calcular informações de curso sem violar regras de hooks.
 */
function getCourseDisplayInfo(courseId: string, allClasses: Class[]) {
    const courseClasses = allClasses.filter(c => c.courseId === courseId);
    
    if (courseClasses.length === 0) {
        return { schedule: "Sem turmas ativas", vacancies: 0, isFull: true, hasClasses: false };
    }

    const schedules = new Set<string>();
    let totalCapacity = 0;
    let totalOccupied = 0;
    let hasUnlimited = false;

    courseClasses.forEach(cls => {
        if (cls.dayOfWeek && cls.startTime) {
            schedules.add(`${cls.dayOfWeek} às ${cls.startTime}`);
        }
        if (cls.maxStudents) {
            totalCapacity += cls.maxStudents;
            totalOccupied += cls.students?.length || 0;
        } else {
            hasUnlimited = true;
        }
    });

    const vacancies = hasUnlimited ? 999 : (totalCapacity - totalOccupied);
    const isFull = !hasUnlimited && vacancies <= 0;

    return {
        schedule: Array.from(schedules).join(', ') || "Horário a definir",
        vacancies: vacancies,
        isFull: isFull,
        hasClasses: true
    };
}

function EnrollmentPortal() {
    const { courses, classes, isLoading } = useVolunteering();
    const [isEnrollmentOpen, setEnrollmentOpen] = useState(false);
    const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

    const handleEnroll = (courseId: string) => {
        setSelectedCourseId(courseId);
        setEnrollmentOpen(true);
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground font-bold uppercase tracking-widest text-xs animate-pulse">Sincronizando Cursos Lumine...</p>
            </div>
        );
    }

    // Organização de cursos por categorias solicitadas
    const trilhosDiscipulado = courses.filter(c => c.type === 'trilho' && c.ebdTrack === 'discipulado');
    const trilhosBiblico = courses.filter(c => c.type === 'trilho' && c.ebdTrack === 'biblico');
    const trilhosTeologico = courses.filter(c => c.type === 'trilho' && c.ebdTrack === 'teologico');
    const escolas = courses.filter(c => c.ministryName?.toLowerCase().includes('wave') || c.ministryName?.toLowerCase().includes('dis'));
    const outros = courses.filter(c => c.type !== 'trilho' && !c.ministryName?.toLowerCase().includes('wave') && !c.ministryName?.toLowerCase().includes('dis'));

    const renderCourseCard = (course: Course) => {
        const info = getCourseDisplayInfo(course.id, classes);
        
        return (
            <Card key={course.id} className={cn(
                "flex flex-col h-full transition-all border-2",
                !info.hasClasses ? "opacity-50 grayscale" : "hover:border-primary/50 hover:shadow-xl"
            )}>
                <CardHeader className="pb-4">
                    <div className="flex justify-between items-start mb-3">
                        <Badge variant="outline" className="text-[9px] uppercase font-black tracking-widest bg-muted/30">{course.ministryName}</Badge>
                        {info.hasClasses && (
                            <Badge variant={info.isFull ? "destructive" : "secondary"} className="text-[9px] font-black uppercase">
                                {info.isFull ? "Vagas Esgotadas" : info.vacancies >= 999 ? "Vagas Disponíveis" : `${info.vacancies} vagas restantes`}
                            </Badge>
                        )}
                    </div>
                    <CardTitle className="text-xl font-black italic tracking-tighter uppercase text-primary leading-tight line-clamp-2">
                        {course.name}
                    </CardTitle>
                    <CardDescription className="text-xs leading-relaxed line-clamp-2">{course.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 pt-0">
                    <div className="bg-slate-50 p-3 rounded-xl border border-dashed flex items-center gap-3">
                        <Clock className="size-4 text-primary shrink-0" />
                        <span className="text-xs font-bold text-slate-700 leading-tight">{info.schedule}</span>
                    </div>
                </CardContent>
                <CardFooter className="pt-4">
                    <Button 
                        className="w-full font-black uppercase tracking-[0.1em] text-xs h-11 shadow-lg shadow-primary/10" 
                        disabled={!info.hasClasses || info.isFull}
                        onClick={() => handleEnroll(course.id)}
                    >
                        {info.isFull ? "Lista de Espera" : "Garantir minha vaga"}
                    </Button>
                </CardFooter>
            </Card>
        );
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-12 sm:py-20">
            <div className="text-center mb-16 space-y-4 animate-in fade-in slide-in-from-top-4 duration-1000">
                <h1 className="text-4xl sm:text-7xl font-black italic tracking-tighter uppercase text-slate-900 leading-none">
                    Portal de <span className="text-primary underline decoration-primary/20">Inscrições</span>
                </h1>
                <p className="text-muted-foreground text-sm sm:text-xl max-w-2xl mx-auto font-medium">Conheça nossa grade de ensino e matricule-se no seu próximo nível.</p>
            </div>

            <Tabs defaultValue="trilhos" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-12 h-14 bg-slate-100 p-1.5 rounded-2xl border">
                    <TabsTrigger value="trilhos" className="rounded-xl font-black uppercase tracking-widest text-[10px] sm:text-xs data-[state=active]:bg-white data-[state=active]:shadow-lg">Trilhos</TabsTrigger>
                    <TabsTrigger value="escolas" className="rounded-xl font-black uppercase tracking-widest text-[10px] sm:text-xs data-[state=active]:bg-white data-[state=active]:shadow-lg">Escolas</TabsTrigger>
                    <TabsTrigger value="outros" className="rounded-xl font-black uppercase tracking-widest text-[10px] sm:text-xs data-[state=active]:bg-white data-[state=active]:shadow-lg">Outros</TabsTrigger>
                </TabsList>

                <TabsContent value="trilhos" className="animate-in fade-in zoom-in-95 duration-500">
                    <Tabs defaultValue="discipulado" className="w-full">
                        <div className="flex justify-center mb-8">
                            <TabsList className="bg-muted/50 p-1 rounded-full h-10 inline-flex">
                                <TabsTrigger value="discipulado" className="rounded-full text-[9px] uppercase font-black px-6">Discipulado</TabsTrigger>
                                <TabsTrigger value="biblico" className="rounded-full text-[9px] uppercase font-black px-6">BÍBLICO</TabsTrigger>
                                <TabsTrigger value="teologico" className="rounded-full text-[9px] uppercase font-black px-6">Teológico</TabsTrigger>
                            </TabsList>
                        </div>
                        
                        <TabsContent value="discipulado" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {trilhosDiscipulado.map(renderCourseCard)}
                        </TabsContent>
                        <TabsContent value="biblico" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {trilhosBiblico.map(renderCourseCard)}
                        </TabsContent>
                        <TabsContent value="teologico" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {trilhosTeologico.map(renderCourseCard)}
                        </TabsContent>
                    </Tabs>
                </TabsContent>

                <TabsContent value="escolas" className="animate-in fade-in zoom-in-95 duration-500">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {escolas.map(renderCourseCard)}
                    </div>
                </TabsContent>

                <TabsContent value="outros" className="animate-in fade-in zoom-in-95 duration-500">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {outros.map(renderCourseCard)}
                    </div>
                </TabsContent>
            </Tabs>

            <EnrollmentDialog 
                open={isEnrollmentOpen} 
                onOpenChange={setEnrollmentOpen} 
                initialCourseId={selectedCourseId}
            />
        </div>
    );
}

export default function EnrollmentPage() {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <PublicNavbar />
            <main className="flex-1">
                <VolunteeringProvider>
                    <EnrollmentPortal />
                </VolunteeringProvider>
            </main>
            <PublicFooter />
        </div>
    );
}
