
'use client';
import React, { useMemo, useState } from 'react';
import { useVolunteering, type EnrollmentRequest } from '@/contexts/volunteering-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, Trash2, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';

export function EnrollmentRequestsList({ courseId }: { courseId?: string }) {
    const { firestore } = useFirebase();
    const { enrollmentRequests, classes, updateEnrollmentRequest, deleteEnrollmentRequest, isLoading } = useVolunteering();
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
        if (!firestore) return;
        const targetClassId = selectedClassMap[request.id] || request.classId;
        
        if (!targetClassId || targetClassId === 'null') {
            toast({ variant: 'destructive', title: 'Turma Necessária', description: 'Por favor, selecione uma turma antes de aprovar.' });
            return;
        }

        const userId = (request as any).userId;
        if (!userId) {
            toast({ variant: 'destructive', title: 'Erro de Dados', description: 'Esta solicitação não possui um ID de usuário vinculado.' });
            return;
        }

        setIsActionInProgress(request.id);
        
        try {
            const classDocRef = doc(firestore, 'classes', targetClassId);
            await updateDoc(classDocRef, {
                students: arrayUnion(userId)
            });

            await updateEnrollmentRequest(request.id, { 
                status: 'approved', 
                classId: targetClassId 
            });
            
            toast({ title: 'Matrícula Efetivada!', description: `${request.name} agora faz parte da turma.` });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Erro na Aprovação', description: 'Ocorreu uma falha ao vincular o aluno à turma.' });
        } finally {
            setIsActionInProgress(null);
        }
    };

    const handleReject = async (requestId: string) => {
        if (confirm('Deseja realmente rejeitar esta solicitação?')) {
            await updateEnrollmentRequest(requestId, { status: 'rejected' });
            toast({ title: 'Solicitação Rejeitada' });
        }
    };

    const handleDelete = async (requestId: string) => {
        if (!requestId) return;
        
        if (confirm('Tem certeza que deseja excluir permanentemente esta solicitação? Esta ação não pode ser desfeita.')) {
            setIsActionInProgress(requestId);
            try {
                await deleteEnrollmentRequest(requestId);
                toast({
                    title: "Exclusão Iniciada",
                    description: "O registro está sendo removido do sistema."
                });
            } catch (error) {
                console.error("Erro ao excluir:", error);
                toast({ 
                    variant: 'destructive', 
                    title: 'Erro ao Excluir', 
                    description: 'Ocorreu uma falha técnica ao tentar remover o registro.' 
                });
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
            <div className="rounded-lg border bg-card overflow-hidden">
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
                                        {req.createdAt ? format(req.createdAt.toDate(), 'dd/MM/yy HH:mm', { locale: ptBR }) : 'Processando...'}
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
                                        <Badge variant={req.status === 'pending' ? 'outline' : req.status === 'approved' ? 'default' : 'destructive'} className="font-bold">
                                            {req.status === 'pending' ? 'Pendente' : req.status === 'approved' ? 'Aprovado' : 'Rejeitado'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            {req.status === 'pending' && (
                                                <>
                                                    <Button 
                                                        variant="default" 
                                                        size="sm" 
                                                        onClick={() => handleApprove(req)} 
                                                        className="bg-green-600 hover:bg-green-700 h-8"
                                                        disabled={isProcessing}
                                                    >
                                                        {isProcessing ? <Loader2 className="animate-spin size-4" /> : <CheckCircle className="size-4" />}
                                                        <span className="ml-2 hidden md:inline">Aprovar</span>
                                                    </Button>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        onClick={() => handleReject(req.id)} 
                                                        className="text-red-600 h-8 w-8"
                                                        disabled={isProcessing}
                                                    >
                                                        <XCircle className="size-4" />
                                                    </Button>
                                                </>
                                            )}
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={() => handleDelete(req.id)} 
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                                                title="Excluir Permanentemente"
                                                disabled={isProcessing}
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
