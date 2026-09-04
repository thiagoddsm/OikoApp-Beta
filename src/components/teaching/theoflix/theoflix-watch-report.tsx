'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { useMembersData } from '@/hooks/useDomainData';
import { format, parseISO } from 'date-fns';
import { theoflixDB, type Course, type Episode } from '@/lib/theoflix-data';
import { 
    Search, 
    CheckCircle2, 
    Clock, 
    ChevronDown, 
    ChevronUp, 
    Download, 
    GraduationCap, 
    BookOpen,
    Mail,
    User as UserIcon,
    Loader2,
    Check,
    AlertCircle,
    Play
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';

export function TheoflixWatchReport() {
    const { firestore } = useFirebase();
    const { users: members, isLoading: isLoadingMembers } = useMembersData();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCourseId, setSelectedCourseId] = useState<string>('');
    const [expandedStudents, setExpandedStudents] = useState<Record<string, boolean>>({});

    // Fetch theoflix courses from DB
    const coursesQuery = useMemoFirebase(() => 
        firestore ? query(collection(firestore, 'theoflix_courses')) : null, 
        [firestore]
    );
    const { data: dbCourses, isLoading: isLoadingCourses } = useCollection<Course>(coursesQuery);

    // Cursos do banco de dados (sem duplicar com defaults)
    const allCourses = useMemo(() => {
        if (dbCourses && dbCourses.length > 0) return dbCourses;
        return theoflixDB;
    }, [dbCourses]);

    // Select the first course by default
    useEffect(() => {
        if (allCourses.length > 0 && !selectedCourseId) {
            setSelectedCourseId(allCourses[0].id);
        }
    }, [allCourses, selectedCourseId]);

    const selectedCourse = useMemo(() => {
        return allCourses.find(c => c.id === selectedCourseId) || null;
    }, [allCourses, selectedCourseId]);

    // Map each student's progress for the selected course
    const studentsProgress = useMemo(() => {
        if (!selectedCourse) return [];

        return members.map(member => {
            const theoflixProgress = member.journey?.theoflixProgress || {};
            const courseProgress = theoflixProgress[selectedCourse.id] || {};
            const episodes = selectedCourse.episodes || [];
            
            let completedCount = 0;
            const episodesStatus = episodes.map(episode => {
                const episodeKey = episode.youtubeId || episode.title.replace(/\s+/g, '_');
                const progValue = courseProgress[episodeKey];
                const isCompleted = !!progValue;
                if (isCompleted) {
                    completedCount++;
                }

                let completedAt: string | undefined;
                let startedAt: string | undefined;
                let watchedMinutes: number | undefined;

                if (progValue && typeof progValue === 'object') {
                    completedAt = progValue.completedAt;
                    startedAt = progValue.startedAt;
                    watchedMinutes = progValue.watchedMinutes || (progValue.timeSpentSeconds ? Math.round(progValue.timeSpentSeconds / 60) : undefined);
                }

                return {
                    title: episode.title,
                    completed: isCompleted,
                    duration: episode.duration,
                    completedAt,
                    startedAt,
                    watchedMinutes
                };
            });

            const percentage = episodes.length > 0 
                ? Math.round((completedCount / episodes.length) * 100) 
                : 0;

            return {
                id: member.id,
                name: member.name || 'Sem nome',
                email: member.email || 'Sem e-mail',
                completedCount,
                totalCount: episodes.length,
                percentage,
                episodesStatus
            };
        });
    }, [members, selectedCourse]);

    // Filter students by search term
    const filteredStudents = useMemo(() => {
        return studentsProgress.filter(student => {
            const searchLower = searchTerm.toLowerCase();
            return (
                student.name.toLowerCase().includes(searchLower) ||
                student.email.toLowerCase().includes(searchLower)
            );
        }).sort((a, b) => b.percentage - a.percentage || a.name.localeCompare(b.name));
    }, [studentsProgress, searchTerm]);

    // Toggle expansion of student details
    const toggleExpand = (studentId: string) => {
        setExpandedStudents(prev => ({
            ...prev,
            [studentId]: !prev[studentId]
        }));
    };

    // Calculate aggregated metrics
    const metrics = useMemo(() => {
        const total = filteredStudents.length;
        if (total === 0) return { total: 0, completedAll: 0, started: 0, averageProgress: 0 };

        let completedAll = 0;
        let started = 0;
        let sumPercentage = 0;

        filteredStudents.forEach(student => {
            sumPercentage += student.percentage;
            if (student.percentage === 100) {
                completedAll++;
            }
            if (student.completedCount > 0) {
                started++;
            }
        });

        return {
            total,
            completedAll,
            started,
            averageProgress: Math.round(sumPercentage / total)
        };
    }, [filteredStudents]);

    // Export Watch History to CSV format
    const handleExportCSV = () => {
        if (!selectedCourse) return;

        const headers = [
            'Nome do Aluno',
            'E-mail',
            'Curso',
            'Progresso',
            'Concluido (%)',
            'Aulas Concluidas',
            'Aulas Pendentes'
        ];

        const rows = filteredStudents.map(student => {
            const completedList = student.episodesStatus
                .filter(ep => ep.completed)
                .map(ep => ep.title)
                .join(', ');

            const pendingList = student.episodesStatus
                .filter(ep => !ep.completed)
                .map(ep => ep.title)
                .join(', ');

            return [
                `"${student.name.replace(/"/g, '""')}"`,
                `"${student.email.replace(/"/g, '""')}"`,
                `"${selectedCourse.title.replace(/"/g, '""')}"`,
                `"${student.completedCount} / ${student.totalCount}"`,
                `"${student.percentage}%"`,
                `"${completedList.replace(/"/g, '""')}"`,
                `"${pendingList.replace(/"/g, '""')}"`
            ];
        });

        const csvContent = '\uFEFF' + [
            headers.join(';'),
            ...rows.map(row => row.join(';'))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `progresso_theoflix_${selectedCourse.id}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const isLoading = isLoadingMembers || isLoadingCourses;

    if (isLoading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="size-8 animate-spin text-primary" />
                <span className="ml-2 text-sm text-slate-500">Carregando dados de progresso...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Top Toolbar / Filters */}
            <Card className="border-slate-200 shadow-sm">
                <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-end md:items-center">
                        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                            <div className="w-full sm:w-72">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                                    Filtrar por Curso TheoFlix
                                </label>
                                <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Selecione um curso" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {allCourses.map(course => (
                                            <SelectItem key={course.id} value={course.id}>
                                                {course.title} (Level {course.level})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="w-full sm:w-72">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                                    Buscar Aluno
                                </label>
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                                    <Input
                                        placeholder="Nome ou e-mail..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-9 w-full"
                                    />
                                </div>
                            </div>
                        </div>

                        <Button 
                            onClick={handleExportCSV} 
                            disabled={filteredStudents.length === 0}
                            variant="outline"
                            className="w-full sm:w-auto flex items-center justify-center gap-2 border-slate-300 hover:bg-slate-50 text-slate-700"
                        >
                            <Download className="size-4" />
                            Exportar CSV
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Metrics Row */}
            {selectedCourse && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="border-slate-200/80 shadow-sm bg-slate-50/50">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Alunos Ativos</p>
                                <h3 className="text-2xl font-bold mt-1 text-slate-800">{metrics.total}</h3>
                            </div>
                            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
                                <UserIcon className="size-5" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200/80 shadow-sm bg-slate-50/50">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Iniciaram Curso</p>
                                <h3 className="text-2xl font-bold mt-1 text-slate-800">{metrics.started}</h3>
                            </div>
                            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
                                <Play className="size-5" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200/80 shadow-sm bg-slate-50/50">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Conclusão 100%</p>
                                <h3 className="text-2xl font-bold mt-1 text-slate-800">{metrics.completedAll}</h3>
                            </div>
                            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
                                <CheckCircle2 className="size-5" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200/80 shadow-sm bg-slate-50/50">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Progresso Médio</p>
                                <h3 className="text-2xl font-bold mt-1 text-slate-800">{metrics.averageProgress}%</h3>
                            </div>
                            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
                                <GraduationCap className="size-5" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Students Table */}
            <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-0">
                    <div className="overflow-x-auto w-full">
<Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50/75 hover:bg-slate-50/75">
                                <TableHead className="w-10"></TableHead>
                                <TableHead className="font-semibold text-slate-600">Aluno</TableHead>
                                <TableHead className="font-semibold text-slate-600 hidden md:table-cell">E-mail</TableHead>
                                <TableHead className="font-semibold text-slate-600 text-center">Aulas Assistidas</TableHead>
                                <TableHead className="font-semibold text-slate-600 w-1/4">Progresso (%)</TableHead>
                                <TableHead className="font-semibold text-slate-600 text-right">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredStudents.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-10 text-slate-500">
                                        <AlertCircle className="size-6 mx-auto mb-2 text-slate-400" />
                                        Nenhum aluno encontrado ou sem progresso registrado.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredStudents.map((student) => {
                                    const isExpanded = !!expandedStudents[student.id];
                                    return (
                                        <React.Fragment key={student.id}>
                                            <TableRow 
                                                className="cursor-pointer hover:bg-slate-50/50 transition-colors"
                                                onClick={() => toggleExpand(student.id)}
                                            >
                                                <TableCell className="p-3">
                                                    {isExpanded ? (
                                                        <ChevronUp className="size-4 text-slate-400" />
                                                    ) : (
                                                        <ChevronDown className="size-4 text-slate-400" />
                                                    )}
                                                </TableCell>
                                                <TableCell className="font-medium text-slate-900">
                                                    {student.name}
                                                </TableCell>
                                                <TableCell className="text-slate-500 hidden md:table-cell">
                                                    {student.email}
                                                </TableCell>
                                                <TableCell className="text-center font-semibold text-slate-700">
                                                    {student.completedCount} / {student.totalCount}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="space-y-1">
                                                        <div className="flex justify-between text-xs text-slate-500">
                                                            <span>{student.percentage}%</span>
                                                        </div>
                                                        <Progress value={student.percentage} className="h-2" />
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {student.percentage === 100 ? (
                                                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                                            Concluído
                                                        </Badge>
                                                    ) : student.completedCount > 0 ? (
                                                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                                            Em Andamento
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200">
                                                            Não Iniciado
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                            </TableRow>

                                            {/* Expandable Details */}
                                            {isExpanded && (
                                                <TableRow className="bg-slate-50/30 hover:bg-slate-50/30">
                                                    <TableCell></TableCell>
                                                    <TableCell colSpan={5} className="p-4 border-t border-slate-100">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div className="space-y-3">
                                                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                                                    Histórico de Aulas detalhado
                                                                </h4>
                                                                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                                                    {student.episodesStatus.map((ep, idx) => (
                                                                        <div 
                                                                            key={idx} 
                                                                            className="flex flex-col gap-1.5 p-2.5 rounded-lg border border-slate-200/60 bg-white"
                                                                        >
                                                                            <div className="flex items-center justify-between">
                                                                                <div className="flex items-center gap-2">
                                                                                    {ep.completed ? (
                                                                                        <div className="p-1 bg-emerald-50 text-emerald-600 rounded-full">
                                                                                            <Check className="size-3.5 stroke-[3]" />
                                                                                        </div>
                                                                                    ) : (
                                                                                        <div className="p-1 bg-slate-100 text-slate-400 rounded-full">
                                                                                            <Clock className="size-3.5" />
                                                                                        </div>
                                                                                    )}
                                                                                    <span className="text-sm font-medium text-slate-700">
                                                                                        {ep.title}
                                                                                    </span>
                                                                                </div>
                                                                                {ep.duration && (
                                                                                    <span className="text-xs text-slate-400 font-mono">
                                                                                        {ep.duration}
                                                                                    </span>
                                                                                )}
                                                                            </div>

                                                                            {/* Detalhes de Telemetria (Data, Hora e Tempo de Permanência) */}
                                                                            {ep.completed && (
                                                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 pl-7">
                                                                                    {ep.completedAt ? (
                                                                                        <span>
                                                                                            📅 Concluído em: <strong className="text-slate-700 font-semibold">{format(parseISO(ep.completedAt), "dd/MM/yyyy 'às' HH:mm")}</strong>
                                                                                        </span>
                                                                                    ) : (
                                                                                        <span className="italic text-slate-400">Concluído (Histórico)</span>
                                                                                    )}

                                                                                    {ep.watchedMinutes !== undefined && (
                                                                                        <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-medium border border-emerald-100">
                                                                                            ⏱️ Permanência: {ep.watchedMinutes} min
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="flex flex-col justify-center p-4 bg-white border border-slate-200/80 rounded-xl shadow-sm">
                                                                <div className="flex items-center gap-3 mb-2">
                                                                    <BookOpen className="size-5 text-slate-500" />
                                                                    <span className="font-semibold text-slate-700 text-sm">Informações de Contato</span>
                                                                </div>
                                                                <div className="space-y-1 text-sm text-slate-600">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <Mail className="size-3.5 text-slate-400" />
                                                                        <span>{student.email}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5 mt-1.5">
                                                                        <span className="font-semibold">ID do Usuário:</span>
                                                                        <span className="font-mono text-xs bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">{student.id}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
</div>
                </CardContent>
            </Card>
        </div>
    );
}
