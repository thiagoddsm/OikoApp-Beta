'use client';
import React, { useMemo, useState } from 'react';
import { Loader2, Edit } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useVolunteering, type User } from '@/contexts/volunteering-context';
import { EditTeacherCoursesDialog } from './edit-teacher-courses-dialog';

export function TeachersManagement() {
    const { users, courses, isLoading } = useVolunteering();
    
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const teachersData = useMemo(() => {
        if (!users || !courses) return [];
        
        const courseMap = new Map<string, string>();
        courses.forEach(c => courseMap.set(c.id, c.name));

        return users.map(user => ({
            ...user,
            isTeacher: user.isTeacher === true,
            taughtCourses: user.taughtCourseIds?.map(id => courseMap.get(id) || 'Curso não encontrado') || []
        })).sort((a, b) => {
            if (a.isTeacher && !b.isTeacher) return -1;
            if (!a.isTeacher && b.isTeacher) return 1;
            return a.name.localeCompare(b.name);
        });
    }, [users, courses]);
    
    const handleEdit = (user: User) => {
        setEditingUser(user);
        setIsDialogOpen(true);
    };

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
                <CardHeader>
                    <CardTitle>Gerenciamento de Professores</CardTitle>
                    <CardDescription>
                        Habilite usuários como professores e atribua os cursos que eles podem lecionar.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-lg border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Professor</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Cursos Lecionados</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {teachersData.map(teacher => {
                                    const avatar = PlaceHolderImages.find(p => p.id === (teacher.avatar || 'avatar-2'));
                                    return (
                                    <TableRow key={teacher.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-9 w-9">
                                                    {avatar && <AvatarImage src={avatar.imageUrl} alt={teacher.name} />}
                                                    <AvatarFallback>{teacher.name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-medium">{teacher.name}</p>
                                                    <p className="text-xs text-muted-foreground">{teacher.email}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {teacher.isTeacher ? (
                                                <Badge>Professor</Badge>
                                            ) : (
                                                <Badge variant="outline">Não é professor</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {teacher.taughtCourses.map(courseName => (
                                                    <Badge key={courseName} variant="secondary">{courseName}</Badge>
                                                ))}
                                            </div>
                                        </TableCell>
                                         <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" onClick={() => handleEdit(teacher)}>
                                                <Edit className="size-4 mr-2" />
                                                Gerenciar
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )})}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
            <EditTeacherCoursesDialog 
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                user={editingUser}
            />
        </>
    );
}
