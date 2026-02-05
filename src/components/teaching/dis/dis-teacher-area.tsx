'use client';

import React, { useMemo } from 'react';
import { useVolunteering } from '@/contexts/volunteering-context';
import { useFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Users, Loader2, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export function DisTeacherArea() {
  const { user } = useFirebase();
  const { classes, courses, isLoading } = useVolunteering();

  // Filtrar turmas onde o usuário logado é o professor
  const myClasses = useMemo(() => {
    if (!user) return [];
    return classes.filter(c => c.teacherId === user.uid);
  }, [classes, user]);

  const courseMap = useMemo(() => new Map(courses.map(c => [c.id, c.name])), [courses]);

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-primary/5">
          <CardHeader className="pb-2">
            <CardDescription>Minhas Turmas Ativas</CardDescription>
            <CardTitle className="text-2xl">{myClasses.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="size-5 text-primary" />
            Minhas Turmas
          </CardTitle>
          <CardDescription>
            Gerencie o conteúdo ministrado e a presença dos seus alunos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Turma</TableHead>
                  <TableHead>Curso</TableHead>
                  <TableHead className="text-center">Alunos</TableHead>
                  <TableHead>Horário</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myClasses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                      Você não possui turmas atribuídas no momento.
                    </TableCell>
                  </TableRow>
                ) : (
                  myClasses.map(cls => (
                    <TableRow key={cls.id} className="group">
                      <TableCell className="font-bold">{cls.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{courseMap.get(cls.courseId) || 'Curso DIS'}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Users className="size-3 text-muted-foreground" />
                          {cls.students?.length || 0}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <span className="font-medium">{cls.dayOfWeek}</span>
                        <br />
                        <span className="text-muted-foreground">{cls.startTime} - {cls.endTime}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" asChild>
                          <Link href={`/dashboard/teaching/log/${cls.id}`}>
                            Lançar Aula
                            <ChevronRight className="ml-1 size-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
