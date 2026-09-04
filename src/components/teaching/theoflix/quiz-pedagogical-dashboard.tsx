'use client';

import React, { useState, useMemo } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { 
    Search, 
    Award, 
    CheckCircle2, 
    XCircle, 
    Calendar, 
    User, 
    BookOpen, 
    ChevronRight, 
    Clock, 
    Sparkles, 
    Filter, 
    TrendingUp, 
    BarChart,
    RefreshCw,
    GraduationCap,
    HelpCircle,
    UserCheck
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface QuizAttempt {
    id?: string;
    userId: string;
    userName: string;
    userEmail: string;
    courseId: string;
    courseTitle: string;
    episodeId: string;
    episodeTitle: string;
    score: number;
    minScore: number;
    approved: boolean;
    answers: (number | string)[];
    questions: {
        title: string;
        type: 'essay' | 'multiple';
        options?: string[];
        correctIndex?: number;
        obtainedScore?: number;
    }[];
    aiFeedback?: string | null;
    submittedAt: string;
}

export function QuizPedagogicalDashboard() {
    const { firestore } = useFirebase();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCourse, setSelectedCourse] = useState<string>('all');
    const [selectedStatus, setSelectedStatus] = useState<string>('all');
    const [selectedAttempt, setSelectedAttempt] = useState<QuizAttempt | null>(null);

    // Fetch quiz attempts
    const attemptsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'theoflix_quiz_attempts'), orderBy('submittedAt', 'desc'));
    }, [firestore]);

    const { data: attempts, isLoading } = useCollection<QuizAttempt>(attemptsQuery);

    // Filter attempts
    const filteredAttempts = useMemo(() => {
        if (!attempts) return [];

        const term = searchTerm.toLowerCase().trim();
        return attempts.filter(attempt => {
            const matchesSearch = 
                (attempt.userName || '').toLowerCase().includes(term) ||
                (attempt.userEmail || '').toLowerCase().includes(term) ||
                (attempt.courseTitle || '').toLowerCase().includes(term) ||
                (attempt.episodeTitle || '').toLowerCase().includes(term);

            const matchesCourse = selectedCourse === 'all' || attempt.courseId === selectedCourse;
            
            const matchesStatus = 
                selectedStatus === 'all' ||
                (selectedStatus === 'approved' && attempt.approved) ||
                (selectedStatus === 'failed' && !attempt.approved);

            return matchesSearch && matchesCourse && matchesStatus;
        });
    }, [attempts, searchTerm, selectedCourse, selectedStatus]);

    // Unique courses for filter
    const coursesFilterOptions = useMemo(() => {
        if (!attempts) return [];
        const unique = new Map<string, string>();
        attempts.forEach(a => {
            if (a.courseId && a.courseTitle) {
                unique.set(a.courseId, a.courseTitle);
            }
        });
        return Array.from(unique.entries()).map(([id, title]) => ({ id, title }));
    }, [attempts]);

    // Get evolution history for the selected student
    const studentHistory = useMemo(() => {
        if (!selectedAttempt || !attempts) return [];
        return attempts
            .filter(a => a.userId === selectedAttempt.userId)
            .sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());
    }, [selectedAttempt, attempts]);

    // General Stats
    const stats = useMemo(() => {
        if (!attempts) return { total: 0, approvedRate: 0, totalApproved: 0 };
        const total = attempts.length;
        const totalApproved = attempts.filter(a => a.approved).length;
        const approvedRate = total > 0 ? Math.round((totalApproved / total) * 100) : 0;
        return { total, approvedRate, totalApproved };
    }, [attempts]);

    const formatDate = (isoString: string) => {
        try {
            const date = new Date(isoString);
            return date.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return isoString;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header Cards / Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    <CardContent className="pt-6">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total de Tentativas</p>
                                <h3 className="text-2xl font-bold mt-1 text-slate-900 dark:text-slate-50">{isLoading ? <RefreshCw className="h-5 w-5 animate-spin text-slate-400" /> : stats.total}</h3>
                            </div>
                            <div className="p-3 bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-lg">
                                <BarChart className="h-6 w-6" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    <CardContent className="pt-6">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Tentativas Aprovadas</p>
                                <h3 className="text-2xl font-bold mt-1 text-slate-900 dark:text-slate-50">{isLoading ? <RefreshCw className="h-5 w-5 animate-spin text-slate-400" /> : stats.totalApproved}</h3>
                            </div>
                            <div className="p-3 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-lg">
                                <UserCheck className="h-6 w-6" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    <CardContent className="pt-6">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Taxa de Aprovação</p>
                                <h3 className="text-2xl font-bold mt-1 text-slate-900 dark:text-slate-50">{isLoading ? <RefreshCw className="h-5 w-5 animate-spin text-slate-400" /> : `${stats.approvedRate}%`}</h3>
                            </div>
                            <div className="p-3 bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-lg">
                                <TrendingUp className="h-6 w-6" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters Dashboard */}
            <Card className="border-slate-200 dark:border-slate-800">
                <CardHeader>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <Filter className="h-5 w-5 text-slate-500" /> Filtros e Busca
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Buscar por aluno, curso, episódio..."
                                className="pl-9 bg-slate-50 dark:bg-slate-900"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="w-full md:w-[220px]">
                            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                                <SelectTrigger className="bg-slate-50 dark:bg-slate-900">
                                    <SelectValue placeholder="Todos os Cursos" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos os Cursos</SelectItem>
                                    {coursesFilterOptions.map(course => (
                                        <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="w-full md:w-[180px]">
                            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                                <SelectTrigger className="bg-slate-50 dark:bg-slate-900">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos os Status</SelectItem>
                                    <SelectItem value="approved">Aprovados</SelectItem>
                                    <SelectItem value="failed">Não Aprovados</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Attempts Table */}
            <Card className="border-slate-200 dark:border-slate-800">
                <CardContent className="p-0">
                    <div className="overflow-x-auto w-full">
<Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50 dark:bg-slate-900/50">
                                <TableHead className="w-[200px]">Aluno</TableHead>
                                <TableHead>Curso & Vídeo</TableHead>
                                <TableHead className="text-center w-[100px]">Nota</TableHead>
                                <TableHead className="w-[120px]">Status</TableHead>
                                <TableHead className="w-[150px]">Data de Envio</TableHead>
                                <TableHead className="w-[60px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-10 text-slate-500">
                                        <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-slate-400" />
                                        Carregando tentativas...
                                    </TableCell>
                                </TableRow>
                            ) : filteredAttempts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-10 text-slate-500">
                                        Nenhuma tentativa encontrada com os filtros atuais.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredAttempts.map((attempt) => (
                                    <TableRow 
                                        key={attempt.id} 
                                        className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                                        onClick={() => setSelectedAttempt(attempt)}
                                    >
                                        <TableCell className="font-medium">
                                            <div>
                                                <p className="text-slate-900 dark:text-slate-100 font-semibold">{attempt.userName}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">{attempt.userEmail}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div>
                                                <p className="text-xs font-semibold text-primary/80 uppercase tracking-wider">{attempt.courseTitle}</p>
                                                <p className="text-slate-700 dark:text-slate-300 font-medium text-sm mt-0.5">{attempt.episodeTitle}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center font-bold">
                                            <span className={attempt.approved ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                                                {attempt.score}%
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            {attempt.approved ? (
                                                <Badge className="bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-400 hover:bg-emerald-100 border-emerald-200 dark:border-emerald-900 flex items-center gap-1 w-fit">
                                                    <CheckCircle2 className="h-3.5 w-3.5" /> Aprovado
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-400 hover:bg-rose-100 border-rose-200 dark:border-rose-900 flex items-center gap-1 w-fit">
                                                    <XCircle className="h-3.5 w-3.5" /> Reprovado
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-slate-500 dark:text-slate-400 text-sm">
                                            {formatDate(attempt.submittedAt)}
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">
                                                <ChevronRight className="h-5 w-5" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
</div>
                </CardContent>
            </Card>

            {/* Detailed Attempt Modal */}
            <Dialog open={selectedAttempt !== null} onOpenChange={(open) => !open && setSelectedAttempt(null)}>
                <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-6">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <GraduationCap className="h-6 w-6 text-primary" /> Relatório Detalhado do Quiz
                        </DialogTitle>
                        <DialogDescription>
                            Visualize o desempenho, respostas discursivas e a evolução pedagógica do estudante.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedAttempt && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden flex-1 mt-4">
                            {/* Left Side: Summary & Evolution History */}
                            <div className="lg:col-span-1 space-y-4 overflow-y-auto pr-2">
                                <Card className="border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                                            <User className="h-4 w-4 text-slate-500" /> Informações do Aluno
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3 text-sm">
                                        <div>
                                            <p className="text-xs text-slate-500 font-medium">Nome</p>
                                            <p className="font-semibold text-slate-900 dark:text-slate-100">{selectedAttempt.userName}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 font-medium">Email</p>
                                            <p className="text-slate-700 dark:text-slate-300 font-mono text-xs truncate">{selectedAttempt.userEmail}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 font-medium">Curso</p>
                                            <p className="text-slate-800 dark:text-slate-200 font-medium">{selectedAttempt.courseTitle}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 font-medium">Vídeo/Aula</p>
                                            <p className="text-slate-800 dark:text-slate-200 font-medium">{selectedAttempt.episodeTitle}</p>
                                        </div>
                                        <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800">
                                            <div>
                                                <p className="text-xs text-slate-500 font-medium">Acertos</p>
                                                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{selectedAttempt.score}%</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500 font-medium">Resultado</p>
                                                {selectedAttempt.approved ? (
                                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                                        <CheckCircle2 className="h-3.5 w-3.5" /> Aprovado
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400">
                                                        <XCircle className="h-3.5 w-3.5" /> Reprovado
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Evolution History */}
                                <Card className="border-slate-100 dark:border-slate-800">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                                            <TrendingUp className="h-4 w-4 text-slate-500" /> Histórico de Evolução
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <ScrollArea className="h-[200px] px-4 pb-4">
                                            <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                                                {studentHistory.map((historyItem, idx) => (
                                                    <div key={historyItem.id || idx} className="flex gap-4 relative">
                                                        <div className={`size-6 rounded-full shrink-0 border-2 z-10 flex items-center justify-center bg-white dark:bg-slate-950 ${
                                                            historyItem.approved 
                                                                ? "border-emerald-500 text-emerald-500" 
                                                                : "border-rose-500 text-rose-500"
                                                        }`}>
                                                            {historyItem.approved ? (
                                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                                            ) : (
                                                                <XCircle className="h-3.5 w-3.5" />
                                                            )}
                                                        </div>
                                                        <div className="flex-1 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg text-xs">
                                                            <div className="flex justify-between items-center mb-1">
                                                                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[120px]">
                                                                    {historyItem.episodeTitle}
                                                                </span>
                                                                <span className={`font-bold ${historyItem.approved ? "text-emerald-600" : "text-rose-600"}`}>
                                                                    {historyItem.score}%
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between text-slate-500 text-[10px]">
                                                                <span>Tentativa #{idx + 1}</span>
                                                                <span className="flex items-center gap-1">
                                                                    <Clock className="h-2.5 w-2.5" /> {new Date(historyItem.submittedAt).toLocaleDateString('pt-BR')}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </ScrollArea>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Right Side: Questions & Answers Details */}
                            <div className="lg:col-span-2 flex flex-col overflow-hidden">
                                <Card className="flex-1 flex flex-col overflow-hidden border-slate-200 dark:border-slate-800">
                                    <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                                        <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                                            <BookOpen className="h-4 w-4 text-slate-500" /> Respostas da Tentativa
                                        </CardTitle>
                                    </CardHeader>
                                    <ScrollArea className="flex-1 p-4">
                                        <div className="space-y-6 pr-2">
                                            {selectedAttempt.questions?.map((q, idx) => {
                                                const userAnswer = selectedAttempt.answers[idx];
                                                const isMultiple = q.type === 'multiple' || (q.options && q.options.length > 0);
                                                
                                                if (isMultiple) {
                                                    const isCorrect = userAnswer === q.correctIndex;
                                                    return (
                                                        <div key={idx} className="space-y-3 pb-6 border-b border-slate-100 dark:border-slate-800 last:border-0 last:pb-0">
                                                            <div className="flex items-start gap-2">
                                                                <span className="font-semibold text-sm text-slate-500 min-w-5">Q{idx + 1}.</span>
                                                                <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{q.title}</p>
                                                            </div>
                                                            
                                                            <div className="grid grid-cols-1 gap-2 pl-7">
                                                                {q.options?.map((opt, optIdx) => {
                                                                    const isUserChoice = Number(userAnswer) === optIdx;
                                                                    const isCorrectOption = q.correctIndex === optIdx;
                                                                    
                                                                    let optionStyle = "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300";
                                                                    if (isCorrectOption) {
                                                                        optionStyle = "bg-emerald-50 border-emerald-500 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-600 dark:text-emerald-300";
                                                                    } else if (isUserChoice && !isCorrect) {
                                                                        optionStyle = "bg-rose-50 border-rose-500 text-rose-800 dark:bg-rose-950/30 dark:border-rose-600 dark:text-rose-300";
                                                                    }

                                                                    return (
                                                                        <div 
                                                                            key={optIdx} 
                                                                            className={`p-2.5 rounded-lg border text-xs flex items-center justify-between font-medium ${optionStyle}`}
                                                                        >
                                                                            <span>{opt}</span>
                                                                            {isCorrectOption && (
                                                                                <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white font-bold py-0.5 px-1.5 text-[9px]">Gabarito</Badge>
                                                                            )}
                                                                            {isUserChoice && !isCorrectOption && (
                                                                                <Badge className="bg-rose-500 hover:bg-rose-500 text-white font-bold py-0.5 px-1.5 text-[9px]">Marcada</Badge>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    );
                                                } else {
                                                    // Essay / Discursive question
                                                    return (
                                                        <div key={idx} className="space-y-3 pb-6 border-b border-slate-100 dark:border-slate-800 last:border-0 last:pb-0">
                                                            <div className="flex items-start gap-2">
                                                                <span className="font-semibold text-sm text-slate-500 min-w-5">Q{idx + 1}.</span>
                                                                <div>
                                                                    <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{q.title}</p>
                                                                    <Badge className="mt-1 bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-950/50 text-[10px]">Questão Discursiva</Badge>
                                                                </div>
                                                            </div>
                                                            <div className="pl-7">
                                                                <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 text-sm whitespace-pre-wrap font-medium">
                                                                    {userAnswer ? String(userAnswer) : <span className="text-slate-400 italic">Nenhuma resposta enviada.</span>}
                                                                </div>
                                                                {q.obtainedScore !== undefined && (
                                                                    <div className="mt-1 flex items-center gap-1.5">
                                                                        <span className="text-xs text-slate-500 font-medium">Nota atribuída:</span>
                                                                        <Badge variant="outline" className={q.obtainedScore >= 70 ? "text-emerald-600 border-emerald-200 bg-emerald-50/50" : "text-rose-600 border-rose-200 bg-rose-50/50"}>
                                                                            {q.obtainedScore}%
                                                                        </Badge>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                            })}

                                            {selectedAttempt.aiFeedback && (
                                                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs">
                                                    <p className="font-black uppercase text-[10px] text-primary mb-1">Feedback de IA Consolidador:</p>
                                                    <p className="whitespace-pre-wrap font-medium">{selectedAttempt.aiFeedback}</p>
                                                </div>
                                            )}
                                        </div>
                                    </ScrollArea>
                                </Card>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
