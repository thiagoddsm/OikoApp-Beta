'use client';
import React, { useMemo, useState } from 'react';
import { useVolunteering, type EnrollmentRequest } from '@/contexts/volunteering-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Loader2, 
  CheckCircle, 
  Trash2, 
  UserX, 
  BookOpen, 
  Users, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2, 
  XCircle,
  AlertCircle,
  GraduationCap
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

import { useDoc } from '@/firebase';
import { sendEnrollmentMessage } from '@/app/actions/whatsapp-actions';
import { useCoursesData, useMembersData } from "@/hooks/useDomainData";

export function EnrollmentRequestsList({ courseId }: { courseId?: string | string[] }) {
    const { courses, classes, enrollmentRequests } = useCoursesData();
    const { users } = useMembersData();

    const { approveEnrollmentRequest, updateEnrollmentRequest, deleteEnrollmentRequest, isLoading } = useVolunteering();
    const { toast } = useToast();
    
    // Estados locais de filtro e controle
    const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');
    const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('pending');
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [selectedClassMap, setSelectedClassMap] = useState<Record<string, string>>({});
    const [isActionInProgress, setIsActionInProgress] = useState<string | null>(null);

    // Cursos disponíveis para o dropdown de filtro
    const availableCoursesForFilter = useMemo(() => {
        if (!courses) return [];
        return [...courses].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }, [courses]);

    // Resumo de contadores gerais
    const stats = useMemo(() => {
        if (!enrollmentRequests) return { pending: 0, approved: 0, rejected: 0, total: 0 };
        const relevant = enrollmentRequests.filter(r => {
            if (!courseId) return true;
            if (Array.isArray(courseId)) return courseId.includes(r.courseId);
            return r.courseId === courseId;
        });

        return {
            pending: relevant.filter(r => r.status === 'pending').length,
            approved: relevant.filter(r => r.status === 'approved').length,
            rejected: relevant.filter(r => r.status === 'rejected').length,
            total: relevant.length
        };
    }, [enrollmentRequests, courseId]);

    // Lista de solicitações filtrada e ordenada
    const filteredRequests = useMemo(() => {
        if (!enrollmentRequests) return [];
        return enrollmentRequests
            .filter(r => {
                // 1. Filtro pela prop courseId
                if (courseId) {
                    if (Array.isArray(courseId)) {
                        if (!courseId.includes(r.courseId)) return false;
                    } else if (r.courseId !== courseId) {
                        return false;
                    }
                }

                // 2. Filtro do dropdown por curso selecionado
                if (selectedCourseFilter !== 'all' && r.courseId !== selectedCourseFilter) {
                    return false;
                }

                // 3. Filtro por status
                if (selectedStatusFilter !== 'all' && r.status !== selectedStatusFilter) {
                    return false;
                }

                // 4. Filtro por busca de texto (Nome ou Telefone)
                if (searchTerm.trim()) {
                    const search = searchTerm.toLowerCase();
                    const nameMatch = (r.name || '').toLowerCase().includes(search);
                    const phoneMatch = String(r.phone || '').includes(search);
                    const emailMatch = (r.email || '').toLowerCase().includes(search);
                    if (!nameMatch && !phoneMatch && !emailMatch) return false;
                }

                return true;
            })
            .sort((a, b) => {
                const getMillis = (t: any) => {
                    if (!t) return 0;
                    if (typeof t.toMillis === 'function') return t.toMillis();
                    if (typeof t.toDate === 'function') return t.toDate().getTime();
                    if (t._seconds) return t._seconds * 1000;
                    if (t.seconds) return t.seconds * 1000;
                    return 0;
                };
                return getMillis(b.createdAt) - getMillis(a.createdAt);
            });
    }, [enrollmentRequests, courseId, selectedCourseFilter, selectedStatusFilter, searchTerm]);

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

    const getPrerequisiteEvaluation = (req: EnrollmentRequest) => {
        const targetCourse = courses?.find(c => c.id === req.courseId);
        if (!targetCourse?.prerequisiteCourseId) {
            return { status: 'none' as const };
        }

        const prereqCourse = courses?.find(c => c.id === targetCourse.prerequisiteCourseId);
        const prereqCourseName = prereqCourse?.name || (prereqCourse as any)?.title || 'Curso anterior';
        const minRate = prereqCourse?.minAttendanceApproval || 75;

        // Match user by ID, email, or phone
        const cleanPhone = (p?: any) => String(p || '').replace(/\D/g, '').slice(-9);
        const reqCleanPhone = cleanPhone(req.phone);
        const reqCleanEmail = (req.email || '').trim().toLowerCase();

        const matchedUser = (users || []).find((u: any) => {
            if ((req as any).userId && u.id === (req as any).userId) return true;
            if (req.volunteerId && u.id === req.volunteerId) return true;
            if (reqCleanEmail && u.email && u.email.trim().toLowerCase() === reqCleanEmail) return true;
            if (reqCleanPhone && reqCleanPhone.length >= 8 && cleanPhone(u.phone) === reqCleanPhone) return true;
            return false;
        });

        if (!matchedUser) {
            return { status: 'not_found' as const, prereqCourseName };
        }

        // Check classes of prerequisite course where user is a student
        const prereqClasses = (classes || []).filter(c => 
            c.courseId === targetCourse.prerequisiteCourseId && 
            c.students?.includes(matchedUser.id)
        );

        if (prereqClasses.length > 0) {
            // Find most complete / recent class
            const cls = prereqClasses[prereqClasses.length - 1];
            const sessions = (cls.attendance || []).filter(a => !a.isRepositionOnly);
            let presentCount = 0;
            sessions.forEach(sess => {
                const inPerson = sess.presentStudentIds?.includes(matchedUser.id);
                const online = sess.onlineStudentIds?.includes(matchedUser.id);
                const repos = sess.repositions?.some((r: any) => r.studentId === matchedUser.id);
                if (inPerson || online || repos) presentCount++;
            });

            const totalSessions = sessions.length;
            const rate = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0;
            const isApprovedJourney = matchedUser.journey?.courseStatus?.[targetCourse.prerequisiteCourseId] === 'approved';

            if (cls.status === 'completed' || isApprovedJourney) {
                if (rate >= minRate || isApprovedJourney) {
                    return {
                        status: 'approved' as const,
                        prereqCourseName,
                        rate,
                        minRate,
                        className: cls.name,
                        matchedUserName: matchedUser.name
                    };
                } else {
                    return {
                        status: 'failed' as const,
                        prereqCourseName,
                        rate,
                        minRate,
                        className: cls.name,
                        matchedUserName: matchedUser.name
                    };
                }
            } else {
                return {
                    status: 'in_progress' as const,
                    prereqCourseName,
                    rate,
                    minRate,
                    className: cls.name,
                    matchedUserName: matchedUser.name
                };
            }
        }

        // If no classes found in Firestore, check if user has approved status in journey
        if (matchedUser.journey?.courseStatus?.[targetCourse.prerequisiteCourseId] === 'approved') {
            return {
                status: 'approved' as const,
                prereqCourseName,
                rate: 100,
                minRate,
                matchedUserName: matchedUser.name
            };
        }

        return {
            status: 'not_enrolled' as const,
            prereqCourseName,
            matchedUserName: matchedUser.name
        };
    };

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div className="space-y-4">
            {/* Barra de Filtros e Busca */}
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex flex-wrap items-center gap-3 flex-1">
                    {/* Busca por Nome/Telefone */}
                    <div className="relative min-w-[200px] flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar interessado ou telefone..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 h-9 text-xs bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                        />
                    </div>

                    {/* Filtro por Curso (caso não esteja fixo por prop) */}
                    {!courseId && (
                        <div className="min-w-[190px]">
                            <Select value={selectedCourseFilter} onValueChange={setSelectedCourseFilter}>
                                <SelectTrigger className="h-9 text-xs bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                                    <div className="flex items-center gap-1.5 truncate">
                                        <BookOpen className="size-3.5 text-primary shrink-0" />
                                        <SelectValue placeholder="Filtrar por Curso" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all" className="text-xs font-semibold">Todos os Cursos</SelectItem>
                                    {availableCoursesForFilter.map(c => (
                                        <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Filtro por Status */}
                    <div className="min-w-[160px]">
                        <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
                            <SelectTrigger className="h-9 text-xs bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                                <div className="flex items-center gap-1.5">
                                    <Filter className="size-3.5 text-muted-foreground shrink-0" />
                                    <SelectValue placeholder="Filtrar por Status" />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="pending" className="text-xs">
                                    Pendentes ({stats.pending})
                                </SelectItem>
                                <SelectItem value="approved" className="text-xs">
                                    Aprovados ({stats.approved})
                                </SelectItem>
                                <SelectItem value="rejected" className="text-xs">
                                    Reprovados ({stats.rejected})
                                </SelectItem>
                                <SelectItem value="all" className="text-xs font-semibold">
                                    Todos ({stats.total})
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Badge de Total Encontrado */}
                <div className="flex items-center gap-2 self-end md:self-center">
                    <span className="text-xs text-muted-foreground font-medium">
                        Exibindo <strong className="text-slate-900 dark:text-slate-100">{filteredRequests.length}</strong> de {stats.total}
                    </span>
                </div>
            </div>

            {/* Tabela de Solicitações */}
            <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
                <div className="overflow-x-auto w-full">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="w-[120px]">Data</TableHead>
                                <TableHead className="min-w-[180px]">Interessado</TableHead>
                                <TableHead className="min-w-[240px]">Curso e Turma Desejada</TableHead>
                                <TableHead className="min-w-[220px]">Pré-requisito / Histórico</TableHead>
                                <TableHead className="w-[110px]">Status</TableHead>
                                <TableHead className="text-right w-[180px]">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredRequests.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-36 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <Filter className="size-8 text-slate-300 dark:text-slate-700" />
                                            <p className="text-sm font-medium">Nenhuma solicitação encontrada com os filtros selecionados.</p>
                                            {(selectedCourseFilter !== 'all' || selectedStatusFilter !== 'all' || searchTerm) && (
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    onClick={() => {
                                                        setSelectedCourseFilter('all');
                                                        setSelectedStatusFilter('all');
                                                        setSearchTerm('');
                                                    }}
                                                    className="text-xs text-primary"
                                                >
                                                    Limpar Filtros
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredRequests.map(req => {
                                    const targetCourse = courses.find(c => c.id === req.courseId);
                                    const courseName = targetCourse?.name || (targetCourse as any)?.title || (req as any).courseName || 'Curso não identificado';
                                    const courseClasses = classes.filter(c => c.courseId === req.courseId);
                                    const isProcessing = isActionInProgress === req.id;
                                    const prereqEval = getPrerequisiteEvaluation(req);

                                    return (
                                    <TableRow key={req.id} className={req.status === 'pending' ? 'bg-primary/[0.02] hover:bg-primary/[0.04]' : 'hover:bg-muted/50'}>
                                        {/* Data */}
                                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap align-middle">
                                            {req.createdAt ? format(req.createdAt.toDate(), 'dd/MM/yy HH:mm', { locale: ptBR }) : '—'}
                                        </TableCell>

                                        {/* Interessado */}
                                        <TableCell className="align-middle">
                                            <div className="font-bold text-sm text-slate-900 dark:text-slate-100">{req.name}</div>
                                            <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                                {req.phone || 'Sem telefone'}
                                            </div>
                                        </TableCell>

                                        {/* Curso e Turma Desejada */}
                                        <TableCell className="align-middle">
                                            <div className="flex flex-col gap-2 py-1">
                                                {/* Nome do Curso com Destaque */}
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800 text-xs font-bold px-2.5 py-0.5 flex items-center gap-1.5">
                                                        <BookOpen className="size-3 shrink-0" />
                                                        <span>{courseName}</span>
                                                    </Badge>
                                                </div>

                                                {/* Seletor de Turma ou Turma Vinculada */}
                                                {req.status === 'pending' ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <Select 
                                                            value={selectedClassMap[req.id] || req.classId || 'null'} 
                                                            onValueChange={(v) => handleClassSelect(req.id, v)}
                                                        >
                                                            <SelectTrigger className="w-full max-w-[280px] h-8 text-xs bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm">
                                                                <div className="flex items-center gap-1.5 truncate">
                                                                    <Users className="size-3 text-muted-foreground shrink-0" />
                                                                    <SelectValue placeholder="Selecionar turma..." />
                                                                </div>
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="null" className="text-xs text-muted-foreground">Definir depois</SelectItem>
                                                                {courseClasses.map(c => (
                                                                    <SelectItem key={c.id} value={c.id} className="text-xs">
                                                                        {c.name} {c.dayOfWeek ? `(${c.dayOfWeek})` : ''}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                ) : (
                                                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                                                        <Users className="size-3" />
                                                        <span>Turma:</span>
                                                        <strong className="text-slate-800 dark:text-slate-200">
                                                            {courseClasses.find(c => c.id === req.classId)?.name || 'Sem turma'}
                                                        </strong>
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>

                                        {/* Pré-requisito / Histórico */}
                                        <TableCell className="align-middle">
                                            {(() => {
                                                if (prereqEval.status === 'none') {
                                                    return (
                                                        <span className="text-xs text-muted-foreground italic flex items-center gap-1">
                                                            — Sem pré-requisito
                                                        </span>
                                                    );
                                                }

                                                if (prereqEval.status === 'approved') {
                                                    return (
                                                        <div className="flex flex-col gap-1 py-1">
                                                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700 text-xs font-bold px-2 py-0.5 w-fit flex items-center gap-1 shadow-xs">
                                                                <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                                                <span>Aprovado em {prereqEval.prereqCourseName}</span>
                                                            </Badge>
                                                            <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium pl-0.5 flex items-center gap-1">
                                                                Freq: <strong>{prereqEval.rate !== undefined ? `${prereqEval.rate}%` : '100%'}</strong>
                                                                {prereqEval.className && <span className="text-muted-foreground">({prereqEval.className})</span>}
                                                            </span>
                                                        </div>
                                                    );
                                                }

                                                if (prereqEval.status === 'in_progress') {
                                                    return (
                                                        <div className="flex flex-col gap-1 py-1">
                                                            <Badge className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700 text-xs font-bold px-2 py-0.5 w-fit flex items-center gap-1 shadow-xs">
                                                                <Clock className="size-3 text-amber-600 dark:text-amber-400 shrink-0" />
                                                                <span>Cursando {prereqEval.prereqCourseName}</span>
                                                            </Badge>
                                                            <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium pl-0.5 flex items-center gap-1">
                                                                Freq. atual: <strong>{prereqEval.rate}%</strong>
                                                                {prereqEval.className && <span className="text-muted-foreground">({prereqEval.className})</span>}
                                                            </span>
                                                        </div>
                                                    );
                                                }

                                                if (prereqEval.status === 'failed') {
                                                    return (
                                                        <div className="flex flex-col gap-1 py-1">
                                                            <Badge className="bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700 text-xs font-bold px-2 py-0.5 w-fit flex items-center gap-1 shadow-xs">
                                                                <XCircle className="size-3 text-rose-600 dark:text-rose-400 shrink-0" />
                                                                <span>Reprovado em {prereqEval.prereqCourseName}</span>
                                                            </Badge>
                                                            <span className="text-[11px] text-rose-700 dark:text-rose-400 font-medium pl-0.5">
                                                                Freq: <strong>{prereqEval.rate}%</strong> (Mín: {prereqEval.minRate}%)
                                                            </span>
                                                        </div>
                                                    );
                                                }

                                                if (prereqEval.status === 'not_enrolled') {
                                                    return (
                                                        <div className="flex flex-col gap-0.5 py-1">
                                                            <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-300 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700 text-xs font-semibold px-2 py-0.5 w-fit flex items-center gap-1">
                                                                <AlertCircle className="size-3 text-amber-500 shrink-0" />
                                                                <span>Não cursou {prereqEval.prereqCourseName}</span>
                                                            </Badge>
                                                            <span className="text-[10px] text-muted-foreground pl-0.5">
                                                                Exige aprovação prévia
                                                            </span>
                                                        </div>
                                                    );
                                                }

                                                // not_found
                                                return (
                                                    <div className="flex flex-col gap-0.5 py-1">
                                                        <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 text-xs font-medium px-2 py-0.5 w-fit flex items-center gap-1">
                                                            <Users className="size-3 text-slate-400 shrink-0" />
                                                            <span>Sem histórico ({prereqEval.prereqCourseName})</span>
                                                        </Badge>
                                                        <span className="text-[10px] text-muted-foreground pl-0.5">
                                                            Primeiro cadastro
                                                        </span>
                                                    </div>
                                                );
                                            })()}
                                        </TableCell>

                                    {/* Ações */}
                                    <TableCell className="text-right align-middle">
                                        <div className="flex justify-end gap-1.5">
                                            {req.status === 'pending' && (
                                                <>
                                                    <Button 
                                                        variant="default" 
                                                        size="sm" 
                                                        onClick={() => handleApprove(req)} 
                                                        className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-3 text-xs font-bold shadow-sm"
                                                        disabled={!!isProcessing}
                                                    >
                                                        {isProcessing ? <Loader2 className="animate-spin size-3.5" /> : <CheckCircle className="size-3.5" />}
                                                        <span className="ml-1.5 hidden md:inline">Aprovar</span>
                                                    </Button>
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm" 
                                                        onClick={() => handleReject(req)} 
                                                        className="h-8 px-3 text-xs font-bold border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-950/30"
                                                        disabled={!!isProcessing}
                                                    >
                                                        {isProcessing ? <Loader2 className="animate-spin size-3.5" /> : <UserX className="size-3.5" />}
                                                        <span className="ml-1.5 hidden md:inline">Reprovar</span>
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
                                                {isProcessing ? <Loader2 className="animate-spin size-3.5" /> : <Trash2 className="size-3.5" />}
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
        </div>
    );
}
