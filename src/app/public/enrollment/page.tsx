'use client';

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
    Loader2, BookOpen, Waves, HandHelping, GraduationCap, 
    ArrowRight, MapPin, Clock, Calendar, CheckCircle2, UserPlus,
    Target, Building2, UserCheck
} from 'lucide-react';
import { PublicNavbar } from '@/components/public/navbar';
import { PublicFooter } from '@/components/public/footer';
import { useVolunteering } from '@/contexts/volunteering-context';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Image from 'next/image';
import { EnrollmentDialog } from '@/components/teaching/enrollment-dialog';
import { cn } from '@/lib/utils';

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

export default function PublicEnrollmentPage() {
    const { courses, classes, isLoading } = useVolunteering();
    const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
    const [isEnrollmentOpen, setEnrollmentOpen] = useState(false);

    const groupedCourses = useMemo(() => {
        if (!courses) return {};
        const groups: Record<string, any[]> = {
            lumine: [],
            wave: [],
            dis: [],
            outros: []
        };

        courses.forEach(c => {
            const ministry = c.ministryName?.toLowerCase() || '';
            if (ministry.includes('lumine') || ministry.includes('ebd')) groups.lumine.push(c);
            else if (ministry.includes('wave')) groups.wave.push(c);
            else if (ministry.includes('dis')) groups.dis.push(c);
            else groups.outros.push(c);
        });

        groups.lumine.sort((a, b) => getDiscipleshipWeight(a.name) - getDiscipleshipWeight(b.name));
        return groups;
    }, [courses]);

    const handleEnroll = (courseId: string) => {
        setSelectedCourseId(courseId);
        setEnrollmentOpen(true);
    };

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-slate-50">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-slate-50">
            <PublicNavbar />

            <main className="flex-1 pb-20">
                {/* Hero Section */}
                <section className="bg-slate-900 text-white py-20 px-4 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-20">
                        <Image 
                            src="https://images.unsplash.com/photo-1523050335392-93851179ae22?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwzfHxlZHVjYXRpb258ZW58MHx8fHwxNzYzMjU0MjUyfDA&ixlib=rb-4.1.0&q=80&w=1080"
                            alt="Educação"
                            fill
                            className="object-cover"
                        />
                    </div>
                    <div className="container mx-auto relative z-10 text-center">
                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 py-1 px-4 font-black uppercase tracking-widest text-[10px] mb-6">
                            Ensino & Discipulado
                        </Badge>
                        <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-white italic mb-4">
                            Trilha de <span className="text-primary">Crescimento</span>
                        </h1>
                        <p className="text-lg text-slate-300 max-w-2xl mx-auto">
                            Escolha o seu próximo passo na jornada espiritual. Da integração à membresia à formação de liderança.
                        </p>
                    </div>
                </section>

                {/* Courses Tabs */}
                <section className="container mx-auto px-4 -mt-10 relative z-20">
                    <Tabs defaultValue="lumine" className="w-full">
                        <div className="flex justify-center mb-8">
                            <TabsList className="bg-white p-1 rounded-2xl shadow-xl border h-auto flex flex-wrap justify-center">
                                <TabsTrigger value="lumine" className="rounded-xl px-8 py-3 data-[state=active]:bg-primary data-[state=active]:text-white font-bold">Lumine (EBD)</TabsTrigger>
                                <TabsTrigger value="wave" className="rounded-xl px-8 py-3 data-[state=active]:bg-primary data-[state=active]:text-white font-bold">Wave (Música)</TabsTrigger>
                                <TabsTrigger value="dis" className="rounded-xl px-8 py-3 data-[state=active]:bg-primary data-[state=active]:text-white font-bold">DIS (Inclusão)</TabsTrigger>
                                <TabsTrigger value="outros" className="rounded-xl px-8 py-3 data-[state=active]:bg-primary data-[state=active]:text-white font-bold">Eventos & GCs</TabsTrigger>
                            </TabsList>
                        </div>

                        {/* Lumine Content */}
                        <TabsContent value="lumine" className="space-y-12 animate-in fade-in-50 duration-500">
                            <div className="max-w-4xl mx-auto space-y-6">
                                {groupedCourses.lumine.map((course, idx) => {
                                    const hasClasses = classes.some(cls => cls.courseId === course.id);
                                    return (
                                        <Card key={course.id} className="overflow-hidden border-none shadow-lg hover:shadow-2xl transition-all group">
                                            <CardContent className="p-0 flex flex-col md:flex-row">
                                                <div className="w-full md:w-16 bg-primary flex items-center justify-center text-white font-black text-2xl group-hover:scale-110 transition-transform">
                                                    {idx + 1}
                                                </div>
                                                <div className="p-6 flex-1 space-y-4">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <h3 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900 group-hover:text-primary transition-colors">{course.name}</h3>
                                                            <Badge variant="secondary" className="mt-1 text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary border-none">Módulo de Discipulado</Badge>
                                                        </div>
                                                        {!hasClasses && <Badge variant="destructive" className="animate-pulse">VAGAS ENCERRADAS</Badge>}
                                                    </div>
                                                    <p className="text-muted-foreground text-sm leading-relaxed">{course.description || 'Este módulo faz parte da trilha fundamental da IBM.'}</p>
                                                    <div className="flex flex-wrap gap-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                                        <div className="flex items-center gap-1.5"><Calendar className="size-3.5 text-primary"/> Domingos</div>
                                                        <div className="flex items-center gap-1.5"><Clock className="size-3.5 text-primary"/> 09h00 às 10h15</div>
                                                        <div className="flex items-center gap-1.5"><MapPin className="size-3.5 text-primary"/> Templo Sede</div>
                                                    </div>
                                                    <div className="pt-4 flex justify-end border-t">
                                                        <Button 
                                                            disabled={!hasClasses}
                                                            onClick={() => handleEnroll(course.id)}
                                                            className="rounded-full px-8 font-black uppercase text-xs h-11 shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                                                        >
                                                            {hasClasses ? 'Inscrever-me Gratuitamente' : 'Aguardando Nova Turma'}
                                                            <ArrowRight className="ml-2 size-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        </TabsContent>

                        {/* Other Contents simplified for space */}
                        <TabsContent value="wave" className="max-w-4xl mx-auto animate-in slide-in-from-left-4">
                            <Card className="bg-white/50 border-dashed border-2 p-12 text-center">
                                <Waves className="size-16 mx-auto mb-4 text-primary opacity-20" />
                                <h3 className="text-2xl font-black mb-2">Escola de Música Wave</h3>
                                <p className="text-muted-foreground mb-6">As inscrições para instrumentos e canto estão abertas! Escolha seu plano e comece hoje.</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {groupedCourses.wave.map(c => (
                                        <Button key={c.id} variant="outline" className="h-16 font-bold" onClick={() => handleEnroll(c.id)}>
                                            {c.name}
                                        </Button>
                                    ))}
                                </div>
                            </Card>
                        </TabsContent>

                        <TabsContent value="dis" className="max-w-4xl mx-auto animate-in slide-in-from-left-4">
                            <Card className="bg-white/50 border-dashed border-2 p-12 text-center">
                                <HandHelping className="size-16 mx-auto mb-4 text-primary opacity-20" />
                                <h3 className="text-2xl font-black mb-2">Escola DIS (Libras)</h3>
                                <p className="text-muted-foreground mb-6">Inclusão que transforma. Inscreva-se para aprender a língua brasileira de sinais.</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {groupedCourses.dis.map(c => (
                                        <Button key={c.id} variant="outline" className="h-16 font-bold" onClick={() => handleEnroll(c.id)}>
                                            {c.name}
                                        </Button>
                                    ))}
                                </div>
                            </Card>
                        </TabsContent>

                        <TabsContent value="outros" className="max-w-4xl mx-auto animate-in slide-in-from-left-4 text-center py-20">
                            <Target className="size-16 mx-auto mb-4 text-primary opacity-20" />
                            <h3 className="text-2xl font-black mb-2">Outros Eventos e GCs</h3>
                            <p className="text-muted-foreground">Novas turmas e workshops serão anunciados em breve.</p>
                        </TabsContent>
                    </Tabs>
                </section>
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
