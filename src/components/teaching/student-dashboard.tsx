
'use client';
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, DollarSign, Book, GraduationCap, CreditCard, User, MessageSquare, Loader2, PlayCircle, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { useFirebase } from '@/firebase';
import { useVolunteering } from '@/contexts/volunteering-context';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export function StudentDashboard() {
    const { user } = useFirebase();
    const { classes, courses, users, wavePayments, disPayments, pedagogicalLogs, isLoading } = useVolunteering();

    // Turmas do aluno
    const studentClasses = useMemo(() => {
        if (!user || !classes) return [];
        return classes.filter(cls => cls.students && cls.students.includes(user.uid));
    }, [user, classes]);

    // Pagamentos Unificados
    const allPayments = useMemo(() => {
        if (!user) return [];
        const wave = wavePayments.filter(p => p.userId === user.uid).map(p => ({...p, school: 'Wave'}));
        const dis = disPayments.filter(p => p.userId === user.uid).map(p => ({...p, school: 'DIS'}));
        return [...wave, ...dis].sort((a, b) => b.month.localeCompare(a.month));
    }, [user, wavePayments, disPayments]);

    const courseMap = useMemo(() => new Map(courses.map(c => [c.id, c])), [courses]);
    const teacherMap = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);

    // Logs de aula (feedback)
    const recentLogs = useMemo(() => {
        if (!pedagogicalLogs || studentClasses.length === 0) return [];
        const studentClassIds = studentClasses.map(c => c.id);
        return pedagogicalLogs
            .filter(log => studentClassIds.includes(log.classId))
            .sort((a, b) => b.date.toMillis() - a.date.toMillis())
            .slice(0, 3);
    }, [pedagogicalLogs, studentClasses]);

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

                {/* Agenda Unificada */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Calendar className="size-5 text-primary"/> Minha Agenda</CardTitle>
                        <CardDescription>Seus horários de aula em todos os cursos.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {studentClasses.length === 0 ? (
                            <p className="text-muted-foreground text-center py-8">Você não possui matrículas ativas.</p>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {studentClasses.map(cls => {
                                    const course = courseMap.get(cls.courseId);
                                    return (
                                        <div key={cls.id} className="p-4 bg-muted/30 rounded-xl border hover:bg-muted/50 transition-colors flex flex-col justify-between h-full">
                                            <div>
                                                <div className="flex justify-between items-start mb-2">
                                                    <p className="text-sm font-black text-primary">{course?.name}</p>
                                                    <Badge variant="outline" className="text-[9px] uppercase">{course?.ministryName}</Badge>
                                                </div>
                                                <div className="space-y-1.5 text-xs">
                                                    <div className="flex items-center gap-2"><Clock className="size-3.5" /> <strong>{cls.dayOfWeek} às {cls.startTime}</strong></div>
                                                    <div className="flex items-center gap-2"><User className="size-3.5" /> Prof. {teacherMap.get(cls.teacherId)?.name || 'A definir'}</div>
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Feedback Recente */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <MessageSquare className="size-5 text-primary" />
                            Feedbacks de Aula
                        </CardTitle>
                        <CardDescription>O que seus professores registraram recentemente.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {recentLogs.length === 0 ? (
                            <p className="text-center py-10 text-sm text-muted-foreground border-2 border-dashed rounded-lg italic">
                                Nenhum feedback disponível.
                            </p>
                        ) : (
                            recentLogs.map(log => (
                                <div key={log.id} className="p-4 bg-slate-50 rounded-xl border-l-4 border-primary shadow-sm">
                                    <div className="flex justify-between items-center mb-2">
                                        <p className="text-xs font-bold text-primary">{format(log.date.toDate(), 'dd/MM/yyyy', { locale: ptBR })}</p>
                                        <div className="flex gap-0.5">
                                            {[...Array(5)].map((_, i) => (
                                                <div key={i} className={cn("size-2 rounded-full", i < log.student_performance ? "bg-yellow-400" : "bg-slate-200")} />
                                            ))}
                                        </div>
                                    </div>
                                    <p className="text-sm font-bold text-slate-800">{log.content_taught}</p>
                                    <p className="text-xs text-muted-foreground mt-2 italic border-t pt-2">"{log.observations}"</p>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>

                {/* Financeiro Unificado */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <DollarSign className="size-5 text-primary" />
                            Minhas Mensalidades
                        </CardTitle>
                        <CardDescription>Acompanhamento de pagamentos Wave e DIS.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {allPayments.length === 0 ? (
                            <p className="text-center py-10 text-sm text-muted-foreground border-2 border-dashed rounded-lg">
                                Nenhum registro financeiro encontrado.
                            </p>
                        ) : (
                            <div className="rounded-lg border overflow-hidden">
                                <Table>
                                    <TableBody>
                                        {allPayments.map(p => (
                                            <TableRow key={p.id}>
                                                <TableCell>
                                                    <p className="text-sm font-bold">{p.month}</p>
                                                    <p className="text-[10px] text-muted-foreground uppercase">{p.school}</p>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <p className="text-sm font-medium">R$ {p.amount.toFixed(2).replace('.', ',')}</p>
                                                    <Badge 
                                                        variant={p.status === 'paid' ? 'default' : p.status === 'overdue' ? 'destructive' : 'outline'}
                                                        className="mt-1 h-5 text-[9px] uppercase font-black"
                                                    >
                                                        {p.status === 'paid' ? 'Pago' : p.status === 'overdue' ? 'Atrasado' : 'Pendente'}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
