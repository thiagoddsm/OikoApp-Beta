'use client';
import React, { useMemo, useState } from 'react';
import { useVolunteering, type EnrollmentRequest } from '@/contexts/volunteering-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, Trash2, UserX } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

import { useDoc } from '@/firebase';
import { sendEnrollmentMessage } from '@/app/actions/whatsapp-actions';
import { useCoursesData } from "@/hooks/useDomainData";

export function EnrollmentRequestsList({ courseId }: { courseId?: string }) {
    const { courses, classes, enrollmentRequests, pedagogicalLogs, theoflixCourses } = useCoursesData();

    const { approveEnrollmentRequest, updateEnrollmentRequest, deleteEnrollmentRequest, isLoading } = useVolunteering();
    const { data: config } = useDoc<any>('config/notifications');
    const { toast } = useToast();
    const [selectedClassMap, setSelectedClassMap] = useState<Record<string, string>>({});
    const [isActionInProgress, setIsActionInProgress] = useState<string | null>(null);

    const requests = useMemo(() => {
        if (!enrollmentRequests) return [];
        return enrollmentRequests
            .filter(r => !courseId || r.courseId === courseId)
            .sort((a, b) => {
                const timeA = a.createdAt?.toMillis?.() || 0;
                const timeB = b.createdAt?.toMillis?.() || 0;
                return timeB - timeA;
            });
    }, [enrollmentRequests, courseId]);

    const handleClassSelect = (requestId: string, classId: string) => {
        setSelectedClassMap(prev => ({ ...prev, [requestId]: classId }));
    };

    const handleApprove = async (request: EnrollmentRequest) => {
        const targetClassId = selectedClassMap[request.id] || request.classId;
        
        if (!targetClassId || targetClassId === 'null') {
            toast({ variant: 'destructive', title: 'Turma Necessária', description: 'Por favor, selecione uma turma antes de aprovar.' });
            return;
        }

        setIsActionInProgress(request.id);
        
        try {
            await approveEnrollmentRequest(request.id, targetClassId);
            toast({ title: 'Inscrição Aprovada!', description: `${request.name} foi matriculado com sucesso.` });

            // Enviar notificação de matrícula
            const targetClass = classes?.find(c => c.id === targetClassId);
            const className = targetClass?.name || '';
            const targetCourse = courses?.find(c => c.id === request.courseId);
            const courseName = targetCourse?.name || 'Curso';
            
            if (request.name && request.phone) {
                // Se localizou o voluntário pelo e-mail ou nome para obter o ID
                sendEnrollmentMessage(
                    request.name, 
                    String(request.phone), 
                    courseName, 
                    className, 
                    undefined, 
                    request.courseId, 
                    request.volunteerId || undefined
                ).catch(err => {
                    console.error("Erro ao enviar mensagem de matrícula:", err);
                });
            }
        } catch (error) {
            console.error("Erro ao aprovar:", error);
            toast({ variant: 'destructive', title: 'Erro na Aprovação', description: 'Ocorreu uma falha ao vincular o aluno.' });
        } finally {
            setIsActionInProgress(null);
        }
    };

    const handleReject = async (request: EnrollmentRequest) => {
        if (!request.id) return;
        
        if (confirm(`Deseja realmente REPROVAR a solicitação de ${request.name}?`)) {
            setIsActionInProgress(request.id);
            try {
                await updateEnrollmentRequest(request.id, { status: 'rejected' });
                toast({ title: 'Solicitação Reprovada', description: 'O interessado foi marcado como reprovado/recusado.' });
            } catch (error) {
                console.error("Erro ao reprovar:", error);
                toast({ variant: 'destructive', title: 'Erro ao Reprovar', description: 'Não foi possível atualizar o status.' });
            } finally {
                setIsActionInProgress(null);
            }
        }
    };

    const handleDelete = async (request: EnrollmentRequest) => {
        if (!request.id) return;
        
        if (confirm(`Tem certeza que deseja EXCLUIR permanentemente o registro de ${request.name}?`)) {
            setIsActionInProgress(request.id);
            try {
                await deleteEnrollmentRequest(request.id);
                toast({ title: 'Solicitação Excluída', description: 'O registro foi removido permanentemente.' });
            } catch (error) {
                console.error("Erro ao excluir:", error);
                toast({ variant: 'destructive', title: 'Erro ao Excluir', description: 'Ocorreu uma falha ao remover o registro.' });
            } finally {
                setIsActionInProgress(null);
            }
        }
    };

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div className="space-y-4">
            <div className="rounded-lg border bg-card overflow-hidden shadow-sm">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead>Interessado</TableHead>
                            <TableHead>Curso e Turma Desejada</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {requests.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                    Nenhuma solicitação encontrada.
                                </TableCell>
                            </TableRow>
                        ) : (
                            requests.map(req => {
                                const courseClasses = classes.filter(c => c.courseId === req.courseId);
                                const isProcessing = isActionInProgress === req.id;

                                return (
                                <TableRow key={req.id} className={req.status === 'pending' ? 'bg-primary/5' : ''}>
                                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                        {req.createdAt ? format(req.createdAt.toDate(), 'dd/MM/yy HH:mm', { locale: ptBR }) : '...'}
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-bold">{req.name}</div>
                                        <div className="text-xs text-muted-foreground">{req.phone}</div>
                                    </TableCell>
                                    <TableCell>
                                        {req.status === 'pending' ? (
                                            <div className="flex flex-col gap-1.5">
                                                <Select 
                                                    value={selectedClassMap[req.id] || req.classId || 'null'} 
                                                    onValueChange={(v) => handleClassSelect(req.id, v)}
                                                >
                                                    <SelectTrigger className="w-[220px] h-8 text-xs">
                                                        <SelectValue placeholder="Selecionar turma..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="null">Definir depois</SelectItem>
                                                        {courseClasses.map(c => (
                                                            <SelectItem key={c.id} value={c.id}>{c.name} ({c.dayOfWeek})</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        ) : (
                                            <div className="text-sm">
                                                <p className="font-medium">{courseClasses.find(c => c.id === req.classId)?.name || 'Sem turma'}</p>
                                                <p className="text-[10px] text-muted-foreground uppercase">{req.courseId.substring(0,8)}</p>
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge 
                                            variant={req.status === 'pending' ? 'outline' : req.status === 'approved' ? 'default' : 'destructive'} 
                                            className={cn("font-black uppercase text-[10px]", req.status === 'approved' ? "bg-emerald-100 text-emerald-800" : "")}
                                        >
                                            {req.status === 'pending' ? 'Pendente' : req.status === 'approved' ? 'Aprovado' : 'Reprovado'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            {req.status === 'pending' && (
                                                <>
                                                    <Button 
                                                        variant="default" 
                                                        size="sm" 
                                                        onClick={() => handleApprove(req)} 
                                                        className="bg-green-600 hover:bg-green-700 h-8 shadow-sm"
                                                        disabled={!!isProcessing}
                                                    >
                                                        {isProcessing ? <Loader2 className="animate-spin size-4" /> : <CheckCircle className="size-4" />}
                                                        <span className="ml-2 hidden md:inline">Aprovar</span>
                                                    </Button>
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm" 
                                                        onClick={() => handleReject(req)} 
                                                        className="h-8 border-red-200 text-red-600 hover:bg-red-50"
                                                        disabled={!!isProcessing}
                                                    >
                                                        {isProcessing ? <Loader2 className="animate-spin size-4" /> : <UserX className="size-4" />}
                                                        <span className="ml-2 hidden md:inline">Reprovar</span>
                                                    </Button>
                                                </>
                                            )}
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={() => handleDelete(req)} 
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                                                title="Excluir Registro"
                                                disabled={!!isProcessing}
                                            >
                                                {isProcessing ? <Loader2 className="animate-spin size-4" /> : <Trash2 className="size-4" />}
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )})
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
