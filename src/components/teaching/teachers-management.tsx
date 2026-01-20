'use client';
import React, { useMemo } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, collectionGroup } from 'firebase/firestore';
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
};

type Class = {
    id: string;
    name: string;
    teacherId: string;
};

export function TeachersManagement() {
    const { firestore } = useFirebase();

    const usersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'users')) : null, [firestore]);
    // Use collectionGroup to query all 'classes' subcollections
    const classesQuery = useMemoFirebase(() => firestore ? query(collectionGroup(firestore, 'classes')) : null, [firestore]);

    const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);
    const { data: classes, isLoading: isLoadingClasses } = useCollection<Class>(classesQuery);

    const isLoading = isLoadingUsers || isLoadingClasses;

    const teachersData = useMemo(() => {
        if (!users || !classes) return [];
        const classesByTeacher = new Map<string, string[]>();
        classes.forEach(c => {
            if (c.teacherId) {
                const currentClasses = classesByTeacher.get(c.teacherId) || [];
                classesByTeacher.set(c.teacherId, [...currentClasses, c.name]);
            }
        });

        // Show all users, and indicate who is a teacher
        return users.map(user => ({
            ...user,
            isTeacher: classesByTeacher.has(user.id),
            taughtClasses: classesByTeacher.get(user.id) || []
        })).sort((a, b) => {
            if (a.isTeacher && !b.isTeacher) return -1;
            if (!a.isTeacher && b.isTeacher) return 1;
            return a.name.localeCompare(b.name);
        });
    }, [users, classes]);

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
                    Visualize todos os usuários e as turmas que eles lecionam. Para atribuir um professor a uma turma, edite a turma na seção "Cursos e Turmas".
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Professor</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Turmas Lecionadas</TableHead>
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
                                            {teacher.taughtClasses.map(className => (
                                                <Badge key={className} variant="secondary">{className}</Badge>
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
