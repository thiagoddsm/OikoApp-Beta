'use client';
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, DollarSign, Book, Download, MessageSquare, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useFirebase } from '@/firebase';
import { useVolunteering } from '@/contexts/volunteering-context';

const paymentStatusConfig: Record<string, { label: string; color: string }> = {
    'paid': { label: 'Pago', color: 'bg-green-100 text-green-800' },
    'pending': { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
    'overdue': { label: 'Atrasado', color: 'bg-red-100 text-red-800' },
};
const teacherAvatar = PlaceHolderImages.find(p => p.id === 'avatar-3');


export function StudentDashboard() {
    const { user } = useFirebase();
    const { classes, courses, users, wavePayments, pedagogicalLogs, isLoading } = useVolunteering();

    const studentClasses = useMemo(() => {
        if (!user || !classes) return [];
        return classes.filter(cls => cls.students && cls.students.includes(user.uid));
    }, [user, classes]);

    const studentPayments = useMemo(() => {
        if (!user || !wavePayments) return [];
        return wavePayments.filter(p => p.userId === user.uid).sort((a, b) => b.month.localeCompare(a.month));
    }, [user, wavePayments]);

    const latestPayment = studentPayments[0];

    const courseMap = useMemo(() => new Map(courses.map(c => [c.id, c.name])), [courses]);
    const teacherMap = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);

    // Simplified logic for next class: just takes the first one.
    const nextClass = studentClasses[0];
    const nextClassCourse = nextClass ? courseMap.get(nextClass.courseId) : null;
    const nextClassTeacher = nextClass ? teacherMap.get(nextClass.teacherId) : null;
    const nextClassTeacherAvatar = nextClassTeacher?.avatar ? PlaceHolderImages.find(p => p.id === nextClassTeacher.avatar) : teacherAvatar;


    const latestLog = useMemo(() => {
        if (!pedagogicalLogs || studentClasses.length === 0) return null;
        const studentClassIds = studentClasses.map(c => c.id);
        return pedagogicalLogs
            .filter(log => studentClassIds.includes(log.classId))
            .sort((a, b) => b.date.toMillis() - a.date.toMillis())[0];
    }, [pedagogicalLogs, studentClasses]);


    if (isLoading) {
        return (
            <div className="flex h-64 w-full items-center justify-center">
                <Loader2 className="size-8 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!user) {
        return <p>Por favor, faça login para ver seu painel.</p>
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Next Class */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Calendar className="size-5"/> Próxima Aula</CardTitle>
                        <CardDescription>Seu próximo encontro musical agendado.</CardDescription>
                    </CardHeader>
                    {nextClass ? (
                         <CardContent className="grid grid-cols-2 gap-6">
                            <div className="flex items-center gap-4">
                                {nextClassTeacherAvatar && <Avatar className="w-16 h-16"><AvatarImage src={nextClassTeacherAvatar.imageUrl} /><AvatarFallback>P</AvatarFallback></Avatar>}
                                <div>
                                    <p className="text-sm text-muted-foreground">{nextClassCourse || 'Instrumento'}</p>
                                    <p className="font-bold text-lg">{nextClassTeacher?.name || 'Professor(a)'}</p>
                                </div>
                            </div>
                            <div className="space-y-3 text-sm">
                                <div className="flex items-center gap-2"><Clock className="size-4 text-muted-foreground"/> <span>{nextClass.dayOfWeek} às <strong>{nextClass.startTime}</strong></span></div>
                                <div className="flex items-center gap-2"><Calendar className="size-4 text-muted-foreground"/> <span>Sala: {nextClass.locationId === 'the_school' ? 'The School' : 'Não definida'}</span></div>
                            </div>
                        </CardContent>
                    ) : (
                        <CardContent><p className="text-muted-foreground">Você não está matriculado em nenhuma turma.</p></CardContent>
                    )}
                </Card>

                {/* Payment Status */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><DollarSign className="size-5"/> Minha Mensalidade</CardTitle>
                    </CardHeader>
                    {latestPayment ? (
                        <CardContent className="text-center">
                            <Badge className={`text-base px-4 py-2 ${paymentStatusConfig[latestPayment.status]?.color || ''}`}>
                                {paymentStatusConfig[latestPayment.status]?.label || 'Status Desconhecido'}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-2">Mês: {latestPayment.month}</p>
                            <Button className="mt-4 w-full" disabled>Ver Histórico (em breve)</Button>
                        </CardContent>
                    ) : (
                         <CardContent><p className="text-muted-foreground text-center">Nenhum registro financeiro encontrado.</p></CardContent>
                    )}
                </Card>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pedagogical Follow-up */}
                <Card>
                    <CardHeader>
                        <CardTitle>Acompanhamento Pedagógico</CardTitle>
                        <CardDescription>Último registro do seu professor.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {latestLog ? (
                             <blockquote className="border-l-2 pl-6 italic text-muted-foreground">
                                {latestLog.content_taught} - {latestLog.observations}
                            </blockquote>
                        ) : (
                             <p className="text-muted-foreground">Nenhum registro encontrado.</p>
                        )}
                        <Button variant="outline" className="mt-4 w-full" disabled>
                            <MessageSquare className="size-4 mr-2"/> Falar com Professor (em breve)
                        </Button>
                    </CardContent>
                </Card>
                
                {/* Materials */}
                <Card>
                    <CardHeader>
                        <CardTitle>Material de Aula</CardTitle>
                        <CardDescription>Acesse os arquivos e links compartilhados.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-center h-24 border-2 border-dashed rounded-md">
                           <p className="text-sm text-muted-foreground">Em breve...</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
