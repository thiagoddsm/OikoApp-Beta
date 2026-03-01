
'use client';

import React, { useState, useMemo } from 'react';
import { useVolunteering, VolunteeringProvider } from '@/contexts/volunteering-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, GraduationCap, School, BookOpen, Clock, Calendar, Users, CheckCircle2 } from 'lucide-react';
import { PublicNavbar } from '@/components/public/navbar';
import { PublicFooter } from '@/components/public/footer';
import { cn } from '@/lib/utils';

// Função auxiliar para agrupar horários sem violar regras de hooks
function getScheduleSummary(courseId: string, allClasses: any[]) {
    const courseClasses = allClasses.filter(c => c.courseId === courseId);
    if (courseClasses.length === 0) return [];

    const scheduleMap: Record<string, { days: Set<string>, capacity: number, occupied: number }> = {};

    courseClasses.forEach(cls => {
        const timeKey = cls.startTime || 'A definir';
        if (!scheduleMap[timeKey]) {
            scheduleMap[timeKey] = { days: new Set(), capacity: 0, occupied: 0 };
        }
        if (cls.dayOfWeek) scheduleMap[timeKey].days.add(cls.dayOfWeek);
        scheduleMap[timeKey].capacity += (cls.maxStudents || 0);
        scheduleMap[timeKey].occupied += (cls.students?.length || 0);
    });

    return Object.entries(scheduleMap).map(([time, data]) => ({
        time,
        days: Array.from(data.days).join(', '),
        available: Math.max(0, data.capacity - data.occupied),
        total: data.capacity,
        isFull: data.capacity > 0 && data.occupied >= data.capacity
    }));
}

