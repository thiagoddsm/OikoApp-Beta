'use client';

import React, { useState, useMemo } from 'react';
import { useVolunteering, type Course, type Class } from '@/contexts/volunteering-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
    Loader2, 
    BookOpen, 
    ChevronRight, 
    GraduationCap, 
    Users, 
    Calendar,
    Clock,
    School,
    CheckCircle2,
    Info,
    ArrowRight,
    Search
} from 'lucide-react';
import { PublicNavbar } from '@/components/public/navbar';
import { PublicFooter } from '@/components/public/footer';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// Função auxiliar para calcular horários sem violar ordem de hooks
const calculateScheduleSummary = (courseClasses: Class[]) => {
    if (!courseClasses.length) return [];
    
    const scheduleMap: Record<string, { days: Set<string>, capacity: number, occupied: number }> = {};
    
    courseClasses.forEach(cls => {
        const time = cls.startTime || 'A definir';
        const day = cls.dayOfWeek || 'Recorrente';
        const capacity = cls.maxStudents || 0;
        const occupied = cls.students?.length || 0;

        if (!scheduleMap[time]) {
            scheduleMap[time] = { days: new Set(), capacity: 0, occupied: 0 };
        }
        scheduleMap[time].days.add(day);
        scheduleMap[time].capacity += capacity;
        scheduleMap[time].occupied += occupied;
    });

    return Object.entries(scheduleMap).map(([time, data]) => ({
        label: `${Array.from(data.days).join(', ')} às ${time}`,
        vagas: data.capacity > 0 ? Math.max(0, data.capacity - data.occupied) : null,
        totalVagas: data.capacity
    }));
};

