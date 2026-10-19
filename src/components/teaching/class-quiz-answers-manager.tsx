'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useFirebase } from '@/firebase';
import { collection, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { 
    type Class, 
    type Course, 
    useVolunteering, 
    getResolvedSchedule, 
    getCourseAttendanceMode 
} from '@/contexts/volunteering-context';
import { useMembersData } from '@/hooks/useDomainData';
import { useToast } from '@/hooks/use-toast';
import { 
    Sparkles, 
    Copy, 
    ExternalLink, 
    Search, 
    Award, 
    MessageSquare, 
    Calendar, 
    UserCheck, 
    CheckCircle2, 
    Clock, 
    Eye, 
    RefreshCw, 
    Heart, 
    Check, 
    HelpCircle,
    User,
    ArrowUpRight,
    Send,
    Filter,
    Layers,
    CalendarDays,
    BookOpen,
    Pencil
} from 'lucide-react';
import { LessonQuizEditorModal } from './lesson-quiz-editor-modal';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface QuizSubmission {
    id: string;
    studentName: string;
    email?: string;
    userId?: string;
    rede?: string;
    gcName?: string;
    courseId?: string;
    classId?: string;
    className?: string;
    lessonNumber?: number | string;
    lessonId?: string;
    sessionDate?: string;
    timestampRaw?: number;
    formattedDate?: string;
    status?: string;
    metodoPresenca?: string;
    xp?: number;
    discursiveAnswers?: Record<string, string | undefined>;
    answers?: Record<string, any>;
    createdAt?: any;
}

interface ClassQuizAnswersManagerProps {
    classData: Class;
    courseData?: Course | null;
}

export function ClassQuizAnswersManager({ classData, courseData }: ClassQuizAnswersManagerProps) {
    const { firestore } = useFirebase();
    const { users } = useMembersData();
    const { updateClass } = useVolunteering();
    const { toast } = useToast();

    const [submissionsMap, setSubmissionsMap] = useState<Map<string, QuizSubmission>>(new Map());
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSessionKey, setSelectedSessionKey] = useState<string>('todas');
    const [selectedSubmission, setSelectedSubmission] = useState<QuizSubmission | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);

    // Fonte única de verdade para o modo de presença
    const attendanceMode = getCourseAttendanceMode(courseData);
    const isQuizMode = attendanceMode === 'quiz';

    // Cronograma resolvido da turma para extração dinâmica das aulas
    const resolvedSchedule = useMemo(() => {
        return getResolvedSchedule(classData, courseData);
    }, [classData, courseData]);

    // Lista de sessões/aulas mapeadas a partir do cronograma
    const sessions = useMemo(() => {
        if (!resolvedSchedule || resolvedSchedule.length === 0) {
            const defaultDate = classData.startDate?.split('T')[0] || format(new Date(), 'yyyy-MM-dd');
            return [
                {
                    key: 'aula-1',
                    lessonNumber: 1,
                    dateStr: defaultDate,
                    title: 'Aula 1: Abertura',
                    label: `Aula 1 (${defaultDate})`
                }
            ];
        }

        return resolvedSchedule.map((item, idx) => {
            const lessonNum = item.syllabusOriginalIndex >= 0 ? item.syllabusOriginalIndex + 1 : idx + 1;
            const dateStr = item.dateStr?.split('T')[0] || '';
            let formattedDate = dateStr;
            try {
                if (dateStr) formattedDate = format(parseISO(dateStr), "dd/MM", { locale: ptBR });
            } catch (e) {}

            const moduleTitle = item.syllabusItem?.title || `Aula ${lessonNum}`;

            return {
                key: `aula-${lessonNum}-${dateStr || idx}`,
                lessonNumber: lessonNum,
                dateStr,
                title: `Aula ${lessonNum}: ${moduleTitle}`,
                label: `Aula ${lessonNum}: ${moduleTitle} (${formattedDate})`
            };
        });
    }, [resolvedSchedule, classData.startDate]);

    // Inicializa selecionando a sessão mais próxima de hoje se ainda estiver em 'todas'
    useEffect(() => {
        if (sessions.length > 0 && selectedSessionKey === 'todas') {
            const todayStr = format(new Date(), 'yyyy-MM-dd');
            const closest = sessions.find(s => s.dateStr === todayStr) || sessions[0];
            if (closest) {
                setSelectedSessionKey(closest.key);
            }
        }
    }, [sessions, selectedSessionKey]);

    const [isQuizEditorOpen, setIsQuizEditorOpen] = useState(false);

    const activeSession = useMemo(() => {
        if (selectedSessionKey === 'todas') return null;
        return sessions.find(s => s.key === selectedSessionKey) || null;
    }, [sessions, selectedSessionKey]);

    const activeLessonNumber = activeSession?.lessonNumber || 1;

    // Contagem de perguntas configuradas para a aula ativa
    const activeLessonQuestionsCount = useMemo(() => {
        // 1. Mapa lessonQuizzes
        const lq = courseData?.lessonQuizzes?.[String(activeLessonNumber)] || courseData?.lessonQuizzes?.[activeLessonNumber];
        if (lq && Array.isArray(lq.questions)) {
            return lq.questions.length;
        }
        // 2. Syllabus item
        if (courseData?.syllabus && Array.isArray(courseData.syllabus)) {
            const item = courseData.syllabus[activeLessonNumber - 1];
            if (item?.quiz && Array.isArray(item.quiz.questions)) {
                return item.quiz.questions.length;
            }
        }
        // 3. Fallback inteligente para Curso Apoiar
        const isApoiar = (courseData?.id && courseData.id.toLowerCase().includes('apoiar')) || 
                         (courseData?.name && courseData.name.toLowerCase().includes('apoiar'));
        if (isApoiar) {
            if (activeLessonNumber === 1) return 8;
            if (activeLessonNumber === 2) return 6;
        }
        return 0;
    }, [courseData, activeLessonNumber]);

    // Link do questionário parametrizado para os alunos desta turma e aula
    const quizUrl = useMemo(() => {
        if (typeof window === 'undefined') return '';
        const origin = window.location.origin;
        const courseId = courseData?.id || 'curso-apoiar';
        const classId = classData.id;
        const lessonNum = activeSession?.lessonNumber || 1;
        const sessionDate = activeSession?.dateStr || format(new Date(), 'yyyy-MM-dd');
        const courseName = encodeURIComponent(courseData?.name || 'Curso Presencial');

        // Suporta tanto o novo template genérico quanto o template da Aula 1
        return `${origin}/quiz-presencial.html?courseId=${courseId}&classId=${classId}&lesson=${lessonNum}&date=${sessionDate}&courseName=${courseName}`;
    }, [courseData?.id, courseData?.name, classData.id, activeSession]);

    // Listener em tempo real nas coleções do Firestore (desacoplada 'course_quiz_submissions' + legada 'apoiar_presencas')
    useEffect(() => {
        if (!firestore) return;
        setIsLoading(true);

        const currentMap = new Map<string, QuizSubmission>();

        const handleDocUpdate = (docId: string, rawData: any) => {
            const data = rawData as Omit<QuizSubmission, 'id'>;
            const matchesClass = data.classId === classData.id;
            const matchesCourse = courseData?.id && data.courseId === courseData.id;
            const isLegacyApoiar = (!data.classId || data.classId === 'aula-1') && 
                (courseData?.id === 'curso-apoiar' || courseData?.name?.toLowerCase().includes('apoiar'));

            if (matchesClass || matchesCourse || isLegacyApoiar) {
                currentMap.set(docId, {
                    ...data,
                    id: docId,
                });
            }
        };

        const handleDocRemove = (docId: string) => {
            currentMap.delete(docId);
        };

        // 1. Coleção genérica da plataforma
        const genericCol = collection(firestore, 'course_quiz_submissions');
        const unsubGeneric = onSnapshot(genericCol, (snap) => {
            snap.docChanges().forEach(change => {
                if (change.type === 'removed') {
                    handleDocRemove(change.doc.id);
                } else {
                    handleDocUpdate(change.doc.id, change.doc.data());
                }
            });
            setSubmissionsMap(new Map(currentMap));
            setIsLoading(false);
        }, (err) => {
            console.warn('Listener course_quiz_submissions warning:', err);
            setIsLoading(false);
        });

        // 2. Coleção legada para retrocompatibilidade sem perdas
        const legacyCol = collection(firestore, 'apoiar_presencas');
        const unsubLegacy = onSnapshot(legacyCol, (snap) => {
            snap.docChanges().forEach(change => {
                if (change.type === 'removed') {
                    // Só remove se não foi re-adicionado pela generic
                    if (!currentMap.has(change.doc.id)) handleDocRemove(change.doc.id);
                } else {
                    handleDocUpdate(change.doc.id, change.doc.data());
                }
            });
            setSubmissionsMap(new Map(currentMap));
            setIsLoading(false);
        }, (err) => {
            console.warn('Listener apoiar_presencas warning:', err);
            setIsLoading(false);
        });

        return () => {
            unsubGeneric();
            unsubLegacy();
        };
    }, [firestore, classData.id, courseData?.id, courseData?.name]);

    // Array de todas as submissões ordenadas
    const allSubmissions = useMemo(() => {
        const list = Array.from(submissionsMap.values());
        list.sort((a, b) => (b.timestampRaw || 0) - (a.timestampRaw || 0));
        return list;
    }, [submissionsMap]);

    // Filtragem por Aula Selecionada e Termo de Busca
    const filteredSubmissions = useMemo(() => {
        let list = allSubmissions;

        // Filtro de Aula
        if (activeSession) {
            list = list.filter(s => {
                // Se a submissão tiver lessonNumber gravado
                if (s.lessonNumber !== undefined && s.lessonNumber !== null) {
                    return Number(s.lessonNumber) === activeSession.lessonNumber;
                }
                // Se tiver sessionDate gravada
                if (s.sessionDate && activeSession.dateStr) {
                    return s.sessionDate === activeSession.dateStr;
                }
                // Fallback para submissões legadas sem lessonNumber (considerar Aula 1)
                return activeSession.lessonNumber === 1;
            });
        }

        // Filtro de Busca textual
        if (searchTerm.trim()) {
            const clean = searchTerm.toLowerCase();
            list = list.filter(s => 
                s.studentName?.toLowerCase().includes(clean) ||
                s.email?.toLowerCase().includes(clean) ||
                s.rede?.toLowerCase().includes(clean) ||
                s.gcName?.toLowerCase().includes(clean)
            );
        }

        return list;
    }, [allSubmissions, activeSession, searchTerm]);

    // Estatísticas resumidas da aula selecionada
    const stats = useMemo(() => {
        const total = filteredSubmissions.length;
        const totalXp = filteredSubmissions.reduce((acc, s) => acc + (s.xp || 0), 0);
        const avgXp = total > 0 ? Math.round(totalXp / total) : 0;
        const withReflection = filteredSubmissions.filter(s => 
            s.discursiveAnswers && Object.values(s.discursiveAnswers).some(v => Boolean(v?.trim()))
        ).length;

        return { total, avgXp, withReflection };
    }, [filteredSubmissions]);

    // Formatação amigável de chaves discursivas
    const formatQuestionLabel = useCallback((key: string): string => {
        if (key === 'desafio3') return 'Desafio 3: Acolhimento Pastoral';
        if (key === 'desafio8') return 'Desafio 8: Pacto & Ação Semanal';
        return key
            .replace(/([A-Z])/g, ' $1')
            .replace(/_/g, ' ')
            .replace(/^./, str => str.toUpperCase());
    }, []);

    // Copiar link do questionário
    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(quizUrl);
            setCopiedLink(true);
            toast({
                title: "Link Copiado com Sucesso!",
                description: `Link da ${activeSession?.title || 'Turma'} copiado para envio no WhatsApp.`,
            });
            setTimeout(() => setCopiedLink(false), 2500);
        } catch {
            toast({
                variant: "destructive",
                title: "Erro ao copiar",
                description: "Não foi possível copiar o link automaticamente.",
            });
        }
    };

    // Abrir o questionário em nova aba
    const handleOpenQuiz = () => {
        window.open(quizUrl, '_blank');
    };

    // Sincronização Segura, Idempotente e com Suporte a Reposições Cruzadas
    const handleSyncWithDiary = async () => {
        if (!classData || filteredSubmissions.length === 0) return;
        setIsSyncing(true);

        try {
            // Data alvo para a qual a presença será gravada no diário
            const targetDate = activeSession?.dateStr || format(new Date(), 'yyyy-MM-dd');
            const currentAttendance = [...(classData.attendance || [])];
            
            // Localiza registro daquela data ou cria um novo
            let recordIndex = currentAttendance.findIndex(a => a.date?.startsWith(targetDate));
            type AttendanceRecordItem = NonNullable<Class['attendance']>[number];
            let recordToUpdate: AttendanceRecordItem = recordIndex >= 0 
                ? { ...currentAttendance[recordIndex] }
                : { date: targetDate, presentStudentIds: [] as string[], repositions: [] };

            // Preserva 100% de quem já foi marcado manualmente pelo professor (inclusive alunos sem celular)
            const presentSet = new Set(recordToUpdate.presentStudentIds || []);
            const enrolledSet = new Set(classData.students || []);
            const currentRepositions = [...(recordToUpdate.repositions || [])];

            let newlyAddedCount = 0;
            let repositionAddedCount = 0;
            const unmatchedNames: string[] = [];

            filteredSubmissions.forEach(sub => {
                let targetUserId = sub.userId;
                if (!targetUserId && sub.email) {
                    const matchedUser = users.find(u => u.email?.toLowerCase().trim() === sub.email?.toLowerCase().trim());
                    if (matchedUser) targetUserId = matchedUser.id;
                }

                // 1. Aluno sem cadastro no Oiko (Visitante ou e-mail não localizado)
                if (!targetUserId) {
                    unmatchedNames.push(sub.studentName || 'Aluno sem nome');
                    return;
                }

                // 2. Aluno regularmente matriculado nesta turma
                if (enrolledSet.has(targetUserId)) {
                    if (!presentSet.has(targetUserId)) {
                        presentSet.add(targetUserId);
                        newlyAddedCount++;
                    }
                } else {
                    // 3. Aluno cadastrado no Oiko mas NÃO matriculado nesta turma -> Reposição Cruzada!
                    const alreadyInReposition = currentRepositions.some(
                        r => r.studentId === targetUserId && (r.date === targetDate || r.dateStr === targetDate)
                    );
                    if (!alreadyInReposition) {
                        currentRepositions.push({
                            studentId: targetUserId,
                            date: targetDate,
                            dateStr: targetDate,
                            type: 'in_person'
                        });
                        repositionAddedCount++;
                    }
                }
            });

            recordToUpdate.presentStudentIds = Array.from(presentSet);
            recordToUpdate.repositions = currentRepositions;

            // Preserva posições originais e registros online intactos
            if (recordIndex >= 0) {
                currentAttendance[recordIndex] = recordToUpdate;
            } else {
                currentAttendance.push(recordToUpdate);
            }

            await updateClass(classData.id, { attendance: currentAttendance });

            // Mensagem de sucesso detalhada
            const parts: string[] = [];
            if (newlyAddedCount > 0) {
                parts.push(`${newlyAddedCount} aluno(s) matriculado(s) confirmado(s)`);
            }
            if (repositionAddedCount > 0) {
                parts.push(`${repositionAddedCount} aluno(s) registrado(s) como Reposição`);
            }

            const successDescription = parts.length > 0 
                ? `${parts.join(' e ')} na aula de ${targetDate}. Total no Diário: ${presentSet.size}.`
                : `Todos os ${presentSet.size} alunos já estavam com presença confirmada em ${targetDate}.`;

            toast({
                title: "Presenças Sincronizadas com Segurança!",
                description: successDescription,
            });

            // Alerta transparente caso haja alunos sem cadastro vinculado
            if (unmatchedNames.length > 0) {
                const namesPreview = unmatchedNames.slice(0, 3).join(', ') + (unmatchedNames.length > 3 ? ` e mais ${unmatchedNames.length - 3}` : '');
                setTimeout(() => {
                    toast({
                        variant: "destructive",
                        title: `Atenção: ${unmatchedNames.length} envio(s) sem cadastro no Oiko`,
                        description: `[${namesPreview}] respondeu(ram) como visitante ou e-mail não localizado. Verifique o cadastro do membro.`,
                    });
                }, 600);
            }
        } catch (error) {
            console.error("Erro ao sincronizar presenças:", error);
            toast({
                variant: "destructive",
                title: "Erro ao Sincronizar",
                description: "Não foi possível consolidar as presenças no Diário de Classe.",
            });
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Top Banner de Integração */}
            <Card className="border-purple-200 bg-gradient-to-r from-purple-50/80 via-white to-indigo-50/50 shadow-sm">
                <CardContent className="p-5">
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="p-1.5 rounded-lg bg-purple-600 text-white">
                                    <Sparkles className="size-4" />
                                </span>
                                <h3 className="font-bold text-slate-900 text-base">
                                    Questionário Interativo & Acompanhamento Pastoral
                                </h3>
                                {isQuizMode ? (
                                    <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[10px]">
                                        Modo Quiz Ativo
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="text-slate-600 border-slate-300 text-[10px]">
                                        Modo Presença Manual
                                    </Badge>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground max-w-2xl">
                                Acompanhe em tempo real quem concluiu os desafios no celular, inspecione respostas discursivas e consolide as presenças de forma idempotente e segura no Diário de Classe.
                            </p>
                        </div>

                        {/* Botões de Ação Rápida */}
                        <div className="flex flex-wrap items-center gap-2">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setIsQuizEditorOpen(true)}
                                className="h-9 text-xs font-bold border-purple-300 text-purple-900 bg-purple-50/70 hover:bg-purple-100 shadow-sm"
                            >
                                <Pencil className="size-3.5 mr-1.5 text-purple-600" />
                                ✏️ Criar / Editar Questionário da Aula
                                <Badge variant="secondary" className="ml-1.5 bg-purple-200/80 text-purple-950 text-[10px] font-extrabold">
                                    {activeLessonQuestionsCount > 0 ? `${activeLessonQuestionsCount} perguntas` : 'Sem questionário'}
                                </Badge>
                            </Button>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={handleCopyLink}
                                className="h-9 text-xs font-semibold border-purple-200 hover:bg-purple-50 text-purple-900"
                            >
                                {copiedLink ? <Check className="size-3.5 mr-1.5 text-emerald-600" /> : <Copy className="size-3.5 mr-1.5" />}
                                {copiedLink ? "Copiado!" : "Copiar Link da Turma"}
                            </Button>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={handleOpenQuiz}
                                className="h-9 text-xs font-semibold"
                            >
                                <ExternalLink className="size-3.5 mr-1.5" />
                                Abrir Quiz
                            </Button>
                            <Button 
                                size="sm" 
                                onClick={handleSyncWithDiary}
                                disabled={isSyncing || filteredSubmissions.length === 0}
                                className="h-9 text-xs font-semibold bg-purple-700 hover:bg-purple-800 text-white"
                            >
                                <RefreshCw className={`size-3.5 mr-1.5 ${isSyncing ? 'animate-spin' : ''}`} />
                                Sincronizar com Diário
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Seletor de Aula / Sessão do Cronograma */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex flex-wrap items-center gap-2">
                    <CalendarDays className="size-4 text-purple-600" />
                    <span className="text-xs font-bold text-slate-800">Aula / Sessão da Turma:</span>
                    <Select value={selectedSessionKey} onValueChange={setSelectedSessionKey}>
                        <SelectTrigger className="w-[280px] sm:w-[340px] h-9 text-xs font-semibold bg-white border-slate-200">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="todas" className="text-xs font-semibold">
                                📚 Todas as Aulas (Visão Geral)
                            </SelectItem>
                            {sessions.map(s => (
                                <SelectItem key={s.key} value={s.key} className="text-xs">
                                    {s.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsQuizEditorOpen(true)}
                        className="h-9 text-xs font-bold text-purple-700 hover:text-purple-900 hover:bg-purple-100/70"
                    >
                        <Pencil className="size-3.5 mr-1.5 text-purple-600" />
                        Editar Questionário
                        <Badge variant="secondary" className="ml-1.5 bg-purple-100 text-purple-900 text-[10px] font-bold">
                            {activeLessonQuestionsCount > 0 ? `${activeLessonQuestionsCount} perguntas` : 'Sem questionário'}
                        </Badge>
                    </Button>
                </div>

                <div className="text-xs text-muted-foreground">
                    {activeSession ? (
                        <span>Filtrando respostas da <strong>{activeSession.title}</strong></span>
                    ) : (
                        <span>Exibindo respostas de <strong>todas as aulas</strong></span>
                    )}
                </div>
            </div>

            {/* Cards de Métricas Rápidas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="bg-slate-50/50">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Alunos que Responderam</p>
                            <p className="text-2xl font-black text-slate-900 mt-0.5">{stats.total}</p>
                        </div>
                        <div className="size-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700">
                            <UserCheck className="size-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-50/50">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Média de XP Conquistado</p>
                            <p className="text-2xl font-black text-purple-700 mt-0.5">{stats.avgXp} <span className="text-xs font-medium text-muted-foreground">pts</span></p>
                        </div>
                        <div className="size-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-700">
                            <Award className="size-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-50/50">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Reflexões Entregues</p>
                            <p className="text-2xl font-black text-emerald-700 mt-0.5">{stats.withReflection}</p>
                        </div>
                        <div className="size-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                            <MessageSquare className="size-5" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Barra de Busca e Contador */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input 
                        placeholder="Buscar por nome, email, GC ou rede..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 h-9 text-xs"
                    />
                </div>
                <div className="text-xs text-muted-foreground self-end sm:self-center">
                    Exibindo <strong>{filteredSubmissions.length}</strong> envio(s)
                </div>
            </div>

            {/* Tabela de Envios dos Alunos */}
            <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
                <Table>
                    <TableHeader className="bg-slate-50/75">
                        <TableRow>
                            <TableHead className="min-w-[200px]">Aluno / Identificação</TableHead>
                            <TableHead className="min-w-[130px]">Rede & GC</TableHead>
                            <TableHead className="min-w-[130px]">Aula / Data</TableHead>
                            <TableHead className="text-center min-w-[90px]">XP</TableHead>
                            <TableHead className="min-w-[240px]">Reflexões Discursivas</TableHead>
                            <TableHead className="text-center min-w-[110px]">Presença</TableHead>
                            <TableHead className="text-right min-w-[100px]">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                                    <div className="flex items-center justify-center gap-2">
                                        <RefreshCw className="size-4 animate-spin text-purple-600" />
                                        <span>Carregando respostas do questionário em tempo real...</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredSubmissions.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-32 text-center">
                                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                        <HelpCircle className="size-8 text-slate-300" />
                                        <p className="font-semibold text-slate-700">Nenhum envio registrado para esta seleção.</p>
                                        <p className="text-xs max-w-md">
                                            Compartilhe o link do questionário com os alunos durante a aula presencial para que eles respondam pelo celular.
                                        </p>
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            onClick={handleCopyLink}
                                            className="mt-2 text-xs"
                                        >
                                            <Copy className="size-3 mr-1.5" /> Copiar Link do Quiz
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredSubmissions.map((sub) => {
                                const discursiveEntries = Object.entries(sub.discursiveAnswers || {}).filter(([_, v]) => Boolean(v?.trim()));
                                const lessonBadge = sub.lessonNumber ? `Aula ${sub.lessonNumber}` : 'Aula 1';

                                return (
                                    <TableRow key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="size-8 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-xs shrink-0">
                                                    {sub.studentName?.charAt(0).toUpperCase() || 'A'}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span className="font-bold text-slate-900 text-xs">{sub.studentName}</span>
                                                        {sub.userId ? (
                                                            <span title="Cadastro Oiko Vinculado">
                                                                <CheckCircle2 className="size-3 text-emerald-600 inline" />
                                                            </span>
                                                        ) : (
                                                            <Badge variant="outline" className="text-[9px] border-amber-300 text-amber-800 bg-amber-50 px-1 py-0 h-4 font-semibold">
                                                                Sem cadastro
                                                            </Badge>
                                                        )}
                                                        {sub.userId && !classData.students?.includes(sub.userId) && (
                                                            <Badge variant="outline" className="text-[9px] border-blue-300 text-blue-700 bg-blue-50 px-1 py-0 h-4 font-semibold">
                                                                Reposição
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    {sub.email && (
                                                        <p className="text-[10px] text-muted-foreground truncate max-w-[180px]">
                                                            {sub.email}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <div className="space-y-0.5 text-xs">
                                                {sub.rede ? (
                                                    <Badge variant="outline" className="text-[10px] border-purple-200 text-purple-800 bg-purple-50/50">
                                                        {sub.rede}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-muted-foreground text-[11px]">-</span>
                                                )}
                                                {sub.gcName && (
                                                    <p className="text-[10px] text-slate-500 font-medium truncate max-w-[120px]">
                                                        {sub.gcName}
                                                    </p>
                                                )}
                                            </div>
                                        </TableCell>

                                        <TableCell className="text-xs text-slate-600">
                                            <div className="space-y-0.5">
                                                <Badge variant="secondary" className="text-[9px] font-bold px-1.5 py-0 bg-slate-100 text-slate-700">
                                                    {lessonBadge}
                                                </Badge>
                                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                                    <Clock className="size-3" />
                                                    <span>{sub.formattedDate || 'Hoje'}</span>
                                                </div>
                                            </div>
                                        </TableCell>

                                        <TableCell className="text-center font-black text-purple-700 text-xs">
                                            <span className="px-2 py-0.5 rounded-full bg-purple-50 border border-purple-100">
                                                {sub.xp || 0} XP
                                            </span>
                                        </TableCell>

                                        <TableCell className="max-w-[280px]">
                                            <div className="space-y-1">
                                                {discursiveEntries.length > 0 ? (
                                                    discursiveEntries.slice(0, 2).map(([key, text]) => (
                                                        <div key={key} className="text-[11px] text-slate-700 line-clamp-1 italic bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                                            <strong className="not-italic text-purple-800 mr-1">
                                                                {formatQuestionLabel(key).split(':')[0]}:
                                                            </strong> 
                                                            &ldquo;{text}&rdquo;
                                                        </div>
                                                    ))
                                                ) : (
                                                    <span className="text-[11px] text-muted-foreground italic">Sem resposta discursiva</span>
                                                )}
                                            </div>
                                        </TableCell>

                                        <TableCell className="text-center">
                                            <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                                                <Check className="size-3 mr-1" /> Validada
                                            </Badge>
                                        </TableCell>

                                        <TableCell className="text-right">
                                            <Button 
                                                variant="ghost" 
                                                size="sm"
                                                onClick={() => {
                                                    setSelectedSubmission(sub);
                                                    setIsDetailOpen(true);
                                                }}
                                                className="h-8 text-xs font-semibold text-purple-700 hover:text-purple-900 hover:bg-purple-50"
                                            >
                                                <Eye className="size-3.5 mr-1" /> Ver Detalhes
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Modal de Inspeção Completa das Respostas do Aluno */}
            <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center justify-between pr-4">
                            <span className="flex items-center gap-2">
                                <Sparkles className="size-5 text-purple-600" />
                                Análise Pedagógica & Pastoral
                            </span>
                            {selectedSubmission?.xp !== undefined && (
                                <Badge className="bg-purple-100 text-purple-800 border-purple-200 font-bold text-xs">
                                    {selectedSubmission.xp} XP Conquistados
                                </Badge>
                            )}
                        </DialogTitle>
                        <DialogDescription>
                            Registro completo das respostas e reflexões enviadas pelo aluno no questionário interativo.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedSubmission && (
                        <div className="space-y-6 pt-2">
                            {/* Card de Identificação */}
                            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-4 text-xs">
                                <div>
                                    <span className="text-muted-foreground block text-[10px] uppercase font-bold">Aluno</span>
                                    <span className="font-bold text-slate-900 text-sm">{selectedSubmission.studentName}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block text-[10px] uppercase font-bold">E-mail</span>
                                    <span className="font-semibold text-slate-800">{selectedSubmission.email || 'Não informado'}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block text-[10px] uppercase font-bold">Rede / Célula (GC)</span>
                                    <span className="font-semibold text-slate-800">
                                        {selectedSubmission.rede || 'Sem rede'} • {selectedSubmission.gcName || 'Sem GC'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block text-[10px] uppercase font-bold">Aula / Data de Envio</span>
                                    <span className="font-semibold text-slate-800">
                                        {selectedSubmission.lessonNumber ? `Aula ${selectedSubmission.lessonNumber}` : 'Aula 1'} • {selectedSubmission.formattedDate || '-'}
                                    </span>
                                </div>
                            </div>

                            {/* Seção Dinâmica de Perguntas Discursivas */}
                            {selectedSubmission.discursiveAnswers && Object.entries(selectedSubmission.discursiveAnswers).length > 0 ? (
                                Object.entries(selectedSubmission.discursiveAnswers).map(([key, answer]) => {
                                    if (!answer?.trim()) return null;
                                    return (
                                        <div key={key} className="space-y-2">
                                            <div className="flex items-center gap-2 text-purple-900 font-bold text-xs uppercase tracking-wide">
                                                <Heart className="size-4 text-purple-600" />
                                                {formatQuestionLabel(key)}
                                            </div>
                                            <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-100 text-xs text-slate-800 space-y-2">
                                                <div className="bg-white p-3 rounded-lg border border-purple-200/60 font-serif text-sm leading-relaxed text-slate-900">
                                                    {answer}
                                                </div>
                                                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                                                    <span>{answer.length} caracteres • {answer.split(/\s+/).filter(Boolean).length} palavras</span>
                                                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                                                        <CheckCircle2 className="size-3" /> Resposta Registrada
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-center text-xs text-muted-foreground">
                                    Nenhuma reflexão discursiva registrada para este envio.
                                </div>
                            )}

                            {/* Resumo do Método de Presença */}
                            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2 text-emerald-900 font-semibold">
                                    <CheckCircle2 className="size-4 text-emerald-600" />
                                    <span>Presença registrada via Questionário Interativo Gamificado</span>
                                </div>
                                <span className="text-emerald-700 font-mono text-[11px]">
                                    {selectedSubmission.formattedDate}
                                </span>
                            </div>

                            {/* Ações do Modal */}
                            <div className="flex justify-end gap-2 pt-2 border-t">
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => setIsDetailOpen(false)}
                                    className="text-xs"
                                >
                                    Fechar
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Modal de Edição Visual do Questionário */}
            <LessonQuizEditorModal
                open={isQuizEditorOpen}
                onOpenChange={setIsQuizEditorOpen}
                course={courseData}
                lessonNumber={activeLessonNumber}
                lessonTitle={activeSession?.title}
            />
        </div>
    );
}
