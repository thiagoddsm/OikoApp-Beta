'use client';
import React, { useMemo, useState } from 'react';
import { useVolunteering, type User, type Class } from '@/contexts/volunteering-context';
import { Loader2, User as UserIcon, Search, Edit } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import Link from 'next/link';

const statusConfig: { [key: string]: { label: string; color: string; } } = {
  active: { label: 'Ativo', color: 'bg-green-100 text-green-800' },
  blocked: { label: 'Bloqueado', color: 'bg-yellow-100 text-yellow-800' },
  delinquent: { label: 'Inadimplente', color: 'bg-red-100 text-red-800' },
};

export function StudentsManagement() {
  const { users, classes, courses, isLoading } = useVolunteering();
  const [searchTerm, setSearchTerm] = useState('');

  const studentsData = useMemo(() => {
    if (!users || !classes || !courses) return [];

    const studentMap = new Map<string, { user: User, enrolledClasses: Class[] }>();
    
    // Initialize map with all users that might be students
    users.forEach(user => {
        studentMap.set(user.id, { user, enrolledClasses: [] });
    });
    
    // Populate enrolled classes
    classes.forEach(cls => {
        cls.students?.forEach(studentId => {
            if (studentMap.has(studentId)) {
                const studentEntry = studentMap.get(studentId)!;
                studentEntry.enrolledClasses.push(cls);
            }
        });
    });

    // Filter out users who are not in any class
    const enrolledStudents = Array.from(studentMap.values()).filter(entry => entry.enrolledClasses.length > 0);

    return enrolledStudents;

  }, [users, classes, courses]);

  const filteredStudents = useMemo(() => {
      if (!studentsData) return [];
      return studentsData.filter(studentEntry => 
        studentEntry.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        studentEntry.user.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [studentsData, searchTerm]);
  
  const courseMap = useMemo(() => new Map(courses.map(c => [c.id, c.name])), [courses]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
      <Card>
          <CardHeader className="flex flex-row items-center justify-between">
              <div>
                  <CardTitle>Alunos Matriculados</CardTitle>
                  <CardDescription>
                      Visualize e gerencie todos os alunos matriculados nos cursos da igreja.
                  </CardDescription>
              </div>
               <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nome ou email..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
          </CardHeader>
          <CardContent>
              <div className="rounded-lg border">
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead>Aluno</TableHead>
                              <TableHead>Status Financeiro (Wave)</TableHead>
                              <TableHead>Turmas Matriculadas</TableHead>
                              <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {filteredStudents.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    Nenhum aluno encontrado.
                                </TableCell>
                            </TableRow>
                          ) : (
                            filteredStudents.map(({ user, enrolledClasses }) => {
                                const avatar = PlaceHolderImages.find(p => p.id === 'avatar-1');
                                const statusInfo = user.financialStatus ? statusConfig[user.financialStatus] : null;

                                return (
                                <TableRow key={user.id}>
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
                                        {statusInfo ? (
                                            <Badge variant="outline" className={statusInfo.color}>{statusInfo.label}</Badge>
                                        ) : (
                                            <Badge variant="secondary">N/A</Badge>
                                        )}
                                    </TableCell>
                                     <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {enrolledClasses.map(cls => (
                                                <Badge key={cls.id} variant="secondary">
                                                    {courseMap.get(cls.courseId)} - {cls.name}
                                                </Badge>
                                            ))}
                                        </div>
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
  );
}
