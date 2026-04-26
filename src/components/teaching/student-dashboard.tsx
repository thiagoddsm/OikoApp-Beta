
'use client';
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Book, GraduationCap, CreditCard, User, Loader2, PlayCircle, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useFirebase } from '@/firebase';
import { useVolunteering, type Class } from '@/contexts/volunteering-context';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export function StudentDashboard() {
    const { user } = useFirebase();
    const { classes, courses, users, isLoading } = useVolunteering();

    // Turmas do aluno agrupadas por curso
    const groupedClasses = useMemo(() => {
        if (!user || !classes) return [];
        const myClasses = classes.filter(cls => cls.students && cls.students.includes(user.uid));
        
        const groups: Record<string, Class[]> = {};
        myClasses.forEach(cls => {
            if (!groups[cls.courseId]) groups[cls.courseId] = [];
            groups[cls.courseId].push(cls);
        });
        
        return Object.values(groups).sort((a, b) => {
            const courseA = courses.find(c => c.id === a[0].courseId)?.name || '';
            const courseB = courses.find(c => c.id === b[0].courseId)?.name || '';
            return courseA.localeCompare(courseB);
        });
    }, [user, classes, courses]);

    const courseMap = useMemo(() => new Map(courses.map(c => [c.id, c])), [courses]);
    const teacherMap = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);

    if (isLoading) {
        return (
            <div className="flex h-64 w-full items-center justify-center">
                <Loader2 className="size-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Carteirinha Unificada */}
                <Card className="bg-gradient-to-br from-indigo-600 to-purple-700 text-primary-foreground border-none shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <GraduationCap size={120} />
                    </div>
                    <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <CreditCard className="size-5" />
                            Identidade Estudantil
                        </CardTitle>
                        <CardDescription className="text-white/70">Ensino IBM</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div>
                            <p className="text-[10px] uppercase tracking-widest opacity-70 mb-1">Aluno(a)</p>
                            <p className="text-xl font-black leading-tight truncate">{user.displayName}</p>
                        </div>
                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-[10px] uppercase tracking-widest opacity-70 mb-1">Status Geral</p>
                                <Badge variant="outline" className="bg-white/20 text-white border-white/20 font-bold">
                                    ATIVO
                                </Badge>
                            </div>
                            <div className="size-14 bg-white rounded-md flex items-center justify-center p-1">
                                <div className="size-full bg-black rounded-sm"></div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Agenda Unificada Agrupada */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Calendar className="size-5 text-primary"/> Minha Agenda</CardTitle>
                        <CardDescription>Seus horários de aula em todos os cursos.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {groupedClasses.length === 0 ? (
                            <p className="text-muted-foreground text-center py-8">Você não possui matrículas ativas.</p>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {groupedClasses.map(group => {
                                    const firstCls = group[0];
                                    const course = courseMap.get(firstCls.courseId);
                                    return (
                                        <div key={firstCls.courseId} className="p-4 bg-muted/30 rounded-xl border hover:bg-muted/50 transition-colors flex flex-col justify-between h-full">
                                            <div>
                                                <div className="flex justify-between items-start mb-3">
                                                    <p className="text-sm font-black text-primary truncate max-w-[150px]">{course?.name}</p>
                                                    <Badge variant="outline" className="text-[9px] uppercase font-black">{course?.ministryName}</Badge>
                                                </div>
                                                <div className="space-y-3">
                                                    {group.map(cls => (
                                                        <div key={cls.id} className="space-y-1">
                                                            <div className="flex items-center gap-2 text-xs">
                                                                <Clock className="size-3.5 text-muted-foreground" /> 
                                                                <span className="font-bold">{cls.dayOfWeek} às {cls.startTime}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                                                <User className="size-3" /> 
                                                                <span>Prof. {teacherMap.get(cls.teacherId)?.name || 'A definir'}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            
                                            {course?.linkedTheoflixId && (
                                                <Button size="sm" variant="outline" className="mt-4 w-full text-[10px] font-black uppercase h-8 border-primary/30 hover:bg-primary/5 group" asChild>
                                                    <Link href="/dashboard/teaching/theoflix">
                                                        <PlayCircle className="size-3 mr-1.5 text-primary" />
                                                        Assistir no TheoFlix
                                                        <ExternalLink className="size-2.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </Link>
                                                </Button>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
