'use client';
import React, { useMemo } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlaceHolderImages } from '@/lib/placeholder-images';

type User = {
    id: string;
    name: string;
    email?: string;
    avatar?: string;
    isTeacher?: boolean;
    taughtCourseIds?: string[];
};

type Course = {
    id: string;
    name: string;
};

export function TeachersManagement() {
    const { firestore } = useFirebase();

    const usersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'users')) : null, [firestore]);
    const coursesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'courses')) : null, [firestore]);

    const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);
    const { data: courses, isLoading: isLoadingCourses } = useCollection<Course>(coursesQuery);

    const isLoading = isLoadingUsers || isLoadingCourses;

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

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8 h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Gerenciamento de Professores</CardTitle>
                <CardDescription>
                    Visualize todos os usuários e os cursos que eles estão aptos a lecionar. Para atribuir um professor a um curso, edite o perfil do membro na seção de Pessoas.
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
                                        <Button variant="ghost" size="sm" asChild>
                                            <Link href={`/dashboard/people/${teacher.id}`}>
                                                Ver Perfil
                                            </Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )})}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
