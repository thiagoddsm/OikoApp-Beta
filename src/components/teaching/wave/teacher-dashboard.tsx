'use client';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, Clock, DollarSign, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Placeholder data
const upcomingClasses = [
    { time: '15:00', student: 'Ana Clara', instrument: 'Piano', room: 'Sala 1' },
    { time: '16:00', student: 'Lucas Mendes', instrument: 'Violão', room: 'Sala 2' },
    { time: '17:00', student: 'Sofia Bernardes', instrument: 'Canto', room: 'Sala 4' },
];

const students = [
    { id: '1', name: 'Ana Clara', instrument: 'Piano', lastClass: '2 dias atrás', progress: 75 },
    { id: '2', name: 'Lucas Mendes', instrument: 'Violão', lastClass: 'Ontem', progress: 50 },
    { id: '3', name: 'Sofia Bernardes', instrument: 'Canto', lastClass: 'Hoje', progress: 90 },
    { id: '4', name: 'Gabriel Faria', instrument: 'Bateria', lastClass: '3 dias atrás', progress: 40 },
];

const financialSummary = {
    month: 'Outubro',
    totalReceived: 'R$ 1.850,00',
    pending: 'R$ 240,00',
};

export function TeacherDashboard() {
  return (
    <div className="space-y-6">
        {/* Welcome and Summary */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
             <Card>
                <CardHeader className="pb-2">
                    <CardDescription>Próxima Aula</CardDescription>
                    <CardTitle className="text-3xl">{upcomingClasses[0]?.time}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-xs text-muted-foreground">
                        com <strong>{upcomingClasses[0]?.student}</strong> na <strong>{upcomingClasses[0]?.room}</strong>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="pb-2">
                    <CardDescription>Total de Alunos</CardDescription>
                    <CardTitle className="text-3xl">{students.length}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-xs text-muted-foreground">
                        Gerenciando {students.length} jornadas musicais
                    </div>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="pb-2">
                    <CardDescription>Repasse (Mês)</CardDescription>
                    <CardTitle className="text-3xl">{financialSummary.totalReceived}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-xs text-muted-foreground">
                       {financialSummary.pending} pendentes de pagamento
                    </div>
                </CardContent>
            </Card>
        </div>
        
        {/* Schedule and Students */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Calendar className="size-5"/> Agenda do Dia</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-4">
                        {upcomingClasses.map(cls => (
                             <li key={cls.time} className="flex items-center gap-4">
                                <div className="flex flex-col items-center">
                                    <span className="font-bold text-lg">{cls.time.split(':')[0]}</span>
                                    <span className="text-xs text-muted-foreground">:{cls.time.split(':')[1]}</span>
                                </div>
                                <div className="border-l-2 border-primary pl-4">
                                    <p className="font-semibold">{cls.student}</p>
                                    <p className="text-sm text-muted-foreground">{cls.instrument} - {cls.room}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </CardContent>
            </Card>
             <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><User className="size-5"/> Meus Alunos</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Aluno</TableHead>
                                <TableHead>Instrumento</TableHead>
                                <TableHead>Última Aula</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {students.map(student => (
                                <TableRow key={student.id}>
                                    <TableCell className="font-medium">{student.name}</TableCell>
                                    <TableCell><Badge variant="outline">{student.instrument}</Badge></TableCell>
                                    <TableCell className="text-muted-foreground">{student.lastClass}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm">
                                            <BookOpen className="size-4 mr-2"/>
                                            Diário
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
