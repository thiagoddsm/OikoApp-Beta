
'use client';

import React, { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useVolunteering } from '@/contexts/volunteering-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, School, Waves, GraduationCap, ArrowRight, CheckCircle2, Music, HeartHandshake } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export function EnrollmentPortalContent() {
    const { courses, classes } = useVolunteering();
    const searchParams = useSearchParams();
    const defaultTab = searchParams.get('tab') || 'lumine';

    const lumineCourses = useMemo(() => 
        courses.filter(c => c.ministryName.toLowerCase().includes('lumine') || c.ministryName.toLowerCase().includes('ebd'))
        .sort((a, b) => {
            const getWeight = (name: string) => {
                const n = name.toLowerCase();
                if (n.includes('pertencer')) return 1;
                if (n.includes('crescer')) return 2;
                if (n.includes('liderar')) return 3;
                if (n.includes('cuidar')) return 4;
                if (n.includes('apoiar')) return 5;
                if (n.includes('enviar')) return 6;
                return 99;
            };
            return getWeight(a.name) - getWeight(b.name);
        })
    , [courses]);

    const schoolCourses = useMemo(() => 
        courses.filter(c => c.ministryName.toLowerCase().includes('wave') || c.ministryName.toLowerCase().includes('dis'))
    , [courses]);

    const otherCourses = useMemo(() => 
        courses.filter(c => 
            !c.ministryName.toLowerCase().includes('lumine') && 
            !c.ministryName.toLowerCase().includes('ebd') &&
            !c.ministryName.toLowerCase().includes('wave') &&
            !c.ministryName.toLowerCase().includes('dis')
        )
    , [courses]);

    const renderCourseCard = (course: any) => {
        const hasClasses = classes.some(cls => cls.courseId === course.id);
        const imageUrl = `https://picsum.photos/seed/${course.id}/600/400`;

        return (
            <Card key={course.id} className="overflow-hidden group hover:shadow-xl transition-all duration-300 border-none shadow-md bg-card">
                <div className="relative aspect-video overflow-hidden">
                    <Image 
                        src={imageUrl} 
                        alt={course.name} 
                        fill 
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-3 flex flex-col gap-1">
                        <Badge className="w-fit bg-primary text-white border-none text-[10px] font-black uppercase">
                            {course.ministryName}
                        </Badge>
                    </div>
                </div>
                <CardHeader className="p-5 pb-2">
                    <CardTitle className="text-xl font-bold line-clamp-1">{course.name}</CardTitle>
                    <CardDescription className="text-sm line-clamp-2 min-h-[40px]">
                        {course.description || "Inicie sua jornada de aprendizado e crescimento ministerial."}
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-5 pt-0">
                    <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center gap-1.5">
                            {hasClasses ? (
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                                    <CheckCircle2 className="size-3 mr-1" /> Inscrições Abertas
                                </Badge>
                            ) : (
                                <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 text-[10px] font-bold">
                                    Em breve
                                </Badge>
                            )}
                        </div>
                        <Button size="sm" asChild disabled={!hasClasses} className="font-bold shadow-lg shadow-primary/20">
                            <Link href={`/public/enrollment/form?courseId=${course.id}`}>
                                Participar <ArrowRight className="ml-2 size-4" />
                            </Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="container mx-auto px-4 py-12 md:py-20">
            <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 py-1 px-4 font-black uppercase tracking-widest text-[10px]">
                    Organismo IBM
                </Badge>
                <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-900 italic">
                    Trilha de <span className="text-primary">Crescimento</span>
                </h1>
                <p className="text-lg text-muted-foreground">
                    A organização serve ao organismo. Escolha o seu próximo passo na caminhada com Cristo e faça parte do que Deus está fazendo em nossa família.
                </p>
            </div>

            <Tabs defaultValue={defaultTab} className="w-full">
                <TabsList className="grid w-full grid-cols-1 md:grid-cols-3 max-w-2xl mx-auto mb-12 bg-muted/50 p-1 rounded-xl h-auto">
                    <TabsTrigger value="lumine" className="rounded-lg py-3 font-bold gap-2">
                        <GraduationCap className="size-4" /> Trilha Lumine
                    </TabsTrigger>
                    <TabsTrigger value="schools" className="rounded-lg py-3 font-bold gap-2">
                        <School className="size-4" /> Escolas (Wave/DIS)
                    </TabsTrigger>
                    <TabsTrigger value="others" className="rounded-lg py-3 font-bold gap-2">
                        <BookOpen className="size-4" /> Capacitação
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="lumine" className="animate-in fade-in duration-500 slide-in-from-bottom-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {lumineCourses.map(renderCourseCard)}
                        {lumineCourses.length === 0 && (
                            <div className="col-span-full py-20 text-center border-2 border-dashed rounded-2xl bg-muted/20">
                                <GraduationCap className="size-12 mx-auto mb-4 text-muted-foreground opacity-20" />
                                <p className="text-muted-foreground font-medium">Nenhum curso da trilha Lumine disponível no momento.</p>
                            </div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="schools" className="animate-in fade-in duration-500 slide-in-from-bottom-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {schoolCourses.map(renderCourseCard)}
                        {schoolCourses.length === 0 && (
                            <div className="col-span-full py-20 text-center border-2 border-dashed rounded-2xl bg-muted/20">
                                <Music className="size-12 mx-auto mb-4 text-muted-foreground opacity-20" />
                                <p className="text-muted-foreground font-medium">Nenhum curso das Escolas IBM disponível no momento.</p>
                            </div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="others" className="animate-in fade-in duration-500 slide-in-from-bottom-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {otherCourses.map(renderCourseCard)}
                        {otherCourses.length === 0 && (
                            <div className="col-span-full py-20 text-center border-2 border-dashed rounded-2xl bg-muted/20">
                                <BookOpen className="size-12 mx-auto mb-4 text-muted-foreground opacity-20" />
                                <p className="text-muted-foreground font-medium">Nenhum outro curso disponível no momento.</p>
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
