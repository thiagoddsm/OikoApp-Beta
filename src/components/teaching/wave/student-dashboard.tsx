'use client';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, DollarSign, Book, Download, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';

// Placeholder data
const studentData = {
    name: 'Ana Clara',
    nextClass: {
        instrument: 'Piano',
        teacher: 'Prof. Ana',
        date: 'Amanhã',
        time: '15:00',
        room: 'Sala 1'
    },
    payment: {
        status: 'Pago',
        dueDate: '10/11/2024'
    },
    lastLog: "Praticamos as escalas maiores e a peça 'Para Elisa'. Ana está progredindo bem com a dinâmica.",
    materials: [
        { name: 'Escalas Maiores - PDF', url: '#' },
        { name: 'Partitura - Para Elisa', url: '#' },
    ]
};
const teacherAvatar = PlaceHolderImages.find(p => p.id === 'avatar-3');


export function StudentDashboard() {
    const paymentStatusConfig = {
        'Pago': 'bg-green-100 text-green-800',
        'Pendente': 'bg-yellow-100 text-yellow-800',
        'Atrasado': 'bg-red-100 text-red-800',
    };

  return (
    <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Next Class */}
            <Card className="md:col-span-2">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Calendar className="size-5"/> Próxima Aula</CardTitle>
                    <CardDescription>Seu próximo encontro musical agendado.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-6">
                    <div className="flex items-center gap-4">
                        {teacherAvatar && <Avatar className="w-16 h-16"><AvatarImage src={teacherAvatar.imageUrl} /><AvatarFallback>P</AvatarFallback></Avatar>}
                        <div>
                             <p className="text-sm text-muted-foreground">{studentData.nextClass.instrument}</p>
                            <p className="font-bold text-lg">{studentData.nextClass.teacher}</p>
                        </div>
                    </div>
                    <div className="space-y-3 text-sm">
                        <div className="flex items-center gap-2"><Clock className="size-4 text-muted-foreground"/> <span>{studentData.nextClass.date} às <strong>{studentData.nextClass.time}</strong></span></div>
                        <div className="flex items-center gap-2"><Calendar className="size-4 text-muted-foreground"/> <span>{studentData.nextClass.room}</span></div>
                    </div>
                </CardContent>
            </Card>

             {/* Payment Status */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><DollarSign className="size-5"/> Minha Mensalidade</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                    <Badge className={`text-base px-4 py-2 ${paymentStatusConfig[studentData.payment.status]}`}>
                        {studentData.payment.status}
                    </Badge>
                     <p className="text-xs text-muted-foreground mt-2">Vencimento: {studentData.payment.dueDate}</p>
                     <Button className="mt-4 w-full">Ver Histórico</Button>
                </CardContent>
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
                    <blockquote className="border-l-2 pl-6 italic text-muted-foreground">
                        {studentData.lastLog}
                    </blockquote>
                    <Button variant="outline" className="mt-4 w-full">
                        <MessageSquare className="size-4 mr-2"/> Falar com Professor
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
                    <ul className="space-y-3">
                        {studentData.materials.map(mat => (
                            <li key={mat.name} className="flex justify-between items-center bg-muted/50 p-3 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <Book className="size-5 text-primary"/>
                                    <span className="font-medium text-sm">{mat.name}</span>
                                </div>
                                <Button size="sm" variant="ghost" asChild>
                                    <a href={mat.url} target="_blank" rel="noopener noreferrer"><Download className="size-4"/></a>
                                </Button>
                            </li>
                        ))}
                    </ul>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
