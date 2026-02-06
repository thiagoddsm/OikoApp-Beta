
'use client';
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Users, Loader2, ChevronRight, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useFirebase } from '@/firebase';
import { useVolunteering } from '@/contexts/volunteering-context';

export function TeacherDashboard() {
  const { user } = useFirebase();
  const { classes, courses, isLoading } = useVolunteering();

  // Filtra todas as turmas do professor logado (independente do curso/ministério)
  const teacherClasses = useMemo(() => {
    if (!user || !classes) return [];
    return classes.filter(cls => cls.teacherId === user.uid);
  }, [user, classes]);

  const courseMap = useMemo(() => new Map(courses.map(c => [c.id, c])), [courses]);

  const totalStudents = useMemo(() => {
    const studentSet = new Set<string>();
    teacherClasses.forEach(cls => {
      cls.students?.forEach(studentId => studentSet.add(studentId));
    });
    return studentSet.size;
  }, [teacherClasses]);

  if (isLoading) {
      return (
          <div className="flex h-64 w-full items-center justify-center">
              <Loader2 className="size-8 animate-spin text-primary" />
          </div>
      );
  }

  return (
    <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="bg-primary/5 border-primary/20">
                <CardHeader className="pb-2">
                    <CardDescription>Turmas sob minha gestão</CardDescription>
                    <CardTitle className="text-3xl flex items-center gap-2">
                        <BookOpen className="size-6 text-primary" />
                        {teacherClasses.length}
                    </CardTitle>
                </CardHeader>
            </Card>
            <Card className="bg-emerald-50 border-emerald-200">
                <CardHeader className="pb-2">
                    <CardDescription>Total de Alunos</CardDescription>
                    <CardTitle className="text-3xl flex items-center gap-2 text-emerald-700">
                        <Users className="size-6" />
                        {totalStudents}
                    </CardTitle>
                </CardHeader>
            </Card>
        </div>
        
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="size-5 text-primary"/> 
                    Minhas Turmas Ativas
                </CardTitle>
                <CardDescription>Gerencie o conteúdo e a frequência de seus alunos em tempo real.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Turma</TableHead>
                                <TableHead>Curso / Ministério</TableHead>
                                <TableHead className="text-center">Alunos</TableHead>
                                <TableHead>Horário</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {teacherClasses.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-32 text-muted-foreground">
                                        Você não possui turmas atribuídas no momento.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                teacherClasses.map(cls => {
                                    const course = courseMap.get(cls.courseId);
                                    return (
                                        <TableRow key={cls.id} className="group">
                                            <TableCell className="font-bold">{cls.name}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium">{course?.name || 'Curso não encontrado'}</span>
                                                    <Badge variant="outline" className="w-fit text-[10px] h-4 mt-1 uppercase">
                                                        {course?.ministryName || 'Ensino'}
                                                    </Badge>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="secondary">{cls.students?.length || 0}</Badge>
                                            </TableCell>
                                            <TableCell className="text-xs">
                                                <span className="font-semibold">{cls.dayOfWeek || 'Dia não definido'}</span>
                                                <br />
                                                <span className="text-muted-foreground">{cls.startTime} às {cls.endTime}</span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm" asChild>
                                                    <Link href={`/dashboard/teaching/log/${cls.id}`}>
                                                        Diário de Classe
                                                        <ChevronRight className="ml-1 size-4" />
                                                    </Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
