'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useCoursesData } from '@/hooks/useDomainData';
import { useFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { getCourseAttendanceMode } from '@/contexts/volunteering-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Sparkles, 
  Search, 
  BookOpen, 
  CheckCircle2, 
  HelpCircle, 
  ExternalLink, 
  Pencil, 
  Copy, 
  Check, 
  Layers, 
  GraduationCap, 
  Loader2, 
  RefreshCw,
  SlidersHorizontal,
  ArrowUpRight,
  School
} from 'lucide-react';
import { LessonQuizEditorModal } from '@/components/teaching/lesson-quiz-editor-modal';
import { Course } from '@/domain/course';

export default function CentralQuestionariosPage() {
  const { courses, classes, isLoading } = useCoursesData();
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'quiz' | 'manual'>('all');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Estado do Modal de Edição de Quiz
  const [editorState, setEditorState] = useState<{
    open: boolean;
    course: any;
    lessonNumber: number;
    lessonTitle: string;
    syllabusId?: string;
  }>({
    open: false,
    course: null,
    lessonNumber: 1,
    lessonTitle: ''
  });

  // Helper para contar perguntas de uma aula
  const getLessonQuestionCount = (course: any, lessonNum: number, syllabusItem?: any): number => {
    // 1. Mapa lessonQuizzes
    const lq = course?.lessonQuizzes?.[String(lessonNum)] || course?.lessonQuizzes?.[lessonNum];
    if (lq && Array.isArray(lq.questions)) {
      return lq.questions.length;
    }
    // 2. Quiz no syllabusItem
    if (syllabusItem?.quiz && Array.isArray(syllabusItem.quiz.questions)) {
      return syllabusItem.quiz.questions.length;
    }
    // 3. Fallback no syllabus array
    if (course?.syllabus && Array.isArray(course.syllabus)) {
      const item = course.syllabus[lessonNum - 1];
      if (item?.quiz && Array.isArray(item.quiz.questions)) {
        return item.quiz.questions.length;
      }
    }
    // 4. Seed Apoiar
    const isApoiar = (course?.id && course.id.toLowerCase().includes('apoiar')) || 
                     (course?.name && course.name.toLowerCase().includes('apoiar'));
    if (isApoiar) {
      if (lessonNum === 1) return 8;
      if (lessonNum === 2) return 6;
    }
    return 0;
  };

  // KPIs
  const stats = useMemo(() => {
    const totalCourses = courses.length;
    const quizModeCourses = courses.filter(c => getCourseAttendanceMode(c) === 'quiz').length;
    
    let totalLessons = 0;
    let totalQuizzesConfigured = 0;

    courses.forEach(c => {
      const syllabus = c.syllabus || [];
      const count = syllabus.length > 0 ? syllabus.length : 1;
      totalLessons += count;

      for (let i = 1; i <= count; i++) {
        const qCount = getLessonQuestionCount(c, i, syllabus[i - 1]);
        if (qCount > 0) totalQuizzesConfigured++;
      }
    });

    return { totalCourses, quizModeCourses, totalLessons, totalQuizzesConfigured };
  }, [courses]);

  // Filtragem dos Cursos
  const filteredCourses = useMemo(() => {
    return courses.filter(course => {
      const mode = getCourseAttendanceMode(course);
      if (filterMode === 'quiz' && mode !== 'quiz') return false;
      if (filterMode === 'manual' && mode !== 'manual') return false;

      if (searchTerm.trim()) {
        const clean = searchTerm.toLowerCase();
        const matchesName = course.name?.toLowerCase().includes(clean);
        const matchesMinistry = course.ministryName?.toLowerCase().includes(clean);
        const matchesDesc = course.description?.toLowerCase().includes(clean);
        return matchesName || matchesMinistry || matchesDesc;
      }

      return true;
    });
  }, [courses, filterMode, searchTerm]);

  // Alterar modo de presença do curso diretamente pela central
  const handleToggleAttendanceMode = async (courseId: string, currentMode: 'manual' | 'quiz') => {
    if (!firestore) return;
    const newMode = currentMode === 'quiz' ? 'manual' : 'quiz';

    try {
      const courseDocRef = doc(firestore, 'courses', courseId);
      await updateDocumentNonBlocking(courseDocRef, {
        attendanceMode: newMode,
        presencaPresencialModo: newMode,
      });

      toast({
        title: "Modo Atualizado!",
        description: `O curso agora está no modo: ${newMode === 'quiz' ? '🎮 Via Questionário' : '📋 Manual (Diário)'}.`,
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar",
        description: err?.message || "Não foi possível alterar o modo de presença.",
      });
    }
  };

  // Copiar link de teste da aula
  const handleCopyQuizLink = (courseId: string, lessonNumber: number, courseName: string) => {
    if (typeof window === 'undefined') return;
    const origin = window.location.origin;
    const url = `${origin}/quiz-presencial.html?courseId=${courseId}&lesson=${lessonNumber}&courseName=${encodeURIComponent(courseName)}`;
    
    navigator.clipboard.writeText(url).then(() => {
      setCopiedKey(`${courseId}-${lessonNumber}`);
      toast({
        title: "Link Copiado!",
        description: `Link do questionário da Aula ${lessonNumber} copiado para a área de transferência.`,
      });
      setTimeout(() => setCopiedKey(null), 2500);
    });
  };

  // Abrir simulador
  const handleOpenQuiz = (courseId: string, lessonNumber: number, courseName: string) => {
    if (typeof window === 'undefined') return;
    const origin = window.location.origin;
    const url = `${origin}/quiz-presencial.html?courseId=${courseId}&lesson=${lessonNumber}&courseName=${encodeURIComponent(courseName)}`;
    window.open(url, '_blank');
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm font-semibold">Carregando catálogo de questionários dos cursos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] font-black uppercase tracking-wider text-purple-700 border-purple-300 bg-purple-50">
              <Sparkles className="size-3 mr-1 text-purple-600" /> Presença Gamificada
            </Badge>
            <Badge className="bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 text-[10px] font-black uppercase">
              Plataforma Oiko
            </Badge>
          </div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
            Central de Questionários Presenciais
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground max-w-3xl">
            Gerencie em um só lugar as perguntas, reflexões pastorais e o modo de validação de chamada de todos os cursos presenciais da igreja.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            asChild
            className="h-10 text-xs font-bold gap-1.5 border-purple-200 text-purple-900 hover:bg-purple-50 shadow-sm"
          >
            <Link href="/quiz-presencial.html" target="_blank">
              <ExternalLink className="size-3.5 text-purple-600" />
              <span>Simulador Geral de Quiz</span>
            </Link>
          </Button>
          <Button
            size="sm"
            asChild
            className="h-10 text-xs font-bold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
          >
            <Link href="/dashboard/teaching/courses">
              <BookOpen className="size-3.5" />
              <span>Ver Todos os Cursos</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-slate-50/60 border-slate-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Cursos Cadastrados</p>
              <p className="text-2xl font-black text-slate-900">{stats.totalCourses}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <BookOpen className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50/50 border-purple-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[11px] font-bold text-purple-800 uppercase tracking-wider">Modo Quiz Ativo</p>
              <p className="text-2xl font-black text-purple-900">{stats.quizModeCourses}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-purple-600 text-white shadow-sm">
              <Sparkles className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-50/60 border-slate-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Aulas Estruturadas</p>
              <p className="text-2xl font-black text-slate-900">{stats.totalLessons}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600">
              <Layers className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-emerald-50/50 border-emerald-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Aulas com Quiz Pronto</p>
              <p className="text-2xl font-black text-emerald-900">{stats.totalQuizzesConfigured}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-sm">
              <CheckCircle2 className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome do curso ou ministério..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs font-semibold bg-slate-50 border-slate-200"
          />
        </div>

        <div className="flex items-center gap-2">
          <SlidersHorizontal className="size-4 text-slate-500" />
          <Select value={filterMode} onValueChange={(v: any) => setFilterMode(v)}>
            <SelectTrigger className="w-[180px] h-9 text-xs font-semibold bg-slate-50 border-slate-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Todos os Cursos</SelectItem>
              <SelectItem value="quiz" className="text-xs">🎮 Apenas Modo Quiz</SelectItem>
              <SelectItem value="manual" className="text-xs">📋 Apenas Modo Manual</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Listagem de Cursos e Quizzes por Aula */}
      <div className="space-y-5">
        {filteredCourses.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed rounded-2xl bg-white space-y-3">
            <HelpCircle className="size-10 mx-auto text-slate-400" />
            <h4 className="font-bold text-slate-800">Nenhum curso encontrado</h4>
            <p className="text-xs text-muted-foreground">Tente alterar o termo de busca ou o filtro de modo de presença.</p>
          </div>
        ) : (
          filteredCourses.map(course => {
            const currentMode = getCourseAttendanceMode(course);
            const isQuiz = currentMode === 'quiz';
            const syllabus = course.syllabus || [];
            const courseClasses = classes.filter(c => c.courseId === course.id);

            // Se não houver syllabus cadastrado, fornece ao menos o slot da Aula 1
            const lessonsList = syllabus.length > 0 
              ? syllabus.map((item, idx) => ({
                  lessonNumber: idx + 1,
                  title: item.title || `Aula ${idx + 1}`,
                  syllabusId: item.id,
                  item
                }))
              : [
                  {
                    lessonNumber: 1,
                    title: 'Aula 1 (Abertura)',
                    syllabusId: undefined,
                    item: undefined
                  }
                ];

            return (
              <Card 
                key={course.id} 
                className={`overflow-hidden transition-all border ${
                  isQuiz ? 'border-purple-200 bg-white shadow-sm' : 'border-slate-200 bg-white/80'
                }`}
              >
                {/* Cabeçalho do Curso */}
                <div className="p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 via-white to-purple-50/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-black text-lg text-slate-900">{course.name}</h3>
                      {course.ministryName && (
                        <Badge variant="outline" className="text-[10px] font-bold text-slate-600 border-slate-300">
                          {course.ministryName}
                        </Badge>
                      )}
                      {courseClasses.length > 0 && (
                        <Badge variant="secondary" className="text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {courseClasses.length} {courseClasses.length === 1 ? 'turma' : 'turmas'}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {course.description || 'Sem descrição cadastrada.'}
                    </p>
                  </div>

                  {/* Ações do Curso e Toggle do Modo de Presença */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    <Button
                      variant={isQuiz ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleToggleAttendanceMode(course.id, currentMode)}
                      className={`h-8 text-xs font-bold gap-1.5 transition-all ${
                        isQuiz 
                          ? 'bg-purple-700 hover:bg-purple-800 text-white shadow-sm' 
                          : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Sparkles className="size-3.5" />
                      <span>{isQuiz ? '🎮 Modo Quiz Ativo' : '📋 Modo Diário Manual'}</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      className="h-8 text-xs font-bold text-slate-700 hover:text-primary hover:bg-slate-100"
                    >
                      <Link href={`/dashboard/teaching/courses/${course.id}?tab=syllabus`}>
                        <BookOpen className="size-3.5 mr-1 text-slate-500" />
                        Ver Ementa
                      </Link>
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      className="h-8 text-xs font-bold text-slate-700 hover:text-primary hover:bg-slate-100"
                    >
                      <Link href={`/dashboard/teaching/courses/${course.id}?tab=classes`}>
                        <ArrowUpRight className="size-3.5 mr-1 text-slate-500" />
                        Turmas
                      </Link>
                    </Button>
                  </div>
                </div>

                {/* Grid das Aulas e Seus Questionários */}
                <CardContent className="p-4 sm:p-5 bg-slate-50/40">
                  <div className="space-y-2 mb-3">
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="size-3.5 text-purple-600" />
                      Questionários das Aulas ({lessonsList.length} {lessonsList.length === 1 ? 'aula' : 'aulas'})
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {lessonsList.map(lesson => {
                      const questionCount = getLessonQuestionCount(course, lesson.lessonNumber, lesson.item);
                      const isConfigured = questionCount > 0;
                      const copyId = `${course.id}-${lesson.lessonNumber}`;
                      const isCopied = copiedKey === copyId;

                      return (
                        <div
                          key={lesson.lessonNumber}
                          className={`p-3.5 rounded-xl border bg-white flex flex-col justify-between gap-3 shadow-xs transition-all hover:border-purple-300 ${
                            isConfigured ? 'border-purple-200' : 'border-slate-200'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <span className="text-[10px] font-black uppercase text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200/60">
                                Aula {lesson.lessonNumber < 10 ? `0${lesson.lessonNumber}` : lesson.lessonNumber}
                              </span>

                              {isConfigured ? (
                                <Badge className="bg-emerald-100 text-emerald-800 text-[10px] font-bold border-emerald-200">
                                  {questionCount} perguntas
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-slate-500 border-slate-200 text-[10px]">
                                  Sem quiz
                                </Badge>
                              )}
                            </div>

                            <h4 className="font-bold text-xs text-slate-900 line-clamp-1">
                              {lesson.title}
                            </h4>
                          </div>

                          {/* Botões de Ação da Aula */}
                          <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => {
                                setEditorState({
                                  open: true,
                                  course,
                                  lessonNumber: lesson.lessonNumber,
                                  lessonTitle: lesson.title,
                                  syllabusId: lesson.syllabusId
                                });
                              }}
                              className="h-8 text-[11px] font-bold flex-1 bg-purple-600 hover:bg-purple-700 text-white shadow-xs"
                            >
                              <Pencil className="size-3 mr-1" />
                              Editar Quiz
                            </Button>

                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => handleOpenQuiz(course.id, lesson.lessonNumber, course.name)}
                              className="h-8 w-8 text-slate-600 hover:text-purple-700 hover:border-purple-300"
                              title="Testar no Celular (Simulador)"
                            >
                              <ExternalLink className="size-3.5" />
                            </Button>

                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => handleCopyQuizLink(course.id, lesson.lessonNumber, course.name)}
                              className="h-8 w-8 text-slate-600 hover:text-purple-700 hover:border-purple-300"
                              title="Copiar Link para Alunos"
                            >
                              {isCopied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Modal Centralizado de Edição do Questionário */}
      {editorState.course && (
        <LessonQuizEditorModal
          open={editorState.open}
          onOpenChange={open => setEditorState(prev => ({ ...prev, open }))}
          course={editorState.course}
          lessonNumber={editorState.lessonNumber}
          lessonTitle={editorState.lessonTitle}
          syllabusId={editorState.syllabusId}
        />
      )}
    </div>
  );
}
