'use client';
import React, { useState, useMemo } from 'react';
import { useFirebase, useCollection, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Loader2, PlusCircle, Edit, Trash2 } from 'lucide-react';
import { ClassFormDialog } from './class-form-dialog';
import { useVolunteering } from '@/contexts/volunteering-context';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

type Class = { id: string; name: string; teacherId: string; students: string[]; courseId: string; frequency?: 'pontual' | 'semanal' | 'quinzenal' | 'mensal', startDate?: string, endDate?: string, startTime?: string, endTime?: string, dayOfWeek?: string, locationId?: string };

export function CourseClassesManager({ course }) {
    const { firestore } = useFirebase();
    const { users, rooms } = useVolunteering();
    const [isClassFormOpen, setClassFormOpen] = useState(false);
    const [editingClass, setEditingClass] = useState(null);

    const classesQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'classes'), where('courseId', '==', course.id));
    }, [firestore, course.id]);

    const { data: classes, isLoading: isLoadingClasses } = useCollection<Class>(classesQuery);

    const userMap = useMemo(() => new Map(users?.map(u => [u.id, u.name]) || []), [users]);
    const roomMap = useMemo(() => new Map(rooms?.map(r => [r.id, r.name]) || []), [rooms]);

    const handleEditClass = (cls: any) => {
        setEditingClass(cls);
        setClassFormOpen(true);
    }
    
    const handleAddClass = () => {
        setEditingClass(null);
        setClassFormOpen(true);
    }
    
    const handleDeleteClass = (cls: any) => {
        if (confirm(`Tem certeza que deseja excluir a turma "${cls.name}"?`)) {
            const docRef = doc(firestore, 'classes', cls.id);
            deleteDocumentNonBlocking(docRef);
        }
    }

    const formatSchedule = (cls: Class) => {
        if (!cls.frequency) return 'Não definido';
        if (cls.frequency === 'pontual') {
            if (!cls.startDate) return 'Data não definida';
            return `Único: ${format(new Date(cls.startDate + 'T12:00:00'), 'dd/MM/yyyy')} às ${cls.startTime}`;
        }
        return `${cls.frequency.charAt(0).toUpperCase() + cls.frequency.slice(1)} - ${cls.dayOfWeek || 'Dia não definido'} às ${cls.startTime}`;
    };

    return (
        <>
            <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-muted-foreground">Gerencie as turmas ativas para este curso.</p>
                <Button size="sm" onClick={handleAddClass}><PlusCircle className="mr-2 size-4"/>Nova Turma</Button>
            </div>
            <div className="rounded-md border bg-background">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Turma</TableHead>
                            <TableHead>Professor</TableHead>
                            <TableHead>Alunos</TableHead>
                            <TableHead>Programação</TableHead>
                            <TableHead>Local</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoadingClasses ? (
                            <TableRow><TableCell colSpan={6} className="text-center h-24"><Loader2 className="animate-spin mx-auto"/></TableCell></TableRow>
                        ) : classes?.length === 0 ? (
                            <TableRow><TableCell colSpan={6} className="text-center h-24">Nenhuma turma cadastrada para este curso.</TableCell></TableRow>
                        ) : (
                            classes?.map(cls => {
                                const locationName = cls.locationId === 'the_school'
                                    ? 'The School'
                                    : (cls.locationId ? roomMap.get(cls.locationId) : '-') || '-';
                                return (
                                <TableRow key={cls.id}>
                                    <TableCell className="font-medium">{cls.name}</TableCell>
                                    <TableCell>{userMap.get(cls.teacherId) || '-'}</TableCell>
                                    <TableCell>{cls.students?.length || 0}</TableCell>
                                    <TableCell>{formatSchedule(cls)}</TableCell>
                                    <TableCell>{locationName}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleEditClass(cls)}><Edit className="size-4"/></Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteClass(cls)}><Trash2 className="size-4 text-destructive"/></Button>
                                    </TableCell>
                                </TableRow>
                            )})
                        )}
                    </TableBody>
                </Table>
            </div>
            <ClassFormDialog
                open={isClassFormOpen}
                onOpenChange={setClassFormOpen}
                existingClass={editingClass}
                courseId={course.id}
            />
        </>
    );
}

    