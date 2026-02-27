
'use client';

import React, { useMemo, useState } from 'react';
import { useVolunteering, VolunteeringProvider } from '@/contexts/volunteering-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    BookOpen, 
    ChevronRight, 
    Waves, 
    Lightbulb, 
    School, 
    HandHelping, 
    GraduationCap,
    Clock,
    MapPin,
    ArrowRight,
    Loader2
} from 'lucide-react';
import { PublicNavbar } from '@/components/public/navbar';
import { PublicFooter } from '@/components/public/footer';
import { EnrollmentDialog } from '@/components/teaching/enrollment-dialog';
import { cn } from '@/lib/utils';

/**
 * Define a ordem de importância/discipulado para exibição pública.
 */
const getDiscipleshipWeight = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('pertencer')) return 1;
    if (lowerName.includes('crescer')) return 2;
    if (lowerName.includes('liderar')) return 3;
    if (lowerName.includes('cuidar')) return 4;
    if (lowerName.includes('apoiar')) return 5;
    if (lowerName.includes('enviar')) return 6;
    return 99;
};

function EnrollmentPageContent() {
    const { courses, classes, isLoading } = useVolunteering();
    const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
    const [isEnrollmentOpen, setEnrollmentOpen] = useState(false);

    const groupedCourses = useMemo(() => {
        if (!courses) return {};
        const groups: Record<string, any[]> = {};
        
        courses.forEach(c => {
            const ministry = c.ministryName || 'Geral';
            if (!groups[ministry]) groups[ministry] = [];
            groups[ministry].push(c);
        });

        Object.keys(groups).forEach(ministry => {
            groups[ministry].sort((a, b) => {
                const weightA = getDiscipleshipWeight(a.name);
                const weightB = getDiscipleshipWeight(b.name);
                if (weightA !== weightB) return weightA - weightB;
                return a.name.localeCompare(b.name);
            });
        });

        return groups;
    }, [courses]);

    const getMinistryIcon = (name: string) => {
        const n = name.toLowerCase();
        if (n.includes('wave')) return Waves;
        if (n === 'dis') return HandHelping;
        if (n.includes('lumine') || n.includes('ebd')) return Lightbulb;
        if (n.includes('college') || n.includes('escola')) return School;
        return BookOpen;
    };

    const handleEnrollClick = (courseId: string) => {
        setSelectedCourseId(courseId);
        setEnrollmentOpen(true);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <PublicNavbar />
            
            <main className="flex-1 container mx-auto px-4 py-12 md:py-20">
                <div className="max-w-4xl mx-auto text-center mb-16 space-y-4">
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 py-1 px-4 font-black uppercase tracking-widest text-[10px]">
                        Ensino & Discipulado
                    </Badge>
                    <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-900 italic">
                        Trilha de <span className="text-primary">Crescimento</span>
                    </h1>
                    <p className="text-lg text-muted-foreground">
                        Encontre o seu lugar na família IBM e avance na sua jornada espiritual através dos nossos cursos e escolas.
                    </p>
                </div>

                {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="animate-spin size-8 text-primary opacity-50" />
                    </div>
                ) : (
                    <div className="space-y-20">
                        {Object.entries(groupedCourses).map(([ministry, ministryCourses]) => {
                            const Icon = getMinistryIcon(ministry);
                            return (
                                <section key={ministry} className="space-y-8 animate-in fade-in-50 duration-700">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-primary text-white rounded-2xl shadow-lg shadow-primary/20">
                                            <Icon size={28} />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900 leading-none">{ministry}</h3>
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mt-1">Escola IBM</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {ministryCourses.map(course => {
                                            const courseClasses = classes.filter(cls => cls.courseId === course.id);
                                            const hasActiveClasses = courseClasses.length > 0;

                                            return (
                                                <Card key={course.id} className="group hover:shadow-xl transition-all duration-300 border-none bg-white overflow-hidden flex flex-col">
                                                    <CardHeader className="pb-4">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <Badge variant="secondary" className="text-[9px] uppercase font-black px-2">{course.type || 'Curso'}</Badge>
                                                            {hasActiveClasses && (
                                                                <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600">
                                                                    <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                                    TURMAS ABERTAS
                                                                </span>
                                                            )}
                                                        </div>
                                                        <CardTitle className="text-xl font-black text-slate-900 group-hover:text-primary transition-colors">
                                                            {course.name}
                                                        </CardTitle>
                                                        <CardDescription className="line-clamp-3 text-sm leading-relaxed pt-2">
                                                            {course.description || 'Uma jornada de aprendizado e crescimento espiritual focada nos princípios do Reino.'}
                                                        </CardDescription>
                                                    </CardHeader>
                                                    <CardContent className="flex-1 flex flex-col justify-end gap-6 pt-0">
                                                        <div className="flex flex-wrap gap-4 text-xs font-bold text-slate-500 border-t pt-4">
                                                            <div className="flex items-center gap-1.5">
                                                                <Clock className="size-3.5 text-primary" />
                                                                {courseClasses[0]?.startTime || 'Consulte'}
                                                            </div>
                                                            <div className="flex items-center gap-1.5">
                                                                <MapPin className="size-3.5 text-primary" />
                                                                {courseClasses[0]?.locationId === 'the_school' ? 'The School' : 'Templo Sede'}
                                                            </div>
                                                        </div>
                                                        <Button 
                                                            onClick={() => handleEnrollClick(course.id)}
                                                            className={cn(
                                                                "w-full h-12 font-black text-sm uppercase tracking-wider shadow-lg transition-all active:scale-95",
                                                                !hasActiveClasses && "bg-slate-200 text-slate-500 hover:bg-slate-200"
                                                            )}
                                                            disabled={!hasActiveClasses}
                                                        >
                                                            {hasActiveClasses ? (
                                                                <>Quero me Inscrever <ArrowRight className="ml-2 size-4" /></>
                                                            ) : 'Indisponível no momento'}
                                                        </Button>
                                                    </CardContent>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                </section>
                            );
                        })}
                    </div>
                )}
            </main>

            <PublicFooter />

            <EnrollmentDialog 
                open={isEnrollmentOpen} 
                onOpenChange={setEnrollmentOpen} 
                initialStudentId={undefined} 
            />
        </div>
    );
}

export default function PublicEnrollmentPage() {
    return (
        <VolunteeringProvider>
            <EnrollmentPageContent />
        </VolunteeringProvider>
    );
}
