
'use client';
import React, { useMemo, useState } from 'react';
import { useVolunteering, type EnrollmentRequest } from '@/contexts/volunteering-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, Clock, UserPlus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

export function EnrollmentRequestsList({ courseId }: { courseId: string }) {
    const { enrollmentRequests, classes, updateClass, updateEnrollmentRequest, deleteEnrollmentRequest, isLoading } = useVolunteering();
    const { toast } = useToast();
    const [selectedClassMap, setSelectedClassMap] = useState<Record<string, string>>({});

    const requests = useMemo(() => {
        return enrollmentRequests
            .filter(r => r.courseId === courseId)
            .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
    }, [enrollmentRequests, courseId]);

    const courseClasses = useMemo(() => {
        return classes.filter(c => c.courseId === courseId);
    }, [classes, courseId]);

    const handleClassSelect = (requestId: string, classId: string) => {
        setSelectedClassMap(prev => ({ ...prev, [requestId]: classId }));
    };

    const handleApprove = async (request: EnrollmentRequest) => {
        const classId = selectedClassMap[request.id] || request.classId;
        
        if (!classId || classId === 'null') {
            toast({ variant: 'destructive', title: 'Turma Necessária', description: 'Por favor, selecione uma turma antes de aprovar.' });
            return;
        }

        const selectedClass = classes.find(c => c.id === classId);
        if (!selectedClass) return;

        // 1. In a real scenario, we would create a User here if they don't exist.
        // For now, we simulate the approval by updating the request and class.
        
        try {
            // Update the request status
            await updateEnrollmentRequest(request.id, { status: 'approved', classId });
            
            // Note: In this prototype, we don't have a direct "add student to class" that creates users.
            // We just notify the success.
            toast({ title: 'Solicitação Aprovada!', description: `${request.name} foi marcado como aprovado.` });
        } catch (error) {
            console.error(error);
        }
    };

    const handleReject = async (requestId: string) => {
        if (confirm('Deseja realmente rejeitar esta solicitação?')) {
            await updateEnrollmentRequest(requestId, { status: 'rejected' });
        }
    };

    const handleDelete = async (requestId: string) => {
        if (confirm('Deseja excluir permanentemente este registro?')) {
            await deleteEnrollmentRequest(requestId);
        }
    };

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Solicitações Recebidas</h3>
                <Badge variant="secondary">{requests.length} total</Badge>
            </div>
            
            <div className="rounded-lg border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead>Interessado</TableHead>
                            <TableHead>Turma Desejada</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {requests.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                    Nenhuma solicitação pendente para este curso.
                                </TableCell>
                            </TableRow>
                        ) : (
                            requests.map(req => (
                                <TableRow key={req.id}>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {format(req.createdAt.toDate(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-medium">{req.name}</div>
                                        <div className="text-xs text-muted-foreground">{req.phone}</div>
                                    </TableCell>
                                    <TableCell>
                                        {req.status === 'pending' ? (
                                            <Select 
                                                value={selectedClassMap[req.id] || req.classId || 'null'} 
                                                onValueChange={(v) => handleClassSelect(req.id, v)}
                                            >
                                                <SelectTrigger className="w-[200px]">
                                                    <SelectValue placeholder="Selecionar turma" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="null">Definir depois</SelectItem>
                                                    {courseClasses.map(c => (
                                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <span className="text-sm">
                                                {courseClasses.find(c => c.id === req.classId)?.name || '-'}
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={req.status === 'pending' ? 'outline' : req.status === 'approved' ? 'default' : 'destructive'}>
                                            {req.status === 'pending' ? 'Pendente' : req.status === 'approved' ? 'Aprovado' : 'Rejeitado'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            {req.status === 'pending' && (
                                                <>
                                                    <Button variant="ghost" size="icon" onClick={() => handleApprove(req)} className="text-green-600">
                                                        <CheckCircle className="size-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleReject(req.id)} className="text-red-600">
                                                        <XCircle className="size-4" />
                                                    </Button>
                                                </>
                                            )}
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(req.id)}>
                                                <Trash2 className="size-4 text-muted-foreground" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
