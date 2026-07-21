'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, DollarSign, Book, Download, MessageSquare, Loader2, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { useVolunteering } from '@/contexts/volunteering-context';
import { useMembersData, useCoursesData, useTeachingFinance } from "@/hooks/useDomainData";
import { collection, query, where, Timestamp } from 'firebase/firestore';

const paymentStatusConfig: Record<string, { label: string; color: string }> = {
    'paid': { label: 'Pago', color: 'bg-green-100 text-green-800 dark:bg-green-950/20 dark:text-green-450' },
    'pending': { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/20 dark:text-yellow-450' },
    'overdue': { label: 'Atrasado', color: 'bg-red-100 text-red-800 dark:bg-red-950/20 dark:text-red-450' },
};

const teacherAvatar = PlaceHolderImages.find(p => p.id === 'avatar-3');

export function StudentDashboard() {
    const { user, firestore } = useFirebase();
    const { users } = useMembersData();
    const { courses, classes, isLoading: loadingCourses } = useCoursesData();
    const { wavePayments, isLoading: loadingFinance } = useTeachingFinance();
    const { isLoading: loadingVolunteering } = useVolunteering();

    // Query lessons where this student has checked out/completed
    const aulasQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return query(
            collection(firestore, 'aulas'),
            where('aluno_id', '==', user.uid),
            where('status', '==', 'concluida')
        );
    }, [firestore, user]);

    const { data: studentAulas, isLoading: loadingAulas } = useCollection<any>(aulasQuery);

    const isLoading = loadingCourses || loadingFinance || loadingVolunteering || loadingAulas;

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

    // Next scheduled class details
    const nextClass = studentClasses[0];
    const nextClassCourse = nextClass ? courseMap.get(nextClass.courseId) : null;
    const nextClassTeacher = nextClass ? teacherMap.get(nextClass.teacherId) : null;
    const nextClassTeacherAvatar = nextClassTeacher?.avatar ? PlaceHolderImages.find(p => p.id === nextClassTeacher.avatar) : teacherAvatar;

    // Latest real class diary log from the 'aulas' collection
    const latestClassDiary = useMemo(() => {
        if (!studentAulas || studentAulas.length === 0) return null;
        return [...studentAulas].sort((a, b) => {
            const dateA = a.horario_fim_real ? (a.horario_fim_real.toDate ? a.horario_fim_real.toDate().getTime() : new Date(a.horario_fim_real).getTime()) : 0;
            const dateB = b.horario_fim_real ? (b.horario_fim_real.toDate ? b.horario_fim_real.toDate().getTime() : new Date(b.horario_fim_real).getTime()) : 0;
            return dateB - dateA;
        })[0];
    }, [studentAulas]);

    if (isLoading) {
        return (
            <div className="flex h-64 w-full items-center justify-center">
                <Loader2 className="size-8 animate-spin text-indigo-600" />
            </div>
        );
    }
    
    if (!user) {
        return <p className="text-center py-12 text-slate-400">Por favor, faça login para acessar sua Área do Aluno Wave.</p>;
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Next Class */}
                <Card className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-md font-bold">
                            <Calendar className="size-5 text-indigo-500"/>
                            Próxima Mentoria
                        </CardTitle>
                        <CardDescription>Sua próxima aula agendada com o seu mentor.</CardDescription>
                    </CardHeader>
                    {nextClass ? (
                         <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="flex items-center gap-4">
                                {nextClassTeacherAvatar && (
                                    <Avatar className="w-16 h-16 border border-slate-100 dark:border-slate-800">
                                        <AvatarImage src={nextClassTeacherAvatar.imageUrl} />
                                        <AvatarFallback>P</AvatarFallback>
                                    </Avatar>
                                )}
                                <div>
                                    <p className="text-xs text-slate-400">{nextClassCourse || 'Instrumento'}</p>
                                    <p className="font-bold text-md text-slate-850 dark:text-slate-200">{nextClassTeacher?.name || 'Mentor Wave'}</p>
                                </div>
                            </div>
                            <div className="space-y-3 text-sm flex flex-col justify-center">
                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                    <Clock className="size-4 text-indigo-500"/>
                                    <span>{nextClass.dayOfWeek} às <strong className="text-indigo-600 dark:text-indigo-400">{nextClass.startTime}</strong></span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                    <Calendar className="size-4 text-indigo-500"/>
                                    <span>Sala: {nextClass.locationId === 'the_school' ? 'The School' : 'Principal'}</span>
                                </div>
                            </div>
                        </CardContent>
                    ) : (
                        <CardContent>
                            <p className="text-slate-400 text-sm">Você não está matriculado em nenhuma mentoria do Wave no momento.</p>
                        </CardContent>
                    )}
                </Card>

                {/* Payment Status */}
                <Card className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-md font-bold">
                            <DollarSign className="size-5 text-indigo-500"/>
                            Minha Mensalidade
                        </CardTitle>
                    </CardHeader>
                    {latestPayment ? (
                        <CardContent className="text-center flex flex-col items-center justify-center py-6">
                            <Badge className={`text-sm px-4 py-1.5 font-bold ${paymentStatusConfig[latestPayment.status]?.color || ''}`}>
                                {paymentStatusConfig[latestPayment.status]?.label || 'Status Desconhecido'}
                            </Badge>
                            <p className="text-xs text-slate-400 mt-3">Mês de Referência: <strong>{latestPayment.month}</strong></p>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-350 mt-1">
                                R$ {latestPayment.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                        </CardContent>
                    ) : (
                         <CardContent>
                             <p className="text-slate-400 text-center text-sm py-4">Nenhum histórico de pagamentos encontrado.</p>
                         </CardContent>
                    )}
                </Card>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pedagogical Follow-up */}
                <Card className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-xl">
                    <CardHeader>
                        <CardTitle className="text-md font-bold">Diário de Classe & Evolução</CardTitle>
                        <CardDescription>O que você estudou em sua última aula concluída.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {latestClassDiary ? (
                             <div className="space-y-3">
                                 <div className="flex items-center gap-2 text-xs font-bold text-indigo-650 dark:text-indigo-400">
                                     <CheckCircle2 className="size-4" />
                                     Aula Concluída em {latestClassDiary.horario_fim_real ? new Date(latestClassDiary.horario_fim_real).toLocaleDateString('pt-BR') : ''}
                                 </div>
                                 <blockquote className="border-l-4 border-indigo-400 pl-4 py-1 italic text-sm text-slate-650 dark:text-slate-400">
                                     "{latestClassDiary.conteudo_ministrado}"
                                 </blockquote>
                             </div>
                        ) : (
                             <p className="text-slate-400 text-sm">Nenhum registro de aula concluída encontrado ainda.</p>
                        )}
                        <Button variant="outline" className="mt-4 w-full font-bold text-xs" disabled>
                            <MessageSquare className="size-4 mr-2 text-indigo-500"/> Falar com Mentor (Em breve)
                        </Button>
                    </CardContent>
                </Card>
                
                {/* Materials */}
                <Card className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-xl">
                    <CardHeader>
                        <CardTitle className="text-md font-bold">Material de Estudo</CardTitle>
                        <CardDescription>Arquivos, áudios e cifras compartilhadas pelo professor.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-center h-28 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-md">
                           <p className="text-xs text-slate-400">Em breve o professor poderá fazer upload de arquivos diretamente aqui...</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
