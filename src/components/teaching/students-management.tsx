'use client';
import React, { useMemo, useState } from 'react';
import { useVolunteering, type User, type Class, type Course } from '@/contexts/volunteering-context';
import { Loader2, User as UserIcon, Search, Edit, PlusCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import Link from 'next/link';
import { EnrollmentDialog } from './enrollment-dialog';

export function StudentsManagement() {
  const { users, classes, courses, isLoading } = useVolunteering();
  const [searchTerm, setSearchTerm] = useState('');
  const [isEnrollmentOpen, setEnrollmentOpen] = useState(false);

  const enrollments = useMemo(() => {
    if (!users || !classes || !courses) return [];

    const userMap = new Map(users.map(u => [u.id, u]));
    const courseMap = new Map(courses.map(c => [c.id, c]));

    const allEnrollments: { id: string; user: User; class: Class; course: Course }[] = [];

    classes.forEach(cls => {
        const course = courseMap.get(cls.courseId);
        if (course) {
            cls.students?.forEach(studentId => {
                const user = userMap.get(studentId);
                if (user) {
                    allEnrollments.push({
                        id: `${user.id}-${cls.id}`, // unique key for the row
                        user,
                        class: cls,
                        course
                    });
                }
            });
        }
    });

    return allEnrollments.sort((a, b) => a.user.name.localeCompare(b.user.name));
  }, [users, classes, courses]);


  const filteredEnrollments = useMemo(() => {
      if (!enrollments) return [];
      return enrollments.filter(enrollment => 
        enrollment.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (enrollment.user.email && enrollment.user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        enrollment.course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        enrollment.class.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [enrollments, searchTerm]);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
      <>
      <Card>
          <CardHeader className="flex flex-row items-center justify-between">
              <div>
                  <CardTitle>Alunos Matriculados</CardTitle>
                  <CardDescription>
                      Visualize e gerencie todos os alunos matriculados nos cursos da igreja.
                  </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                 <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                          placeholder="Buscar por aluno, curso, turma..."
                          className="pl-8"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                      />
                  </div>
                   <Button onClick={() => setEnrollmentOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4"/>
                        Nova Matrícula
                    </Button>
              </div>
          </CardHeader>
          <CardContent>
              <div className="rounded-lg border">
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead>Aluno</TableHead>
                              <TableHead>Curso</TableHead>
                              <TableHead>Turma</TableHead>
                              <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {filteredEnrollments.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    Nenhum aluno encontrado.
                                </TableCell>
                            </TableRow>
                          ) : (
                            filteredEnrollments.map((enrollment) => {
                                const { user, course, class: cls } = enrollment;
                                const avatar = PlaceHolderImages.find(p => p.id === 'avatar-1');
                                
                                return (
                                <TableRow key={enrollment.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-9 w-9">
                                                {avatar && <AvatarImage src={avatar.imageUrl} alt={user.name} />}
                                                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-medium">{user.name}</p>
                                                <p className="text-xs text-muted-foreground">{user.email}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="outline">{course.name}</Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                      {cls.name}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" asChild>
                                            <Link href={`/dashboard/people/${user.id}`}>
                                                <Edit className="size-4 mr-2" />
                                                Ver Perfil
                                            </Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )})
                          )}
                      </TableBody>
                  </Table>
              </div>
          </CardContent>
      </Card>
      <EnrollmentDialog open={isEnrollmentOpen} onOpenChange={setEnrollmentOpen} />
      </>
  );
}
