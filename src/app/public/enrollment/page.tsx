'use client';

import React, { useMemo, useState } from 'react';
import { VolunteeringProvider, useVolunteering } from '@/contexts/volunteering-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronRight, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PublicNavbar } from '@/components/public/navbar';
import { PublicFooter } from '@/components/public/footer';

function EnrollmentContent() {
  const { courses, classes, isLoading } = useVolunteering();
  const [activeMainTab, setActiveMainTab] = useState('trilhos');
  const [activeTrilhoTab, setActiveTrilhoTab] = useState('discipulado');

  const filteredCourses = useMemo(() => {
    if (!courses) return [];
    
    return courses.filter(course => {
      const ministry = course.ministryName?.toLowerCase() || '';
      const isLumine = ministry.includes('lumine') || ministry.includes('ebd');
      const isEscola = ministry.includes('wave') || ministry.includes('dis');

      if (activeMainTab === 'trilhos') {
        if (!isLumine) return false;
        if (activeTrilhoTab === 'discipulado') return course.ebdTrack === 'discipulado';
        if (activeTrilhoTab === 'biblico') return course.ebdTrack === 'biblico';
        if (activeTrilhoTab === 'teologico') return course.ebdTrack === 'teologico';
        return false;
      }

      if (activeMainTab === 'escolas') return isEscola;
      if (activeMainTab === 'outros') return !isLumine && !isEscola;

      return true;
    });
  }, [courses, activeMainTab, activeTrilhoTab]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl py-12 px-4 space-y-12">
      <div className="text-center space-y-4">
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-900 uppercase italic">
          Portal de Inscrições
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Inicie sua jornada de crescimento. Escolha entre nossos cursos bíblicos, escolas de música e muito mais.
        </p>
      </div>

      <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="w-full">
        <div className="flex justify-center mb-12">
          <TabsList className="bg-muted/50 p-1 h-14 w-full max-w-xl">
            <TabsTrigger value="trilhos" className="flex-1 font-bold uppercase text-xs tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-md">Trilhos</TabsTrigger>
            <TabsTrigger value="escolas" className="flex-1 font-bold uppercase text-xs tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-md">Escolas</TabsTrigger>
            <TabsTrigger value="outros" className="flex-1 font-bold uppercase text-xs tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-md">Outros</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="trilhos" className="mt-0 space-y-8 animate-in fade-in-50 duration-500">
          <Tabs value={activeTrilhoTab} onValueChange={setActiveTrilhoTab} className="w-full">
            <div className="flex justify-center mb-8">
              <TabsList className="bg-transparent border-b h-10 w-full max-w-lg justify-around rounded-none">
                <TabsTrigger value="discipulado" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-6 font-bold text-[11px] uppercase tracking-tighter transition-all">Discipulado</TabsTrigger>
                <TabsTrigger value="biblico" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-6 font-bold text-[11px] uppercase tracking-tighter transition-all">Bíblico</TabsTrigger>
                <TabsTrigger value="teologico" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-6 font-bold text-[11px] uppercase tracking-tighter transition-all">Teológico</TabsTrigger>
              </TabsList>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredCourses.map(course => (
                <CourseCard 
                  key={course.id} 
                  course={course} 
                  courseClasses={classes.filter(c => c.courseId === course.id)} 
                />
              ))}
            </div>
          </Tabs>
        </TabsContent>

        <TabsContent value="escolas" className="mt-0 animate-in fade-in-50 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredCourses.map(course => (
              <CourseCard 
                key={course.id} 
                course={course} 
                courseClasses={classes.filter(c => c.courseId === course.id)} 
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="outros" className="mt-0 animate-in fade-in-50 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredCourses.map(course => (
              <CourseCard 
                key={course.id} 
                course={course} 
                courseClasses={classes.filter(c => c.courseId === course.id)} 
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CourseCard({ course, courseClasses }: { course: any, courseClasses: any[] }) {
  const schedules = useMemo(() => {
    if (courseClasses.length === 0) return [];
    
    const uniqueSchedules = new Set<string>();
    courseClasses.forEach(cls => {
      if (cls.dayOfWeek && cls.startTime) {
        uniqueSchedules.add(`${cls.dayOfWeek} às ${cls.startTime}`);
      }
    });
    
    return Array.from(uniqueSchedules);
  }, [courseClasses]);

  const hasClasses = schedules.length > 0;

  return (
    <Card className={cn(
      "flex flex-col h-full transition-all duration-500 border-2 shadow-sm rounded-[1.5rem] overflow-hidden",
      !hasClasses ? "grayscale opacity-60 bg-slate-50 border-slate-200" : "hover:shadow-2xl hover:border-primary/20 hover:scale-[1.02]"
    )}>
      <CardHeader className="p-6 pb-4">
        <div className="mb-3">
          <Badge variant="secondary" className="bg-primary/5 text-primary text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 border border-primary/10">
            {course.ministryName || 'LUMINE'}
          </Badge>
        </div>
        <CardTitle className="text-2xl font-black text-slate-900 tracking-tight">{course.name}</CardTitle>
      </CardHeader>
      
      <CardContent className="p-6 pt-0 flex-1 space-y-6">
        <div className="bg-muted/30 p-4 rounded-xl min-h-[3.5rem] flex flex-col justify-center border border-border/50">
          {hasClasses ? (
            <div className="space-y-1">
              {schedules.map((sched, idx) => (
                <div key={idx} className="flex items-center gap-2.5 text-sm font-bold text-slate-700">
                  <Clock className="size-4 text-primary" />
                  <span>{sched}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs font-black text-destructive uppercase tracking-widest">
              <span className="size-2 rounded-full bg-destructive animate-pulse" />
              Sem turmas no momento
            </div>
          )}
        </div>
        
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">
          {course.description || "Inicie sua jornada de crescimento e maturidade através deste curso oficial da nossa trilha de discipulado."}
        </p>
      </CardContent>

      <CardFooter className="p-6 pt-0">
        <Button 
          className="w-full h-14 font-black uppercase tracking-widest text-xs group rounded-xl shadow-lg"
          disabled={!hasClasses}
        >
          Inscrever-se Agora
          <ChevronRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function EnrollmentPage() {
  return (
    <VolunteeringProvider>
      <div className="flex flex-col min-h-screen bg-slate-50">
        <PublicNavbar />
        <main className="flex-1">
          <EnrollmentContent />
        </main>
        <PublicFooter />
      </div>
    </VolunteeringProvider>
  );
}