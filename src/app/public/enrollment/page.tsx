
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import { PublicNavbar } from '@/components/public/navbar';
import { PublicFooter } from '@/components/public/footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { 
    BookOpen, 
    Waves, 
    HandHelping, 
    School, 
    Lightbulb, 
    ChevronRight, 
    CheckCircle2, 
    Loader2, 
    Clock, 
    Info, 
    Calendar,
    Users,
    ArrowRight
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { addEnrollmentRequest } from './actions';
import { cn } from '@/lib/utils';

type Course = {
  id: string;
  name: string;
  description: string;
  ministryName: string;
};

type Class = {
  id: string;
  courseId: string;
  name: string;
  dayOfWeek?: string;
  startTime?: string;
};

const lumineOrder = ["pertencer", "crescer", "liderar", "cuidar", "apoiar", "enviar"];

const getLumineWeight = (name: string) => {
    const lower = name.toLowerCase();
    const index = lumineOrder.findIndex(item => lower.includes(item));
    return index === -1 ? 99 : index;
};

export default function PublicEnrollmentPage() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const initialCourseId = searchParams.get('courseId');

    const [activeCategory, setActiveCategory] = useState('lumine');
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Data fetching
    const coursesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'courses')) : null, [firestore]);
    const { data: allCourses, isLoading: isLoadingCourses } = useCollection<Course>(coursesQuery);

    const classesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'classes')) : null, [firestore]);
    const { data: allClasses, isLoading: isLoadingClasses } = useCollection<Class>(classesQuery);

    const groupedCourses = useMemo(() => {
        if (!allCourses) return { lumine: [], wave: [], dis: [], other: [] };
        
        const groups: any = { lumine: [], wave: [], dis: [], other: [] };
        
        allCourses.forEach(c => {
            const min = c.ministryName?.toLowerCase() || '';
            if (min.includes('lumine') || min.includes('ebd')) groups.lumine.push(c);
            else if (min.includes('wave')) groups.wave.push(c);
            else if (min === 'dis') groups.dis.push(c);
            else groups.other.push(c);
        });

        // Sort Lumine
        groups.lumine.sort((a: Course, b: Course) => getLumineWeight(a.name) - getLumineWeight(b.name));
        
        return groups;
    }, [allCourses]);

    useEffect(() => {
        if (initialCourseId && allCourses) {
            const course = allCourses.find(c => c.id === initialCourseId);
            if (course) {
                const min = course.ministryName?.toLowerCase() || '';
                if (min.includes('lumine')) setActiveCategory('lumine');
                else if (min.includes('wave')) setActiveCategory('wave');
                else if (min === 'dis') setActiveCategory('dis');
                else setActiveCategory('other');
                
                setSelectedCourse(course);
            }
        }
    }, [initialCourseId, allCourses]);

    const handleEnroll = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedCourse) return;
        
        setIsSubmitting(true);
        const formData = new FormData(e.currentTarget);
        
        try {
            const result = await addEnrollmentRequest({
                name: formData.get('name') as string,
                email: formData.get('email') as string,
                phone: formData.get('phone') as string,
                courseId: selectedCourse.id,
            });

            if (result.success) {
                toast({ title: "Solicitação Enviada!", description: "Em breve um líder entrará em contato para confirmar sua vaga." });
                setSelectedCourse(null);
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Erro ao enviar", description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoadingCourses) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

    const renderCourseCard = (course: Course) => {
        const hasClasses = allClasses?.some(cls => cls.courseId === course.id);
        const courseClasses = allClasses?.filter(cls => cls.courseId === course.id) || [];

        return (
            <Card key={course.id} className={cn("group transition-all hover:shadow-md", !hasClasses && "opacity-60")}>
                <CardHeader>
                    <div className="flex justify-between items-start mb-2">
                        <Badge variant="secondary" className="text-[10px] uppercase font-black">{course.ministryName}</Badge>
                        {hasClasses ? (
                            <Badge className="bg-emerald-100 text-emerald-700 border-none text-[10px] font-black uppercase h-5">Vagas Abertas</Badge>
                        ) : (
                            <Badge variant="outline" className="text-[10px] font-black uppercase h-5">Em Breve</Badge>
                        )}
                    </div>
                    <CardTitle className="text-xl font-black italic tracking-tighter uppercase text-slate-900">{course.name}</CardTitle>
                    <CardDescription className="line-clamp-2 text-xs min-h-[2.5rem]">{course.description || 'Uma jornada de crescimento e aprendizado na IBM.'}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {hasClasses ? (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase">
                                <Clock className="size-3" /> Horários Disponíveis:
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {courseClasses.map(cls => (
                                    <Badge key={cls.id} variant="outline" className="bg-slate-50 text-[9px] font-medium h-5">
                                        {cls.dayOfWeek} às {cls.startTime}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg text-xs text-muted-foreground italic border border-dashed">
                            <Info className="size-3" /> Nenhuma turma com inscrições abertas agora.
                        </div>
                    )}
                </CardContent>
                <CardFooter>
                    <Button 
                        className="w-full font-black uppercase text-xs h-11" 
                        disabled={!hasClasses}
                        onClick={() => setSelectedCourse(course)}
                    >
                        {hasClasses ? 'Quero me inscrever' : 'Aguardar Próxima Turma'}
                        <ArrowRight className="ml-2 size-4" />
                    </Button>
                </CardFooter>
            </Card>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <PublicNavbar />
            
            <main className="flex-1 container mx-auto px-4 py-12">
                <div className="max-w-4xl mx-auto text-center mb-12 space-y-4">
                    <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter text-slate-900 uppercase">
                        Trilha de <span className="text-primary">Crescimento</span>
                    </h1>
                    <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                        Escolha um dos nossos cursos e comece hoje mesmo sua jornada ministerial na Igreja Batista da Manhã.
                    </p>
                </div>

                <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
                    <div className="flex justify-center mb-10">
                        <TabsList className="bg-white border shadow-sm p-1 h-auto rounded-full">
                            <TabsTrigger value="lumine" className="rounded-full px-6 py-2 text-xs font-black uppercase data-[state=active]:bg-primary data-[state=active]:text-white">
                                <Lightbulb className="mr-2 size-4" /> Lumine (Discipulado)
                            </TabsTrigger>
                            <TabsTrigger value="wave" className="rounded-full px-6 py-2 text-xs font-black uppercase data-[state=active]:bg-primary data-[state=active]:text-white">
                                <Waves className="mr-2 size-4" /> Wave (Música)
                            </TabsTrigger>
                            <TabsTrigger value="dis" className="rounded-full px-6 py-2 text-xs font-black uppercase data-[state=active]:bg-primary data-[state=active]:text-white">
                                <HandHelping className="mr-2 size-4" /> DIS (Inclusão)
                            </TabsTrigger>
                            <TabsTrigger value="other" className="rounded-full px-6 py-2 text-xs font-black uppercase data-[state=active]:bg-primary data-[state=active]:text-white">
                                <BookOpen className="mr-2 size-4" /> Outros
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="lumine" className="animate-in fade-in-50 duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {groupedCourses.lumine.map(renderCourseCard)}
                        </div>
                    </TabsContent>

                    <TabsContent value="wave" className="animate-in fade-in-50 duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {groupedCourses.wave.map(renderCourseCard)}
                        </div>
                    </TabsContent>

                    <TabsContent value="dis" className="animate-in fade-in-50 duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {groupedCourses.dis.map(renderCourseCard)}
                        </div>
                    </TabsContent>

                    <TabsContent value="other" className="animate-in fade-in-50 duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {groupedCourses.other.map(renderCourseCard)}
                        </div>
                    </TabsContent>
                </Tabs>
            </main>

            <Dialog open={!!selectedCourse} onOpenChange={(o) => !o && setSelectedCourse(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black italic uppercase tracking-tighter">Inscrição: {selectedCourse?.name}</DialogTitle>
                        <DialogDescription>Preencha seus dados para solicitar sua vaga neste curso.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleEnroll} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nome Completo</Label>
                            <Input id="name" name="name" placeholder="Como devemos te chamar?" required />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="phone">WhatsApp</Label>
                                <Input id="phone" name="phone" placeholder="(21) 9..." required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">E-mail</Label>
                                <Input id="email" name="email" type="email" placeholder="seu@email.com" />
                            </div>
                        </div>
                        <div className="pt-4">
                            <Button type="submit" className="w-full h-12 font-black uppercase shadow-lg shadow-primary/20" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2" />}
                                Finalizar Solicitação
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            <PublicFooter />
        </div>
    );
}
