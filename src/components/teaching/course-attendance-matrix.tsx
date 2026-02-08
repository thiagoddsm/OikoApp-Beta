'use client';
import React, { useMemo } from 'react';
import { useVolunteering } from '@/contexts/volunteering-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, Award, Loader2, Users, GraduationCap, ChevronRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function CourseAttendanceMatrix({ courseId }: { courseId: string }) {
    const { classes, users, courses, updateVolunteer, isLoading } = useVolunteering();

    const course = useMemo(() => courses.find(c => c.id === courseId), [courses, courseId]);
    const isMemberCourse = course?.name?.toLowerCase().includes('membro') || course?.name?.toLowerCase().includes('integração');

    // Filter classes for this course and sort them
    const courseClasses = useMemo(() => {
        return classes
            .filter(c => c.courseId === courseId)
            .sort((a, b) => {
                const order: Record<string, number> = { '1': 1, '2': 2, '3': 3, '4': 4, 'last': 5 };
                if (a.weekOfMonth && b.weekOfMonth) {
                    return (order[a.weekOfMonth] || 0) - (order[b.weekOfMonth] || 0);
                }
                return (a.startDate || '').localeCompare(b.startDate || '');
            });
    }, [classes, courseId]);

    // Unique list of students enrolled
    const students = useMemo(() => {
        const studentSet = new Set<string>();
        courseClasses.forEach(cls => cls.students?.forEach(sId => studentSet.add(sId)));
        
        return users
            .filter(u => studentSet.has(u.id))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [users, courseClasses]);

    const stats = useMemo(() => {
        if (!isMemberCourse) return null;
        
        const counts = { ready: 0, finishing: 0, missing: 0 };
        students.forEach(s => {
            const progress = s.journey?.memberCourseProgress || {};
            const completedCount = Object.values(progress).filter(Boolean).length;
            const has1to4 = ['module1', 'module2', 'module3', 'module4'].every(m => progress[m]);
            
            if (completedCount === 5) counts.finishing++;
            else if (has1to4) counts.ready++;
            else counts.missing++;
        });
        return counts;
    }, [students, isMemberCourse]);

    const handleStatusChange = (userId: string, newStatus: string) => {
        updateVolunteer(userId, { [`journey.courseStatus.${courseId}`]: newStatus });
    };

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>;
    }

    return (
        <div className="space-y-6">
            {isMemberCourse && stats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-amber-50 border-amber-200">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-2 bg-amber-500 text-white rounded-lg"><GraduationCap size={20}/></div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-amber-700">Aptos para Comissionamento</p>
                                <p className="text-2xl font-black text-amber-900">{stats.ready}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-emerald-50 border-emerald-200">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-2 bg-emerald-500 text-white rounded-lg"><Award size={20}/></div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-emerald-700">Curso Concluído</p>
                                <p className="text-2xl font-black text-emerald-900">{stats.finishing}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-slate-50 border-slate-200">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-2 bg-slate-500 text-white rounded-lg"><Users size={20}/></div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-700">Em Jornada (Módulos 1-4)</p>
                                <p className="text-2xl font-black text-slate-900">{stats.missing}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

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
                                        <TableCell className="sticky left-0 bg-background z-10 font-medium border-r">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={PlaceHolderImages.find(p => p.id === 'avatar-1')?.imageUrl} />
                                                    <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-bold">{student.name}</p>
                                                    <p className={cn("text-[9px] uppercase font-black", is100Percent ? "text-emerald-600" : "text-muted-foreground")}>
                                                        {attendanceCount}/{totalClasses} módulos concluídos
                                                    </p>
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
                                                            <span className="text-[9px] font-bold text-emerald-700 uppercase">OK</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-center gap-1 opacity-20">
                                                            <Clock className="text-slate-400 size-5" />
                                                            <span className="text-[9px] font-bold text-slate-500 uppercase">-</span>
                                                        </div>
                                                    )}
                                                </TableCell>
                                            );
                                        })}

                                        <TableCell className="bg-primary/5">
                                            <div className="flex flex-col items-center">
                                                {isMemberCourse ? (
                                                    is100Percent ? (
                                                        <div className="flex flex-col items-center gap-1">
                                                            <Badge className="bg-emerald-600 hover:bg-emerald-600 font-bold uppercase text-[10px]">Aprovado</Badge>
                                                            {student.integrationStatus !== 'membro' && (
                                                                <span className="text-[8px] font-black text-amber-600 uppercase">Pendente Oficiailização</span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <Badge variant="secondary" className="text-[10px] uppercase font-bold">Em Jornada</Badge>
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