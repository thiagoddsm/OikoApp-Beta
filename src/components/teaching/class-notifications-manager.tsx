'use client';
import React, { useMemo, useState } from 'react';
import { useVolunteering, type Class, type User, type Course } from '@/contexts/volunteering-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Loader2, Send, Filter, CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { getWhatsAppClient, formatWhatsAppNumber, TypeMessage } from '@/lib/whatsapp';

interface ClassNotificationsManagerProps {
    classData: Class;
    courseData: Course;
}

export function ClassNotificationsManager({ classData, courseData }: ClassNotificationsManagerProps) {
    const { users, isLoading } = useVolunteering();
    const { toast } = useToast();
    
    const [targetFilter, setTargetFilter] = useState('all');
    const [messageText, setMessageText] = useState('Olá [Nome],\n\nPassando para informar que...');
    const [isSending, setIsSending] = useState(false);
    const [sentCount, setSentCount] = useState(0);
    const [totalToSend, setTotalToSend] = useState(0);

    const minAttendanceApproval = courseData.minAttendanceApproval || 75;

    const studentStatuses = useMemo(() => {
        if (!users || !classData?.students) return [];
        const studentSet = new Set(classData.students);
        const students = users.filter(u => studentSet.has(u.id));
        
        // Calcular faltas e presenças baseadas no ClassPerformanceReport
        let totalClassesTaken = 0;
        const occurrences = new Set<string>();
        
        // Pega as datas com aulas que já têm registro de presença
        if (classData.attendance) {
            classData.attendance.forEach(a => occurrences.add(a.date));
        }
        totalClassesTaken = occurrences.size;

        const results = students.map(student => {
            let presentCount = 0;
            const missedDates: string[] = [];

            if (classData.attendance) {
                classData.attendance.forEach(record => {
                    const isPresent = record.presentStudentIds?.includes(student.id) || record.onlineStudentIds?.includes(student.id);
                    if (isPresent) {
                        presentCount++;
                    } else {
                        // Formata a data (YYYY-MM-DD para DD/MM)
                        try {
                            const [year, month, day] = record.date.split('-');
                            missedDates.push(`${day}/${month}`);
                        } catch(e) {
                            missedDates.push(record.date);
                        }
                    }
                });
            }

            const attendancePercent = totalClassesTaken > 0 ? (presentCount / totalClassesTaken) * 100 : 0;
            
            // Regra: Aprovado se frequência for >= mínimo
            const isApproved = attendancePercent >= minAttendanceApproval;
            
            return {
                ...student,
                attendancePercent,
                isApproved,
                hasPhone: !!student.phone,
                missedDates
            };
        });

        results.sort((a, b) => a.name.localeCompare(b.name));
        return results;
    }, [users, classData, minAttendanceApproval]);

    const filteredStudents = useMemo(() => {
        return studentStatuses.filter(s => {
            if (targetFilter === 'all') return true;
            if (targetFilter === 'approved') return s.isApproved;
            if (targetFilter === 'failed') return !s.isApproved;
            return s.id === targetFilter; // Caso seja o ID de um aluno específico
        });
    }, [studentStatuses, targetFilter]);

    const handleSendNotifications = async () => {
        const recipients = filteredStudents.filter(s => s.hasPhone);
        if (recipients.length === 0) {
            toast({ variant: 'destructive', title: 'Nenhum destinatário válido', description: 'Nenhum aluno no filtro selecionado possui número de telefone cadastrado.' });
            return;
        }

        if (!messageText.trim()) {
            toast({ variant: 'destructive', title: 'Mensagem Vazia', description: 'Por favor, escreva uma mensagem antes de enviar.' });
            return;
        }

        if (!confirm(`Você está prestes a enviar uma mensagem no WhatsApp para ${recipients.length} aluno(s). Deseja continuar?`)) {
            return;
        }

        setIsSending(true);
        setTotalToSend(recipients.length);
        setSentCount(0);

        try {
            const waClient = await getWhatsAppClient();

            for (let i = 0; i < recipients.length; i++) {
                const student = recipients[i];
                const formattedPhone = formatWhatsAppNumber(student.phone);
                
                // Substituir a variável [Nome] e [Faltas]
                const firstName = student.name.split(' ')[0];
                const faltasText = student.missedDates.length > 0 
                    ? student.missedDates.join(', ') 
                    : 'Nenhuma falta registrada';

                let personalizedMessage = messageText
                    .replace(/\[Nome\]/gi, firstName)
                    .replace(/\[Faltas\]/gi, faltasText);

                await waClient.sendMessage({
                    type: TypeMessage.TEXT,
                    body: {
                        to: formattedPhone,
                        text: personalizedMessage
                    }
                });

                setSentCount(prev => prev + 1);
                
                // Pequeno delay para evitar bloqueio por spam (rate limit)
                if (i < recipients.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }

            toast({ title: 'Notificações Enviadas!', description: `Mensagem enviada com sucesso para ${recipients.length} aluno(s).` });
            setMessageText('Olá [Nome],\n\nPassando para informar que...');
        } catch (error) {
            console.error('Erro ao enviar mensagens em lote:', error);
            toast({ variant: 'destructive', title: 'Erro de Envio', description: 'Ocorreu um erro ao disparar algumas das mensagens. Verifique os logs.' });
        } finally {
            setIsSending(false);
            setTotalToSend(0);
        }
    };

    if (isLoading) {
        return <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 space-y-6">
                <div className="space-y-4 bg-muted/30 p-4 rounded-xl border">
                    <div>
                        <h3 className="font-bold flex items-center gap-2 mb-2">
                            <Filter className="size-4" /> Público-Alvo
                        </h3>
                        <Select value={targetFilter} onValueChange={setTargetFilter} disabled={isSending}>
                            <SelectTrigger className="bg-white">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos os Alunos</SelectItem>
                                <SelectItem value="approved">Apenas Aprovados (Freq. &gt;= {minAttendanceApproval}%)</SelectItem>
                                <SelectItem value="failed">Apenas Reprovados (Freq. &lt; {minAttendanceApproval}%)</SelectItem>
                                {studentStatuses.length > 0 && (
                                    <>
                                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-slate-50 mt-2 mb-1">
                                            Envio Individual
                                        </div>
                                        {studentStatuses.map(student => (
                                            <SelectItem key={student.id} value={student.id}>
                                                {student.name}
                                            </SelectItem>
                                        ))}
                                    </>
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="pt-2">
                        <h3 className="font-bold flex items-center gap-2 mb-2">
                            <Send className="size-4" /> Mensagem
                        </h3>
                        <Textarea 
                            rows={8} 
                            value={messageText} 
                            onChange={e => setMessageText(e.target.value)}
                            disabled={isSending}
                            className="bg-white resize-none text-sm"
                            placeholder="Escreva sua mensagem aqui..."
                        />
                        <p className="text-xs text-muted-foreground mt-2 italic space-y-1">
                            <span>Dica: Use variáveis mágicas para personalizar sua mensagem:</span><br/>
                            <span className="font-semibold text-primary">[Nome]</span> - Nome do aluno.<br/>
                            <span className="font-semibold text-primary">[Faltas]</span> - Lista de datas que o aluno faltou (ex: 05/03, 12/03).
                        </p>
                    </div>

                    <Button 
                        onClick={handleSendNotifications} 
                        disabled={isSending || filteredStudents.length === 0} 
                        className="w-full bg-emerald-600 hover:bg-emerald-700"
                    >
                        {isSending ? (
                            <><Loader2 className="mr-2 size-4 animate-spin" /> Enviando ({sentCount}/{totalToSend})...</>
                        ) : (
                            <><Send className="mr-2 size-4" /> Disparar para {filteredStudents.filter(s => s.hasPhone).length} aluno(s)</>
                        )}
                    </Button>
                </div>
            </div>

            <div className="md:col-span-2">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold">Resumo de Destinatários ({filteredStudents.length})</h3>
                    <Badge variant="outline" className="bg-slate-50">
                        {filteredStudents.filter(s => !s.hasPhone).length} sem WhatsApp
                    </Badge>
                </div>
                
                <div className="rounded-md border bg-card overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead>Aluno</TableHead>
                                <TableHead className="text-center">Frequência</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                                <TableHead className="text-center">WhatsApp</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredStudents.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">Nenhum aluno atende a este filtro.</TableCell>
                                </TableRow>
                            ) : (
                                filteredStudents.map((student) => {
                                    const avatar = PlaceHolderImages.find(p => p.id === 'avatar-1');
                                    return (
                                        <TableRow key={student.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-8 w-8">
                                                        {avatar && <AvatarImage src={avatar.imageUrl} alt={student.name} />}
                                                        <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-sm">{student.name}</span>
                                                        <span className="text-xs text-muted-foreground">{student.email || '-'}</span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center font-bold">
                                                {student.attendancePercent.toFixed(0)}%
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {student.isApproved ? (
                                                    <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-300">Aprovado</Badge>
                                                ) : (
                                                    <Badge variant="outline" className="bg-red-50 text-red-800 border-red-200">Reprovado</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {student.hasPhone ? (
                                                    <CheckCircle2 className="size-4 text-emerald-500 mx-auto" />
                                                ) : (
                                                    <AlertCircle className="size-4 text-amber-500 mx-auto" title="Sem telefone" />
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
