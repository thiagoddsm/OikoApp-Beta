
'use client';

import React, { Suspense, useMemo, useState } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useVolunteering, VolunteeringProvider } from '@/contexts/volunteering-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import { Loader2, GraduationCap, School, BookOpen, ChevronRight, CheckCircle2, Star, Sparkles, MapPin, Clock } from 'lucide-react';
import { PublicNavbar } from '@/components/public/navbar';
import { PublicFooter } from '@/components/public/footer';
import { EnrollmentForm } from './enrollment-form';
import { cn } from '@/lib/utils';
import { PlaceHolderImages } from '@/lib/placeholder-images';

function EnrollmentPageContent() {
    const searchParams = useSearchParams();
    const { courses, classes, isLoading } = useVolunteering();
    const [selectedCourseId, setSelectedCourseId] = useState<string | null>(searchParams.get('courseId'));
    const [activeTab, setActiveTab] = useState('lumine');
    const [activeLumineTab, setActiveLumineTab] = useState('discipulado');

    const groupedCourses = useMemo(() => {
        const groups = {
            lumine: {
                discipulado: courses.filter(c => c.ministryName.toLowerCase().includes('lumine') && c.ebdTrack === 'discipulado'),
                biblia: courses.filter(c => c.ministryName.toLowerCase().includes('lumine') && c.ebdTrack === 'biblico'),
                teologia: courses.filter(c => c.ministryName.toLowerCase().includes('lumine') && c.ebdTrack === 'teologico'),
            },
            schools: courses.filter(c => c.ministryName.toLowerCase().includes('wave') || c.ministryName.toLowerCase() === 'dis'),
            others: courses.filter(c => !c.ministryName.toLowerCase().includes('lumine') && !c.ministryName.toLowerCase().includes('wave') && c.ministryName.toLowerCase() !== 'dis')
        };
        return groups;
    }, [courses]);

    const getCourseImage = (course: any) => {
        if (course.ebdTrack === 'discipulado') return PlaceHolderImages.find(p => p.id === 'course-discipulado')?.imageUrl;
        if (course.ebdTrack === 'biblico') return PlaceHolderImages.find(p => p.id === 'course-biblia')?.imageUrl;
        if (course.ebdTrack === 'teologico') return PlaceHolderImages.find(p => p.id === 'course-teologia')?.imageUrl;
        return PlaceHolderImages.find(p => p.id === 'course-escolas')?.imageUrl;
    };

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <div className="text-center">
                    <Loader2 className="size-12 animate-spin text-primary mx-auto mb-4" />
                    <p className="font-bold text-slate-600">Carregando Trilhas de Crescimento...</p>
                </div>
            </div>
        );
    }

    if (selectedCourseId) {
        const course = courses.find(c => c.id === selectedCourseId);
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col">
                <PublicNavbar />
                <main className="flex-1 container mx-auto px-4 py-12">
                    <Button variant="ghost" onClick={() => setSelectedCourseId(null)} className="mb-8 font-bold">
                        <ChevronRight className="rotate-180 mr-2 size-4" /> Voltar ao Catálogo
                    </Button>
                    <div className="max-w-4xl mx-auto">
                        <EnrollmentForm course={course} onCancel={() => setSelectedCourseId(null)} />
                    </div>
                </main>
                <PublicFooter />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white flex flex-col">
            <PublicNavbar />
            
            <main className="flex-1">
                {/* Hero section refined */}
                <section className="bg-slate-50 py-20 px-4 border-b">
                    <div className="container mx-auto text-center space-y-6">
                        <div className="flex justify-center">
                            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 py-1 px-4 font-black uppercase tracking-widest text-[10px]">
                                Ensino & Discipulado
                            </Badge>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-slate-900 italic">
                            Lumine
                        </h1>
                        <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                            A organização serve ao organismo. Escolha o seu próximo passo na caminhada com Cristo e faça parte do que Deus está fazendo em nossa família.
                        </p>
                    </div>
                </section>

                <section className="py-16 container mx-auto px-4">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <div className="flex justify-center mb-12">
                            <TabsList className="bg-muted/50 p-1 h-14 rounded-full border shadow-inner">
                                <TabsTrigger value="lumine" className="rounded-full px-8 h-full data-[state=active]:bg-white data-[state=active]:shadow-lg font-black text-xs uppercase tracking-wider">
                                    <Sparkles className="size-4 mr-2" /> Trilha Lumine
                                </TabsTrigger>
                                <TabsTrigger value="schools" className="rounded-full px-8 h-full data-[state=active]:bg-white data-[state=active]:shadow-lg font-black text-xs uppercase tracking-wider">
                                    <School className="size-4 mr-2" /> Escolas IBM
                                </TabsTrigger>
                                <TabsTrigger value="others" className="rounded-full px-8 h-full data-[state=active]:bg-white data-[state=active]:shadow-lg font-black text-xs uppercase tracking-wider">
                                    <BookOpen className="size-4 mr-2" /> Capacitação
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="lumine" className="mt-0 animate-in fade-in-50 duration-500">
                            <div className="space-y-12">
                                {/* Sub-abas para a Trilha Lumine */}
                                <div className="flex justify-center border-b pb-4 gap-8">
                                    {['discipulado', 'biblia', 'teologia'].map((sub) => (
                                        <button
                                            key={sub}
                                            onClick={() => setActiveLumineTab(sub)}
                                            className={cn(
                                                "text-xs font-black uppercase tracking-widest pb-2 transition-all relative",
                                                activeLumineTab === sub 
                                                    ? "text-primary border-b-2 border-primary" 
                                                    : "text-muted-foreground hover:text-slate-900"
                                            )}
                                        >
                                            {sub}
                                        </button>
                                    ))}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {groupedCourses.lumine[activeLumineTab as keyof typeof groupedCourses.lumine]?.map(course => (
                                        <CourseCard key={course.id} course={course} image={getCourseImage(course)} onSelect={() => setSelectedCourseId(course.id)} />
                                    ))}
                                    {groupedCourses.lumine[activeLumineTab as keyof typeof groupedCourses.lumine]?.length === 0 && (
                                        <div className="col-span-full py-20 text-center border-2 border-dashed rounded-3xl opacity-50 italic">
                                            Nenhum curso disponível nesta categoria no momento.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="schools" className="mt-0 animate-in fade-in-50 duration-500">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {groupedCourses.schools.map(course => (
                                    <CourseCard key={course.id} course={course} image={getCourseImage(course)} onSelect={() => setSelectedCourseId(course.id)} />
                                ))}
                            </div>
                        </TabsContent>

                        <TabsContent value="others" className="mt-0 animate-in fade-in-50 duration-500">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {groupedCourses.others.map(course => (
                                    <CourseCard key={course.id} course={course} image={getCourseImage(course)} onSelect={() => setSelectedCourseId(course.id)} />
                                ))}
                            </div>
                        </TabsContent>
                    </Tabs>
                </section>
            </main>

            <PublicFooter />
        </div>
    );
}

function CourseCard({ course, image, onSelect }: { course: any, image: any, onSelect: () => void }) {
    return (
        <Card className="group overflow-hidden border-none shadow-2xl hover:shadow-primary/10 transition-all duration-500 rounded-[2rem] bg-slate-50 flex flex-col">
            <div className="relative aspect-video overflow-hidden">
                <Image 
                    src={image || 'https://picsum.photos/seed/placeholder/800/450'} 
                    alt={course.name} 
                    fill 
                    className="object-cover transition-transform duration-700 group-hover:scale-110" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60" />
                <Badge className="absolute bottom-4 left-4 bg-primary text-white font-black px-3 py-0.5 text-[10px] uppercase shadow-lg border-none">
                    {course.ministryName}
                </Badge>
            </div>
            <CardContent className="p-8 flex-1 flex flex-col">
                <div className="flex-1 space-y-3">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none group-hover:text-primary transition-colors">
                        {course.name}
                    </h3>
                    <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed">
                        {course.description || 'Descrição em desenvolvimento. Prepare-se para uma jornada transformadora neste curso.'}
                    </p>
                </div>
                <div className="pt-8 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-emerald-600">
                        <CheckCircle2 size={16} />
                        <span className="text-[10px] font-black uppercase tracking-tighter">Inscrições Abertas</span>
                    </div>
                    <Button onClick={onSelect} className="h-10 px-6 rounded-full font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 group-hover:bg-primary transition-all">
                        Participar <ChevronRight className="ml-2 size-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

export default function PublicEnrollmentPage() {
    return (
        <VolunteeringProvider>
            <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>}>
                <EnrollmentPageContent />
            </Suspense>
        </VolunteeringProvider>
    );
}
