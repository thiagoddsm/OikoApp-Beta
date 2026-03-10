
'use client';
import React, { useState, useMemo } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Loader2, PlusCircle, Edit, Trash2, ChevronRight, Wand2, ClipboardCheck, BookOpen } from 'lucide-react';
import { ClassFormDialog } from './class-form-dialog';
import { useVolunteering } from '@/contexts/volunteering-context';
import { format, addWeeks, startOfMonth, nextDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { DeleteConfirmationDialog } from '@/components/structure/delete-confirmation-dialog';

type Class = { 
    id: string; 
    name: string; 
    teacherId: string; 
    students: string[]; 
    maxStudents?: number;
    courseId: string; 
    frequency?: 'pontual' | 'semanal' | 'quinzenal' | 'mensal', 
    startDate?: string, 
    endDate?: string, 
    startTime?: string, 
    endTime?: string, 
    dayOfWeek?: string, 
    weekOfMonth?: string, 
    locationId?: string 
};

export function CourseClassesManager({ course }: { course: any }) {
    const { firestore } = useFirebase();
    const { users, rooms, deleteClass, addClass } = useVolunteering();
    const { toast } = useToast();
    const [isClassFormOpen, setClassFormOpen] = useState(false);
    const [editingClass, setEditingClass] = useState<Class | null>(null);
    const [classToDelete, setClassToDelete] = useState<Class | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const classesQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'classes'), where('courseId', '==', course.id));
    }, [firestore, course.id]);

    const { data: classes, isLoading: isLoadingClasses } = useCollection<Class>(classesQuery);

    const userMap = useMemo(() => new Map(users?.map(u => [u.id, u.name]) || []), [users]);
    const roomMap = useMemo(() => new Map(rooms?.map(r => [r.id, r.name]) || []), [rooms]);

    const isMemberCourse = course.name?.toLowerCase().includes('membro') || course.name?.toLowerCase().includes('pertencer') || course.name?.toLowerCase().includes('integração');
    const isWaveOrDis = course.ministryName?.toLowerCase().includes('wave') || course.ministryName?.toLowerCase().includes('dis');

    const handleAddClass = () => {
        setEditingClass(null);
        setClassFormOpen(true);
    };

    const handleEditClass = (cls: Class) => {
        setEditingClass(cls);
        setClassFormOpen(true);
    };

    const handleDeleteClass = (cls: Class) => {
        setClassToDelete(cls);
    };

    const confirmDelete = async () => {
        if (classToDelete) {
            await deleteClass(classToDelete.id);
            setClassToDelete(null);
        }
    };

    const handleGenerateCycle = async () => {
        if (!isMemberCourse) return;
        setIsGenerating(true);

        try {
            const nextMonth = new Date();
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            const startOfNextMonth = startOfMonth(nextMonth);
            const firstSunday = nextDay(startOfNextMonth, 0); 
            const lastSunday = addWeeks(firstSunday, 4);

            const monthName = format(firstSunday, 'MMMM', { locale: ptBR });
            const yearName = format(firstSunday, 'yyyy');

            await addClass({
                courseId: course.id,
                name: `Ciclo ${monthName.charAt(0).toUpperCase() + monthName.slice(1)} / ${yearName}`,
                teacherId: "",
                students: [],
                maxStudents: 30,
                frequency: 'semanal',
                dayOfWeek: "Domingo",
                startTime: "09:00",
                endTime: "10:30",
                startDate: format(firstSunday, 'yyyy-MM-dd'),
                endDate: format(lastSunday, 'yyyy-MM-dd'),
                locationId: ""
            });

            toast({ title: "Ciclo Gerado!", description: `A turma de ${monthName} foi criada como um ciclo de 5 semanas.` });
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Erro", description: "Falha ao gerar o ciclo de turmas." });
        } finally {
            setIsGenerating(false);
        }
    };

    const formatSchedule = (cls: Class) => {
        if (!cls.frequency) return 'Não definido';
        if (cls.frequency === 'pontual') {
            if (!cls.startDate) return 'Data não definida';
            return `Único: ${format(new Date(cls.startDate + 'T12:00:00'), 'dd/MM/yyyy')} às ${cls.startTime}`;
        }
        if (cls.frequency === 'mensal') {
            const weekLabel = cls.weekOfMonth === 'last' ? 'Último' : `${cls.weekOfMonth}º`;
            return `${weekLabel} ${cls.dayOfWeek} às ${cls.startTime}`;
        }
        return `${cls.frequency.charAt(0).toUpperCase() + cls.frequency.slice(1)} - ${cls.dayOfWeek || 'Dia não definido'} às ${cls.startTime}`;
    };

    return (
        <>
            <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-muted-foreground">Gerencie os ciclos e turmas ativas.</p>
                <div className="flex gap-2">
                    {isMemberCourse && (
                        <Button variant="outline" size="sm" onClick={handleGenerateCycle} disabled={isGenerating}>
                            {isGenerating ? <Loader2 className="mr-2 size-4 animate-spin"/> : <Wand2 className="mr-2 size-4"/>}
                            Gerar Ciclo Mensal (5 domingos)
                        </Button>
                    )}
                    <Button size="sm" onClick={handleAddClass}><PlusCircle className="mr-2 size-4"/>Nova Turma / Ciclo</Button>
                </div>
            </div>
            <div className="rounded-md border bg-background">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Ciclo / Turma</TableHead>
                            <TableHead>Professor</TableHead>
                            <TableHead>Inscritos / Vagas</TableHead>
                            <TableHead>Programação</TableHead>
                            <TableHead>Local</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoadingClasses ? (
                            <TableRow><TableCell colSpan={6} className="text-center h-24"><Loader2 className="animate-spin mx-auto"/></TableCell></TableRow>
                        ) : classes?.length === 0 ? (
                            <TableRow><TableCell colSpan={6} className="text-center h-24">Nenhum ciclo cadastrado para este curso.</TableCell></TableRow>
                        ) : (
                            classes?.map(cls => {
                                const locationName = cls.locationId === 'the_school'
                                    ? 'The School'
                                    : (cls.locationId ? roomMap.get(cls.locationId) : '-') || '-';
                                
                                const studentCount = cls.students?.length || 0;
                                const max = cls.maxStudents;
                                const isFull = max && studentCount >= max;

                                return (
                                <TableRow key={cls.id} className="group">
                                    <TableCell className="font-medium">{cls.name}</TableCell>
                                    <TableCell>{userMap.get(cls.teacherId) || '-'}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Badge variant={isFull ? "destructive" : "secondary"} className="font-bold">
                                                {studentCount}{max ? ` / ${max}` : ''}
                                            </Badge>
                                            {isFull && <span className="text-[10px] font-black text-destructive uppercase">Lotada</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell>{formatSchedule(cls)}</TableCell>
                                    <TableCell>{locationName}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end items-center gap-1 transition-all">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditClass(cls)}>
                                                <Edit className="size-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteClass(cls)}>
                                                <Trash2 className="size-4" />
                                            </Button>
                                            <Button asChild variant="outline" size="sm" className="h-8 ml-2">
                                                <Link href={`/dashboard/teaching/log/${cls.id}`} className="flex items-center">
                                                    {isWaveOrDis ? <BookOpen className="size-3 mr-1" /> : <ClipboardCheck className="size-3 mr-1" />}
                                                    {isWaveOrDis ? 'Diário' : 'Chamada'}
                                                </Link>
                                            </Button>
                                            <Button asChild variant="ghost" size="icon" className="h-8 w-8 ml-1">
                                                <Link href={`/dashboard/teaching/classes/${cls.id}`}>
                                                    <ChevronRight className="size-4" />
                                                </Link>
                                            </Button>
                                        </div>
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
            {classToDelete && (
                <DeleteConfirmationDialog
                    open={!!classToDelete}
                    onOpenChange={() => setClassToDelete(null)}
                    onConfirm={confirmDelete}
                    itemName={classToDelete.name}
                    itemType="Turma (A reserva de sala também será removida)"
                />
            )}
        </>
    );
}
