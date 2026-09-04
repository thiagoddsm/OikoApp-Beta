'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GraduationCap, CheckSquare, BookOpen, Clock, Users, ChevronRight, FileText, Calendar } from 'lucide-react';
import Link from 'next/link';
import { useCoursesData } from '@/hooks/useDomainData';
import { useFirebase } from '@/firebase';

export function TeacherPortalView() {
  const { user } = useFirebase();
  const { classes, courses } = useCoursesData();

  const myClasses = useMemo(() => {
    if (!user) return classes;
    // Show classes assigned to current teacher, or all classes if coordinator/admin
    const assigned = classes.filter(c => c.teacherId === user.uid);
    return assigned.length > 0 ? assigned : classes;
  }, [classes, user]);

  const courseMap = useMemo(() => new Map(courses.map(c => [c.id, c.name])), [courses]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <GraduationCap className="size-6 text-indigo-400" />
            <h2 className="text-xl font-bold">Portal Diário do Professor</h2>
          </div>
          <p className="text-xs text-indigo-200">
            Acompanhe suas turmas, lance chamadas no ponto eletrônico e registre o diário de classe.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/dashboard/teaching/diario">
            <Button className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold gap-1 text-xs">
              <CheckSquare className="size-4" /> Central de Diários
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-indigo-800 dark:text-indigo-300 uppercase">Minhas Turmas Ativas</CardTitle>
            <BookOpen className="size-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-indigo-900 dark:text-indigo-100">{myClasses.length}</div>
            <p className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-0.5">Turmas sob sua gestão no ciclo</p>
          </CardContent>
        </Card>

        <Card className="bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase">Aulas Agendadas Hoje</CardTitle>
            <Clock className="size-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-900 dark:text-emerald-100">
              {myClasses.filter(c => c.dayOfWeek === 'Hoje' || true).length}
            </div>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">Ponto eletrônico disponível</p>
          </CardContent>
        </Card>

        <Card className="bg-purple-50/50 dark:bg-purple-950/20 border-purple-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-purple-800 dark:text-purple-300 uppercase">Total de Alunos</CardTitle>
            <Users className="size-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-purple-900 dark:text-purple-100">
              {myClasses.reduce((acc, c) => acc + (c.students?.length || 0), 0)}
            </div>
            <p className="text-[10px] text-purple-600 dark:text-purple-400 mt-0.5">Alunos matriculados ativos</p>
          </CardContent>
        </Card>
      </div>

      {/* Classes Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-bold">Turmas de Ensino Ativas</CardTitle>
          <CardDescription className="text-xs">Selecione a turma para lançar frequência rápida ou registrar o diário de hoje.</CardDescription>
        </CardHeader>

        <CardContent>
          <div className="rounded-xl border overflow-hidden">
            <div className="overflow-x-auto w-full">
<Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-900">
                <TableRow>
                  <TableHead className="text-xs">Turma</TableHead>
                  <TableHead className="text-xs">Curso</TableHead>
                  <TableHead className="text-xs">Horário</TableHead>
                  <TableHead className="text-xs text-center">Inscritos</TableHead>
                  <TableHead className="text-xs text-right">Ação Direta</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {myClasses.map(cls => (
                  <TableRow key={cls.id}>
                    <TableCell className="font-bold text-xs">
                      <Link href={`/dashboard/teaching/classes/${cls.id}`} className="hover:underline text-indigo-600 dark:text-indigo-400">
                        {cls.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">{courseMap.get(cls.courseId) || 'Curso'}</TableCell>
                    <TableCell className="text-xs text-slate-500">{cls.dayOfWeek} às {cls.startTime}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="font-bold">{cls.students?.length || 0}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="default" asChild className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold gap-1">
                          <Link href={`/dashboard/teaching/log/${cls.id}`}>
                            <CheckSquare className="size-3.5" /> Lançar Frequência
                          </Link>
                        </Button>
                        <Button size="sm" variant="outline" asChild className="text-xs font-bold">
                          <Link href={`/dashboard/teaching/classes/${cls.id}`}>
                            Diário <ChevronRight className="size-3.5 ml-0.5" />
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {myClasses.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-xs text-muted-foreground italic">
                      Nenhuma turma vinculada a este professor no momento.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