function EnrollmentPortal() {
    const { courses, classes, isLoading } = useVolunteering();
    const [searchTerm, setSearchTerm] = useState('');
    const [activeMainTab, setActiveMainTab] = useState('trilhos');
    const [activeTrilhoTab, setActiveTrilhoTab] = useState('discipulado');

    const filteredCourses = useMemo(() => {
        if (!courses) return [];
        return courses.filter(c => {
            const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                 c.ministryName.toLowerCase().includes(searchTerm.toLowerCase());
            
            if (!matchesSearch) return false;

            if (activeMainTab === 'trilhos') {
                const isTrilho = c.type === 'trilho' || c.ministryName.toLowerCase().includes('lumine');
                if (!isTrilho) return false;

                if (activeTrilhoTab === 'discipulado') return c.ebdTrack === 'discipulado' || c.name.toLowerCase().includes('pertencer') || c.name.toLowerCase().includes('crescer');
                if (activeTrilhoTab === 'biblico') return c.ebdTrack === 'biblico';
                if (activeTrilhoTab === 'teologico') return c.ebdTrack === 'teologico';
                return true;
            }

            if (activeMainTab === 'escolas') return c.ministryName.toLowerCase().includes('wave') || c.ministryName.toLowerCase().includes('dis');
            if (activeMainTab === 'outros') return !c.type && !c.ministryName.toLowerCase().includes('wave') && !c.ministryName.toLowerCase().includes('dis');

            return true;
        });
    }, [courses, searchTerm, activeMainTab, activeTrilhoTab]);

    if (isLoading) {
        return (
            <div className="flex h-96 w-full items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-12 max-w-6xl">
            <header className="text-center mb-12 space-y-4">
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 px-4 py-1 font-bold uppercase tracking-widest">
                    Inscrições Abertas 2025
                </Badge>
                <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-900 italic">
                    ESCOLHA SUA <span className="text-primary">JORNADA</span>
                </h1>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    Invista no seu crescimento espiritual e ministerial através dos nossos cursos e trilhos de formação.
                </p>
                <div className="relative max-w-md mx-auto mt-8">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input 
                        placeholder="Pesquisar curso ou ministério..." 
                        className="pl-10 h-12 rounded-full shadow-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </header>

            <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="w-full">
                <div className="flex justify-center mb-8">
                    <TabsList className="bg-muted/50 p-1 h-12 rounded-full border-2 border-slate-100 shadow-inner">
                        <TabsTrigger value="trilhos" className="rounded-full px-8 font-black uppercase text-[10px] tracking-widest">Trilhos</TabsTrigger>
                        <TabsTrigger value="escolas" className="rounded-full px-8 font-black uppercase text-[10px] tracking-widest">Escolas</TabsTrigger>
                        <TabsTrigger value="outros" className="rounded-full px-8 font-black uppercase text-[10px] tracking-widest">Outros</TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="trilhos" className="animate-in fade-in-50 duration-500">
                    <div className="flex justify-center mb-10">
                        <Tabs value={activeTrilhoTab} onValueChange={setActiveTrilhoTab} className="w-fit">
                            <TabsList className="bg-slate-100 h-10 p-1">
                                <TabsTrigger value="discipulado" className="text-[10px] uppercase font-bold tracking-tight">Discipulado</TabsTrigger>
                                <TabsTrigger value="biblico" className="text-[10px] uppercase font-bold tracking-tight">BÍBLICO</TabsTrigger>
                                <TabsTrigger value="teologico" className="text-[10px] uppercase font-bold tracking-tight">Teológico</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                </TabsContent>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCourses.map((course) => {
                        const courseClasses = classes.filter(cls => cls.courseId === course.id);
                        const hasClasses = courseClasses.length > 0;
                        const scheduleSummary = calculateScheduleSummary(courseClasses);
                        
                        // Verifica se está tudo esgotado
                        const isAllFull = hasClasses && scheduleSummary.every(s => s.vagas !== null && s.vagas === 0);

                        return (
                            <Card key={course.id} className={cn(
                                "flex flex-col overflow-hidden transition-all duration-300 hover:shadow-2xl border-none ring-1 ring-slate-200",
                                !hasClasses && "opacity-60 grayscale"
                            )}>
                                <div className="h-2 bg-primary w-full" />
                                <CardHeader className="pb-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <Badge variant="secondary" className="text-[10px] font-black uppercase tracking-tighter bg-primary/5 text-primary border-none">
                                            {course.ministryName}
                                        </Badge>
                                        {isAllFull && <Badge variant="destructive" className="text-[10px] font-black">ESGOTADO</Badge>}
                                    </div>
                                    <CardTitle className="text-xl font-black text-slate-900 leading-tight uppercase italic">{course.name}</CardTitle>
                                    <CardDescription className="line-clamp-3 text-sm font-medium mt-2 leading-relaxed">
                                        {course.description || 'Nenhuma descrição disponível para este curso no momento.'}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="flex-1 space-y-4">
                                    {hasClasses ? (
                                        <div className="space-y-3">
                                            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                                                <Clock className="size-3" /> Horários & Vagas
                                            </p>
                                            <div className="space-y-2">
                                                {scheduleSummary.map((slot, i) => (
                                                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 group transition-colors">
                                                        <span className="text-xs font-bold text-slate-700">{slot.label}</span>
                                                        {slot.vagas !== null && (
                                                            <span className={cn(
                                                                "text-[10px] font-black px-2 py-0.5 rounded-full",
                                                                slot.vagas === 0 ? "bg-red-100 text-red-700" : 
                                                                slot.vagas < 5 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                                                            )}>
                                                                {slot.vagas === 0 ? 'SEM VAGAS' : `${slot.vagas} VAGAS`}
                                                            </span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="py-6 text-center border-2 border-dashed rounded-xl bg-slate-50">
                                            <Calendar className="size-8 mx-auto mb-2 text-slate-300" />
                                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">Sem turmas previstas</p>
                                        </div>
                                    )}
                                </CardContent>
                                <CardFooter className="pt-4 border-t bg-slate-50/50">
                                    <Button 
                                        className="w-full font-black uppercase tracking-widest text-xs h-11 shadow-lg" 
                                        disabled={!hasClasses || isAllFull}
                                        asChild={hasClasses && !isAllFull}
                                    >
                                        {hasClasses && !isAllFull ? (
                                            <a href={`#enroll-${course.id}`}>
                                                Quero me inscrever <ArrowRight className="ml-2 size-4" />
                                            </a>
                                        ) : (
                                            <span>Inscrições Indisponíveis</span>
                                        )}
                                    </Button>
                                </CardFooter>
                            </Card>
                        )
                    })}
                </div>
            </Tabs>
        </div>
    );
}

export default function EnrollmentPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <PublicNavbar />
            <main className="flex-1 bg-slate-50/30">
                <EnrollmentPortal />
            </main>
            <PublicFooter />
        </div>
    );
}
