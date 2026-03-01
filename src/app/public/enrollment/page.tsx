
'use client';

import React, { useState, useMemo } from 'react';
import { VolunteeringProvider, useVolunteering } from '@/contexts/volunteering-context';
import { PublicNavbar } from '@/components/public/navbar';
import { PublicFooter } from '@/components/public/footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, BookOpen, GraduationCap, School, Layers, ChevronRight, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

function EnrollmentContent() {
  const { courses, classes, isLoading } = useVolunteering();
  const [mainTab, setMainTab] = useState('trilhos');
  const [trilhoSubTab, setTrilhoSubTab] = useState('discipulado');

  const filteredCourses = useMemo(() => {
    if (!courses) return [];

    if (mainTab === 'trilhos') {
      return courses.filter(c => 
        c.type === 'trilho' && c.ebdTrack === (trilhoSubTab === 'biblico' ? 'biblico' : trilhoSubTab === 'teologico' ? 'teologico' : 'discipulado')
      );
    }

    if (mainTab === 'escolas') {
      return courses.filter(c => 
        c.ministryName?.toLowerCase().includes('escola') || 
        c.ministryName?.toLowerCase() === 'wave' || 
        c.ministryName?.toLowerCase() === 'dis'
      );
    }

    if (mainTab === 'outros') {
      // Cursos que não se encaixam em trilhos nem em escolas conhecidas
      return courses.filter(c => {
        const isTrilho = c.type === 'trilho';
        const isEscola = c.ministryName?.toLowerCase().includes('escola') || 
                         c.ministryName?.toLowerCase() === 'wave' || 
                         c.ministryName?.toLowerCase() === 'dis';
        return !isTrilho && !isEscola;
      });
    }

    return [];
  }, [courses, mainTab, trilhoSubTab]);

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-black mb-4 tracking-tight">Portal de Inscrições</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Escolha o seu próximo passo de crescimento. Temos trilhas de discipulado, escolas de artes e cursos bíblicos para todas as idades.
        </p>
      </div>

      <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
        <div className="flex justify-center mb-8">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="trilhos">Trilhos</TabsTrigger>
            <TabsTrigger value="escolas">Escolas</TabsTrigger>
            <TabsTrigger value="outros">Outros</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="trilhos" className="space-y-8 animate-in fade-in-50 duration-500">
          <div className="flex justify-center">
            <Tabs value={trilhoSubTab} onValueChange={setTrilhoSubTab} className="w-full max-w-2xl">
              <TabsList className="grid w-full grid-cols-3 bg-muted/50 p-1 rounded-xl">
                <TabsTrigger value="discipulado" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Discipulado</TabsTrigger>
                <TabsTrigger value="biblico" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Bíblico</TabsTrigger>
                <TabsTrigger value="teologico" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Teológico</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.length === 0 ? (
              <div className="col-span-full py-20 text-center border-2 border-dashed rounded-2xl bg-muted/20">
                <Layers className="size-12 mx-auto mb-4 text-muted-foreground opacity-20" />
                <p className="text-muted-foreground">Nenhum curso disponível nesta categoria no momento.</p>
              </div>
            ) : (
              filteredCourses.map(course => (
                <CourseCard key={course.id} course={course} classes={classes} />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="escolas" className="animate-in fade-in-50 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.length === 0 ? (
              <div className="col-span-full py-20 text-center border-2 border-dashed rounded-2xl bg-muted/20">
                <School className="size-12 mx-auto mb-4 text-muted-foreground opacity-20" />
                <p className="text-muted-foreground">Nenhuma escola com inscrições abertas no momento.</p>
              </div>
            ) : (
              filteredCourses.map(course => (
                <CourseCard key={course.id} course={course} classes={classes} />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="outros" className="animate-in fade-in-50 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.length === 0 ? (
              <div className="col-span-full py-20 text-center border-2 border-dashed rounded-2xl bg-muted/20">
                <BookOpen className="size-12 mx-auto mb-4 text-muted-foreground opacity-20" />
                <p className="text-muted-foreground">Nenhum outro curso disponível no momento.</p>
              </div>
            ) : (
              filteredCourses.map(course => (
                <CourseCard key={course.id} course={course} classes={classes} />
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CourseCard({ course, classes }) {
  const courseClasses = classes.filter(cls => cls.courseId === course.id);
  const hasClasses = courseClasses.length > 0;

  return (
    <Card className={cn(
      "overflow-hidden flex flex-col h-full transition-all border-2",
      hasClasses ? "hover:border-primary/50 hover:shadow-xl" : "opacity-60 grayscale border-dashed"
    )}>
      <CardHeader className="bg-muted/30 pb-4">
        <div className="flex justify-between items-start gap-2">
          <Badge variant="secondary" className="text-[10px] uppercase font-black tracking-widest">{course.ministryName}</Badge>
          {!hasClasses && <Badge variant="destructive" className="text-[10px] font-black">Em Breve</Badge>}
        </div>
        <CardTitle className="text-xl font-bold mt-2">{course.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-6 space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-3">
          {course.description || "Inicie sua jornada de crescimento neste curso fundamental para sua vida espiritual."}
        </p>
        
        {hasClasses ? (
          <div className="space-y-2">
            <p className="text-xs font-bold text-primary uppercase flex items-center gap-1">
              <CheckCircle2 className="size-3" /> Turmas Disponíveis:
            </p>
            <div className="flex flex-wrap gap-1">
              {courseClasses.map(cls => (
                <Badge key={cls.id} variant="outline" className="text-[10px] bg-white">
                  {cls.dayOfWeek || 'Data fixa'}
                </Badge>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-3 bg-muted rounded-lg text-xs text-center text-muted-foreground font-medium">
            Estamos preparando novas turmas para este curso.
          </div>
        )}
      </CardContent>
      <div className="p-6 pt-0 mt-auto">
        <Button 
          className="w-full font-black uppercase text-xs tracking-widest group" 
          disabled={!hasClasses}
          asChild={hasClasses}
        >
          {hasClasses ? (
            <Link href={`/public/enrollment/form?courseId=${course.id}`}>
              Inscrever-se Agora
              <ChevronRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
            </Link>
          ) : (
            <span>Indisponível</span>
          )}
        </Button>
      </div>
    </Card>
  );
}

export default function EnrollmentPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <PublicNavbar />
      <main className="flex-1">
        <VolunteeringProvider>
          <EnrollmentContent />
        </VolunteeringProvider>
      </main>
      <PublicFooter />
    </div>
  );
}