function EnrollmentPortal() {
    const { courses, classes, isLoading } = useVolunteering();
    const [activeMainTab, setActiveMainTab] = useState('trilhos');

    const groupedCourses = useMemo(() => {
        const groups = {
            trilhos: {
                discipulado: [] as any[],
                biblico: [] as any[],
                teologico: [] as any[],
            },
            escolas: [] as any[],
            outros: [] as any[]
        };

        courses.forEach(course => {
            const mName = course.ministryName?.toLowerCase() || '';
            const isTrilho = mName.includes('lumine') || mName.includes('ebd');
            const isEscola = mName.includes('wave') || mName.includes('dis');

            if (isTrilho) {
                if (course.ebdTrack === 'discipulado') groups.trilhos.discipulado.push(course);
                else if (course.ebdTrack === 'biblico') groups.trilhos.biblico.push(course);
                else if (course.ebdTrack === 'teologico') groups.trilhos.teologico.push(course);
                else groups.outros.push(course);
            } else if (isEscola) {
                groups.escolas.push(course);
            } else {
                groups.outros.push(course);
            }
        });

        return groups;
    }, [courses]);

    if (isLoading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const renderCourseCard = (course: any) => {
        const schedules = getScheduleSummary(course.id, classes);
        const hasClasses = schedules.length > 0;
        const totalAvailable = schedules.reduce((acc, curr) => acc + curr.available, 0);
        const isSoldOut = hasClasses && totalAvailable === 0;

        return (
            <Card key={course.id} className={cn("overflow-hidden flex flex-col h-full transition-all hover:shadow-md", !hasClasses && "opacity-60 grayscale")}>
                <CardHeader className="bg-muted/30 pb-4">
                    <div className="flex justify-between items-start mb-2">
                        <Badge variant="outline" className="text-[10px] uppercase font-black">{course.ministryName}</Badge>
                        {!hasClasses && <Badge variant="secondary" className="text-[9px]">Sem turmas</Badge>}
                        {isSoldOut && <Badge variant="destructive" className="text-[9px]">Vagas Esgotadas</Badge>}
                    </div>
                    <CardTitle className="text-xl font-black italic tracking-tighter uppercase text-primary">{course.name}</CardTitle>
                    <CardDescription className="line-clamp-2 text-xs h-8">{course.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 py-4 space-y-4">
                    {hasClasses ? (
                        <div className="space-y-3">
                            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1">
                                <Clock className="size-3" /> Horários & Vagas
                            </p>
                            <div className="space-y-2">
                                {schedules.map((s, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                                        <div className="text-xs">
                                            <span className="font-bold text-slate-900">{s.days} às {s.time}</span>
                                        </div>
                                        <div className="text-right">
                                            {s.isFull ? (
                                                <span className="text-[9px] font-black text-destructive uppercase">Esgotado</span>
                                            ) : (
                                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                                    {s.available} vagas
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="py-6 text-center italic text-muted-foreground text-xs">
                            Novas turmas em breve.
                        </div>
                    )}
                </CardContent>
                <CardFooter className="pt-0">
                    <Button 
                        className="w-full font-bold" 
                        disabled={!hasClasses || isSoldOut}
                        onClick={() => window.location.href = `/public/enrollment/form?courseId=${course.id}`}
                    >
                        {isSoldOut ? 'Vagas Esgotadas' : 'Inscrever-se'}
                    </Button>
                </CardFooter>
            </Card>
        );
    };

    return (
        <div className="container mx-auto px-4 py-10 space-y-10">
            <div className="text-center max-w-2xl mx-auto space-y-4">
                <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter text-slate-900 uppercase">
                    Portal Lumine
                </h1>
                <p className="text-muted-foreground text-lg">
                    Escolha sua próxima etapa de crescimento e faça sua inscrição agora mesmo.
                </p>
            </div>

            <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="w-full">
                <div className="flex justify-center mb-8">
                    <TabsList className="bg-muted/50 p-1 h-12 rounded-xl border">
                        <TabsTrigger value="trilhos" className="rounded-lg px-8 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">Trilhos</TabsTrigger>
                        <TabsTrigger value="escolas" className="rounded-lg px-8 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">Escolas</TabsTrigger>
                        <TabsTrigger value="outros" className="rounded-lg px-8 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">Outros</TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="trilhos" className="mt-0 animate-in fade-in-50 duration-500">
                    <Tabs defaultValue="discipulado" className="w-full">
                        <div className="flex justify-center mb-10">
                            <TabsList className="bg-transparent border-b h-10 w-full max-w-md justify-center rounded-none gap-8">
                                <TabsTrigger value="discipulado" className="border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent shadow-none px-0 text-[10px] uppercase font-bold tracking-tight">Discipulado</TabsTrigger>
                                <TabsTrigger value="biblico" className="border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent shadow-none px-0 text-[10px] uppercase font-bold tracking-tight">BÍBLICO</TabsTrigger>
                                <TabsTrigger value="teologico" className="border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent shadow-none px-0 text-[10px] uppercase font-bold tracking-tight">Teológico</TabsTrigger>
                            </TabsList>
                        </div>
                        
                        <TabsContent value="discipulado" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {groupedCourses.trilhos.discipulado.map(renderCourseCard)}
                        </TabsContent>
                        <TabsContent value="biblico" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {groupedCourses.trilhos.biblico.map(renderCourseCard)}
                        </TabsContent>
                        <TabsContent value="teologico" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {groupedCourses.trilhos.teologico.map(renderCourseCard)}
                        </TabsContent>
                    </Tabs>
                </TabsContent>

                <TabsContent value="escolas" className="mt-0 animate-in fade-in-50 duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {groupedCourses.escolas.map(renderCourseCard)}
                    </div>
                </TabsContent>

                <TabsContent value="outros" className="mt-0 animate-in fade-in-50 duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {groupedCourses.outros.map(renderCourseCard)}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

export default function EnrollmentPage() {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <PublicNavbar />
            <VolunteeringProvider>
                <main className="flex-1">
                    <EnrollmentPortal />
                </main>
            </VolunteeringProvider>
            <PublicFooter />
        </div>
    );
}
