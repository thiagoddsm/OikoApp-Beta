'use client';

import React, { useState } from 'react';
import { usePublicEnrollment, PublicEnrollmentProvider, type Course, type Class } from '@/contexts/public/enrollment-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
    Loader2, 
    Clock, 
    Search
} from 'lucide-react';
import { PublicNavbar } from '@/components/public/navbar';
import { PublicFooter } from '@/components/public/footer';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { PublicEnrollmentDialog } from '@/components/public/public-enrollment-dialog';

interface Schedule {
    day: string;
    time: string;
    capacity: number;
    occupied: number;
}

function CourseCard({ 
    course, 
    schedules, 
    hasClasses, 
    isFull, 
    onEnroll 
}: { 
    course: Course; 
    schedules: Schedule[]; 
    hasClasses: boolean; 
    isFull: boolean; 
    onEnroll: (c: Course) => void;
}) {
    const [isExpanded, setIsExpanded] = useState(false);
    const isLongDescription = course.description && course.description.length > 100;

    return (
        <Card className={cn("flex flex-col h-full transition-all hover:shadow-lg bg-white overflow-hidden", !hasClasses && "opacity-60 grayscale-[0.5]")}>
            <CardHeader className="pb-4">
                <div className="flex justify-between items-start mb-2">
                    <Badge variant="outline" className="text-[10px] uppercase font-black tracking-widest">
                        {course.ministryName}
                    </Badge>
                    {isFull && <Badge variant="destructive" className="text-[9px] font-black uppercase">Esgotado</Badge>}
                </div>
                <CardTitle className="text-xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">
                    {course.name}
                </CardTitle>
                <div className="relative flex flex-col items-start pt-2">
                    <CardDescription className={cn(
                        "text-xs text-muted-foreground leading-relaxed transition-all duration-300 min-h-[3rem]",
                        !isExpanded && "line-clamp-3"
                    )}>
                        {course.description}
                    </CardDescription>
                    
                    {isLongDescription && (
                        <button 
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="mt-2 text-[10px] font-bold text-[#6A52A3] uppercase border border-[#6A52A3] rounded-full px-3 py-1 hover:bg-[#6A52A3]/5 focus:outline-none transition-colors"
                        >
                            {isExpanded ? "VER MENOS" : "VER MAIS"}
                        </button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="flex-1 space-y-4">
                <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1.5">
                        <Clock className="size-3" /> Horários Disponíveis
                    </p>
                    {hasClasses ? (
                        <div className="space-y-1.5">
                            {schedules.map((s, i) => (
                                <div key={i} className="flex items-center justify-between text-sm bg-muted/30 p-2 rounded-lg border border-border/50">
                                    <span className="font-bold text-slate-700">{s.day} às {s.time}</span>
                                    {s.capacity > 0 && (
                                        <span className={cn("text-[10px] font-black uppercase", s.occupied >= s.capacity ? "text-destructive" : "text-emerald-600")}>
                                            {s.capacity - s.occupied} vagas
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs italic text-muted-foreground bg-muted/20 p-3 rounded-lg border border-dashed">
                            Sem turmas abertas no momento.
                        </p>
                    )}
                </div>
            </CardContent>
            <CardFooter className="pt-0 pb-6 px-6">
                <Button 
                    onClick={() => onEnroll(course)} 
                    disabled={!hasClasses || isFull}
                    className="w-full font-black uppercase tracking-widest bg-[#6A52A3] hover:bg-[#584289] text-white"
                >
                    {isFull ? 'Vagas Esgotadas' : 'Inscrever-se'}
                </Button>
            </CardFooter>
        </Card>
    );
}

function EnrollmentPortal() {
    const { courses, classes, isLoading } = usePublicEnrollment();
    const [searchTerm, setSearchTerm] = useState('');
    const [isEnrollmentOpen, setEnrollmentOpen] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

    const handleEnroll = (course: Course) => {
        setSelectedCourse(course);
        setEnrollmentOpen(true);
    };

    const getScheduleSummary = (courseId: string) => {
        const courseClasses = classes.filter(c => c.courseId === courseId);
        if (courseClasses.length === 0) return [];

        const summary: Record<string, { day: string, time: string, capacity: number, occupied: number }> = {};
        
        courseClasses.forEach(cls => {
            const key = `${cls.dayOfWeek}-${cls.startTime}`;
            if (!summary[key]) {
                summary[key] = { 
                    day: cls.dayOfWeek || 'A definir', 
                    time: cls.startTime, 
                    capacity: 0, 
                    occupied: 0 
                };
            }
            summary[key].capacity += (cls.maxStudents || 0);
            summary[key].occupied += (cls.students?.length || 0);
        });

        return Object.values(summary);
    };

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    const filteredCourses = courses.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const trilhos = filteredCourses.filter(c => c.type === 'trilho' || c.ministryName.toLowerCase().includes('lumine'));
    const escolas = filteredCourses.filter(c => ['wave', 'dis'].includes(c.ministryName.toLowerCase()));
    const outros = filteredCourses.filter(c => c.type === 'eletivo' && !escolas.includes(c) && !trilhos.includes(c));

    const renderCourseCard = (course: Course) => {
        const schedules = getScheduleSummary(course.id);
        const hasClasses = schedules.length > 0;
        const isFull = hasClasses && schedules.every(s => s.capacity > 0 && s.occupied >= s.capacity);

        return (
            <CourseCard
                key={course.id}
                course={course}
                schedules={schedules}
                hasClasses={hasClasses}
                isFull={isFull}
                onEnroll={handleEnroll}
            />
        );
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <PublicNavbar />
            <main className="flex-1 container mx-auto px-4 py-12 max-w-6xl">
                <header className="text-center space-y-4 mb-12">
                    <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">
                        Portal de Inscrições
                    </h1>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                        Escolha sua trilha de crescimento e torne-se parte ativa da nossa comunidade.
                    </p>
                    <div className="max-w-md mx-auto relative pt-4">
                        <Search className="absolute left-3 top-7 size-4 text-muted-foreground" />
                        <Input 
                            placeholder="Buscar curso..." 
                            className="pl-10 rounded-full h-12 bg-white shadow-sm"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </header>

                <Tabs defaultValue="trilhos" className="space-y-8">
                    <TabsList className="grid w-full grid-cols-3 max-w-lg mx-auto bg-muted/50 p-1 rounded-xl">
                        <TabsTrigger value="trilhos" className="rounded-lg font-bold py-2">Trilhos</TabsTrigger>
                        <TabsTrigger value="escolas" className="rounded-lg font-bold py-2">Escolas</TabsTrigger>
                        <TabsTrigger value="outros" className="rounded-lg font-bold py-2">Outros</TabsTrigger>
                    </TabsList>

                    <TabsContent value="trilhos" className="animate-in fade-in-50 duration-500">
                        <Tabs defaultValue="discipulado">
                            <div className="flex justify-center mb-8">
                                <TabsList className="inline-flex bg-slate-200/50 p-1 rounded-full">
                                    <TabsTrigger value="discipulado" className="rounded-full px-6 text-[10px] uppercase font-black">Discipulado</TabsTrigger>
                                    <TabsTrigger value="biblico" className="rounded-full px-6 text-[10px] uppercase font-black">BÍBLICO</TabsTrigger>
                                    <TabsTrigger value="teologico" className="rounded-full px-6 text-[10px] uppercase font-black">Teológico</TabsTrigger>
                                </TabsList>
                            </div>
                            
                            <TabsContent value="discipulado" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {trilhos.filter(c => c.ebdTrack === 'discipulado' || c.name.toLowerCase().includes('pertencer')).map(renderCourseCard)}
                            </TabsContent>
                            <TabsContent value="biblico" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {trilhos.filter(c => c.ebdTrack === 'biblico').map(renderCourseCard)}
                            </TabsContent>
                            <TabsContent value="teologico" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {trilhos.filter(c => c.ebdTrack === 'teologico').map(renderCourseCard)}
                            </TabsContent>
                        </Tabs>
                    </TabsContent>

                    <TabsContent value="escolas" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in-50">
                        {escolas.map(renderCourseCard)}
                    </TabsContent>

                    <TabsContent value="outros" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in-50">
                        {outros.map(renderCourseCard)}
                    </TabsContent>
                </Tabs>
            </main>
            <PublicFooter />

            <PublicEnrollmentDialog 
                open={isEnrollmentOpen} 
                onOpenChange={setEnrollmentOpen} 
                initialCourseId={selectedCourse?.id} 
            />
        </div>
    );
}

export default function EnrollmentPage() {
    return (
        <PublicEnrollmentProvider>
            <EnrollmentPortal />
        </PublicEnrollmentProvider>
    );
}