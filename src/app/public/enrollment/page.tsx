'use client';

import React, { useMemo, useState } from 'react';
import { useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
    Loader2, BookOpen, Waves, HandHelping, GraduationCap, 
    ArrowRight, MapPin, Calendar, Clock, CheckCircle2, AlertCircle 
} from 'lucide-react';
import { PublicNavbar } from '@/components/public/navbar';
import { PublicFooter } from '@/components/public/footer';
import { EnrollmentDialog } from '@/components/teaching/enrollment-dialog';
import { VolunteeringProvider, useVolunteering } from '@/contexts/volunteering-context';
import { cn } from '@/lib/utils';

// Ordem estratégica Lumine
const lumineOrder = ['pertencer', 'crescer', 'liderar', 'cuidar', 'apoiar', 'enviar'];

function EnrollmentPageContent() {
    const { courses, classes, isLoading } = useVolunteering();
    const [isEnrollmentOpen, setEnrollmentOpen] = useState(false);
    const [selectedCourseId, setSelectedCourseId] = useState<string | undefined>(undefined);

    const groupedCourses = useMemo(() => {
        if (!courses) return { lumine: [], wave: [], dis: [], other: [] };
        
        const groups: any = { lumine: [], wave: [], dis: [], other: [] };
        
        courses.forEach(c => {
            const m = c.ministryName?.toLowerCase() || '';
            const n = c.name?.toLowerCase() || '';
            
            if (m.includes('lumine') || m.includes('ebd')) groups.lumine.push(c);
            else if (m.includes('wave')) groups.wave.push(c);
            else if (m === 'dis' || n.includes('libras')) groups.dis.push(c);
            else groups.other.push(c);
        });

        // Ordenação Lumine
        groups.lumine.sort((a: any, b: any) => {
            const idxA = lumineOrder.findIndex(name => a.name.toLowerCase().includes(name));
            const idxB = lumineOrder.findIndex(name => b.name.toLowerCase().includes(name));
            return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
        });

        return groups;
    }, [courses]);

    const handleEnroll = (courseId: string) => {
        setSelectedCourseId(courseId);
        setEnrollmentOpen(true);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="animate-spin size-10 text-primary" />
            </div>
        );
    }

    const CourseCard = ({ course }: { course: any }) => {
        const hasClasses = classes.some(cls => cls.courseId === course.id);
        
        return (
            <Card className={cn(
                "group overflow-hidden border-2 transition-all hover:shadow-xl",
                hasClasses ? "hover:border-primary/50" : "opacity-80 grayscale-[0.5]"
            )}>
                <CardHeader className="bg-muted/30 pb-4">
                    <div className="flex justify-between items-start">
                        <Badge variant={hasClasses ? "default" : "outline"} className="font-black text-[10px] uppercase">
                            {hasClasses ? "Turmas Abertas" : "Em breve"}
                        </Badge>
                        <BookOpen className="size-5 text-primary opacity-20 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <CardTitle className="text-xl font-black uppercase italic tracking-tighter mt-2 group-hover:text-primary transition-colors">
                        {course.name}
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                    <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed min-h-[60px]">
                        {course.description || "Inicie sua jornada de crescimento neste curso fundamental do nosso organismo."}
                    </p>
                    
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                            <Clock className="size-3.5" /> Todo Domingo às 09h00
                        </div>
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                            <MapPin className="size-3.5" /> Templo Sede / Salas EBD
                        </div>
                    </div>

                    <Button 
                        onClick={() => handleEnroll(course.id)} 
                        className="w-full font-black uppercase text-xs h-11 shadow-lg shadow-primary/10"
                        variant={hasClasses ? "default" : "secondary"}
                    >
                        {hasClasses ? "Quero me inscrever" : "Tenho Interesse"}
                        <ArrowRight className="ml-2 size-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="min-h-screen flex flex-col bg-slate-50">
            <PublicNavbar />
            
            <main className="flex-1 container mx-auto px-4 py-12">
                <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 py-1 px-4 font-black uppercase tracking-widest text-[10px]">
                        Ensino & Discipulado
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-900 italic">
                        Trilha de <span className="text-primary">Crescimento</span>
                    </h1>
                    <p className="text-lg text-muted-foreground">
                        Escolha o seu próximo passo na jornada espiritual. Nossos cursos são pensados para equipar cada membro para o serviço do Reino.
                    </p>
                </div>

                <Tabs defaultValue="lumine" className="w-full">
                    <div className="flex justify-center mb-12">
                        <TabsList className="bg-white border-2 p-1 h-14 rounded-2xl shadow-sm overflow-x-auto no-scrollbar max-w-full">
                            <TabsTrigger value="lumine" className="rounded-xl px-8 font-black uppercase text-xs data-[state=active]:bg-primary data-[state=active]:text-white">
                                <GraduationCap className="mr-2 size-4" /> Lumine (Trilha)
                            </TabsTrigger>
                            <TabsTrigger value="wave" className="rounded-xl px-8 font-black uppercase text-xs data-[state=active]:bg-primary data-[state=active]:text-white">
                                <Waves className="mr-2 size-4" /> Escola Wave
                            </TabsTrigger>
                            <TabsTrigger value="dis" className="rounded-xl px-8 font-black uppercase text-xs data-[state=active]:bg-primary data-[state=active]:text-white">
                                <HandHelping className="mr-2 size-4" /> Libras / DIS
                            </TabsTrigger>
                            <TabsTrigger value="other" className="rounded-xl px-8 font-black uppercase text-xs data-[state=active]:bg-primary data-[state=active]:text-white">
                                Outros
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="lumine" className="animate-in fade-in-50 duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {groupedCourses.lumine.map((c: any) => <CourseCard key={c.id} course={c} />)}
                        </div>
                    </TabsContent>

                    <TabsContent value="wave" className="animate-in fade-in-50 duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {groupedCourses.wave.map((c: any) => <CourseCard key={c.id} course={c} />)}
                        </div>
                    </TabsContent>

                    <TabsContent value="dis" className="animate-in fade-in-50 duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {groupedCourses.dis.map((c: any) => <CourseCard key={c.id} course={c} />)}
                        </div>
                    </TabsContent>

                    <TabsContent value="other" className="animate-in fade-in-50 duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {groupedCourses.other.map((c: any) => <CourseCard key={c.id} course={c} />)}
                        </div>
                    </TabsContent>
                </Tabs>
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