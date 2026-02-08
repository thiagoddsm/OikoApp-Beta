'use client';
import React, { useMemo } from 'react';
import { useVolunteering } from '@/contexts/volunteering-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, Award, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function CourseAttendanceMatrix({ courseId }: { courseId: string }) {
    const { classes, users, courses, updateVolunteer, isLoading } = useVolunteering();

    const course = useMemo(() => courses.find(c => c.id === courseId), [courses, courseId]);
    const isMemberCourse = course?.name?.toLowerCase().includes('membro') || course?.name?.toLowerCase().includes('integração');

    // Filter classes for this course and sort them (especially for members course)
    const courseClasses = useMemo(() => {
        return classes
            .filter(c => c.courseId === courseId)
            .sort((a, b) => {
                // Member course classes use weekOfMonth '1', '2', '3', '4', 'last'
                const order: Record<string, number> = { '1': 1, '2': 2, '3': 3, '4': 4, 'last': 5 };
                if (a.weekOfMonth && b.weekOfMonth) {
                    return (order[a.weekOfMonth] || 0) - (order[b.weekOfMonth] || 0);
                }
                return (a.startDate || '').localeCompare(b.startDate || '');
            });
    }, [classes, courseId]);

    // Unique list of students enrolled in any of these classes
    const students = useMemo(() => {
        const studentSet = new Set<string>();
        courseClasses.forEach(cls => cls.students?.forEach(sId => studentSet.add(sId)));
        
        return users
            .filter(u => studentSet.has(u.id))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [users, courseClasses]);

    const handleStatusChange = (userId: string, newStatus: string) => {
        updateVolunteer(userId, { [`journey.courseStatus.${courseId}`]: newStatus });
    };

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-muted/30 p-4 rounded-xl border border-dashed">
                <div>
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <Award className="text-primary" />
                        Matriz de Frequência & Aprovação
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        {isMemberCourse 
                            ? "Aprovação automática: Participar de todas as 5 aulas dominicais é obrigatório para membresia."
                            : "Acompanhe a frequência e defina o status final do aluno no curso."}
                    </p>
                </div>
            </div>

            <div className="rounded-xl border bg-background overflow-x-auto shadow-sm">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="min-w-[250px] sticky left-0 bg-muted/50 z-20">Aluno</TableHead>
                            {courseClasses.map(cls => (
                                <TableHead key={cls.id} className="text-center min-w-[120px]">
                                    <div className="flex flex-col items-center">
                                        <span className="text-[10px] font-black uppercase text-muted-foreground">
                                            {cls.weekOfMonth ? `Módulo ${cls.weekOfMonth === 'last' ? '5' : cls.weekOfMonth}` : 'Aula'}
                                        </span>
                                        <span className="font-bold text-slate-900 truncate max-w-[100px]">{cls.name}</span>
                                    </div>
                                </TableHead>
                            ))}
                            <TableHead className="text-center min-w-[150px] bg-primary/5 font-black text-primary">Status Final</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {students.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={courseClasses.length + 2} className="h-32 text-center text-muted-foreground italic">
                                    Nenhum aluno matriculado neste curso.
                                </TableCell>
                            </TableRow>
                        ) : (
                            students.map(student => {
                                const attendanceCount = courseClasses.filter(cls => 
                                    cls.attendance?.some(att => att.presentStudentIds.includes(student.id))
                                ).length;
                                
                                const totalClasses = courseClasses.length;
                                const is100Percent = totalClasses > 0 && attendanceCount === totalClasses;
                                
                                const currentStatus = student.journey?.courseStatus?.[courseId] || (is100Percent ? 'approved' : 'ongoing');

                                return (
                                    <TableRow key={student.id} className="hover:bg-muted/30">
                                        <TableCell className="sticky left-0 bg-background z-10 font-medium">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={PlaceHolderImages.find(p => p.id === 'avatar-1')?.imageUrl} />
                                                    <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm">{student.name}</p>
                                                    <p className="text-[9px] text-muted-foreground uppercase">{attendanceCount}/{totalClasses} aulas</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        
                                        {courseClasses.map(cls => {
                                            const isPresent = cls.attendance?.some(att => att.presentStudentIds.includes(student.id));
                                            return (
                                                <TableCell key={cls.id} className="text-center">
                                                    {isPresent ? (
                                                        <div className="flex flex-col items-center gap-1 animate-in zoom-in-95">
                                                            <CheckCircle2 className="text-emerald-500 size-5" />
                                                            <span className="text-[9px] font-bold text-emerald-700 uppercase">Presente</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-center gap-1 opacity-30">
                                                            <Clock className="text-slate-400 size-5" />
                                                            <span className="text-[9px] font-bold text-slate-500 uppercase">Pendente</span>
                                                        </div>
                                                    )}
                                                </TableCell>
                                            );
                                        })}

                                        <TableCell className="bg-primary/5">
                                            <div className="flex flex-col items-center">
                                                {isMemberCourse ? (
                                                    is100Percent ? (
                                                        <Badge className="bg-emerald-600 hover:bg-emerald-600 font-bold uppercase text-[10px]">Aprovado</Badge>
                                                    ) : (
                                                        <Badge variant="secondary" className="text-[10px] uppercase font-bold">Em Andamento</Badge>
                                                    )
                                                ) : (
                                                    <Select value={currentStatus} onValueChange={(v) => handleStatusChange(student.id, v)}>
                                                        <SelectTrigger className="h-8 text-[10px] uppercase font-black">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="ongoing">Em Andamento</SelectItem>
                                                            <SelectItem value="approved">Aprovado</SelectItem>
                                                            <SelectItem value="rejected">Reprovado</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}