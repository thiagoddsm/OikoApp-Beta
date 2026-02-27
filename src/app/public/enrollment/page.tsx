
'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useVolunteering, VolunteeringProvider } from '@/contexts/volunteering-context';
import { PublicNavbar } from '@/components/public/navbar';
import { PublicFooter } from '@/components/public/footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
    BookOpen, 
    GraduationCap, 
    Music, 
    ShieldCheck, 
    Users, 
    Waves, 
    ChevronRight, 
    ArrowRight, 
    CheckCircle2, 
    PlayCircle,
    Loader2,
    CalendarDays
} from 'lucide-react';
import Image from 'next/image';
import { EnrollmentDialog } from '@/components/teaching/enrollment-dialog';
import { useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

function EnrollmentPageContent() {
    const { courses, classes, isLoading } = useVolunteering();
    const searchParams = useSearchParams();
    const [selectedCourseId, setSelectedCourseId] = useState<string | undefined>(undefined);
    const [isEnrollmentOpen, setEnrollmentOpen] = useState(false);

    useEffect(() => {
        const id = searchParams.get('courseId');
        if (id) {
            setSelectedCourseId(id);
            setEnrollmentOpen(true);
        }
    }, [searchParams]);

    const categorizedCourses = useMemo(() => {
        const results = {
            trilha: [] as any[],
            escolas: [] as any[],
            outros: [] as any[]
        };

        courses.forEach(course => {
            const mName = course.ministryName?.toLowerCase() || '';
            const cName = course.name?.toLowerCase() || '';
            
            // 1. Trilha de Crescimento (Lumine / Membros)
            if (mName.includes('lumine') || mName.includes('ebd') || cName.includes('pertencer') || cName.includes('crescer')) {
                results.trilha.push(course);
            } 
            // 2. Escolas (Wave / DIS)
            else if (mName.includes('wave') || mName.includes('dis')) {
                results.escolas.push(course);
            }
            // 3. Outros
            else {
                results.outros.push(course);
            }
        });

        // Ordenar trilha
        const weightMap: Record<string, number> = { pertencer: 1, crescer: 2, liderar: 3, cuidar: 4, apoiar: 5, enviar: 6 };
        results.trilha.sort((a, b) => {
            const wA = Object.keys(weightMap).find(k => a.name.toLowerCase().includes(k)) ? weightMap[Object.keys(weightMap).find(k => a.name.toLowerCase().includes(k))!] : 99;
            const wB = Object.keys(weightMap).find(k => b.name.toLowerCase().includes(k)) ? weightMap[Object.keys(weightMap).find(k => b.name.toLowerCase().includes(k))!] : 99;
            return wA - wB;
        });

        return results;
    }, [courses]);

    const handleEnroll = (courseId: string) => {
        setSelectedCourseId(courseId);
        setEnrollmentOpen(true);
    };

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="animate-spin size-8 text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-slate-50">
            <PublicNavbar />
            
            <main className="flex-1">
                {/* Hero Section */}
                <section className="bg-slate-900 text-white py-20 overflow-hidden relative">
                    <div className="absolute inset-0 bg-primary/10 mix-blend-overlay opacity-20"></div>
                    <div className="container mx-auto px-4 text-center relative z-10 space-y-6">
                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 py-1 px-4 font-black uppercase tracking-widest text-[10px]">
                            Ensino & Discipulado
                        </Badge>
                        <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-white italic">
                            Trilha de <span className="text-primary">Crescimento</span>
                        </h1>
                        <p className="text-lg text-slate-300 max-w-2xl mx-auto">
                            Descubra sua identidade, desenvolva seus dons e conecte-se ao seu propósito ministerial através das nossas escolas e cursos.
                        </p>
                    </div>
                </section>

                <div className="container mx-auto px-4 py-12">
                    <Tabs defaultValue="trilha" className="w-full">
                        <div className="flex justify-center mb-12">
                            <TabsList className="bg-white border p-1 rounded-2xl h-auto flex-wrap justify-center gap-2 shadow-sm">
                                <TabsTrigger value="trilha" className="rounded-xl px-8 py-3 data-[state=active]:bg-primary data-[state=active]:text-white font-bold flex gap-2">
                                    <GraduationCap size={18}/> Trilha do Crescimento
                                </TabsTrigger>
                                <TabsTrigger value="escolas" className="rounded-xl px-8 py-3 data-[state=active]:bg-primary data-[state=active]:text-white font-bold flex gap-2">
                                    <Music size={18}/> Escolas IBM
                                </TabsTrigger>
                                <TabsTrigger value="outros" className="rounded-xl px-8 py-3 data-[state=active]:bg-primary data-[state=active]:text-white font-bold flex gap-2">
                                    <BookOpen size={18}/> Outros Cursos
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        {/* TABS CONTENT */}
                        {['trilha', 'escolas', 'outros'].map(category => (
                            <TabsContent key={category} value={category} className="animate-in fade-in-50 duration-500">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {categorizedCourses[category as keyof typeof categorizedCourses].map((course: any) => {
                                        const hasActiveClasses = classes.some(cls => cls.courseId === course.id);
                                        return (
                                            <Card key={course.id} className="overflow-hidden border-none shadow-xl hover:shadow-2xl transition-all duration-300 group rounded-3xl flex flex-col bg-white">
                                                <div className="relative aspect-[16/9] overflow-hidden">
                                                    <Image 
                                                        src={course.image || `https://picsum.photos/seed/${course.id}/800/450`} 
                                                        alt={course.name} 
                                                        fill 
                                                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                                                    <Badge className="absolute top-4 left-4 bg-white/20 backdrop-blur-md text-white border-white/20 uppercase font-black text-[9px] tracking-widest">
                                                        {course.ministryName}
                                                    </Badge>
                                                </div>
                                                <CardHeader className="p-6 pb-2">
                                                    <CardTitle className="text-xl font-black uppercase italic tracking-tighter text-slate-900 line-clamp-1">{course.name}</CardTitle>
                                                    <CardDescription className="line-clamp-3 text-sm min-h-[60px] leading-relaxed">
                                                        {course.description || "Inicie sua jornada de aprendizado e crescimento espiritual neste curso."}
                                                    </CardDescription>
                                                </CardHeader>
                                                <CardContent className="px-6 py-4 space-y-3 flex-1">
                                                    <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                                        <CalendarDays size={14} className="text-primary" />
                                                        <span>Domingos às 09h00</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                                        <CheckCircle2 size={14} className="text-emerald-500" />
                                                        <span>Inscrições Abertas</span>
                                                    </div>
                                                </CardContent>
                                                <CardFooter className="p-6 pt-0">
                                                    <Button 
                                                        className="w-full h-12 rounded-2xl font-black uppercase tracking-widest text-xs group/btn shadow-lg shadow-primary/10"
                                                        onClick={() => handleEnroll(course.id)}
                                                        disabled={!hasActiveClasses}
                                                    >
                                                        {hasActiveClasses ? (
                                                            <>
                                                                Quero me Inscrever
                                                                <ArrowRight className="ml-2 size-4 group-hover/btn:translate-x-1 transition-transform" />
                                                            </>
                                                        ) : "Turmas em Breve"}
                                                    </Button>
                                                </CardFooter>
                                            </Card>
                                        );
                                    })}
                                </div>
                                
                                {categorizedCourses[category as keyof typeof categorizedCourses].length === 0 && (
                                    <div className="py-20 text-center border-2 border-dashed rounded-[3rem] bg-white">
                                        <Loader2 className="size-12 mx-auto mb-4 text-muted-foreground opacity-20" />
                                        <p className="text-muted-foreground font-bold">Nenhum curso disponível nesta categoria no momento.</p>
                                    </div>
                                )}
                            </TabsContent>
                        ))}
                    </Tabs>
                </div>
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

export default function EnrollmentPage() {
    return (
        <VolunteeringProvider>
            <EnrollmentPageContent />
        </VolunteeringProvider>
    );
}
