
'use client';

import React, { useState, useMemo, Suspense } from 'react';
import { useVolunteering, VolunteeringProvider } from '@/contexts/volunteering-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
    BookOpen, 
    GraduationCap, 
    Music, 
    HeartHandshake, 
    ArrowRight, 
    ChevronRight, 
    CheckCircle2, 
    Loader2,
    Calendar,
    Users,
    Waves,
    Lightbulb,
    School,
    HandHelping
} from 'lucide-react';
import { PublicNavbar } from '@/components/public/navbar';
import { PublicFooter } from '@/components/public/footer';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';

const TRACK_ORDER = ['discipulado', 'biblico', 'teologico'];

function EnrollmentPageContent() {
    const { courses, classes, isLoading } = useVolunteering();
    const searchParams = useSearchParams();
    const [selectedCourseId, setSelectedCourseId] = useState<string | null>(searchParams.get('courseId'));
    const [activeMainTab, setActiveTab] = useState('lumine');
    const [activeLumineTab, setActiveLumineTab] = useState('discipulado');

    const filteredCourses = useMemo(() => {
        if (!courses) return { lumine: [], schools: [], others: [] };
        
        return {
            lumine: courses.filter(c => c.ministryName?.toLowerCase().includes('lumine') || c.ministryName?.toLowerCase().includes('ebd')),
            schools: courses.filter(c => c.ministryName?.toLowerCase() === 'wave' || c.ministryName?.toLowerCase() === 'dis'),
            others: courses.filter(c => !c.ministryName?.toLowerCase().includes('lumine') && c.ministryName?.toLowerCase() !== 'wave' && c.ministryName?.toLowerCase() !== 'dis')
        };
    }, [courses]);

    const lumineByTrack = useMemo(() => {
        return {
            discipulado: filteredCourses.lumine.filter(c => c.ebdTrack === 'discipulado' || (!c.ebdTrack && c.name.toLowerCase().includes('pertencer'))),
            biblico: filteredCourses.lumine.filter(c => c.ebdTrack === 'biblico'),
            teologico: filteredCourses.lumine.filter(c => c.ebdTrack === 'teologico')
        };
    }, [filteredCourses.lumine]);

    const getMinistryIcon = (name: string) => {
        const n = name?.toLowerCase() || '';
        if (n.includes('wave')) return Waves;
        if (n === 'dis') return HandHelping;
        if (n.includes('lumine')) return Lightbulb;
        return BookOpen;
    };

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <PublicNavbar />
            
            <main className="flex-1 container mx-auto px-4 py-12">
                <div className="max-w-4xl mx-auto text-center mb-12 space-y-4">
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 py-1 px-4 font-black uppercase tracking-widest text-[10px]">
                        Ensino & Discipulado
                    </Badge>
                    <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-900 italic">
                        Trilha de <span className="text-primary">Crescimento</span>
                    </h1>
                    <p className="text-lg text-muted-foreground">
                        Escolha um curso e inicie sua jornada de maturidade na IBM.
                    </p>
                </div>

                <Tabs value={activeMainTab} onValueChange={setActiveTab} className="w-full space-y-10">
                    <div className="flex justify-center">
                        <TabsList className="bg-white border p-1 rounded-full shadow-sm">
                            <TabsTrigger value="lumine" className="rounded-full px-8 font-bold data-[state=active]:bg-primary data-[state=active]:text-white">LUMINE</TabsTrigger>
                            <TabsTrigger value="schools" className="rounded-full px-8 font-bold data-[state=active]:bg-primary data-[state=active]:text-white">ESCOLAS IBM</TabsTrigger>
                            <TabsTrigger value="others" className="rounded-full px-8 font-bold data-[state=active]:bg-primary data-[state=active]:text-white">OUTROS</TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="lumine" className="animate-in fade-in-50 duration-500">
                        <div className="space-y-10">
                            <div className="flex flex-col items-center gap-4">
                                <Tabs value={activeLumineTab} onValueChange={setActiveLumineTab} className="w-full max-w-lg">
                                    <TabsList className="grid w-full grid-cols-3 bg-muted/50 p-1">
                                        <TabsTrigger value="discipulado" className="text-xs font-black uppercase">Discipulado</TabsTrigger>
                                        <TabsTrigger value="biblico" className="text-xs font-black uppercase">Bíblia</TabsTrigger>
                                        <TabsTrigger value="teologico" className="text-xs font-black uppercase">Teologia</TabsTrigger>
                                    </TabsList>
                                </Tabs>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {lumineByTrack[activeLumineTab as keyof typeof lumineByTrack].map(course => {
                                    const Icon = getMinistryIcon(course.ministryName);
                                    return (
                                        <Card key={course.id} className="group hover:border-primary/50 transition-all shadow-sm bg-card overflow-hidden">
                                            <div className="relative h-32 w-full bg-primary/5 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                                                <Icon size={48} className="text-primary opacity-20 group-hover:scale-110 transition-transform" />
                                                <div className="absolute top-3 right-3">
                                                    <Badge className="bg-white/80 text-primary border-none text-[9px] font-black uppercase">{activeLumineTab}</Badge>
                                                </div>
                                            </div>
                                            <CardHeader className="p-5">
                                                <CardTitle className="text-lg font-black uppercase italic tracking-tighter leading-none">{course.name}</CardTitle>
                                                <CardDescription className="line-clamp-2 text-xs leading-relaxed mt-2">{course.description}</CardDescription>
                                            </CardHeader>
                                            <CardFooter className="p-5 pt-0">
                                                <Button className="w-full font-bold group" onClick={() => setSelectedCourseId(course.id)}>
                                                    Inscrever-se <ArrowRight className="ml-2 size-4 group-hover:translate-x-1 transition-transform" />
                                                </Button>
                                            </CardFooter>
                                        </Card>
                                    )
                                })}
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="schools" className="animate-in fade-in-50 duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredCourses.schools.map(course => {
                                const Icon = getMinistryIcon(course.ministryName);
                                return (
                                    <Card key={course.id} className="group hover:shadow-xl transition-all border-none bg-white overflow-hidden ring-1 ring-slate-200">
                                        <div className="p-6">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                                                    <Icon size={32} />
                                                </div>
                                                <Badge variant="secondary" className="font-black uppercase tracking-widest text-[9px]">{course.ministryName}</Badge>
                                            </div>
                                            <h3 className="text-xl font-black uppercase italic tracking-tighter mb-2">{course.name}</h3>
                                            <p className="text-sm text-muted-foreground leading-relaxed mb-6">{course.description}</p>
                                            <Button variant="outline" className="w-full font-bold border-2 hover:bg-primary hover:text-white" onClick={() => setSelectedCourseId(course.id)}>
                                                Saiba Mais e Inscreva-se
                                            </Button>
                                        </div>
                                    </Card>
                                )
                            })}
                        </div>
                    </TabsContent>

                    <TabsContent value="others" className="animate-in fade-in-50 duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredCourses.others.map(course => (
                                <div key={course.id} className="p-6 bg-white rounded-2xl border flex flex-col justify-between hover:border-primary transition-colors">
                                    <div>
                                        <Badge variant="secondary" className="mb-2 text-[9px] font-black uppercase">{course.ministryName || 'Geral'}</Badge>
                                        <h4 className="font-bold text-lg mb-2">{course.name}</h4>
                                        <p className="text-xs text-muted-foreground mb-6">{course.description}</p>
                                    </div>
                                    <Button size="sm" className="w-full font-bold" onClick={() => setSelectedCourseId(course.id)}>Inscrição Aberta</Button>
                                </div>
                            ))}
                        </div>
                    </TabsContent>
                </Tabs>
            </main>

            <PublicFooter />
        </div>
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
